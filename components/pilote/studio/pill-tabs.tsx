"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

// Onglets à pastille glissante (tiroir d'un vol, maquette v2 validée le 24/09) :
// piste grise, UNE pastille blanche qui glisse vers l'onglet choisi, un seul
// mouvement sans rebond. Le libellé n'apparaît que sur l'onglet actif (les
// autres gardent leur icône, avec un compteur éventuel).
const EASE = "cubic-bezier(0.22, 1, 0.36, 1)";

export function PillTabs<T extends string>({ items, value, onChange, className }: {
  items: { key: T; label: string; icon: React.ComponentType<{ size?: number; className?: string }>; count?: number }[];
  value: T;
  onChange: (key: T) => void;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const first = useRef(true);
  const [pill, setPill] = useState<{ left: number; width: number; animate: boolean } | null>(null);

  useLayoutEffect(() => {
    const place = (animate: boolean) => {
      const el = ref.current?.querySelector<HTMLElement>(`[data-key="${value}"]`);
      if (!el) return;
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      setPill({ left: el.offsetLeft, width: el.offsetWidth, animate: animate && !reduce });
    };
    place(!first.current);
    first.current = false;
    const onResize = () => place(false);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [value]);

  return (
    <div ref={ref} role="tablist" className={cn("relative flex gap-0.5 rounded-[11px] bg-st-surface-hover p-[3px]", className)}>
      <span
        aria-hidden="true"
        className={cn("absolute bottom-[3px] left-0 top-[3px] rounded-[8px] bg-white shadow-[0_1px_2px_rgba(15,17,23,0.08)]", !pill && "opacity-0")}
        style={pill ? {
          width: pill.width,
          transform: `translateX(${pill.left}px)`,
          transition: pill.animate ? `transform 380ms ${EASE}, width 380ms ${EASE}` : "none",
        } : undefined}
      />
      {items.map(({ key, label, icon: Icon, count }) => {
        const active = key === value;
        return (
          <button
            key={key}
            data-key={key}
            type="button"
            role="tab"
            aria-selected={active}
            aria-label={label}
            title={active ? undefined : label}
            onClick={() => onChange(key)}
            className={cn(
              "relative z-10 flex h-8 min-w-0 cursor-pointer items-center justify-center gap-1.5 rounded-[8px] text-[12.5px] transition-colors duration-200",
              active ? "flex-[2.2] px-3 font-semibold text-st-text" : "flex-1 px-2 font-medium text-st-muted hover:text-st-text",
            )}
          >
            <Icon size={15} className="shrink-0" />
            {active && <span className="truncate motion-safe:animate-[st-tab-label-in_240ms_ease-out_120ms_both]">{label}</span>}
            {count != null && count > 0 && (
              <span className="st-num grid h-[17px] min-w-[17px] shrink-0 place-items-center rounded-full bg-st-ink px-1 text-[10px] font-semibold text-white">
                {count > 99 ? "99+" : count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
