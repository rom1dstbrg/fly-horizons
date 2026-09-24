"use client";

import { Fuel } from "lucide-react";
import { aircraftByReg, type MassBalanceInputs } from "@/lib/mass-balance/da40-calc";
import { AIRCRAFT, ARM, BAG_MAX, FUEL_MAX_GAL } from "@/lib/mass-balance/da40-data";
import { Button } from "@/components/pilote/studio";
import { MB, Stepper } from "./fields";

// ── Saisie du chargement (« Studio », 24/09) ─────────────────────────────
// Pensée pour le pouce, sur le tarmac : chaque poids au − / + (la valeur reste
// tapable), le carburant au curseur avec « Plein » en un tap. Le résultat
// (enveloppe, tableau) s'affiche dans la carte voisine.

function fr(v: number, d = 1): string {
  return v.toLocaleString("fr-FR", { minimumFractionDigits: d, maximumFractionDigits: d });
}

function Row({ label, sub, children }: { label: string; sub: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 py-2 [&+&]:border-t [&+&]:border-st-line-soft">
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13.5px] font-[550] text-st-text">{label}</p>
        <p className="truncate text-[11.5px] text-st-muted">{sub}</p>
      </div>
      {children}
    </div>
  );
}

const arm = (m: number) => `${fr(m, 2)} m`;

export function ChargementFields({
  inputs,
  computedFuelL,
  computedFuelKg,
  patch,
}: {
  inputs: MassBalanceInputs;
  computedFuelL: number;
  computedFuelKg: number;
  patch: (p: Partial<MassBalanceInputs>) => void;
}) {
  const [reg, bem, bemArm] = aircraftByReg(inputs.aircraftReg);
  const fuelPct = Math.min(100, (inputs.fuelGal / FUEL_MAX_GAL) * 100);

  return (
    <div className="space-y-4">
      {/* Avion & date */}
      <div className="space-y-1.5">
        <div className="grid grid-cols-2 gap-2">
          <label className="min-w-0">
            <span className={`mb-1 block ${MB.label}`}>Avion</span>
            <select
              value={inputs.aircraftReg}
              onChange={(e) => patch({ aircraftReg: e.target.value })}
              className={`w-full cursor-pointer px-2.5 font-semibold ${MB.input}`}
            >
              {AIRCRAFT.map(([r]) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </label>
          <label className="min-w-0">
            <span className={`mb-1 block ${MB.label}`}>Date du vol</span>
            <input
              type="date"
              value={inputs.flightDate}
              onChange={(e) => patch({ flightDate: e.target.value })}
              className={`w-full px-2.5 ${MB.input}`}
            />
          </label>
        </div>
        <p className={MB.help}>
          {reg} · masse à vide <span className="st-num">{fr(bem)}</span> kg · bras <span className="st-num">{fr(bemArm, 3)}</span> m
        </p>
      </div>

      {/* Occupants & bagages */}
      <div>
        <p className={MB.groupLabel}>Occupants &amp; bagages</p>
        <div className="mt-1">
          <Row label="Pilote" sub={`siège avant · ${arm(ARM.front)}`}>
            <Stepper label="Pilote" value={inputs.pilot} onChange={(v) => patch({ pilot: v })} />
          </Row>
          <Row label="Passager avant" sub={arm(ARM.front)}>
            <Stepper label="Passager avant" value={inputs.fpax} onChange={(v) => patch({ fpax: v })} />
          </Row>
          <Row label="Arrière 1" sub={arm(ARM.rear)}>
            <Stepper label="Arrière 1" value={inputs.rpax1} onChange={(v) => patch({ rpax1: v })} />
          </Row>
          <Row label="Arrière 2" sub={arm(ARM.rear)}>
            <Stepper label="Arrière 2" value={inputs.rpax2} onChange={(v) => patch({ rpax2: v })} />
          </Row>
          <Row label="Bagages" sub={`max ${BAG_MAX} kg · ${arm(ARM.bag)}`}>
            <Stepper label="Bagages" value={inputs.bag} onChange={(v) => patch({ bag: v })} bad={inputs.bag > BAG_MAX} />
          </Row>
        </div>
      </div>

      {/* Carburant */}
      <div className="border-t border-st-line-soft pt-3">
        <div className="flex items-center justify-between gap-2">
          <p className={`flex items-center gap-1.5 ${MB.groupLabel}`}>
            <Fuel size={15} className="text-st-text-2" /> Carburant
          </p>
          <p className="st-num text-[13px] text-st-muted">
            <b className={`text-[15px] font-semibold ${inputs.fuelGal > FUEL_MAX_GAL ? "text-st-bad" : "text-st-text"}`}>{fr(inputs.fuelGal, 1)}</b> / {FUEL_MAX_GAL} gal
          </p>
        </div>
        <input
          type="range"
          aria-label="Carburant embarqué (gal)"
          min={0}
          max={FUEL_MAX_GAL}
          step={0.5}
          value={Math.min(inputs.fuelGal, FUEL_MAX_GAL)}
          onChange={(e) => patch({ fuelGal: Number(e.target.value) })}
          className="mt-3 h-2 w-full cursor-pointer appearance-none rounded-full bg-st-surface-hover accent-st-ink [&::-webkit-slider-thumb]:h-6 [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-st-ink [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow"
          style={{ background: `linear-gradient(to right, var(--color-st-ink) ${fuelPct}%, var(--color-st-surface-hover) ${fuelPct}%)` }}
        />
        <div className="mt-3 flex items-center gap-2">
          <Stepper label="Carburant embarqué" unit="gal" step={0.5} value={inputs.fuelGal} onChange={(v) => patch({ fuelGal: v })} bad={inputs.fuelGal > FUEL_MAX_GAL} />
          <Button variant="secondary" size="sm" className="h-11 flex-1 sm:h-10" onClick={() => patch({ fuelGal: FUEL_MAX_GAL })}>
            Plein {FUEL_MAX_GAL} gal
          </Button>
        </div>
        <Row label="Consommé en vol" sub="pour le point d'atterrissage">
          <Stepper label="Carburant consommé" unit="gal" step={0.5} value={inputs.tripGal} onChange={(v) => patch({ tripGal: v })} bad={inputs.tripGal > inputs.fuelGal} />
        </Row>
        <p className={MB.help}>
          Embarqué {fr(computedFuelL, 0)} l · {fr(computedFuelKg, 1)} kg · roulage − 1,5 kg
        </p>
      </div>
    </div>
  );
}
