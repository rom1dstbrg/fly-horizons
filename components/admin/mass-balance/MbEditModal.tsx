"use client";

import { aircraftByReg, type AerodromeInput, type MassBalanceInputs, type PerfInputs } from "@/lib/mass-balance/da40-calc";
import { Button, Sheet, SheetBody, SheetFooter, SheetHeader } from "@/components/pilote/studio";
import { PerfInputsSection } from "./PerfSection";

// ── Saisie des performances (aérodromes, météo, pistes, TODA/LDA) ─────────
// Feuille Studio : monte du bas au téléphone, panneau flottant sur le bureau.
// Le chargement se saisit directement sur la page.

export function MbEditModal({
  open,
  inputs,
  onClose,
  patchAero,
  patchPerf,
}: {
  open: boolean;
  inputs: MassBalanceInputs;
  onClose: () => void;
  patchAero: (which: "dep" | "dest" | "alt", p: Partial<AerodromeInput>) => void;
  patchPerf: (p: Partial<Pick<PerfInputs, "toda" | "ldaDest" | "ldaAlt">>) => void;
}) {
  const [reg] = aircraftByReg(inputs.aircraftReg);

  return (
    <Sheet value={open ? true : null} onClose={onClose} width="lg">
      {() => (
        <>
          <SheetHeader title="Performances" subtitle={`${reg} · conditions et pistes`} onClose={onClose} />
          <SheetBody>
            <PerfInputsSection perf={inputs.perf} onChangeAero={patchAero} onChange={patchPerf} />
          </SheetBody>
          <SheetFooter>
            <Button fullWidth size="lg" onClick={onClose}>Terminer</Button>
          </SheetFooter>
        </>
      )}
    </Sheet>
  );
}
