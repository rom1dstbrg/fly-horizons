"use client";

import { X, ChevronLeft, ChevronRight } from "lucide-react";
import {
  aircraftByReg,
  type MassBalanceInputs,
  type AerodromeInput,
  type PerfInputs,
} from "@/lib/mass-balance/da40-calc";
import { AIRCRAFT, FUEL_MAX_GAL } from "@/lib/mass-balance/da40-data";
import { MB, ValueRow } from "./fields";
import { PerfInputsSection } from "./PerfSection";

// ── Popup de saisie — deux parties, même logique visuelle ───────────────────
// 1 · Chargement (avion, date, carburant, occupants & bagages)
// 2 · Performances (aérodromes, météo, pistes, TODA/LDA)
// La page principale (MassBalanceClient) n'affiche plus ces champs bruts :
// seulement le résultat (tableau, enveloppe, blocs de performances). Modifier
// passe systématiquement par ici.

type Tab = "chargement" | "performances";

function fr(v: number, d = 1): string {
  return v.toLocaleString("fr-FR", { minimumFractionDigits: d, maximumFractionDigits: d });
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <p className={MB.groupLabel}>{label}</p>
      {children}
    </div>
  );
}

function TabPill({ n, label, active, onClick }: { n: number; label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-2 h-8 px-3.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
        active ? "bg-navy text-white" : "bg-secondary text-muted-foreground hover:text-foreground"
      }`}
    >
      <span
        className={`flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold ${
          active ? "bg-white/20 text-white" : "bg-border text-muted-foreground"
        }`}
      >
        {n}
      </span>
      {label}
    </button>
  );
}

export function MbEditModal({
  inputs,
  computedFuelL,
  computedFuelKg,
  tab,
  onTabChange,
  onClose,
  patch,
  patchAero,
  patchPerf,
}: {
  inputs: MassBalanceInputs;
  computedFuelL: number;
  computedFuelKg: number;
  tab: Tab;
  onTabChange: (t: Tab) => void;
  onClose: () => void;
  patch: (p: Partial<MassBalanceInputs>) => void;
  patchAero: (which: "dep" | "dest" | "alt", p: Partial<AerodromeInput>) => void;
  patchPerf: (p: Partial<Pick<PerfInputs, "toda" | "ldaDest" | "ldaAlt">>) => void;
}) {
  const [reg, bem, bemArm] = aircraftByReg(inputs.aircraftReg);

  return (
    <div className="fixed inset-0 z-[200] bg-black/50 flex items-end sm:items-center justify-center">
      <div className="w-full sm:max-w-xl sm:mx-4 bg-card rounded-t-2xl sm:rounded-2xl shadow-xl max-h-[92vh] sm:max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-border shrink-0">
          <p className="text-sm font-bold text-foreground">Feuille de vol — {reg}</p>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer"
            aria-label="Fermer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 px-5 pt-4 shrink-0">
          <TabPill n={1} label="Chargement" active={tab === "chargement"} onClick={() => onTabChange("chargement")} />
          <TabPill n={2} label="Performances" active={tab === "performances"} onClick={() => onTabChange("performances")} />
        </div>

        {/* Body */}
        <div className="overflow-y-auto p-5 space-y-4">
          {tab === "chargement" ? (
            <>
              <div className="flex flex-wrap items-end gap-4">
                <label className="space-y-1">
                  <span className={`block ${MB.label}`}>Avion</span>
                  <select
                    value={inputs.aircraftReg}
                    onChange={(e) => patch({ aircraftReg: e.target.value })}
                    className={`${MB.input} px-2.5 cursor-pointer`}
                  >
                    {AIRCRAFT.map(([r]) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="space-y-1">
                  <span className={`block ${MB.label}`}>Date du vol</span>
                  <input
                    type="date"
                    value={inputs.flightDate}
                    onChange={(e) => patch({ flightDate: e.target.value })}
                    className={`${MB.input} px-2.5`}
                  />
                </label>
              </div>
              <p className={MB.help}>
                {reg} — masse à vide <span className="font-mono">{fr(bem)}</span> kg · bras{" "}
                <span className="font-mono">{fr(bemArm, 3)}</span> m
              </p>

              <div className="border-t border-border pt-3">
                <Group label="Carburant">
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                    <ValueRow
                      label="Plein"
                      sub="gal"
                      value={inputs.fuelGal}
                      onChange={(v) => patch({ fuelGal: v })}
                      step={0.5}
                      bad={inputs.fuelGal > FUEL_MAX_GAL}
                    />
                    <ValueRow
                      label="Trajet"
                      sub="gal"
                      value={inputs.tripGal}
                      onChange={(v) => patch({ tripGal: v })}
                      step={0.5}
                      bad={inputs.tripGal > inputs.fuelGal}
                    />
                  </div>
                  <p className={MB.help}>
                    Plein max {FUEL_MAX_GAL} gal · embarqué {fr(computedFuelL, 0)} l / {fr(computedFuelKg, 1)} kg ·
                    roulage − 1,5 kg.
                  </p>
                </Group>
              </div>

              <div className="border-t border-border pt-3">
                <Group label="Occupants & bagages">
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                    <ValueRow label="Pilote" sub="2,30 m" value={inputs.pilot} onChange={(v) => patch({ pilot: v })} />
                    <ValueRow label="Pax avant" sub="2,30 m" value={inputs.fpax} onChange={(v) => patch({ fpax: v })} />
                    <ValueRow label="Pax arrière 1" sub="3,25 m" value={inputs.rpax1} onChange={(v) => patch({ rpax1: v })} />
                    <ValueRow label="Pax arrière 2" sub="3,25 m" value={inputs.rpax2} onChange={(v) => patch({ rpax2: v })} />
                    <ValueRow
                      label="Bagages"
                      sub="≤ 30 · 3,65 m"
                      value={inputs.bag}
                      onChange={(v) => patch({ bag: v })}
                      bad={inputs.bag > 30}
                    />
                  </div>
                </Group>
              </div>
            </>
          ) : (
            <PerfInputsSection perf={inputs.perf} onChangeAero={patchAero} onChange={patchPerf} />
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-t border-border shrink-0">
          {tab === "chargement" ? (
            <>
              <button
                type="button"
                onClick={onClose}
                className="h-9 px-4 rounded-lg border border-border text-sm font-semibold hover:bg-secondary transition-colors cursor-pointer"
              >
                Fermer
              </button>
              <button
                type="button"
                onClick={() => onTabChange("performances")}
                className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg bg-navy text-white text-sm font-semibold hover:bg-navy/90 transition-colors cursor-pointer"
              >
                Performances
                <ChevronRight size={14} />
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => onTabChange("chargement")}
                className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg border border-border text-sm font-semibold hover:bg-secondary transition-colors cursor-pointer"
              >
                <ChevronLeft size={14} />
                Chargement
              </button>
              <button
                type="button"
                onClick={onClose}
                className="h-9 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-[#e6a800] transition-colors cursor-pointer"
              >
                Terminer
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
