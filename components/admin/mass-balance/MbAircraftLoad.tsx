"use client";

import { useState } from "react";
import { Fuel, Users } from "lucide-react";
import { aircraftByReg, type MassBalanceInputs } from "@/lib/mass-balance/da40-calc";
import { AIRCRAFT, ARM, BAG_MAX, FUEL_MAX_GAL } from "@/lib/mass-balance/da40-data";
import { Button } from "@/components/pilote/studio";
import { cn } from "@/lib/utils";
import { MB, Stepper } from "./fields";

// ── Chargement saisi sur la cabine du DA40 vue de dessus (24/09) ───────────
// Même logique que ForeFlight / Garmin Pilot : on touche une place (siège,
// bagages) et le compteur sous la cabine passe sur cette place. Dessin zoomé
// sur la cabine (verrière, tableau de bord, départ des ailes) à la demande de
// Romain ; le carburant a son propre bloc en dessous. Les positions sont en
// coordonnées du dessin (360 × 330), converties en %.

type SeatId = "pilot" | "fpax" | "rpax1" | "rpax2" | "bag";

type Station = { id: SeatId; label: string; name: string; detail: string; box: [x: number, y: number, w: number, h: number]; seat: boolean };

const fr = (v: number, d = 2) => v.toLocaleString("fr-FR", { minimumFractionDigits: d, maximumFractionDigits: d });

const STATIONS: Station[] = [
  { id: "pilot", label: "Pilote", name: "Pilote", detail: `siège avant gauche · bras ${fr(ARM.front)} m`, box: [112, 88, 62, 70], seat: true },
  { id: "fpax", label: "Passager", name: "Passager avant", detail: `siège avant droit · bras ${fr(ARM.front)} m`, box: [186, 88, 62, 70], seat: true },
  { id: "rpax1", label: "Passager", name: "Passager arrière gauche", detail: `bras ${fr(ARM.rear)} m`, box: [112, 172, 62, 70], seat: true },
  { id: "rpax2", label: "Passager", name: "Passager arrière droit", detail: `bras ${fr(ARM.rear)} m`, box: [186, 172, 62, 70], seat: true },
  { id: "bag", label: "Bagages", name: "Bagages", detail: `max ${BAG_MAX} kg · bras ${fr(ARM.bag)} m`, box: [132, 256, 96, 44], seat: false },
];

// Cabine du DA40 vue de dessus, zoomée : capot vers le haut, grande verrière,
// tableau de bord, départ des ailes basses, fuselage qui s'affine vers la queue.
function Cabin() {
  return (
    <svg viewBox="0 0 360 330" aria-hidden="true" className="absolute inset-0 h-full w-full">
      <defs>
        <linearGradient id="mb-wing-l" x1="1" x2="0" y1="0" y2="0">
          <stop offset="0" stopColor="#e9edf3" />
          <stop offset="1" stopColor="#e9edf3" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="mb-wing-r" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor="#e9edf3" />
          <stop offset="1" stopColor="#e9edf3" stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* Départ des ailes (ailes basses, au niveau des sièges avant) */}
      <path d="M100 118 L0 112 L0 176 L102 182 Z" fill="url(#mb-wing-l)" />
      <path d="M260 118 L360 112 L360 176 L258 182 Z" fill="url(#mb-wing-r)" />
      {/* Fuselage : capot en haut, cabine, puis vers la queue */}
      <path
        d="M150 0 C150 22 104 44 100 84 L98 236 C98 272 146 306 156 330 L204 330 C214 306 262 272 262 236 L260 84 C256 44 210 22 210 0 Z"
        fill="#ffffff"
        stroke="#d6dbe3"
        strokeWidth={1.5}
      />
      {/* Verrière (bulle) */}
      <path d="M180 36 C140 36 108 58 106 96 L106 232 C106 244 118 250 180 250 C242 250 254 244 254 232 L254 96 C252 58 220 36 180 36 Z" fill="none" stroke="#c9d3df" strokeWidth={1.2} strokeDasharray="4 4" />
      {/* Tableau de bord */}
      <path d="M116 76 Q180 58 244 76" fill="none" stroke="#b9c3cf" strokeWidth={3} strokeLinecap="round" />
      <text x="180" y="24" textAnchor="middle" fontSize="10" fill="#9aa0ac">avant</text>
    </svg>
  );
}

