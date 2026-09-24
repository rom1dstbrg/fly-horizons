import { flightRules, type MetarJson } from "@/components/admin/MetarWidget";
import { cn } from "@/lib/utils";

// METAR de la base, en une ligne, pour la barre du haut de l'espace pilote.
// Même source et même cache (5 min) que MetarWidget ; rien si l'API ne répond pas.
export async function MetarChip({ icao = "EBCI" }: { icao?: string }) {
  let metar: MetarJson | null = null;
  try {
    const res = await fetch(`https://aviationweather.gov/api/data/metar?ids=${icao}&format=json&hours=3`, {
      next: { revalidate: 300 },
    });
    const data = await res.json();
    if (Array.isArray(data) && data.length > 0) metar = data[0];
  } catch {
    // non critique
  }
  if (!metar) return null;

  const fr = flightRules(metar.visib, metar.clouds);
  const tone =
    fr.label === "VFR" ? "bg-st-ok-soft text-st-ok"
    : fr.label === "MVFR" ? "bg-st-info-soft text-st-info"
    : "bg-st-bad-soft text-st-bad";
  // Le METAR brut sans le préfixe « METAR » éventuel.
  const raw = metar.rawOb.replace(/^METAR\s+/, "");

  return (
    <span
      title={metar.rawOb}
      className="flex h-[34px] min-w-0 max-w-[460px] items-center gap-2 rounded-[10px] bg-st-surface px-3 text-xs text-st-text-2"
    >
      <b className={cn("shrink-0 rounded-[6px] px-1.5 py-px text-[11.5px] font-semibold", tone)}>{fr.label}</b>
      <span className="truncate font-mono">{raw}</span>
    </span>
  );
}
