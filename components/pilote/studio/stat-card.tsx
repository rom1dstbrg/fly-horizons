import React from "react";
import { cn } from "@/lib/utils";

// Libellé → valeur → une ligne de contexte (toujours rendue, vide si rien à
// dire, pour que toutes les cartes d'une rangée aient la même hauteur).
export function StatCard({ label, value, hint, tone, className }: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  tone?: "ok" | "warn" | "bad";
  className?: string;
}) {
  const toneCls = tone === "ok" ? "text-st-ok" : tone === "warn" ? "text-st-warn" : tone === "bad" ? "text-st-bad" : "text-st-text";
  return (
    <div data-stat-card className={cn("flex h-full flex-col rounded-[20px] border border-st-line bg-white p-3 shadow-st-sm sm:px-5 sm:py-4", className)}>
      <p className="truncate text-[12.5px] text-st-muted">{label}</p>
      <p data-stat-value className={cn("st-num mt-1 truncate text-lg font-medium tracking-[-0.03em] sm:text-[22px]", toneCls)}>{value}</p>
      <p data-stat-hint className="mt-1 min-h-4 truncate text-xs leading-4 text-st-muted">{hint}</p>
    </div>
  );
}

const COLS: Record<number, string> = { 1: "sm:grid-cols-1", 2: "sm:grid-cols-2", 3: "sm:grid-cols-3", 4: "sm:grid-cols-4" };

// Rangée de 4 chiffres clés au maximum. Téléphone : une bande qu'on fait défiler.
export function StatGrid({ children, className }: { children: React.ReactNode; className?: string }) {
  const count = Math.min(4, Math.max(1, React.Children.toArray(children).filter(Boolean).length));
  return <div className={cn("st-stat-strip grid gap-3", COLS[count], className)}>{children}</div>;
}
