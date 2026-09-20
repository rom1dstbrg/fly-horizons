"use client";

import { aircraftByReg, type MassBalanceInputs } from "@/lib/mass-balance/da40-calc";
import { AIRCRAFT, FUEL_MAX_GAL } from "@/lib/mass-balance/da40-data";
import { MB, ValueRow } from "./fields";

// ── Saisie chargement — carte permanente (plus un popup) ─────────────────
// Avion, date, carburant, occupants & bagages. Le résultat (tableau,
// enveloppe) s'affiche à côté, dans la carte voisine.

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

  return (
    <div className="space-y-4">
      <Group label="Avion & date">
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
      </Group>

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
            Plein max {FUEL_MAX_GAL} gal · embarqué {fr(computedFuelL, 0)} l / {fr(computedFuelKg, 1)} kg · roulage
            − 1,5 kg.
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
    </div>
  );
}
