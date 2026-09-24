import { cn } from "@/lib/utils";

// Tuile de date d'un vol (jour abrégé + numéro), repère visuel des listes de
// vols. `today` : le vol a lieu aujourd'hui (tuile navy pleine).
export function DateTile({ date, today = false, className }: {
  /** YYYY-MM-DD */
  date: string;
  today?: boolean;
  className?: string;
}) {
  const d = new Date(date + "T12:00:00Z");
  const day = d.toLocaleDateString("fr-BE", { weekday: "short", timeZone: "Europe/Brussels" }).replace(".", "");
  return (
    <span
      className={cn(
        "flex h-[42px] w-10 shrink-0 flex-col items-center justify-center rounded-[11px] border leading-none",
        today ? "border-st-ink bg-st-ink text-white" : "border-st-line bg-white text-st-text",
        className,
      )}
    >
      <small className={cn("text-[9.5px] font-semibold uppercase tracking-[0.04em]", today ? "text-white/65" : "text-st-muted")}>{day}</small>
      <b className="st-num mt-[3px] text-base font-semibold">{d.getUTCDate()}</b>
    </span>
  );
}
