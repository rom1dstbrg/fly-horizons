import { CheckCircle2, AlertTriangle, Clock } from "lucide-react";
import type { PerfInputs, PerfComputed, Verdict } from "@/lib/mass-balance/da40-calc";
import { CardSplit } from "@/components/pilote/studio";
import { cn } from "@/lib/utils";

// ── Lecture seule — 4 cellules Départ / Décollage / Destination /
// Atterrissage dans une carte composée (« Studio »), marges bien visibles.
// La saisie (ICAO, météo, pistes, TODA/LDA) se fait dans MbEditModal.

const TONE = {
  ok: { text: "text-st-ok", icon: CheckCircle2 },
  ko: { text: "text-st-bad", icon: AlertTriangle },
  pending: { text: "text-st-warn", icon: Clock },
} as const;

function Kv({ label, value, strong, tone }: { label: string; value: string; strong?: boolean; tone?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 text-[12px]">
      <span className="text-st-muted">{label}</span>
      <span className={cn("st-num text-right", strong ? "font-semibold" : "", tone ?? "text-st-text")}>{value}</span>
    </div>
  );
}

function windLabel(wdir: number | null, wspd: number | null): string {
  if (wdir == null && wspd == null) return "—";
  return `${wdir ?? "—"}° / ${wspd ?? "—"} kt`;
}

const signed = (n: number | null) => (n == null ? "—" : `${n >= 0 ? "+" : ""}${n} m`);

function Head({ label, status }: { label: string; status?: Verdict["status"] }) {
  const t = status ? TONE[status] : null;
  const Icon = t?.icon;
  return (
    <p className={cn("flex items-center gap-1.5 text-[12.5px]", t ? t.text : "text-st-muted")}>
      {Icon && <Icon size={13} />}
      {label}
    </p>
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
  const tOff = TONE[d.verdict.status].text;
  const tLdg = TONE[ldgWorst].text;

  const big = "st-num mt-0.5 text-[20px] font-medium leading-tight tracking-[-0.03em]";

  return (
    <CardSplit className="border-t-0">
      {/* Départ */}
      <div className="space-y-2">
        <Head label="Départ" />
        <p className={cn(big, "text-st-text")}>
          {perf.dep.icao?.trim() || "—"}
          {perf.dep.rwy != null && <span className="ml-2 text-[12px] font-medium text-st-muted">RWY {perf.dep.rwy}°</span>}
        </p>
        <div className="space-y-1">
          <Kv label="QNH / OAT" value={`${perf.dep.qnh ?? "—"} hPa / ${perf.dep.oat ?? "—"}°C`} />
          <Kv label="Vent" value={windLabel(perf.dep.wdir, perf.dep.wspd)} />
          <Kv label="Élévation" value={perf.dep.elev != null ? `${perf.dep.elev} ft` : "—"} />
        </div>
      </div>

      {/* Décollage */}
      <div className="space-y-2">
        <Head label="Décollage" status={d.verdict.status} />
        <p className={cn(big, tOff)}>{d.error ?? signed(depMargin)}</p>
        <div className="space-y-1">
          <Kv label="TODR × 1,25" value={d.todr125 != null ? `${d.todr125} m` : "—"} />
          <Kv label="TODA" value={d.toda != null ? `${d.toda} m` : "—"} />
          <Kv label="Marge" value={signed(depMargin)} strong tone={tOff} />
        </div>
      </div>

      {/* Destination */}
      <div className="space-y-2">
        <Head label="Destination" />
        <p className={cn(big, "text-st-text")}>
          {perf.dest.icao?.trim() || "—"}
          {perf.dest.rwy != null && <span className="ml-2 text-[12px] font-medium text-st-muted">RWY {perf.dest.rwy}°</span>}
        </p>
        <div className="space-y-1">
          <Kv label="QNH / OAT" value={`${perf.dest.qnh ?? "—"} hPa / ${perf.dest.oat ?? "—"}°C`} />
          <Kv label="Vent" value={windLabel(perf.dest.wdir, perf.dest.wspd)} />
          <Kv label="Alternate" value={perf.alt.icao?.trim() || "—"} />
        </div>
      </div>

      {/* Atterrissage */}
      <div className="space-y-2">
        <Head label="Atterrissage" status={ldgWorst} />
        <p className={cn(big, tLdg)}>{l.error ?? signed(ldgMarginDest)}</p>
        <div className="space-y-1">
          <Kv label="LDR / LDA dest." value={l.ldr != null && l.ldaDest != null ? `${l.ldr} / ${l.ldaDest} m` : "—"} />
          <Kv label="LDR / LDA alt." value={l.ldr != null && l.ldaAlt != null ? `${l.ldr} / ${l.ldaAlt} m` : "—"} />
          <Kv label="Marge alt." value={signed(ldgMarginAlt)} strong tone={tLdg} />
        </div>
      </div>
    </CardSplit>
  );
}
