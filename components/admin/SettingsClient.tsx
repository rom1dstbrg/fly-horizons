"use client";

import { createContext, useContext, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Bell, CalendarClock, ChevronLeft, ChevronRight, Euro, Globe, TriangleAlert, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { addTarifAvion, deleteTarifAvion, updateAppSettings } from "@/lib/actions/settings";
import { serializePatch, type AppSettings } from "@/lib/app-settings";
import { calculerPrixClient } from "@/lib/pilote-pricing";
import {
  Badge, Button, FormField, Input, PageHeader, Segmented, Sheet, SheetBody, SheetFooter, SheetHeader, Textarea,
} from "@/components/pilote/studio";

// Paramètres (maquette validée le 01/10) : une liste de catégories ; on en ouvre
// une pour voir ses réglages. Tout vit dans ce seul composant : les six
// catégories sont montées d'avance et seulement masquées, donc ouvrir l'une
// n'attend rien. Au téléphone, la catégorie est une page qui glisse de la droite
// (et repart vers la droite à la fermeture) ; sur le bureau, la liste reste à
// gauche et le panneau arrive de la droite. Un seul bouton « Enregistrer » pour
// l'ensemble des modifications.

export type Tarif = { id: string; prix_heure: number; actif_depuis: string; note: string | null };

type CatId = "site" | "resa" | "suivi" | "notifs" | "fin";

const CATS: { id: CatId; icon: LucideIcon; title: string; summary: string; lead: string }[] = [
  { id: "site", icon: Globe, title: "Site", summary: "Maintenance, chatbot", lead: "Ce que voient les visiteurs du site public." },
  { id: "resa", icon: CalendarClock, title: "Réservations", summary: "Préavis, délais, rappels", lead: "Les délais qui encadrent une demande, de la réponse du pilote au rappel avant le vol." },
  { id: "suivi", icon: TriangleAlert, title: "Suivi et alertes", summary: "Seuils orange et rouge", lead: "À partir de quand un vol est signalé dans Réservations. Les mêmes seuils déclenchent les notifications." },
  { id: "notifs", icon: Bell, title: "Notifications", summary: "Alertes sur ton téléphone", lead: "Les notifications envoyées à l'admin. Chaque palier part une seule fois par réservation." },
  { id: "fin", icon: Euro, title: "Tarifs et finances", summary: "Tarif avion, ma part", lead: "Sert au calcul de ton gain ou de ta perte sur chaque vol (Transactions, bilan de vol)." },
];

type NumKey = { [K in keyof AppSettings]: AppSettings[K] extends number ? K : never }[keyof AppSettings];
type BoolKey = { [K in keyof AppSettings]: AppSettings[K] extends boolean ? K : never }[keyof AppSettings];

const fmtEur = (n: number) => n.toLocaleString("fr-BE", { style: "currency", currency: "EUR" });
const fmtDate = (iso: string) =>
  new Date(`${iso}T12:00:00Z`).toLocaleDateString("fr-BE", { day: "numeric", month: "long", year: "numeric" });

type SettingsCtx = { v: AppSettings; set: <K extends keyof AppSettings>(k: K, val: AppSettings[K]) => void };
const SettingsContext = createContext<SettingsCtx | null>(null);
function useSettingsCtx() {
  const c = useContext(SettingsContext);
  if (!c) throw new Error("SettingsContext manquant");
  return c;
}

// Briques au niveau du module : définies dans le composant, elles seraient
// recréées à chaque frappe et les champs perdraient le focus.
const Group = ({ title, children }: { title?: string; children: React.ReactNode }) => (
  <section className="rounded-2xl border border-st-line bg-white px-4 pb-1 pt-3.5 shadow-st-sm lg:px-5">
    {title && <h3 className="text-[11px] font-semibold uppercase tracking-[0.06em] text-st-muted">{title}</h3>}
    <div className="divide-y divide-st-line-soft">{children}</div>
  </section>
);

const Row = ({ title, desc, children, wrap }: { title: string; desc?: string; children: React.ReactNode; wrap?: boolean }) => (
  <div className={cn("flex gap-4 py-3.5", wrap ? "flex-col sm:flex-row sm:items-center sm:justify-between" : "items-center justify-between")}>
    <div className="min-w-0">
      <p className="text-sm font-semibold text-st-text">{title}</p>
      {desc && <p className="mt-0.5 max-w-[52ch] text-[12.5px] leading-snug text-st-muted">{desc}</p>}
    </div>
    <div className="shrink-0">{children}</div>
  </div>
);

const Switch = ({ k, label, danger }: { k: BoolKey; label: string; danger?: boolean }) => {
  const { v, set } = useSettingsCtx();
  const on = v[k];
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={() => set(k, !on as AppSettings[BoolKey])}
      className={cn(
        "relative h-[26px] w-[44px] shrink-0 cursor-pointer rounded-full transition-colors",
        on ? (danger ? "bg-st-bad" : "bg-st-ink") : "bg-st-line-strong",
      )}
    >
      <span className={cn("absolute left-[3px] top-[3px] size-5 rounded-full bg-white shadow transition-transform", on && "translate-x-[18px]")} />
    </button>
  );
};

