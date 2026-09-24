import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

// Route d'un vol en suite de points (EBCI → Dinant → … → EBCI) qui passe à la
// ligne proprement quand il y a beaucoup d'étapes : chaque point reste entier,
// seules les flèches séparent. Les terrains de départ / d'arrivée en gras.
export function RoutePath({ points, className }: { points: string[]; className?: string }) {
  return (
    <p className={cn("flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[14px] leading-snug text-st-text", className)}>
      {points.map((p, i) => {
        const end = i === 0 || i === points.length - 1;
        return (
          <span key={i} className="inline-flex items-center gap-1.5">
            {i > 0 && <ArrowRight size={13} className="shrink-0 text-st-muted" />}
            <span className={cn("whitespace-nowrap", end ? "font-semibold" : "font-[450] text-st-text-2")}>{p}</span>
          </span>
        );
      })}
    </p>
  );
}
