"use client";

import { useState } from "react";
import { aircraftByReg, type MassBalanceInputs } from "@/lib/mass-balance/da40-calc";
import { AIRCRAFT, ARM, BAG_MAX, FUEL_MAX_GAL } from "@/lib/mass-balance/da40-data";
import { Button } from "@/components/pilote/studio";
import { cn } from "@/lib/utils";
import { MB, Stepper } from "./fields";

// ── Chargement saisi sur l'avion vu de dessus (maquette v2 validée, 24/09) ──
// Même logique que ForeFlight / Garmin Pilot : on touche une place (siège,
// bagages, réservoir) et le compteur sous l'avion passe sur cette place.
// Les positions sont en coordonnées du dessin (390 × 380), converties en %.

type StationId = "pilot" | "fpax" | "rpax1" | "rpax2" | "bag" | "fuel" | "trip";

type Station = {
  id: StationId;
  label: string;
  /** Nom complet dans la barre de saisie. */
  name: string;
  detail: string;
  unit: "kg" | "gal";
  box: [x: number, y: number, w: number, h: number];
  step: number;
};

const fr = (v: number, d = 2) => v.toLocaleString("fr-FR", { minimumFractionDigits: d, maximumFractionDigits: d });

const STATIONS: Station[] = [
  { id: "pilot", label: "Pilote", name: "Pilote", detail: `siège avant gauche · bras ${fr(ARM.front)} m`, unit: "kg", box: [128, 92, 64, 56], step: 1 },
  { id: "fpax", label: "Passager", name: "Passager avant", detail: `siège avant droit · bras ${fr(ARM.front)} m`, unit: "kg", box: [198, 92, 64, 56], step: 1 },
  { id: "rpax1", label: "Passager", name: "Passager arrière gauche", detail: `bras ${fr(ARM.rear)} m`, unit: "kg", box: [128, 158, 64, 56], step: 1 },
  { id: "rpax2", label: "Passager", name: "Passager arrière droit", detail: `bras ${fr(ARM.rear)} m`, unit: "kg", box: [198, 158, 64, 56], step: 1 },
  { id: "bag", label: "Bagages", name: "Bagages", detail: `max ${BAG_MAX} kg · bras ${fr(ARM.bag)} m`, unit: "kg", box: [150, 226, 90, 44], step: 1 },
  { id: "fuel", label: "Carburant", name: "Carburant embarqué", detail: `max ${FUEL_MAX_GAL} gal · bras ${fr(ARM.fuel)} m`, unit: "gal", box: [14, 120, 100, 50], step: 0.5 },
  { id: "trip", label: "Consommé", name: "Carburant consommé en vol", detail: "pour le point d'atterrissage", unit: "gal", box: [276, 120, 100, 50], step: 0.5 },
];

const valueOf = (inputs: MassBalanceInputs, id: StationId): number =>
  id === "fuel" ? inputs.fuelGal : id === "trip" ? inputs.tripGal : inputs[id];

const patchFor = (id: StationId, v: number): Partial<MassBalanceInputs> =>
  id === "fuel" ? { fuelGal: v } : id === "trip" ? { tripGal: v } : { [id]: v };

function isBad(inputs: MassBalanceInputs, id: StationId): boolean {
  if (id === "bag") return inputs.bag > BAG_MAX;
  if (id === "fuel") return inputs.fuelGal > FUEL_MAX_GAL;
  if (id === "trip") return inputs.tripGal > inputs.fuelGal;
  return false;
}

// Silhouette DA40 simplifiée : ailes, empennage, fuselage, verrière.
function Silhouette() {
  return (
    <svg viewBox="0 0 390 380" aria-hidden="true" className="absolute inset-0 h-full w-full">
      <path d="M6 132 Q6 124 14 123 L376 123 Q384 124 384 132 L384 162 Q384 170 376 170 L14 170 Q6 170 6 162 Z" fill="#eef1f5" stroke="#dfe3ea" />
      <path d="M126 342 L264 342 Q270 342 270 348 L270 356 Q270 362 264 362 L126 362 Q120 362 120 356 L120 348 Q120 342 126 342 Z" fill="#eef1f5" stroke="#dfe3ea" />
      <path
        d="M195 8 C170 8 124 40 120 80 L118 250 C118 300 184 350 188 372 L202 372 C206 350 272 300 272 250 L270 80 C266 40 220 8 195 8 Z"
        fill="#ffffff"
        stroke="#d6dbe3"
        strokeWidth={1.5}
      />
      <path d="M195 24 C176 24 140 50 136 84" fill="none" stroke="#c9d3df" strokeWidth={1.2} strokeDasharray="3 4" />
      <path d="M195 24 C214 24 250 50 254 84" fill="none" stroke="#c9d3df" strokeWidth={1.2} strokeDasharray="3 4" />
      <text x="195" y="48" textAnchor="middle" fontSize="10" fill="#9aa0ac">avant</text>
    </svg>
  );
}

