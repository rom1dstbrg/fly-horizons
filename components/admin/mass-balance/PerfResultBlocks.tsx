import { CheckCircle2, AlertTriangle, Clock } from "lucide-react";
import type { PerfInputs, PerfComputed, Verdict } from "@/lib/mass-balance/da40-calc";

// ── Lecture seule — 4 blocs séparés Départ / Décollage / Destination /
// Atterrissage, avec les valeurs calculées et les marges bien visibles.
// La saisie (ICAO, météo, pistes, TODA/LDA) se fait dans MbEditModal.

function tone(status: Verdict["status"] | "neutral") {
  if (status === "ok") return { bg: "bg-green-50/60", text: "text-green-700", icon: CheckCircle2 };
  if (status === "ko") return { bg: "bg-red-50/60", text: "text-red-700", icon: AlertTriangle };
  if (status === "pending") return { bg: "bg-amber-50/50", text: "text-amber-700", icon: Clock };
  return { bg: "bg-white", text: "text-navy", icon: null };
}

function Kv({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[10.5px] text-muted-foreground">{label}</span>
      <span className="font-mono text-[11px] font-semibold text-foreground">{value}</span>
    </div>
  );
}

function windLabel(wdir: number | null, wspd: number | null): string {
  if (wdir == null && wspd == null) return "—";
  return `${wdir ?? "—"}° / ${wspd ?? "—"} kt`;
}

function BlockHeader({ label, tone: t }: { label: string; tone: ReturnType<typeof tone> }) {
  const Icon = t.icon;
  return (
    <div className="mb-2 flex items-center gap-1.5">
      {Icon && <Icon size={12} className={t.text} />}
      <span className={`text-[10px] font-bold uppercase tracking-wide ${t.text}`}>{label}</span>
    </div>
  );
}

export function PerfResultBlocks({ perf, computed }: { perf: PerfInputs; computed: PerfComputed }) {
  const d = computed.dep;
  const l = computed.ldg;

  const depMargin = d.todr125 != null && d.toda != null ? d.toda - d.todr125 : null;
  const ldgMarginDest = l.ldr != null && l.ldaDest != null ? l.ldaDest - l.ldr : null;
  const ldgMarginAlt = l.ldr != null && l.ldaAlt != null ? l.ldaAlt - l.ldr : null;
  const ldgWorst: Verdict["status"] =
    l.verdictDest.status === "ko" || l.verdictAlt.status === "ko"
      ? "ko"
      : l.verdictDest.status === "pending" || l.verdictAlt.status === "pending"
        ? "pending"
        : "ok";

  const tDep = tone("neutral");
  const tDest = tone("neutral");
  const tOff = tone(d.verdict.status);
  const tLdg = tone(ldgWorst);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
      {/* Départ */}
      <div className={`rounded-xl border border-border ${tDep.bg} p-3.5`}>
        <BlockHeader label="Départ" tone={tDep} />
        <p className="mb-2 font-mono text-base font-bold text-foreground">
          {perf.dep.icao?.trim() || "—"}
          {perf.dep.rwy != null && <span className="ml-2 text-xs font-semibold text-muted-foreground">RWY {perf.dep.rwy}°</span>}
        </p>
        <div className="space-y-1">
          <Kv label="QNH / OAT" value={`${perf.dep.qnh ?? "—"} hPa / ${perf.dep.oat ?? "—"}°C`} />
          <Kv label="Vent" value={windLabel(perf.dep.wdir, perf.dep.wspd)} />
          <Kv label="Élévation" value={perf.dep.elev != null ? `${perf.dep.elev} ft` : "—"} />
        </div>
      </div>

      {/* Décollage */}
      <div className={`rounded-xl border border-border ${tOff.bg} p-3.5`}>
        <BlockHeader label="Décollage" tone={tOff} />
        <p className={`mb-2 font-mono text-xl font-extrabold ${tOff.text}`}>
          {d.error ?? (d.todr125 != null ? `${d.todr125} m` : "—")}
        </p>
        <div className="space-y-1">
          <Kv label="TODR × 1,25" value={d.todr125 != null ? `${d.todr125} m` : "—"} />
          <Kv label="TODA" value={d.toda != null ? `${d.toda} m` : "—"} />
          <div className="flex items-center justify-between">
            <span className="text-[10.5px] text-muted-foreground">Marge</span>
            <span className={`font-mono text-[11px] font-bold ${tOff.text}`}>
              {depMargin != null ? `${depMargin >= 0 ? "+" : ""}${depMargin} m` : "—"}
            </span>
          </div>
        </div>
      </div>

      {/* Destination */}
      <div className={`rounded-xl border border-border ${tDest.bg} p-3.5`}>
        <BlockHeader label="Destination" tone={tDest} />
        <p className="mb-2 font-mono text-base font-bold text-foreground">
          {perf.dest.icao?.trim() || "—"}
          {perf.dest.rwy != null && <span className="ml-2 text-xs font-semibold text-muted-foreground">RWY {perf.dest.rwy}°</span>}
        </p>
        <div className="space-y-1">
          <Kv label="QNH / OAT" value={`${perf.dest.qnh ?? "—"} hPa / ${perf.dest.oat ?? "—"}°C`} />
          <Kv label="Vent" value={windLabel(perf.dest.wdir, perf.dest.wspd)} />
          <Kv label="Alternate" value={perf.alt.icao?.trim() || "—"} />
        </div>
      </div>

      {/* Atterrissage */}
      <div className={`rounded-xl border border-border ${tLdg.bg} p-3.5`}>
        <BlockHeader label="Atterrissage" tone={tLdg} />
        <p className={`mb-2 font-mono text-xl font-extrabold ${tLdg.text}`}>
          {l.error ?? (l.ldr != null ? `${l.ldr} m` : "—")}
        </p>
        <div className="space-y-1">
          <Kv label="LDR dest." value={l.ldr != null && l.ldaDest != null ? `${l.ldr} m / LDA ${l.ldaDest} m` : "—"} />
          <Kv label="LDR alt." value={l.ldr != null && l.ldaAlt != null ? `${l.ldr} m / LDA ${l.ldaAlt} m` : "—"} />
          <div className="flex items-center justify-between">
            <span className="text-[10.5px] text-muted-foreground">Marge (dest. / alt.)</span>
            <span className={`font-mono text-[11px] font-bold ${tLdg.text}`}>
              {ldgMarginDest != null ? `${ldgMarginDest >= 0 ? "+" : ""}${ldgMarginDest}` : "—"}
              {" / "}
              {ldgMarginAlt != null ? `${ldgMarginAlt >= 0 ? "+" : ""}${ldgMarginAlt}` : "—"} m
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
