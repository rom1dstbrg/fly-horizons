"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { Check, ChevronLeft, ChevronRight, CircleHelp, Info, Repeat, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button, ButtonLabel, PageHeader } from "@/components/pilote/studio";
import { PageTour, type TourStep } from "@/components/pilote/PageTour";
import { BLOCS, BLOC_H, addDaysIso, blocsOccupes, fmtIso } from "@/lib/pilote-creneaux";
import { markVisiteVue, savePiloteCreneaux, type CreneauResa } from "@/lib/actions/pilote-creneaux";
import { RecurrenceDialog, type Recurrence } from "./RecurrenceDialog";
import { WeekGrid, blocKey as key } from "./WeekGrid";

// Disponibilités du pilote en grille (maquette-disponibilites.html, validée le
// 27/09) : 7 jours × 7 blocs de 2 h, chaque bloc ouvert ou fermé. Un toucher
// sur un bloc, un jour (toute la journée) ou une heure (toute la semaine), un
// glisser à la souris. Rien ne part au serveur avant « Enregistrer » : un seul
// envoi pour tous les changements.


const TOUR: TourStep[] = [
  { target: '[data-tour="cell"]', title: "Touchez un bloc pour l'ouvrir",
    text: "Jaune : un passager peut réserver ce créneau de 2 h. Touchez encore pour le fermer. Rien n'est envoyé avant de cliquer sur Enregistrer." },
  { target: '[data-col="5"]', title: "Toute la journée en un clic",
    text: "Touchez le jour en haut de la colonne : toute la journée s'ouvre. Touchez encore : elle se ferme." },
  { target: '[data-row="13"]', title: "Un créneau toute la semaine",
    text: "Touchez l'heure à gauche : ce créneau s'ouvre du lundi au dimanche." },
  { target: '[data-tour="rec"]', title: "Les semaines suivantes",
    text: "Ajoutez une récurrence : par exemple chaque mardi de 13 h à 17 h pendant 8 semaines. Même chose pour fermer vos congés." },
];

