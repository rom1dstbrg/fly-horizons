"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

// Grande option cliquable (type de vol, mode de vente, mode de paiement) :
// bordure navy + anneau quand elle est choisie. Pour 2 ou 3 choix qui méritent
// une phrase d'explication ; sinon un Segmented suffit.
export function ChoiceCard({ selected, onClick, icon: Icon, title, desc }: {
  selected: boolean;
  onClick: () => void;
  icon?: React.ComponentType<{ size?: number }>;
  title: React.ReactNode;
  desc?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        "flex w-full cursor-pointer items-center gap-3 rounded-[14px] border bg-white p-3.5 text-left transition-all",
        selected ? "border-st-ink ring-4 ring-st-ink-soft" : "border-st-line hover:border-st-line-strong hover:bg-st-surface",
      )}
    >
      {Icon && (
        <span className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-[10px]", selected ? "bg-st-ink text-white" : "bg-st-surface text-st-text-2")}>
          <Icon size={16} />
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className="block text-[13.5px] font-semibold text-st-text">{title}</span>
        {desc && <span className="mt-0.5 block text-xs leading-snug text-st-muted">{desc}</span>}
      </span>
      {selected && Icon && <Check size={16} className="shrink-0 text-st-ink" />}
    </button>
  );
}
