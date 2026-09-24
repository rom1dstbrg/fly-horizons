"use client";

import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

// ── Échelle de style de l'outil Masse & centrage (« Studio », 24/09) ───────
// Un seul jeu de tailles / classes, appliqué partout (MassBalanceClient,
// MbAircraftLoad, MbTerrains, PerfSection). Ne pas réinventer de tailles ailleurs.

export const MB = {
  /** Titre de sous-groupe dans une section (« Carburant », « Conditions »…). */
  groupLabel: "text-[12.5px] font-semibold text-st-text",
  /** Libellé d'un champ. */
  label: "text-[12px] font-[550] text-st-text-2",
  /** Texte d'aide / notes sous un champ. */
  help: "text-[12px] text-st-muted",
  /** Input texte / select — hauteur unique. */
  input:
    "h-10 rounded-[11px] border border-st-line bg-white text-[16px] text-st-text outline-none transition-colors hover:border-st-line-strong focus:border-st-ink focus:ring-4 focus:ring-st-ink-soft sm:text-sm",
  /** Input numérique (chiffres alignés à droite, sans flèches). */
  num:
    "h-10 px-2 rounded-[11px] border border-st-line bg-white text-[16px] st-num text-right text-st-text outline-none transition-colors hover:border-st-line-strong focus:border-st-ink focus:ring-4 focus:ring-st-ink-soft sm:text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none",
} as const;

/** Deux largeurs de champ numérique, pas plus. */
export const NUM_W = { sm: "w-16", md: "w-20" } as const;

// ── Champ numérique labellisé (label au-dessus) ───────────────────────────

export function NumberField({
  label,
  value,
  onChange,
  size = "md",
  min,
  max,
  step,
  bad,
}: {
  label: string;
  value: number | null;
  onChange: (n: number | null) => void;
  size?: "sm" | "md";
  min?: number;
  max?: number;
  step?: number;
  bad?: boolean;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className={`${MB.label} whitespace-nowrap`}>{label}</span>
      <input
        type="number"
        inputMode="decimal"
        value={value ?? ""}
        min={min}
        max={max}
        step={step}
        placeholder="—"
        onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
        className={cn(NUM_W[size], MB.num, bad && "!border-st-bad !bg-st-bad-soft")}
      />
    </label>
  );
}

// ── Compteur − valeur + (saisie au pouce, sans clavier) ──────────────────
// La valeur reste tapable au clavier. Boutons de 44 px au téléphone.

export function Stepper({
  value,
  onChange,
  step = 1,
  min = 0,
  max,
  unit = "kg",
  bad,
  label,
}: {
  value: number;
  onChange: (n: number) => void;
  step?: number;
  min?: number;
  max?: number;
  unit?: string;
  bad?: boolean;
  /** Nom accessible (« Pilote », « Bagages »…). */
  label: string;
}) {
  const clamp = (n: number) => {
    const r = Math.round(n / step) * step;
    return Math.max(min, max != null ? Math.min(max, r) : r);
  };
  const btn =
    "grid h-full w-11 shrink-0 cursor-pointer place-items-center bg-st-surface text-st-text-2 transition-colors hover:bg-st-surface-hover hover:text-st-text active:bg-st-line disabled:cursor-default disabled:opacity-40 sm:w-9";
  return (
    <div
      className={cn(
        "flex h-11 shrink-0 items-stretch overflow-hidden rounded-[12px] border bg-white sm:h-10",
        bad ? "border-st-bad" : "border-st-line",
      )}
    >
      <button type="button" aria-label={`${label} : moins ${step}`} disabled={value <= min} onClick={() => onChange(clamp(value - step))} className={btn}>
        <Minus size={16} />
      </button>
      <label className="flex w-[74px] items-center justify-center gap-0.5">
        <input
          type="number"
          inputMode="decimal"
          aria-label={label}
          value={value}
          min={min}
          max={max}
          step={step}
          onChange={(e) => onChange(e.target.value === "" ? 0 : Number(e.target.value))}
          className={cn(
            "st-num w-11 bg-transparent text-right text-[16px] font-semibold outline-none sm:text-[14px] [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none",
            bad ? "text-st-bad" : "text-st-text",
          )}
        />
        <span className="text-[11px] font-medium text-st-muted">{unit}</span>
      </label>
      <button type="button" aria-label={`${label} : plus ${step}`} disabled={max != null && value >= max} onClick={() => onChange(clamp(value + step))} className={btn}>
        <Plus size={16} />
      </button>
    </div>
  );
}
