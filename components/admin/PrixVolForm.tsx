"use client";

import { useState, useTransition } from "react";
import { updatePrixVol } from "@/lib/actions/settings";
import { calculerPrixClient } from "@/lib/pilote-pricing";
import { Check, Loader2 } from "lucide-react";

const DUREES = [30, 60, 90, 120] as const;

interface Props {
  coutAvionHeure: number;
  partType: "pourcentage" | "montant";
  partValeur: number;
  acomptePersoHeure: number;
}

export function PrixVolForm({ coutAvionHeure, partType: initialType, partValeur: initialValeur, acomptePersoHeure }: Props) {
  const [partType, setPartType] = useState<"pourcentage" | "montant">(initialType);
  const [partValeur, setPartValeur] = useState(String(initialValeur));
  const [acompte, setAcompte] = useState(String(acomptePersoHeure));
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const valeurNum = parseFloat(partValeur) || 0;
  const prixHeureCalcule = calculerPrixClient(coutAvionHeure, 60, partType, valeurNum);

  function handleSave() {
    setError(""); setSaved(false);
    startTransition(async () => {
      const result = await updatePrixVol(partType, valeurNum, parseFloat(acompte));
      if (result.error) setError(result.error);
      else { setSaved(true); setTimeout(() => setSaved(false), 2500); }
    });
  }

  return (
    <div className="card-premium p-6 space-y-5">
      <div>
        <h2 className="text-base font-semibold text-foreground">Prix des vols</h2>
        <p className="text-xs text-muted-foreground mt-1">
          Prix client = coût avion (tarif actuel ci-dessous) moins ta part. Calculé automatiquement,
          sert de base pour chaque pack (30 / 60 / 90 / 120 min).
        </p>
      </div>

      {coutAvionHeure <= 0 && (
        <p className="text-xs text-destructive bg-destructive/10 border border-destructive/30 rounded-lg px-3 py-2">
          Aucun tarif avion actif — ajoute-en un dans &quot;Tarif avion&quot; ci-dessous avant de configurer le prix.
        </p>
      )}

      <div className="flex items-end gap-3 flex-wrap">
        <div className="flex-1 min-w-[140px] max-w-[180px]">
          <label className="block text-xs font-medium text-muted-foreground mb-1.5">
            Ma part
          </label>
          <div className="flex h-10 rounded-lg border border-input bg-background overflow-hidden focus-within:ring-2 focus-within:ring-ring">
            <input
              type="number"
              value={partValeur}
              min={0}
              step={1}
              onChange={e => { setPartValeur(e.target.value); setSaved(false); }}
              className="w-full px-3 text-sm bg-transparent focus:outline-none"
            />
            <button
              type="button"
              onClick={() => { setPartType(t => t === "pourcentage" ? "montant" : "pourcentage"); setSaved(false); }}
              className="px-2.5 text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted transition-colors border-l border-input cursor-pointer shrink-0"
            >
              {partType === "pourcentage" ? "%" : "€"}
            </button>
          </div>
        </div>

        <div className="flex-1 min-w-[140px] max-w-[180px]">
          <label className="block text-xs font-medium text-muted-foreground mb-1.5">
            Prix client (calculé)
          </label>
          <div className="h-10 px-3 flex items-center rounded-lg border border-border bg-secondary/50 text-sm font-semibold text-foreground">
            {prixHeureCalcule} €/h
          </div>
        </div>

        <div className="flex-1 max-w-[220px]">
          <label className="block text-xs font-medium text-muted-foreground mb-1.5">
            Provision vol sur mesure (€/60 min)
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
          disabled={isPending || coutAvionHeure <= 0 || prixHeureCalcule <= 0}
          className="h-10 px-5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors flex items-center gap-2 cursor-pointer"
        >
          {isPending ? <Loader2 size={14} className="animate-spin" /> : saved ? <Check size={14} /> : null}
          {saved ? "Enregistré" : "Enregistrer"}
        </button>
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}

      {/* Aperçu des 4 packs */}
      {prixHeureCalcule > 0 && (
        <div className="border border-border rounded-xl overflow-hidden">
          <div className="px-4 py-2.5 bg-secondary/50 border-b border-border">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Aperçu des prix</p>
          </div>
          <div className="divide-y divide-border">
            {DUREES.map(d => (
              <div key={d} className="flex items-center justify-between px-4 py-2.5">
                <span className="text-sm text-foreground">{d} minutes</span>
                <span className="text-sm font-bold text-primary">{Math.round((prixHeureCalcule / 60) * d)} €</span>
              </div>
            ))}
          </div>
          <p className="px-4 py-2.5 text-[11px] text-muted-foreground border-t border-border bg-secondary/30">
            Les fiches produit actives (/nos-offres, /vols/…) sont mises à jour automatiquement
            avec ces prix à l&apos;enregistrement.
          </p>
        </div>
      )}
    </div>
  );
}