export function DispoGrid({ monday, today, ouverts, reservations, visiteVue }: {
  /** Lundi de la semaine en cours (heure de Bruxelles). */
  monday: string;
  today: string;
  ouverts: string[];
  reservations: CreneauResa[];
  visiteVue: boolean;
}) {
  // Semaine affichée à l'ouverture : celle du premier jour réservable (J+2). Un
  // dimanche, la semaine en cours est déjà passée : on ouvre sur la suivante.
  const firstWeek = addDaysIso(today, 2) >= addDaysIso(monday, 7) ? 1 : 0;
  const [week, setWeek] = useState(firstWeek);
  const [open, setOpen] = useState(() => new Set(ouverts));
  const [saved, setSaved] = useState(() => new Set(ouverts));
  const [saving, startSaving] = useTransition();
  const [saveError, setSaveError] = useState("");
  const [toast, setToast] = useState("");
  const [recOpen, setRecOpen] = useState(false);
  const [tourOpen, setTourOpen] = useState(false);

  // Blocs pris par un vol → prénom(s) du passager.
  const reserved = useMemo(() => {
    const m = new Map<string, string[]>();
    for (const r of reservations) {
      for (const b of blocsOccupes([r]).keys()) {
        const k = key(r.date, b);
        m.set(k, [...(m.get(k) ?? []), r.prenom || "Réservé"]);
      }
    }
    return new Map([...m].map(([k, names]) => [k, names.length > 1 ? `${names[0]} +${names.length - 1}` : names[0]]));
  }, [reservations]);

  const weekStart = addDaysIso(monday, week * 7);
  const dates = Array.from({ length: 7 }, (_, i) => addDaysIso(weekStart, i));
  const editable = (k: string) => k.slice(0, 10) >= today && !reserved.has(k);

  const dirty = useMemo(() => {
    let n = 0;
    for (const k of open) if (!saved.has(k)) n++;
    for (const k of saved) if (!open.has(k)) n++;
    return n;
  }, [open, saved]);

  const futureOpen = useMemo(() => [...open].some((k) => k.slice(0, 10) >= today), [open, today]);

  const save = () => {
    const ajouts = [...open].filter((k) => !saved.has(k));
    const retraits = [...saved].filter((k) => !open.has(k));
    setSaveError("");
    startSaving(async () => {
      const res = await savePiloteCreneaux(ajouts, retraits);
      if (res && "error" in res && res.error) { setSaveError(res.error); return; }
      setSaved(new Set(open));
      setToast("Disponibilités enregistrées");
    });
  };

  const applyRecurrence = (r: Recurrence) => {
    const keys: string[] = [];
    for (let w = 0; w < r.weeks; w++) for (const d of r.days) for (const b of BLOCS) {
      if (b >= r.from && b + BLOC_H <= r.to) keys.push(key(addDaysIso(weekStart, w * 7 + d), b));
    }
    const free = keys.filter(editable);
    setOpen((prev) => {
      const next = new Set(prev);
      free.forEach((k) => (r.mode === "open" ? next.add(k) : next.delete(k)));
      return next;
    });
    setRecOpen(false);
    setToast(`${free.length} bloc${free.length > 1 ? "s" : ""} ${r.mode === "open" ? "ouvert" : "fermé"}${free.length > 1 ? "s" : ""}, pensez à enregistrer`);
  };

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  // Modifications non enregistrées : on prévient avant de quitter la page
  // (fermeture de l'onglet, et liens internes de l'espace pilote).
  useEffect(() => {
    if (!dirty) return;
    const msg = "Vous avez des disponibilités non enregistrées. Quitter quand même ?";
    const onUnload = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    const onLink = (e: MouseEvent) => {
      const a = (e.target as HTMLElement).closest("a[href]");
      if (a && !a.getAttribute("href")?.startsWith("#") && !window.confirm(msg)) { e.preventDefault(); e.stopPropagation(); }
    };
    window.addEventListener("beforeunload", onUnload);
    document.addEventListener("click", onLink, true);
    return () => {
      window.removeEventListener("beforeunload", onUnload);
      document.removeEventListener("click", onLink, true);
    };
  }, [dirty]);

  // Première visite : la visite démarre toute seule.
  useEffect(() => {
    if (visiteVue) return;
    const t = setTimeout(() => setTourOpen(true), 700);
    return () => clearTimeout(t);
  }, [visiteVue]);
  const endTour = useCallback(() => {
    setTourOpen(false);
    markVisiteVue("disponibilites");
  }, []);

  const weekCount = dates.reduce((n, d) => n + BLOCS.filter((b) => open.has(key(d, b))).length, 0);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Disponibilités"
        actions={<>
          <Button variant="secondary" size="icon" aria-label="Revoir la visite" title="Revoir la visite" onClick={() => { setWeek(firstWeek); setTourOpen(true); }}>
            <CircleHelp />
          </Button>
          <Button variant="secondary" data-tour="rec" onClick={() => setRecOpen(true)}>
            <Repeat /><ButtonLabel full="Ajouter une récurrence" short="Récurrence" />
          </Button>
        </>}
      />

      {!futureOpen && (
        <div className="flex gap-2.5 rounded-[14px] bg-st-warn-soft px-4 py-3 text-[13px] leading-snug text-st-warn">
          <TriangleAlert size={16} className="mt-px shrink-0" />
          <p><b className="font-semibold">Aucun créneau ouvert : vos annonces ne sont pas réservables.</b> Touchez les blocs où vous pouvez voler, puis enregistrez.</p>
        </div>
      )}

      <section className="rounded-[20px] border border-st-line bg-white px-2.5 py-3.5 shadow-st-sm sm:px-5 sm:py-5">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex w-full items-center justify-between gap-1.5 sm:w-auto">
            <Button variant="secondary" size="icon" aria-label="Semaine précédente" disabled={week === 0} onClick={() => setWeek(week - 1)}><ChevronLeft /></Button>
            <span className="min-w-0 flex-1 text-center text-[13.5px] font-semibold sm:min-w-[230px] sm:text-[14.5px]">
              Semaine du {fmtIso(dates[0])} au {fmtIso(dates[6])}
            </span>
            <Button variant="secondary" size="icon" aria-label="Semaine suivante" onClick={() => setWeek(week + 1)}><ChevronRight /></Button>
          </div>
          {week !== firstWeek && <Button variant="ghost" size="sm" className="hidden sm:inline-flex" onClick={() => setWeek(firstWeek)}>Revenir à aujourd&apos;hui</Button>}
          <span className="w-full text-center text-[12.5px] text-st-muted sm:ml-auto sm:w-auto">
            <b className="st-num font-semibold text-st-text">{weekCount}</b> bloc{weekCount > 1 ? "s" : ""} ouvert{weekCount > 1 ? "s" : ""} cette semaine
          </span>
        </div>

        <div className="mt-3 sm:mt-4">
          <WeekGrid dates={dates} today={today} open={open} saved={saved} reserved={reserved} setOpen={setOpen} tourCell />
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-x-[18px] gap-y-2 text-xs text-st-text-2">
          <Legend className="border-st-gold bg-st-gold-soft">Ouvert</Legend>
          <Legend className="border-st-line-strong bg-st-surface">Fermé</Legend>
          <Legend className="border-st-ink bg-st-ink">Réservé</Legend>
          <span className="inline-flex items-center gap-[7px]"><i className="size-[7px] rounded-full bg-st-ink" />Pas encore enregistré</span>
          <span className="w-full text-st-muted sm:ml-auto sm:w-auto">Touchez un jour ou une heure pour tout ouvrir ou tout fermer.</span>
        </div>
      </section>

      <div className="flex gap-2.5 rounded-[14px] bg-st-info-soft px-4 py-3 text-[13px] leading-snug text-st-info">
        <Info size={16} className="mt-px shrink-0" />
        <p>
          Un seul calendrier pour toutes vos annonces. Le passager réserve un bloc de 2 h entier, vous calez ensuite l&apos;heure exacte ensemble ;
          un vol plus long demande deux blocs qui se suivent. Un bloc réservé se gère depuis le vol.
        </p>
      </div>

      {/* Barre d'enregistrement : au-dessus de la barre d'onglets au téléphone. */}
      <div
        role="status"
        className={cn(
          "fixed inset-x-4 bottom-[calc(env(safe-area-inset-bottom)+5.25rem)] z-40 flex items-center gap-1.5 rounded-2xl bg-st-ink py-2 pl-3.5 pr-2 text-white shadow-st-panel transition-[transform,opacity] duration-200 ease-[cubic-bezier(0.2,0.8,0.2,1)]",
          "sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 sm:gap-3.5 sm:pl-[18px] lg:bottom-6 lg:left-[calc(50%+38px)]",
          dirty ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-[140%] opacity-0",
        )}
      >
        <span className="min-w-0 flex-1 text-[12.5px] font-[550] sm:text-[13px]">
          {saveError
            ? <span className="text-[#ffb4ab]">{saveError}</span>
            : <>{dirty} modification{dirty > 1 ? "s" : ""}<span className="hidden font-normal text-[#b9c4d2] sm:inline"> non enregistrée{dirty > 1 ? "s" : ""}</span></>}
        </span>
        <Button variant="ghost" className="text-[#d5dde7] hover:bg-white/10 hover:text-white" disabled={saving}
          onClick={() => { setOpen(new Set(saved)); setSaveError(""); }}>
          Annuler
        </Button>
        <Button className="bg-st-gold font-semibold text-st-ink shadow-none hover:bg-[#ffc81f]" loading={saving} onClick={save}>
          Enregistrer
        </Button>
      </div>

      <div
        aria-live="polite"
        className={cn(
          "pointer-events-none fixed left-1/2 z-40 flex -translate-x-1/2 items-center gap-2 whitespace-nowrap rounded-[14px] border border-st-line bg-white px-4 py-2.5 text-[13px] font-[550] shadow-st-lg transition-[transform,opacity] duration-200 lg:left-[calc(50%+38px)]",
          // Au-dessus de la barre d'enregistrement quand elle est affichée.
          dirty ? "bottom-[calc(env(safe-area-inset-bottom)+9.25rem)] lg:bottom-24" : "bottom-[calc(env(safe-area-inset-bottom)+5.25rem)] lg:bottom-6",
          toast ? "translate-y-0 opacity-100" : "translate-y-5 opacity-0",
        )}
      >
        <Check size={16} className="text-st-ok" />{toast}
      </div>

      <RecurrenceDialog open={recOpen} weekStart={weekStart} onClose={() => setRecOpen(false)} onApply={applyRecurrence} reservedKeys={reserved} />
      <PageTour steps={TOUR} open={tourOpen} onClose={endTour} />
    </div>
  );
}

function Legend({ className, children }: { className: string; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-[7px]">
      <i className={cn("size-3.5 rounded-[4px] border", className)} />
      {children}
    </span>
  );
}
