"use client";

import { useState, useTransition } from "react";
import { updatePrixVol } from "@/lib/actions/settings";
import { Check, Loader2 } from "lucide-react";

const DUREES = [30, 60, 90, 120] as const;

export function PrixVolForm({ prixHeure, acomptePersoHeure }: { prixHeure: number; acomptePersoHeure: number }) {
  const [prix, setPrix] = useState(String(prixHeure));
  const [acompte, setAcompte] = useState(String(acomptePersoHeure));
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const preview = parseFloat(prix) || 0;

  function handleSave() {
    setError(""); setSaved(false);
    startTransition(async () => {
      const result = await updatePrixVol(parseFloat(prix), parseFloat(acompte));
      if (result.error) setError(result.error);
      else { setSaved(true); setTimeout(() => setSaved(false), 2500); }
    });
  }

  return (
    <div className="card-premium p-6 space-y-5">
      <div>
        <h2 className="text-base font-semibold text-foreground">Prix des vols</h2>
        <p className="text-xs text-muted-foreground mt-1">
          Le tarif horaire sert de base pour calculer le prix de chaque pack (30 / 60 / 90 / 120 min).
        </p>
      </div>

      <div className="flex items-end gap-3 flex-wrap">
        <div className="flex-1 max-w-[180px]">
          <label className="block text-xs font-medium text-muted-foreground mb-1.5">
            Prix à l&apos;heure (€)
          </label>
          <div className="relative">
            <input
              type="number"
              value={prix}
              min={1}
              step={1}
              onChange={e => { setPrix(e.target.value); setSaved(false); }}
              className="w-full h-10 pl-3 pr-8 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="254"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">€/h</span>
          </div>
        </div>

        <div className="flex-1 max-w-[220px]">
          <label className="block text-xs font-medium text-muted-foreground mb-1.5">
            Acompte vol sur mesure (€/60 min)
          </label>
          <div className="relative">
            <input
              type="number"
              value={acompte}
              min={0}
              step={1}
              onChange={e => { setAcompte(e.target.value); setSaved(false); }}
              className="w-full h-10 pl-3 pr-8 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="150"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">€</span>
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={isPending || !prix || parseFloat(prix) <= 0}
          className="h-10 px-5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors flex items-center gap-2"
        >
          {isPending ? <Loader2 size={14} className="animate-spin" /> : saved ? <Check size={14} /> : null}
          {saved ? "Enregistré" : "Enregistrer"}
        </button>
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}

      {/* Aperçu des 4 packs */}
      {preview > 0 && (
        <div className="border border-border rounded-xl overflow-hidden">
          <div className="px-4 py-2.5 bg-secondary/50 border-b border-border">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Aperçu des prix</p>
          </div>
          <div className="divide-y divide-border">
            {DUREES.map(d => (
              <div key={d} className="flex items-center justify-between px-4 py-2.5">
                <span className="text-sm text-foreground">{d} minutes</span>
                <span className="text-sm font-bold text-primary">{Math.round((preview / 60) * d)} €</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