export function MbAircraftLoad({
  inputs,
  patch,
  computedFuelL,
  computedFuelKg,
  maxWidth = 320,
}: {
  inputs: MassBalanceInputs;
  patch: (p: Partial<MassBalanceInputs>) => void;
  computedFuelL: number;
  computedFuelKg: number;
  /** Largeur maximale du dessin (px). */
  maxWidth?: number;
}) {
  const [sel, setSel] = useState<StationId>("pilot");
  const [reg, bem] = aircraftByReg(inputs.aircraftReg);
  const current = STATIONS.find((s) => s.id === sel)!;
  const v = valueOf(inputs, sel);
  const fuelPct = Math.min(100, (inputs.fuelGal / FUEL_MAX_GAL) * 100);

  return (
    <div className="flex h-full flex-col">
      {/* En-tête : avion + date */}
      <div className="flex items-center justify-between gap-2 px-4 pt-4 sm:px-5">
        <h2 className="text-sm font-semibold text-st-text">Chargement et carburant</h2>
        <div className="flex items-center gap-2">
          <input
            type="date"
            aria-label="Date du vol"
            value={inputs.flightDate}
            onChange={(e) => patch({ flightDate: e.target.value })}
            className={`h-[34px] w-[140px] px-2 ${MB.input} sm:text-[12.5px]`}
          />
          <select
            aria-label="Avion"
            value={inputs.aircraftReg}
            onChange={(e) => patch({ aircraftReg: e.target.value })}
            className={`h-[34px] cursor-pointer px-2 font-semibold ${MB.input} sm:text-[12.5px]`}
          >
            {AIRCRAFT.map(([r]) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>
      </div>

      {/* L'avion */}
      <div className="flex flex-1 items-center justify-center px-3 py-2">
        <div className="relative w-full" style={{ maxWidth, aspectRatio: "390 / 380" }}>
          <Silhouette />
          {STATIONS.map((s) => {
            const val = valueOf(inputs, s.id);
            const empty = val === 0 && s.unit === "kg" && s.id !== "pilot";
            const [x, y, w, h] = s.box;
            const bad = isBad(inputs, s.id);
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setSel(s.id)}
                aria-pressed={sel === s.id}
                aria-label={`${s.name} : ${val} ${s.unit}`}
                style={{ left: `${(x / 390) * 100}%`, top: `${(y / 380) * 100}%`, width: `${(w / 390) * 100}%`, height: `${(h / 380) * 100}%` }}
                className={cn(
                  "absolute flex cursor-pointer flex-col items-center justify-center rounded-[12px] border-[1.5px] bg-white px-1 leading-tight transition-[border-color,box-shadow] duration-150",
                  empty ? "border-dashed border-st-line-strong bg-white/70" : "border-st-line-strong",
                  sel === s.id && "border-st-ink shadow-[0_0_0_4px_var(--color-st-ink-soft)]",
                  bad && "border-st-bad",
                )}
              >
                <span className="text-[10px] font-medium text-st-muted">{s.label}</span>
                {empty ? (
                  <span className="text-[11.5px] font-medium text-st-muted">+ ajouter</span>
                ) : (
                  <span className={cn("st-num text-[15px] font-semibold", bad ? "text-st-bad" : "text-st-text")}>
                    {s.unit === "gal" ? fr(val, val % 1 ? 1 : 0) : val}
                    <span className="ml-px text-[10.5px] font-medium text-st-muted">{s.unit}</span>
                  </span>
                )}
                {s.id === "fuel" && (
                  <span className="mt-1 block h-[5px] w-[80%] overflow-hidden rounded-full bg-st-surface-hover">
                    <span className="block h-full rounded-full bg-st-ink" style={{ width: `${fuelPct}%` }} />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* La place choisie : un seul compteur, sous l'avion */}
      <div className="border-t border-st-line px-4 py-3 sm:px-5">
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13.5px] font-semibold text-st-text">{current.name}</p>
            <p className="truncate text-[11.5px] text-st-muted">{current.detail}</p>
          </div>
          {sel === "fuel" && (
            <Button variant="secondary" size="sm" className="h-11 sm:h-10" onClick={() => patch({ fuelGal: FUEL_MAX_GAL })}>
              Plein
            </Button>
          )}
          <Stepper
            label={current.name}
            unit={current.unit}
            step={current.step}
            value={v}
            onChange={(n) => patch(patchFor(sel, n))}
            bad={isBad(inputs, sel)}
          />
        </div>
        {sel === "fuel" && (
          <input
            type="range"
            aria-label="Carburant embarqué (gal)"
            min={0}
            max={FUEL_MAX_GAL}
            step={0.5}
            value={Math.min(inputs.fuelGal, FUEL_MAX_GAL)}
            onChange={(e) => patch({ fuelGal: Number(e.target.value) })}
            className="mt-3 h-2 w-full cursor-pointer appearance-none rounded-full [&::-webkit-slider-thumb]:h-6 [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-st-ink [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow"
            style={{ background: `linear-gradient(to right, var(--color-st-ink) ${fuelPct}%, var(--color-st-surface-hover) ${fuelPct}%)` }}
          />
        )}
        <p className="mt-2 text-[11.5px] text-st-muted">
          {reg} · masse à vide {fr(bem, 1)} kg · carburant {fr(computedFuelL, 0)} l / {fr(computedFuelKg, 1)} kg · roulage − 1,5 kg
        </p>
      </div>
    </div>
  );
}
