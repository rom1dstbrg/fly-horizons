"use client";

import { X } from "lucide-react";
import { aircraftByReg, type AerodromeInput, type MassBalanceInputs, type PerfInputs } from "@/lib/mass-balance/da40-calc";
import { PerfInputsSection } from "./PerfSection";

// ── Popup de saisie — Performances (aérodromes, météo, pistes, TODA/LDA) ──
// Le chargement (avion, carburant, occupants) est saisi directement dans la
// carte de la page principale — plus besoin de popup pour cette partie.

export function MbEditModal({
  inputs,
  onClose,
  patchAero,
  patchPerf,
}: {
  inputs: MassBalanceInputs;
  onClose: () => void;
  patchAero: (which: "dep" | "dest" | "alt", p: Partial<AerodromeInput>) => void;
  patchPerf: (p: Partial<Pick<PerfInputs, "toda" | "ldaDest" | "ldaAlt">>) => void;
}) {
  const [reg] = aircraftByReg(inputs.aircraftReg);

  return (
    <div className="fixed inset-0 z-[200] bg-black/50 flex items-end sm:items-center justify-center">
      <div className="w-full sm:max-w-xl sm:mx-4 bg-card rounded-t-2xl sm:rounded-2xl shadow-xl max-h-[92vh] sm:max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-border shrink-0">
          <p className="text-sm font-bold text-foreground">Feuille de vol — {reg} — Performances</p>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer"
            aria-label="Fermer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto p-5 space-y-4">
          <PerfInputsSection perf={inputs.perf} onChangeAero={patchAero} onChange={patchPerf} />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-border shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="h-9 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-[#e6a800] transition-colors cursor-pointer"
          >
            Terminer
          </button>
        </div>
      </div>
    </div>
  );
}