export function MbAircraftLoad({
  inputs,
  patch,
  computedFuelL,
  computedFuelKg,
  resa,
  onImportResa,
}: {
  inputs: MassBalanceInputs;
  patch: (p: Partial<MassBalanceInputs>) => void;
  computedFuelL: number;
  computedFuelKg: number;
  /** Vol lié : nom, passagers et poids à importer. */
  resa?: { label: string; detail: string } | null;
  onImportResa?: () => void;
}) {
  const [sel, setSel] = useState<SeatId>("pilot");
  const [reg, bem] = aircraftByReg(inputs.aircraftReg);
  const current = STATIONS.find((s) => s.id === sel)!;
  const fuelPct = Math.min(100, (inputs.fuelGal / FUEL_MAX_GAL) * 100);
  const fuelOver = inputs.fuelGal > FUEL_MAX_GAL;
  const tripOver = inputs.tripGal > inputs.fuelGal;

  return (
    <div className="flex h-full flex-col">
      {/* Titre, puis date et immatriculation */}
      <div className="space-y-3 px-4 pt-4 sm:px-5">
        <h2 className="text-sm font-semibold text-st-text">Chargement et carburant</h2>
        <div className="grid grid-cols-2 gap-2.5">
          <label className="min-w-0">
            <span className={`mb-1 block ${MB.label}`}>Date du vol</span>
            <input type="date" value={inputs.flightDate} onChange={(e) => patch({ flightDate: e.target.value })} className={`w-full px-2.5 ${MB.input}`} />
          </label>
          <label className="min-w-0">
            <span className={`mb-1 block ${MB.label}`}>Immatriculation</span>
            <select value={inputs.aircraftReg} onChange={(e) => patch({ aircraftReg: e.target.value })} className={`w-full cursor-pointer px-2.5 font-semibold ${MB.input}`}>
              {AIRCRAFT.map(([r]) => <option key={r} value={r}>{r}</option>)}
            </select>
          </label>
        </div>
        {resa && (
          <div className="flex items-center gap-2 rounded-[12px] bg-st-surface py-1.5 pl-3 pr-1.5">
            <Users size={14} className="shrink-0 text-st-text-2" />
            <span className="min-w-0 flex-1 leading-tight">
              <span className="block truncate text-[12.5px] font-semibold text-st-text">{resa.label}</span>
              <span className="block truncate text-[11.5px] text-st-muted">{resa.detail}</span>
            </span>
            <Button variant="secondary" size="sm" onClick={onImportResa}>Importer les poids</Button>
          </div>
        )}
      </div>

      {/* La cabine, zoomée sur les sièges */}
      <div className="flex justify-center px-3 pt-2">
        <div className="relative w-full max-w-[340px]" style={{ aspectRatio: "360 / 330" }}>
          <Cabin />
          {STATIONS.map((s) => {
            const val = inputs[s.id];
            const empty = val === 0 && s.id !== "pilot";
            const bad = s.id === "bag" && inputs.bag > BAG_MAX;
            const [x, y, w, h] = s.box;
            const on = sel === s.id;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setSel(s.id)}
                aria-pressed={on}
                aria-label={`${s.name} : ${val} kg`}
                style={{ left: `${(x / 360) * 100}%`, top: `${(y / 330) * 100}%`, width: `${(w / 360) * 100}%`, height: `${(h / 330) * 100}%` }}
                className={cn(
                  "absolute flex cursor-pointer flex-col items-center justify-center overflow-hidden border-[1.5px] bg-white leading-tight transition-[border-color,box-shadow] duration-150",
                  s.seat ? "rounded-[14px] rounded-b-[8px] pb-2" : "rounded-[10px]",
                  empty ? "border-dashed border-st-line-strong bg-white/80" : "border-st-line-strong",
                  on && "border-st-ink shadow-[0_0_0_4px_var(--color-st-ink-soft)]",
                  bad && "border-st-bad",
                )}
              >
                <span className="text-[10px] font-medium text-st-muted">{s.label}</span>
                {empty ? (
                  <span className="text-[11.5px] font-medium text-st-muted">+ ajouter</span>
                ) : (
                  <span className={cn("st-num text-[15px] font-semibold", bad ? "text-st-bad" : "text-st-text")}>
                    {val}<span className="ml-px text-[10.5px] font-medium text-st-muted">kg</span>
                  </span>
                )}
                {/* Dossier du siège (vers l'arrière) */}
                {s.seat && <span className={cn("absolute inset-x-2 bottom-1 h-[5px] rounded-full", on ? "bg-st-ink/70" : "bg-st-line-strong")} />}
              </button>
            );
          })}
        </div>
      </div>

      {/* La place choisie : un seul compteur */}
      <div className="flex items-center gap-3 border-t border-st-line px-4 py-3 sm:px-5">
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13.5px] font-semibold text-st-text">{current.name}</p>
          <p className="truncate text-[11.5px] text-st-muted">{current.detail}</p>
        </div>
        <Stepper label={current.name} value={inputs[sel]} onChange={(n) => patch({ [sel]: n })} bad={sel === "bag" && inputs.bag > BAG_MAX} />
      </div>

      {/* Carburant : son propre bloc */}
      <div className="space-y-3 border-t border-st-line px-4 py-3.5 sm:px-5">
        <div className="flex items-center justify-between gap-2">
          <p className="flex items-center gap-1.5 text-[13.5px] font-semibold text-st-text"><Fuel size={15} className="text-st-text-2" /> Carburant embarqué</p>
          <p className="st-num text-[12px] text-st-muted">{fr(computedFuelL, 0)} l · {fr(computedFuelKg, 1)} kg</p>
        </div>
        <input
          type="range"
          aria-label="Carburant embarqué (gal)"
          min={0}
          max={FUEL_MAX_GAL}
          step={0.5}
          value={Math.min(inputs.fuelGal, FUEL_MAX_GAL)}
          onChange={(e) => patch({ fuelGal: Number(e.target.value) })}
          className="h-2 w-full cursor-pointer appearance-none rounded-full [&::-webkit-slider-thumb]:h-6 [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-st-ink [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow"
          style={{ background: `linear-gradient(to right, var(--color-st-ink) ${fuelPct}%, var(--color-st-surface-hover) ${fuelPct}%)` }}
        />
        <div className="flex items-center gap-2">
          <Stepper label="Carburant embarqué" unit="gal" step={0.5} value={inputs.fuelGal} onChange={(v) => patch({ fuelGal: v })} bad={fuelOver} />
          <Button variant="secondary" size="sm" className="h-11 flex-1 sm:h-10" onClick={() => patch({ fuelGal: FUEL_MAX_GAL })}>
            Plein {FUEL_MAX_GAL} gal
          </Button>
        </div>
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-[550] text-st-text">Consommé en vol</p>
            <p className="text-[11.5px] text-st-muted">pour le point d&apos;atterrissage</p>
          </div>
          <Stepper label="Carburant consommé" unit="gal" step={0.5} value={inputs.tripGal} onChange={(v) => patch({ tripGal: v })} bad={tripOver} />
        </div>
        <p className="text-[11.5px] text-st-muted">{reg} · masse à vide {fr(bem, 1)} kg · roulage − 1,5 kg</p>
      </div>
    </div>
  );
}