const ToggleRow = ({ k, title, desc, danger, children }: { k: BoolKey; title: string; desc?: string; danger?: boolean; children?: React.ReactNode }) => {
  const { v } = useSettingsCtx();
  return (
  <>
    <Row title={title} desc={desc}><Switch k={k} label={title} danger={danger} /></Row>
    {v[k] && children && <div className="space-y-3 pb-4">{children}</div>}
  </>
  );
};

const Num = ({ k, unit, label }: { k: NumKey; unit: string; label: string }) => {
  const { v, set } = useSettingsCtx();
  return (
  <div className="flex items-center gap-2">
    <Input
      type="number"
      inputMode="decimal"
      min={0}
      aria-label={label}
      value={Number.isNaN(v[k]) ? "" : v[k]}
      onChange={(e) => set(k, (e.target.value === "" ? NaN : Number(e.target.value)) as AppSettings[NumKey])}
      className="!min-h-10 w-[84px] text-right"
    />
    <span className="w-[52px] text-[12.5px] text-st-muted">{unit}</span>
  </div>
  );
};

const NumRow = ({ k, title, desc, unit }: { k: NumKey; title: string; desc: string; unit: string }) => (
  <Row title={title} desc={desc} wrap><Num k={k} unit={unit} label={title} /></Row>
);

const PairRow = ({ orange, rouge, title, desc, unit }: { orange: NumKey; rouge: NumKey; title: string; desc: string; unit: string }) => (
  <Row title={title} desc={desc} wrap>
    <div className="flex gap-4">
      <div>
        <p className="mb-1 flex items-center gap-1.5 text-[11.5px] font-semibold text-st-muted"><i className="size-2 rounded-full bg-[#e08a00]" />Orange</p>
        <Num k={orange} unit={unit} label={`${title}, seuil orange`} />
      </div>
      <div>
        <p className="mb-1 flex items-center gap-1.5 text-[11.5px] font-semibold text-st-muted"><i className="size-2 rounded-full bg-st-bad" />Rouge</p>
        <Num k={rouge} unit={unit} label={`${title}, seuil rouge`} />
      </div>
    </div>
  </Row>
);

