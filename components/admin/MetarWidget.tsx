import { Wind, Eye, Thermometer, Gauge } from "lucide-react";

type MetarJson = {
  rawOb: string;
  temp: number | null;
  dewp: number | null;
  wdir: number | "VRB" | null;
  wspd: number | null;
  wgst: number | null;
  visib: string | null;
  clouds: { cover: string; base: number }[] | null;
  altim: number | null;
  obsTime: number | null;
};

type TafJson = {
  rawTAF: string;
  issueTime: string | null;
};

// ── helpers ───────────────────────────────────────────────────────────────────

const COVER_RANK: Record<string, number> = {
  SKC: 0, CLR: 0, NCD: 0, NSC: 0, CAVOK: 0,
  FEW: 1, SCT: 2, BKN: 3, OVC: 4,
};

function worstSky(clouds: { cover: string }[] | null): string {
  if (!clouds || clouds.length === 0) return "SKC";
  return clouds.reduce((a, b) =>
    (COVER_RANK[b.cover] ?? 0) > (COVER_RANK[a.cover] ?? 0) ? b : a
  ).cover;
}

function parseVisSM(visib: string | null): number {
  if (!visib) return Infinity;
  if (visib === "9999" || visib.includes("+")) return 10;
  const n = parseFloat(visib);
  if (isNaN(n)) return Infinity;
  if (n > 100) return n / 1609.34; // meters → SM
  return n; // already in SM
}

function flightRules(
  visib: string | null,
  clouds: { cover: string; base: number }[] | null,
): { label: "VFR" | "MVFR" | "IFR" | "LIFR"; bg: string; text: string } {
  const visSM = parseVisSM(visib);
  const ceiling = (clouds ?? [])
    .filter(c => c.cover === "BKN" || c.cover === "OVC")
    .reduce((min, c) => Math.min(min, c.base), Infinity);

  if (ceiling < 500 || visSM < 1)
    return { label: "LIFR", bg: "bg-purple-600",  text: "text-white" };
  if (ceiling < 1000 || visSM < 3)
    return { label: "IFR",  bg: "bg-red-500",     text: "text-white" };
  if (ceiling < 3000 || visSM < 5)
    return { label: "MVFR", bg: "bg-blue-500",    text: "text-white" };
  return   { label: "VFR",  bg: "bg-green-500",   text: "text-white" };
}

function formatVis(visib: string | null): string {
  if (!visib) return "—";
  if (visib === "9999" || visib.includes("+")) return ">10 km";
  const n = parseFloat(visib);
  if (!isNaN(n)) {
    if (n > 100) return n >= 9999 ? ">10 km" : `${(n / 1000).toFixed(1)} km`;
    if (n >= 6)  return ">10 km";
    return `${(n * 1.852).toFixed(1)} km`;
  }
  return visib;
}

// ── component ─────────────────────────────────────────────────────────────────

export async function MetarWidget() {
  let metar: MetarJson | null = null;
  let taf: TafJson | null = null;

  try {
    const [mRes, tRes] = await Promise.all([
      fetch("https://aviationweather.gov/api/data/metar?ids=EBCI&format=json&hours=3", {
        next: { revalidate: 300 },
      }),
      fetch("https://aviationweather.gov/api/data/taf?ids=EBCI&format=json", {
        next: { revalidate: 300 },
      }),
    ]);
    const mData = await mRes.json();
    const tData = await tRes.json();
    if (Array.isArray(mData) && mData.length > 0) metar = mData[0];
    if (Array.isArray(tData) && tData.length > 0) taf = tData[0];
  } catch {
    // non-critique
  }

  const fr = metar ? flightRules(metar.visib, metar.clouds) : null;

  const obsLabel = metar?.obsTime
    ? new Date(metar.obsTime * 1000).toLocaleTimeString("fr-BE", {
        hour: "2-digit", minute: "2-digit", timeZone: "Europe/Brussels",
      })
    : null;

  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden">

      {/* Header */}
      <div className="bg-secondary border-b border-border px-4 py-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-[1.8px]">METAR · EBCI</span>
          {obsLabel && (
            <span className="text-[9px] text-muted-foreground/50">· {obsLabel}</span>
          )}
        </div>
        {fr && (
          <span className={`text-[10px] font-black px-2 py-0.5 rounded-md ${fr.bg} ${fr.text}`}>
            {fr.label}
          </span>
        )}
      </div>

      {!metar ? (
        <div className="px-4 py-3">
          <p className="text-xs text-muted-foreground">Données indisponibles</p>
        </div>
      ) : (
        <div className="p-3 space-y-2.5">

          {/* Métriques décodées */}
          <div className="grid grid-cols-2 gap-x-4 gap-y-2">
            <div className="flex items-center gap-2">
              <Wind size={13} className="text-muted-foreground shrink-0" />
              <span className="text-sm text-foreground font-medium">
                {metar.wdir === "VRB" ? "Variable" : metar.wdir != null ? `${metar.wdir}°` : "—"}
                {metar.wspd != null ? ` · ${metar.wspd} kt` : ""}
                {metar.wgst != null ? ` G${metar.wgst}` : ""}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Eye size={13} className="text-muted-foreground shrink-0" />
              <span className="text-sm text-foreground font-medium">{formatVis(metar.visib)}</span>
            </div>
            <div className="flex items-center gap-2">
              <Thermometer size={13} className="text-muted-foreground shrink-0" />
              <span className="text-sm text-foreground font-medium">
                {metar.temp != null ? `${metar.temp}°` : "—"} / {metar.dewp != null ? `${metar.dewp}°` : "—"}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Gauge size={13} className="text-muted-foreground shrink-0" />
              <span className="text-sm text-foreground font-medium">
                {metar.altim != null ? `Q${Math.round(metar.altim)}` : "—"}
              </span>
            </div>
          </div>

          {/* Raw METAR */}
          <div className="bg-secondary rounded-lg px-3 py-2.5">
            <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">METAR</p>
            <p className="font-mono text-xs text-foreground leading-relaxed break-all">{metar.rawOb}</p>
          </div>

          {/* Raw TAF */}
          {taf?.rawTAF && (
            <div className="bg-secondary rounded-lg px-3 py-2.5">
              <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">TAF</p>
              <p className="font-mono text-xs text-foreground leading-relaxed break-all">
                {taf.rawTAF.replace(/^TAF\s+/, "")}
              </p>
            </div>
          )}

        </div>
      )}
    </div>
  );
}
