import { cn } from "@/lib/utils";

// Pastille d'état ou de catégorie : toujours teinte douce + texte coloré,
// jamais un aplat criard. `dot` = petit point d'état, réservé aux vrais états.
export type BadgeTone = "neutral" | "ink" | "gold" | "success" | "warning" | "danger" | "info";

const tones: Record<BadgeTone, string> = {
  neutral: "bg-st-surface text-st-text-2",
  ink: "bg-st-ink-soft text-st-ink",
  gold: "bg-st-gold-soft text-st-gold-text",
  success: "bg-st-ok-soft text-st-ok",
  warning: "bg-st-warn-soft text-st-warn",
  danger: "bg-st-bad-soft text-st-bad",
  info: "bg-st-info-soft text-st-info",
};

const dots: Record<BadgeTone, string> = {
  neutral: "bg-st-muted", ink: "bg-st-ink", gold: "bg-st-gold", success: "bg-st-ok",
  warning: "bg-st-warn", danger: "bg-st-bad", info: "bg-st-info",
};

export function Badge({ tone = "neutral", dot = false, size = "md", className, children }: {
  tone?: BadgeTone;
  dot?: boolean;
  /** sm : étiquette dans une ligne de texte (« Annonce » à côté d'un nom). */
  size?: "md" | "sm";
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap font-semibold",
        size === "sm" ? "rounded-[6px] px-[7px] py-px text-[10.5px]" : "rounded-[7px] px-[9px] py-[3px] text-[11.5px]",
        tones[tone],
        className,
      )}
    >
      {dot && <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", dots[tone])} />}
      {children}
    </span>
  );
}
