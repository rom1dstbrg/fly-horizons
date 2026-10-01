import { Eye, Thermometer, Gauge } from "lucide-react";
import { Badge, Card } from "@/components/pilote/studio";

export type MetarJson = {
  rawOb: string;
  temp: number | null;
  dewp: number | null;
  wdir: number | "VRB" | null;
  wspd: number | null;
  wgst: number | null;
  visib: string | number | null;
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

function parseVisSM(visib: string | number | null): number {
  if (visib == null) return Infinity;
  const s = String(visib);
  if (s === "9999" || s.includes("+")) return 10;
  const n = parseFloat(s);
  if (isNaN(n)) return Infinity;
  if (n > 100) return n / 1609.34; // meters → SM
  return n; // already in SM
}

export function flightRules(
  visib: string | number | null,
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

function formatVis(visib: string | number | null): string {
  if (visib == null) return "—";
  const s = String(visib);
  if (s === "9999" || s.includes("+")) return ">10 km";
  const n = parseFloat(s);
  if (!isNaN(n)) {
    if (n > 100) return n >= 9999 ? ">10 km" : `${(n / 1000).toFixed(1)} km`;
    if (n >= 6)  return ">10 km";
    return `${(n * 1.852).toFixed(1)} km`;
  }
  return s;
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

  const RULES_TONE = { VFR: "success", MVFR: "info", IFR: "danger", LIFR: "danger" } as const;

  return (
    <Card padded={false}>
      <div className="flex items-center justify-between gap-3 px-5 pb-1 pt-4">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.06em] text-st-muted">
          Météo · EBCI{obsLabel && <span className="ml-1.5 normal-case tracking-normal">· {obsLabel}</span>}
        </h2>
        {fr && <Badge tone={RULES_TONE[fr.label]}>{fr.label}</Badge>}
      </div>

      {!metar ? (
        <p className="px-5 pb-5 pt-3 text-sm text-st-muted">Données indisponibles.</p>
      ) : (
        <div className="space-y-4 px-5 pb-5 pt-2">
          <p className="st-num text-[28px] font-medium leading-none tracking-[-0.03em]">
            {metar.wdir === "VRB" ? "Variable" : metar.wdir != null ? `${metar.wdir}°` : "—"}
            {metar.wspd != null && <span> / {metar.wspd} kt{metar.wgst != null ? ` G${metar.wgst}` : ""}</span>}
          </p>
          <dl className="grid grid-cols-3 gap-x-4 gap-y-3 text-sm">
            <div><dt className="flex items-center gap-1.5 text-[11.5px] text-st-muted"><Eye size={12} />Visibilité</dt><dd className="mt-0.5 font-semibold">{formatVis(metar.visib)}</dd></div>
            <div><dt className="flex items-center gap-1.5 text-[11.5px] text-st-muted"><Thermometer size={12} />Temp.</dt><dd className="mt-0.5 font-semibold">{metar.temp != null ? `${metar.temp}°` : "—"} / {metar.dewp != null ? `${metar.dewp}°` : "—"}</dd></div>
            <div><dt className="flex items-center gap-1.5 text-[11.5px] text-st-muted"><Gauge size={12} />QNH</dt><dd className="mt-0.5 font-semibold">{metar.altim != null ? `${Math.round(metar.altim)} hPa` : "—"}</dd></div>
          </dl>
          <div className="rounded-xl bg-st-surface px-3.5 py-3">
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.06em] text-st-muted">METAR</p>
            <p className="break-all font-mono text-xs leading-relaxed text-st-text">{metar.rawOb}</p>
          </div>
          {taf?.rawTAF && (
            <div className="rounded-xl bg-st-surface px-3.5 py-3">
              <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.06em] text-st-muted">TAF</p>
              <p className="break-all font-mono text-xs leading-relaxed text-st-text">{taf.rawTAF.replace(/^TAF\s+/, "")}</p>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
