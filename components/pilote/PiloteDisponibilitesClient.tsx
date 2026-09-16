"use client";

import { useState, useTransition } from "react";
import { savePiloteDisponibilites, type PiloteDispoState } from "@/lib/actions/pilote-disponibilites";
import { Input } from "@/components/ui/input";
import { CalendarRange, Ban, Plus, X, Check, Loader2 } from "lucide-react";

const JOURS_LABELS = ["dim.", "lun.", "mar.", "mer.", "jeu.", "ven.", "sam."];

type Exception = { date: string; ferme: boolean; heure_debut: string; heure_fin: string };

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
  }

  function addException() {
    if (!excDate || exceptions.some(e => e.date === excDate)) return;
    setExceptions(prev => [...prev, { date: excDate, ferme: excFerme, heure_debut: excHeureDebut, heure_fin: excHeureFin }].sort((a, b) => a.date.localeCompare(b.date)));
    setExcDate("");
    setExcFerme(true);
  }

  function removeException(date: string) {
    setExceptions(prev => prev.filter(e => e.date !== date));
  }

  function handleSave() {
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
      setTimeout(() => setSaved(false), 3000);
    });
  }

  return (
    <div className="space-y-4 max-w-2xl">
      {error && (
        <div className="bg-destructive/10 border border-destructive/30 text-destructive text-sm rounded-md px-4 py-3">{error}</div>
      )}

      <div className="bg-card border border-navy/15 rounded-[10px] p-5 space-y-3">
        <p className="text-sm font-semibold text-foreground flex items-center gap-1.5">
          <CalendarRange size={14} /> Période récurrente
        </p>
        <p className="text-xs text-muted-foreground -mt-1.5">
          Rien d&apos;indiqué = vos annonces restent ouvertes à n&apos;importe quelle date (comportement par défaut).
        </p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] text-muted-foreground mb-1">Du</label>
            <Input type="date" value={plageDebut} onChange={e => setPlageDebut(e.target.value)} className="bg-card border-navy/15 h-10" />
          </div>
          <div>
            <label className="block text-[11px] text-muted-foreground mb-1">Au</label>
            <Input type="date" value={plageFin} min={plageDebut || undefined} onChange={e => setPlageFin(e.target.value)} className="bg-card border-navy/15 h-10" />
          </div>
        </div>
        {plageDebut && plageFin && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] text-muted-foreground mb-1">Disponible à partir de</label>
                <Input type="time" value={plageHeureDebut} onChange={e => setPlageHeureDebut(e.target.value)} className="bg-card border-navy/15 h-10" />
              </div>
              <div>
                <label className="block text-[11px] text-muted-foreground mb-1">Jusqu&apos;à</label>
                <Input type="time" value={plageHeureFin} onChange={e => setPlageHeureFin(e.target.value)} className="bg-card border-navy/15 h-10" />
              </div>
            </div>
            <div>
              <label className="block text-[11px] text-muted-foreground mb-1.5">
                Jours de la semaine (aucun coché = tous les jours de la période)
              </label>
              <div className="flex flex-wrap gap-1.5">
                {JOURS_LABELS.map((label, j) => (
                  <button key={j} type="button" onClick={() => toggleJour(j)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer border ${
                      plageJours.includes(j) ? "bg-primary text-primary-foreground border-primary" : "bg-card text-muted-foreground border-navy/15 hover:text-foreground"
                    }`}
                  >{label}</button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      <div className="bg-card border border-navy/15 rounded-[10px] p-5 space-y-3">
        <p className="text-sm font-semibold text-foreground flex items-center gap-1.5">
          <Ban size={14} /> Exceptions ponctuelles
        </p>
        <p className="text-xs text-muted-foreground -mt-1.5">
          Une date fermée malgré la période ci-dessus, ou au contraire un jour libre en plus.
        </p>
        <div className="flex flex-wrap items-end gap-2">
          <div>
            <label className="block text-[11px] text-muted-foreground mb-1">Date</label>
            <Input type="date" value={excDate} onChange={e => setExcDate(e.target.value)} className="bg-card border-navy/15 h-10 w-40" />
          </div>
          <div className="flex rounded-md border border-navy/15 overflow-hidden h-10">
            <button type="button" onClick={() => setExcFerme(true)}
              className={`px-3 text-xs font-semibold cursor-pointer transition-colors ${excFerme ? "bg-red-500 text-white" : "bg-card text-muted-foreground hover:text-foreground"}`}>
              Fermé
            </button>
            <button type="button" onClick={() => setExcFerme(false)}
              className={`px-3 text-xs font-semibold cursor-pointer transition-colors border-l border-border ${!excFerme ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:text-foreground"}`}>
              Ouvert
            </button>
          </div>
          {!excFerme && (
            <>
              <Input type="time" value={excHeureDebut} onChange={e => setExcHeureDebut(e.target.value)} className="bg-card border-navy/15 h-10 w-28" />
              <Input type="time" value={excHeureFin} onChange={e => setExcHeureFin(e.target.value)} className="bg-card border-navy/15 h-10 w-28" />
            </>
          )}
          <button type="button" onClick={addException} disabled={!excDate}
            className="flex items-center gap-1 h-10 px-3.5 rounded-lg border border-navy/15 text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors disabled:opacity-40 cursor-pointer">
            <Plus size={14} /> Ajouter
          </button>
        </div>
        {exceptions.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {exceptions.map(e => (
              <span key={e.date} className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold ${e.ferme ? "bg-red-50 text-red-700" : "bg-primary/10 text-primary"}`}>
                {new Date(e.date + "T12:00:00Z").toLocaleDateString("fr-BE", { day: "numeric", month: "short", year: "numeric" })}
                {e.ferme ? " · fermé" : ` · ${e.heure_debut}-${e.heure_fin}`}
                <button type="button" onClick={() => removeException(e.date)} className="cursor-pointer hover:opacity-70">
                  <X size={12} />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center gap-3">
        <button type="button" onClick={handleSave} disabled={isPending}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-[#e6a800] transition-colors cursor-pointer disabled:opacity-50">
          {isPending ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
          {isPending ? "Enregistrement..." : "Enregistrer"}
        </button>
        {saved && <span className="text-xs font-semibold text-emerald-600">Enregistré ✓</span>}
      </div>
    </div>
  );
}
