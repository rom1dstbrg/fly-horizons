"use client";

import { useState } from "react";
import { Banknote, Check } from "lucide-react";
import { Button, FormField, Input } from "@/components/pilote/studio";

export type PaiementMode = "virement" | "especes";

// Confirmation d'un paiement reçu (demande de Romain, 27/09) : « Marquer comme
// reçu » ou « En espèces » n'enregistrent plus tout de suite, ils ouvrent ce
// petit formulaire avec le montant prévu, modifiable, puis « Confirmer ».
// Une seule source : Transactions et le tiroir d'un vol (Règlement) l'utilisent.
export function PaiementRecuForm({ mode, montantPrevu, loading, onCancel, onConfirm }: {
  mode: PaiementMode;
  montantPrevu: number;
  loading?: boolean;
  onCancel: () => void;
  onConfirm: (montant: number) => void;
}) {
  const [valeur, setValeur] = useState(String(montantPrevu).replace(".", ","));
  const montant = Number(valeur.replace(",", ".").replace(/\s/g, ""));
  const valide = Number.isFinite(montant) && montant > 0 && montant <= 100000;
  const change = valide && Math.round(montant * 100) / 100 !== montantPrevu;
  const Icon = mode === "especes" ? Banknote : Check;

  return (
    <form
      className="space-y-3 rounded-[16px] bg-st-surface p-3.5"
      onSubmit={(e) => { e.preventDefault(); if (valide) onConfirm(montant); }}
    >
      <p className="flex items-center gap-2 text-[13px] font-semibold text-st-text">
        <Icon size={15} />
        {mode === "especes" ? "Paiement reçu en espèces" : "Paiement reçu par virement"}
      </p>
      <FormField
        id="montant-recu"
        label="Montant reçu"
        error={valeur && !valide ? "Montant invalide" : undefined}
        hint={change
          ? `Prévu : ${montantPrevu.toLocaleString("fr-BE")} €. Le montant du passager sera corrigé.`
          : "Modifiez-le si le passager a payé une autre somme."}
      >
        <div className="relative">
          <Input
            id="montant-recu"
            inputMode="decimal"
            autoFocus
            value={valeur}
            onChange={(e) => setValeur(e.target.value)}
            aria-invalid={!!valeur && !valide}
            className="st-num pr-9 font-semibold"
          />
          <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-sm text-st-muted">€</span>
        </div>
      </FormField>
      <div className="grid grid-cols-[auto_1fr] gap-2">
        <Button variant="secondary" onClick={onCancel} disabled={loading}>Annuler</Button>
        <Button type="submit" loading={loading} disabled={!valide}>Confirmer</Button>
      </div>
    </form>
  );
}
