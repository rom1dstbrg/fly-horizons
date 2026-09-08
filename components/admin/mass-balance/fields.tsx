"use client";

// ── Échelle de style de l'outil Masse & centrage ──────────────────────────
// Un seul jeu de tailles / classes, appliqué partout (MassBalanceClient +
// PerfSection). Ne pas réinventer de tailles ailleurs.

export const MB = {
  /** Titre de sous-groupe dans une section (« Carburant », « Conditions »…). */
  groupLabel: "text-[11px] font-semibold uppercase tracking-wide text-muted-foreground",
  /** Libellé d'un champ. */
  label: "text-[11px] font-medium text-muted-foreground",
  /** Texte d'aide / notes sous un champ. */
  help: "text-[11px] text-muted-foreground",
  /** Input texte / select — hauteur unique. */
  input:
    "h-9 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring",
  /** Input numérique (mono, aligné à droite, sans flèches). */
  num:
    "h-9 px-2 rounded-md border border-input bg-background text-sm font-mono tabular-nums text-right focus:outline-none focus:ring-2 focus:ring-ring [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none",
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
        className={`${NUM_W[size]} ${MB.num} ${bad ? "!border-red-500 !bg-red-50" : ""}`}
      />
    </label>
  );
}

// ── Ligne « libellé … valeur » (colonne étroite, label à gauche) ──────────

export function ValueRow({
  label,
  sub,
  value,
  onChange,
  step = 1,
  bad,
}: {
  label: string;
  sub?: string;
  value: number;
  onChange: (n: number) => void;
  step?: number;
  bad?: boolean;
}) {
  return (
    <label className="flex items-center justify-between gap-2 min-w-0">
      <span className="text-xs text-foreground truncate">
        {label}
        {sub && <span className={MB.help}> · {sub}</span>}
      </span>
      <input
        type="number"
        inputMode="decimal"
        min={0}
        step={step}
        value={value}
        onChange={(e) => onChange(e.target.value === "" ? 0 : Number(e.target.value))}
        className={`${NUM_W.md} ${MB.num} ${bad ? "!border-red-500 !bg-red-50" : ""}`}
      />
    </label>
  );
}

// ── Encadré de verdict ───────────────────────────────────────────────────

export function VerdictBox({
  status,
  message,
  className = "",
}: {
  status: "ok" | "ko" | "pending";
  message: string;
  className?: string;
}) {
  const tone =
    status === "ok"
      ? "text-green-700 border-green-300 bg-green-50"
      : status === "ko"
        ? "text-red-700 border-red-300 bg-red-50"
        : "text-muted-foreground border-border bg-secondary";
  return (
    <p className={`rounded-lg border px-3 py-2 text-xs font-semibold ${tone} ${className}`}>{message}</p>
  );
}
