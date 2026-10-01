import { cn } from "@/lib/utils";
import type { Rich } from "@/lib/analytics-stats";

// Phrase calculée : du texte et des passages en gras (vert ou rouge pour une évolution).
// Partagé par Analytiques et Satisfaction.
export function RichText({ r }: { r: Rich }) {
  return (
    <>
      {r.map((x, i) => typeof x === "string"
        ? <span key={i}>{x}</span>
        : <b key={i} className={cn("font-semibold text-st-text", x.tone === "up" && "text-st-ok", x.tone === "down" && "text-st-bad")}>{x.b}</b>)}
    </>
  );
}
