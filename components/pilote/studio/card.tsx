import React from "react";
import { cn } from "@/lib/utils";

// Carte Studio : radius 20, bordure 1 px, ombre presque plate. `interactive`
// seulement pour ce qui se clique (jamais de survol artificiel sur une carte
// d'information). Carte composée : une info principale en haut, puis une
// rangée de cellules séparées par des traits fins (CardSplit).
export function Card({ interactive = false, padded = true, className, children, ...props }: {
  interactive?: boolean;
  padded?: boolean;
  className?: string;
  children: React.ReactNode;
} & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-[20px] border border-st-line bg-white shadow-st-sm",
        padded && "p-4 sm:p-5",
        interactive && "cursor-pointer transition-all duration-200 hover:border-st-line-strong hover:shadow-st-md",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

// Rangée de cellules en bas d'une carte composée, séparées par des traits
// fins. Téléphone : 2 colonnes ; bureau : autant de colonnes que de cellules
// (dès sm jusqu'à 3, dès lg pour 4). Chaque trait est posé par la cellule
// selon sa place, pour rester juste à chaque largeur.
export function CardSplit({ className, children }: { className?: string; children: React.ReactNode }) {
  const cells = React.Children.toArray(children).filter(Boolean);
  const cols = Math.min(4, Math.max(2, cells.length));
  const bp = cols === 4 ? "lg" : "sm";
  return (
    <div
      className={cn(
        "grid grid-cols-2 border-t border-st-line",
        cols === 3 && "sm:grid-cols-3",
        cols === 4 && "lg:grid-cols-4",
        className,
      )}
    >
      {cells.map((cell, i) => {
        const deskLeft = i % cols !== 0;
        const deskTop = i >= cols;
        return (
          <div
            key={i}
            className={cn(
              "min-w-0 border-st-line px-4 py-3.5 sm:px-5 sm:py-4",
              i % 2 === 1 && "border-l",
              i >= 2 && "border-t",
              bp === "sm" && (deskLeft ? "sm:border-l" : "sm:border-l-0"),
              bp === "sm" && (deskTop ? "sm:border-t" : "sm:border-t-0"),
              bp === "lg" && (deskLeft ? "lg:border-l" : "lg:border-l-0"),
              bp === "lg" && (deskTop ? "lg:border-t" : "lg:border-t-0"),
            )}
          >
            {cell}
          </div>
        );
      })}
    </div>
  );
}

// Libellé + valeur (+ contexte) : la cellule type d'une carte composée.
export function Metric({ label, value, hint, tone, className }: {
  label: React.ReactNode;
  value: React.ReactNode;
  hint?: React.ReactNode;
  tone?: "ok" | "warn" | "bad";
  className?: string;
}) {
  const toneCls = tone === "ok" ? "text-st-ok" : tone === "warn" ? "text-st-warn" : tone === "bad" ? "text-st-bad" : "text-st-text";
  return (
    <div className={cn("flex min-w-0 flex-col gap-0.5", className)}>
      <span className="truncate text-[12.5px] text-st-muted">{label}</span>
      <span className={cn("st-num truncate text-[19px] font-medium leading-tight tracking-[-0.03em] sm:text-[22px]", toneCls)}>{value}</span>
      {hint && <span className="truncate text-[12px] text-st-muted">{hint}</span>}
    </div>
  );
}