export function SettingsClient({ settings, tarifs, currentTarifId }: { settings: AppSettings; tarifs: Tarif[]; currentTarifId: string | null }) {
  const router = useRouter();
  const [base, setBase] = useState(settings);
  const [v, setV] = useState(settings);
  const [active, setActive] = useState<CatId>("site");
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [saving, startSaving] = useTransition();
  const [tarifSheet, setTarifSheet] = useState(false);

  const set = <K extends keyof AppSettings>(k: K, val: AppSettings[K]) => { setV((p) => ({ ...p, [k]: val })); setError(""); };

  const patch: Partial<AppSettings> = {};
  for (const k of Object.keys(v) as (keyof AppSettings)[]) {
    if (!Object.is(v[k], base[k])) (patch as Record<string, unknown>)[k] = v[k];
  }
  const dirty = Object.keys(patch).length;
  const check = dirty ? serializePatch({ ...patch }) : null;
  const problem = check && "error" in check ? check.error : "";

  function save() {
    startSaving(async () => {
      const res = await updateAppSettings(patch);
      if ("error" in res && res.error) { setError(res.error); return; }
      setBase(v);
    });
  }

  const cout = tarifs.find((t) => t.id === currentTarifId)?.prix_heure ?? 0;
  const prixClient = calculerPrixClient(cout, 60, v.partType, Number.isNaN(v.partValeur) ? 0 : v.partValeur);
  const cat = CATS.find((c) => c.id === active)!;

  return (
    <SettingsContext.Provider value={{ v, set }}>
    <div className="pilote-studio space-y-5 font-sans text-st-text">
      <PageHeader title="Paramètres" />

      <div className="lg:grid lg:grid-cols-[280px_minmax(0,1fr)] lg:items-start lg:gap-10">
        {/* Liste des catégories */}
        <nav aria-label="Catégories de paramètres" className="overflow-hidden rounded-2xl border border-st-line bg-white shadow-st-sm lg:sticky lg:top-6 lg:p-2">
          {CATS.map((c) => {
            const Icon = c.icon;
            const on = c.id === active;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => { setActive(c.id); setOpen(true); }}
                className={cn(
                  "flex w-full cursor-pointer items-center gap-3 border-t border-st-line-soft px-4 py-3 text-left transition-colors first:border-t-0 hover:bg-st-surface",
                  "lg:rounded-xl lg:border-0 lg:px-3 lg:py-2.5 lg:first:border-0",
                  on && "lg:bg-st-ink-soft lg:hover:bg-st-ink-soft",
                )}
              >
                <span className={cn("grid size-[34px] shrink-0 place-items-center rounded-[10px] bg-st-surface text-st-ink", on && "lg:bg-st-ink lg:text-white")}>
                  <Icon size={17} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[13.5px] font-semibold">{c.title}</span>
                  <span className="block truncate text-[11.5px] text-st-muted">{c.summary}</span>
                </span>
                <ChevronRight size={18} className="shrink-0 text-st-muted lg:hidden" />
              </button>
            );
          })}
        </nav>

        {/* Page de la catégorie : glisse de la droite au téléphone, panneau fixe sur le bureau */}
        <div
          aria-hidden={!open ? undefined : false}
          className={cn(
            "fixed inset-0 z-[60] overflow-y-auto bg-st-bg transition-[translate,visibility] duration-300 ease-[cubic-bezier(0.2,0,0,1)]",
            open ? "visible translate-x-0" : "invisible translate-x-full",
            "lg:visible lg:static lg:z-auto lg:translate-x-0 lg:overflow-visible lg:bg-transparent lg:transition-none",
          )}
        >
          <div className="sticky top-0 z-10 flex items-center gap-3 border-b border-st-line bg-st-bg/95 px-3 pb-3 pt-[calc(0.75rem+env(safe-area-inset-top))] backdrop-blur lg:hidden">
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Retour aux paramètres"
              className="grid size-9 cursor-pointer place-items-center rounded-full bg-st-surface text-st-text transition-colors hover:bg-st-line"
            >
              <ChevronLeft size={19} />
            </button>
            <h2 className="text-lg font-semibold tracking-[-0.02em]">{cat.title}</h2>
          </div>

          <div className="px-4 pb-32 pt-4 lg:p-0">
            {CATS.map((c) => (
              <div key={c.id} hidden={c.id !== active} className="st-pane-in space-y-6">
                <div className="max-lg:hidden">
                  <h2 className="text-xl font-semibold tracking-[-0.02em]">{c.title}</h2>
                  <p className="mt-1 text-[13px] text-st-muted">{c.lead}</p>
                </div>
                <p className="text-[12.5px] text-st-muted lg:hidden">{c.lead}</p>

                {c.id === "site" && (
                  <>
                    <Group title="Accès au site">
                      <ToggleRow k="maintenanceMode" danger title="Site en reconstruction" desc="Redirige les visiteurs vers une page « site en pause ». Connecté en admin, tu vois le site normalement.">
                        <FormField id="maint-date" label="Date de réouverture (facultatif)">
                          <Input id="maint-date" type="date" value={v.maintenanceReopenDate} onChange={(e) => set("maintenanceReopenDate", e.target.value)} />
                        </FormField>
                        <FormField id="maint-msg" label="Message affiché aux visiteurs">
                          <Textarea id="maint-msg" rows={2} className="min-h-0" value={v.maintenanceMessage} placeholder="Les réservations restent possibles par email, on vous répond vite." onChange={(e) => set("maintenanceMessage", e.target.value)} />
                        </FormField>
                      </ToggleRow>
                      <ToggleRow k="calendarClosed" danger title="Fermer les réservations" desc="Bloque le calendrier sur toutes les pages de réservation.">
                        <FormField id="cal-msg" label="Message affiché aux clients">
                          <Input id="cal-msg" value={v.calendarClosedMessage} placeholder="Réservations suspendues jusqu'au 15 janvier, contactez-nous pour toute demande." onChange={(e) => set("calendarClosedMessage", e.target.value)} />
                        </FormField>
                      </ToggleRow>
                    </Group>
                    <Group title="Assistant">
                      <ToggleRow k="chatEnabled" title="Assistant chatbot" desc="Affiche ou masque le bouton de chat sur tout le site." />
                    </Group>
                  </>
                )}

                {c.id === "resa" && (
                  <>
                    <Group title="Avant le vol">
                      <NumRow k="minJours" unit="jours" title="Préavis minimum" desc="Nombre de jours avant le vol à partir duquel un client peut réserver." />
                      <NumRow k="rappelClientH" unit="h avant" title="Rappel envoyé au client" desc="Email de rappel envoyé avant le vol." />
                      <NumRow k="annulationImpayeH" unit="h avant" title="Annulation si le vol n'est pas payé" desc="Un vol réglé par lien de paiement et toujours impayé est annulé automatiquement à ce délai. Le client reçoit un rappel 24 h avant." />
                    </Group>
                    <Group title="Réponses">
                      <NumRow k="delaiReponsePiloteH" unit="heures" title="Délai de réponse du pilote" desc="Passé ce délai, une demande sans réponse est libérée et le client est prévenu." />
                      <NumRow k="validitePropositionH" unit="heures" title="Validité d'une proposition de vol" desc="Durée pendant laquelle un pilote peut prendre un vol mis en jeu. Ne change pas les propositions déjà envoyées." />
                    </Group>
                    <Group title="Après le vol">
                      <NumRow k="bilanRappelH" unit="h après" title="Premier rappel du bilan" desc="Notification envoyée au pilote pour clôturer le vol." />
                      <NumRow k="bilanRelanceH" unit="h après" title="Relance du bilan" desc="Deuxième rappel, après le premier, si le vol n'est toujours pas clôturé." />
                    </Group>
                  </>
                )}

                {c.id === "suivi" && (
                  <>
                    <Group title="Seuils">
                      <PairRow orange="sansReponseOrangeH" rouge="sansReponseRougeH" unit="h" title="Demande sans réponse du pilote" desc="Depuis la demande." />
                      <PairRow orange="clientPayeOrangeH" rouge="clientPayeRougeH" unit="h" title="Client dit avoir payé, pilote pas confirmé" desc="Depuis la déclaration du client." />
                      <PairRow orange="paiementOrangeJ" rouge="paiementRougeJ" unit="jours" title="Paiement en attente" desc="Depuis l'envoi du lien de paiement." />
                      <PairRow orange="nonClotureOrangeH" rouge="nonClotureRougeH" unit="h" title="Vol passé non marqué effectué" desc="Depuis l'heure du vol." />
                    </Group>
                    <Group title="Vol proche">
                      <ToggleRow k="sansHeureActif" title="Signaler un vol proche sans heure" desc="Orange à moins de 48 h, rouge le jour même." />
                    </Group>
                  </>
                )}

                {c.id === "notifs" && (
                  <>
                    <Group title="Relances de suivi">
                      <ToggleRow k="notifSansReponse" title="Demande sans réponse" />
                      <ToggleRow k="notifPaiement" title="Paiement en attente" />
                      <ToggleRow k="notifClientPaye" title="Client dit avoir payé" />
                      <ToggleRow k="notifNonCloture" title="Vol non marqué effectué" />
                    </Group>
                    <Group title="Niveau">
                      <Row title="Notifier à partir de" desc="Orange : dès le premier seuil. Rouge : seulement les cas graves." wrap>
                        <Segmented
                          value={v.notifNiveau}
                          onChange={(k) => set("notifNiveau", k)}
                          items={[{ key: "warn", label: "Orange" }, { key: "bad", label: "Rouge" }]}
                        />
                      </Row>
                    </Group>
                  </>
                )}

                {c.id === "fin" && (
                  <>
                    <Group title="Tarif avion (école)">
                      <div className="flex flex-wrap items-end justify-between gap-3 py-4">
                        <div>
                          <p className="st-num text-[32px] font-medium leading-none tracking-[-0.03em]">
                            {cout > 0 ? fmtEur(cout) : "Aucun"}<span className="text-[15px] font-normal text-st-muted"> /h</span>
                          </p>
                          <p className="mt-1.5 text-[12.5px] text-st-muted">
                            {cout > 0 ? `Tarif actuel, depuis le ${fmtDate(tarifs.find((t) => t.id === currentTarifId)!.actif_depuis)}` : "Ajoute un tarif pour calculer tes gains."}
                          </p>
                        </div>
                        <Button onClick={() => setTarifSheet(true)}>Nouveau tarif</Button>
                      </div>
                      {tarifs.length > 0 && (
                        <ul className="divide-y divide-st-line-soft">
                          {[...tarifs].sort((a, b) => b.actif_depuis.localeCompare(a.actif_depuis)).map((t) => (
                            <TarifLine key={t.id} t={t} actuel={t.id === currentTarifId} seul={tarifs.length === 1} onDone={() => router.refresh()} />
                          ))}
                        </ul>
                      )}
                    </Group>
                    <Group title="Ma part">
                      <Row title="Part sur chaque vol" desc="Prix client = coût avion moins ta part." wrap>
                        <div className="flex items-center gap-2.5">
                          <Input
                            type="number" inputMode="decimal" min={0} aria-label="Ma part"
                            value={Number.isNaN(v.partValeur) ? "" : v.partValeur}
                            onChange={(e) => set("partValeur", e.target.value === "" ? NaN : Number(e.target.value))}
                            className="!min-h-10 w-[84px] text-right"
                          />
                          <Segmented
                            value={v.partType}
                            onChange={(k) => set("partType", k)}
                            items={[{ key: "pourcentage", label: "%" }, { key: "montant", label: "€" }]}
                          />
                        </div>
                      </Row>
                      <div className="flex items-center justify-between py-3.5 text-sm">
                        <span className="text-st-text-2">Prix client calculé</span>
                        <span className="st-num font-semibold">{cout > 0 ? `${prixClient.toLocaleString("fr-BE")} €/h` : "—"}</span>
                      </div>
                    </Group>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Barre d'enregistrement : une seule pour tous les réglages */}
      {dirty > 0 && (
        <div
          className={cn(
            "fixed inset-x-4 bottom-[calc(1rem+env(safe-area-inset-bottom))] z-[65] flex items-center justify-between gap-3 rounded-2xl bg-st-ink py-2.5 pl-5 pr-2.5 text-white shadow-st-lg",
            "lg:sticky lg:inset-x-auto lg:bottom-6 lg:ml-[320px]",
            !open && "max-lg:hidden",
          )}
        >
          <span className={cn("min-w-0 text-[13px]", (problem || error) && "text-[#ffd0cb]")}>
            {problem || error || `${dirty} modification${dirty > 1 ? "s" : ""} non enregistrée${dirty > 1 ? "s" : ""}`}
          </span>
          <span className="flex shrink-0 items-center gap-2">
            <button type="button" onClick={() => { setV(base); setError(""); }} className="h-[34px] cursor-pointer rounded-[10px] px-3 text-[13px] font-[550] text-white/80 transition-colors hover:text-white">
              Annuler
            </button>
            <button
              type="button"
              disabled={!!problem || saving}
              onClick={save}
              className="h-[34px] cursor-pointer rounded-[10px] bg-white px-4 text-[13px] font-[550] text-st-ink transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? "Enregistrement…" : "Enregistrer"}
            </button>
          </span>
        </div>
      )}

      <Sheet value={tarifSheet ? true : null} onClose={() => setTarifSheet(false)}>
        {() => <NouveauTarif onClose={() => setTarifSheet(false)} onDone={() => { setTarifSheet(false); router.refresh(); }} />}
      </Sheet>
    </div>
    </SettingsContext.Provider>
  );
}

function TarifLine({ t, actuel, seul, onDone }: { t: Tarif; actuel: boolean; seul: boolean; onDone: () => void }) {
  const [pending, start] = useTransition();
  const [err, setErr] = useState("");
  return (
    <li className="flex items-center justify-between gap-3 py-3 text-sm">
      <span className="min-w-0">
        <span className="font-[550]">{fmtDate(t.actif_depuis)}</span>
        {actuel && <Badge tone="success" className="ml-2">actuel</Badge>}
        {t.note && <span className="block truncate text-[12.5px] text-st-muted">{t.note}</span>}
        {err && <span className="block text-[12.5px] text-st-bad">{err}</span>}
      </span>
      <span className="flex shrink-0 items-center gap-4">
        <span className="st-num font-semibold">{fmtEur(t.prix_heure)}</span>
        <button
          type="button"
          disabled={seul || pending}
          title={seul ? "Impossible de supprimer le seul tarif" : undefined}
          onClick={() => start(async () => {
            const r = await deleteTarifAvion(t.id);
            if ("error" in r && r.error) setErr(r.error); else onDone();
          })}
          className="cursor-pointer text-[13px] font-semibold text-st-ink hover:underline disabled:cursor-not-allowed disabled:opacity-40 disabled:no-underline"
        >
          Supprimer
        </button>
      </span>
    </li>
  );
}

function NouveauTarif({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [prix, setPrix] = useState("");
  const [date, setDate] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  function submit() {
    const p = parseFloat(prix.replace(",", "."));
    if (!(p > 0)) { setError("Indique un prix par heure."); return; }
    if (!date) { setError("Indique la date de début."); return; }
    start(async () => {
      const r = await addTarifAvion(p, date, note || undefined);
      if ("error" in r && r.error) setError(r.error); else onDone();
    });
  }

  return (
    <>
      <SheetHeader title="Nouveau tarif avion" subtitle="Remplace le tarif actuel à la date choisie" onClose={onClose} />
      <SheetBody>
        <FormField id="tarif-prix" label="Prix par heure (€)">
          <Input id="tarif-prix" inputMode="decimal" placeholder="256,00" value={prix} onChange={(e) => { setPrix(e.target.value); setError(""); }} />
        </FormField>
        <FormField id="tarif-date" label="Actif depuis">
          <Input id="tarif-date" type="date" value={date} onChange={(e) => { setDate(e.target.value); setError(""); }} />
        </FormField>
        <FormField id="tarif-note" label="Note (facultatif)">
          <Input id="tarif-note" placeholder="DA40, nouveau tarif de l'école" value={note} onChange={(e) => setNote(e.target.value)} />
        </FormField>
        {error && <p className="text-[13px] text-st-bad">{error}</p>}
      </SheetBody>
      <SheetFooter>
        <Button size="lg" fullWidth loading={pending} onClick={submit}>Ajouter le tarif</Button>
      </SheetFooter>
    </>
  );
}
