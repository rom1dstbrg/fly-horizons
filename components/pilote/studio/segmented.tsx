"use client";

import { cn } from "@/lib/utils";

// Contrôle segmenté (« Studio ») : piste grise, choix actif en puce blanche.
// Pour les onglets d'une liste (À venir / Passés), les onglets d'un outil.
export function Segmented<T extends string>({ items, value, onChange, fill = false, className }: {
  items: { key: T; label: React.ReactNode; count?: number }[];
  value: T;
  onChange: (key: T) => void;
  /** Occupe toute la largeur, segments égaux (téléphone). */
  fill?: boolean;
  className?: string;
}) {
  return (
    <div
      role="tablist"
      className={cn(
        "max-w-full gap-0.5 overflow-x-auto rounded-[11px] bg-st-surface-hover p-[3px] [scrollbar-width:none]",
        fill ? "grid" : "inline-flex",
        className,
      )}
      style={fill ? { gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` } : undefined}
    >
      {items.map((item) => {
        const active = item.key === value;
        return (
          <button
            key={item.key}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(item.key)}
            className={cn(
              "shrink-0 cursor-pointer whitespace-nowrap rounded-[8px] px-3 py-[5px] text-[12.5px] transition-colors duration-200",
              active ? "bg-white font-semibold text-st-text shadow-[0_1px_2px_rgba(15,17,23,0.08)]" : "font-medium text-st-text-2 hover:text-st-text",
            )}
          >
            {item.label}
            {item.count != null && <span className="st-num ml-1.5 font-medium text-st-muted">{item.count}</span>}
          </button>
        );
      })}
    </div>
  );
}
