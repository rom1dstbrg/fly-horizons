"use client";

import { useState, useTransition } from "react";
import { savePiloteDisponibilites, type PiloteDispoState } from "@/lib/actions/pilote-disponibilites";
import { Plus, X, Check } from "lucide-react";
import { Badge, Button, FormField, Input, SectionHeader, Segmented } from "@/components/pilote/studio";
import { cn } from "@/lib/utils";

// Lundi en premier (usage belge) ; la valeur reste le numéro JS (0 = dimanche).
const JOURS: { j: number; label: string }[] = [
  { j: 1, label: "Lun" }, { j: 2, label: "Mar" }, { j: 3, label: "Mer" }, { j: 4, label: "Jeu" },
  { j: 5, label: "Ven" }, { j: 6, label: "Sam" }, { j: 0, label: "Dim" },
];

type Exception = { date: string; ferme: boolean; heure_debut: string; heure_fin: string };

const dateLabel = (d: string) =>
  new Date(d + "T12:00:00Z").toLocaleDateString("fr-BE", { weekday: "short", day: "numeric", month: "long", year: "numeric" });

// Formulaire Studio : pas de cartes, deux sections, validation pleine largeur.
export function PiloteDisponibilitesClient({
  initialPlage,
  initialExceptions,
}: {
  initialPlage: PiloteDispoState["plage"];
  initialExceptions: PiloteDispoState["exceptions"];
}) {
  const [plageDebut, setPlageDebut] = useState(initialPlage?.date_debut ?? "");
  const [plageFin, setPlageFin] = useState(initialPlage?.date_fin ?? "");
  const [plageHeureDebut, setPlageHeureDebut] = useState(initialPlage?.heure_debut.slice(0, 5) ?? "08:00");
  const [plageHeureFin, setPlageHeureFin] = useState(initialPlage?.heure_fin.slice(0, 5) ?? "20:00");
  const [plageJours, setPlageJours] = useState<number[]>(initialPlage?.jours ?? []);

  const [exceptions, setExceptions] = useState<Exception[]>(
    initialExceptions.map(e => ({
      date: e.date,
      ferme: e.ferme,
      heure_debut: e.heure_debut?.slice(0, 5) ?? "08:00",
      heure_fin: e.heure_fin?.slice(0, 5) ?? "20:00",
    })),
  );
  const [excDate, setExcDate] = useState("");
  const [excFerme, setExcFerme] = useState(true);
  const [excHeureDebut, setExcHeureDebut] = useState("08:00");
  const [excHeureFin, setExcHeureFin] = useState("20:00");

  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleJour(j: number) {
    setPlageJours(prev => prev.includes(j) ? prev.filter(x => x !== j) : [...prev, j].sort());
    setSaved(false);
  }

  function addException() {
    if (!excDate || exceptions.some(e => e.date === excDate)) return;
    setExceptions(prev => [...prev, { date: excDate, ferme: excFerme, heure_debut: excHeureDebut, heure_fin: excHeureFin }].sort((a, b) => a.date.localeCompare(b.date)));
    setExcDate("");
    setExcFerme(true);
    setSaved(false);
  }

  function removeException(date: string) {
    setExceptions(prev => prev.filter(e => e.date !== date));
    setSaved(false);
  }

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const result = await savePiloteDisponibilites({
        plage: plageDebut && plageFin
          ? { date_debut: plageDebut, date_fin: plageFin, heure_debut: plageHeureDebut, heure_fin: plageHeureFin, jours: plageJours }
          : null,
        exceptions: exceptions.map(e => ({ date: e.date, ferme: e.ferme, heure_debut: e.ferme ? null : e.heure_debut, heure_fin: e.ferme ? null : e.heure_fin })),
      });
      if (result?.error) { setError(result.error); return; }
      setSaved(true);
    });
  }

  const plageComplete = !!(plageDebut && plageFin);

  return (
    <form onSubmit={handleSave} className="space-y-7">
      {/* Période récurrente */}
      <section className="space-y-3.5">
        <div>
          <SectionHeader
            title="Période récurrente"
            action={plageComplete && (
              <button type="button" onClick={() => { setPlageDebut(""); setPlageFin(""); setSaved(false); }}
                className="cursor-pointer text-[12.5px] font-[550] text-st-text-2 hover:text-st-bad">
                Effacer
              </button>
            )}
          />
          <p className="mt-0.5 text-[12.5px] text-st-muted">Vide : vos annonces restent réservables à n&apos;importe quelle date.</p>
        </div>
        <div className="grid grid-cols-2 gap-3.5">
          <FormField id="d-du" label="Du">
            <Input id="d-du" type="date" value={plageDebut} onChange={e => { setPlageDebut(e.target.value); setSaved(false); }} />
          </FormField>
          <FormField id="d-au" label="Au">
            <Input id="d-au" type="date" value={plageFin} min={plageDebut || undefined} onChange={e => { setPlageFin(e.target.value); setSaved(false); }} />
          </FormField>
        </div>
        {plageComplete && (
          <>
            <div className="grid grid-cols-2 gap-3.5">
              <FormField id="d-hdeb" label="À partir de">
                <Input id="d-hdeb" type="time" value={plageHeureDebut} onChange={e => { setPlageHeureDebut(e.target.value); setSaved(false); }} />
              </FormField>
              <FormField id="d-hfin" label="Jusqu'à">
                <Input id="d-hfin" type="time" value={plageHeureFin} onChange={e => { setPlageHeureFin(e.target.value); setSaved(false); }} />
              </FormField>
            </div>
            <FormField label="Jours de la semaine" hint="Aucun jour choisi : tous les jours de la période.">
              <div className="grid grid-cols-7 gap-1.5">
                {JOURS.map(({ j, label }) => {
                  const on = plageJours.includes(j);
                  return (
                    <button
                      key={j}
                      type="button"
                      onClick={() => toggleJour(j)}
                      aria-pressed={on}
                      className={cn(
                        "h-10 cursor-pointer rounded-[10px] border text-[12.5px] font-semibold transition-colors",
                        on ? "border-st-ink bg-st-ink text-white" : "border-st-line bg-white text-st-text-2 hover:bg-st-surface hover:text-st-text",
                      )}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </FormField>
          </>
        )}
      </section>

      {/* Exceptions */}
      <section className="space-y-3.5">
        <div>
          <SectionHeader title="Exceptions" />
          <p className="mt-0.5 text-[12.5px] text-st-muted">Un jour fermé malgré la période, ou au contraire un jour libre en plus.</p>
        </div>

        <div className="space-y-3 rounded-[14px] bg-st-surface p-3.5">
          <div className="grid grid-cols-[1fr_auto] items-end gap-2.5">
            <FormField id="d-exc" label="Date">
              <Input id="d-exc" type="date" value={excDate} onChange={e => setExcDate(e.target.value)} />
            </FormField>
            <Segmented
              className="mb-[5px]"
              value={excFerme ? "ferme" : "ouvert"}
              onChange={(v) => setExcFerme(v === "ferme")}
              items={[{ key: "ferme", label: "Fermé" }, { key: "ouvert", label: "Ouvert" }]}
            />
          </div>
          {!excFerme && (
            <div className="grid grid-cols-2 gap-2.5">
              <FormField id="d-exc-deb" label="De">
                <Input id="d-exc-deb" type="time" value={excHeureDebut} onChange={e => setExcHeureDebut(e.target.value)} />
              </FormField>
              <FormField id="d-exc-fin" label="À">
                <Input id="d-exc-fin" type="time" value={excHeureFin} onChange={e => setExcHeureFin(e.target.value)} />
              </FormField>
            </div>
          )}
          <Button variant="secondary" fullWidth onClick={addException} disabled={!excDate || exceptions.some(e => e.date === excDate)}>
            <Plus />
            Ajouter l&apos;exception
          </Button>
        </div>

        {exceptions.length > 0 && (
          <ul className="divide-y divide-st-line-soft">
            {exceptions.map(e => (
              <li key={e.date} className="flex items-center gap-3 py-2.5">
                <span className="min-w-0 flex-1 truncate text-sm capitalize text-st-text">{dateLabel(e.date)}</span>
                {e.ferme
                  ? <Badge tone="danger">Fermé</Badge>
                  : <Badge tone="success">{e.heure_debut} – {e.heure_fin}</Badge>}
                <button type="button" onClick={() => removeException(e.date)} aria-label="Retirer l'exception"
                  className="grid h-8 w-8 shrink-0 cursor-pointer place-items-center rounded-[9px] text-st-muted transition-colors hover:bg-st-surface hover:text-st-bad">
                  <X size={15} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="space-y-3">
        {saved && (
          <p className="flex items-center gap-2 rounded-[12px] bg-st-ok-soft px-3.5 py-2.5 text-[13px] text-st-ok">
            <Check size={15} className="shrink-0" />
            Disponibilités enregistrées.
          </p>
        )}
        {error && <p className="rounded-[12px] bg-st-bad-soft px-3.5 py-2.5 text-[13px] text-st-bad">{error}</p>}
        <Button type="submit" size="lg" fullWidth loading={isPending} className="sm:h-[38px] sm:text-[13px]">
          {isPending ? "Enregistrement…" : "Enregistrer"}
        </Button>
      </div>
    </form>
  );
}
