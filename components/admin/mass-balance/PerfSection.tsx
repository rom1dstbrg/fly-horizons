"use client";

import { useState } from "react";
import { Cloud, Loader2, CornerDownLeft } from "lucide-react";
import type { AerodromeInput, PerfInputs, PerfComputed } from "@/lib/mass-balance/da40-calc";
import { extractFromRawMetar } from "@/lib/mass-balance/da40-calc";
import { findAerodrome } from "@/lib/mass-balance/aerodromes";
import { MB, NumberField, VerdictBox } from "./fields";

type Which = "dep" | "dest" | "alt";

export interface RunwayPick {
  heading: number;
  elev: number;
  toda: number | null;
  lda: number | null;
}

function Kv({ label, value, bad }: { label: string; value: string; bad?: boolean }) {
  return (
    <div className="rounded-md border border-border bg-secondary px-2 py-1">
      <span className="text-[10px] text-muted-foreground">{label}: </span>
      <span className={`font-mono text-xs font-semibold ${bad ? "text-red-600" : "text-foreground"}`}>{value}</span>
    </div>
  );
}

function AeroRow({
  label,
  ad,
  narrow,
  canCopyDep,
  onChange,
  onRunway,
  onCopyDep,
}: {
  label: string;
  ad: AerodromeInput;
  narrow?: boolean;
  canCopyDep?: boolean;
  onChange: (patch: Partial<AerodromeInput>) => void;
  onRunway: (rw: RunwayPick) => void;
  onCopyDep?: () => void;
}) {
  const [status, setStatus] = useState<{ msg: string; tone: "ok" | "ko" | "" }>({ msg: "", tone: "" });
  const [loading, setLoading] = useState(false);
  const [rawPaste, setRawPaste] = useState("");
  const [showPaste, setShowPaste] = useState(false);
  const [selRwy, setSelRwy] = useState<string | null>(null);

  const rec = findAerodrome(ad.icao);

  function setIcao(v: string) {
    const icao = v.toUpperCase();
    const found = findAerodrome(icao);
    const patch: Partial<AerodromeInput> = { icao };
    if (found && ad.elev == null && !narrow) patch.elev = found.elevation;
    onChange(patch);
    setSelRwy(null);
  }

  function pickRunway(ident: string) {
    if (!rec) return;
    const rw = rec.runways.find((r) => r.ident === ident);
    if (!rw) return;
    setSelRwy(ident);
    onChange({ rwy: rw.heading, elev: rec.elevation });
    onRunway({ heading: rw.heading, elev: rec.elevation, toda: rw.toda, lda: rw.lda });
  }

  async function fetchMetar() {
    const icao = (ad.icao || "").trim().toUpperCase();
    if (icao.length < 3) {
      setStatus({ msg: "ICAO invalide", tone: "ko" });
      return;
    }
    setLoading(true);
    setStatus({ msg: "…", tone: "" });
    try {
      const res = await fetch(`/api/admin/metar?icao=${encodeURIComponent(icao)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Import impossible");
      onChange({
        oat: data.oat ?? ad.oat,
        qnh: data.qnh ?? ad.qnh,
        wdir: data.wdir ?? ad.wdir,
        wspd: data.wspd ?? ad.wspd,
        rawMetar: data.raw || "",
      });
      setStatus({ msg: `METAR ✓ (${data.source})` + (data.vrb ? " · vent vrb" : ""), tone: "ok" });
    } catch {
      setStatus({ msg: "Import impossible — saisie manuelle ou METAR brut", tone: "ko" });
      setShowPaste(true);
    } finally {
      setLoading(false);
    }
  }

  function parsePaste() {
    const p = extractFromRawMetar(rawPaste);
    if (!p.found) {
      setStatus({ msg: "Rien reconnu dans le texte", tone: "ko" });
      return;
    }
    onChange({
      oat: p.oat ?? ad.oat,
      qnh: p.qnh ?? ad.qnh,
      wdir: p.wdir ?? ad.wdir,
      wspd: p.wspd ?? ad.wspd,
      rawMetar: rawPaste.trim().toUpperCase(),
    });
    setStatus({ msg: "METAR analysé ✓" + (p.vrb ? " · vent vrb" : ""), tone: "ok" });
  }

  return (
    <div className="rounded-lg border border-border bg-white p-3">
      {/* Ligne 1 : identité + actions */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-bold uppercase tracking-wide text-navy w-16 shrink-0">{label}</span>
        <input
          type="text"
          value={ad.icao}
          maxLength={4}
          placeholder="ICAO"
          onChange={(e) => setIcao(e.target.value)}
          className={`w-20 ${MB.input} px-1.5 font-mono uppercase`}
        />
        <button
          type="button"
          onClick={fetchMetar}
          disabled={loading}
          className="inline-flex items-center gap-1 h-8 px-2 rounded-md border border-navy text-navy text-[11px] font-semibold hover:bg-navy hover:text-white transition-colors disabled:opacity-50 cursor-pointer"
        >
          {loading ? <Loader2 size={11} className="animate-spin" /> : <Cloud size={11} />}
          METAR
        </button>
        {canCopyDep && (
          <button
            type="button"
            onClick={onCopyDep}
            title="Reprendre l'aérodrome de départ"
            className="inline-flex items-center gap-1 h-8 px-2 rounded-md border border-navy/40 text-navy text-[11px] font-semibold hover:bg-navy/10 transition-colors cursor-pointer"
          >
            <CornerDownLeft size={11} />= Départ
          </button>
        )}
        {rec && (
          <span className="inline-flex items-center gap-1">
            <span className="text-[11px] text-muted-foreground">Pistes</span>
            {rec.runways.map((r) => (
              <button
                key={r.ident}
                type="button"
                onClick={() => pickRunway(r.ident)}
                title={
                  `Piste ${r.ident} — cap ${r.heading}°` +
                  (r.toda ? ` · TODA ${r.toda} m` : "") +
                  (r.lda ? ` · LDA ${r.lda} m` : "")
                }
                className={`h-7 px-1.5 rounded border text-[11px] font-semibold font-mono transition-colors cursor-pointer ${
                  selRwy === r.ident
                    ? "bg-navy text-white border-navy"
                    : "border-navy/30 text-navy hover:bg-navy/10"
                }`}
              >
                {r.ident}
              </button>
            ))}
            <span className="text-[11px] text-muted-foreground">· {rec.elevation} ft</span>
          </span>
        )}
        <button
          type="button"
          onClick={() => setShowPaste((s) => !s)}
          className="text-[11px] text-muted-foreground underline underline-offset-2 cursor-pointer"
        >
          METAR brut
        </button>
      </div>

      {/* Ligne 2 : valeurs */}
      <div className="mt-2 flex flex-wrap items-end gap-x-3 gap-y-1.5">
        {!narrow && <NumberField label="RWY °" value={ad.rwy} onChange={(v) => onChange({ rwy: v })} min={0} max={360} size="sm" />}
        {!narrow && <NumberField label="Élévation ft" value={ad.elev} onChange={(v) => onChange({ elev: v })} size="md" />}
        <NumberField label="QNH hPa" value={ad.qnh} onChange={(v) => onChange({ qnh: v })} size="md" />
        <NumberField label="OAT °C" value={ad.oat} onChange={(v) => onChange({ oat: v })} size="sm" />
        <NumberField label="Vent °" value={ad.wdir} onChange={(v) => onChange({ wdir: v })} min={0} max={360} size="sm" />
        <NumberField label="Vent kt" value={ad.wspd} onChange={(v) => onChange({ wspd: v })} min={0} size="sm" />
      </div>

      {status.msg && (
        <p
          className={`mt-1.5 text-[11px] ${
            status.tone === "ok" ? "text-green-600" : status.tone === "ko" ? "text-red-600" : "text-muted-foreground"
          }`}
        >
          {status.msg}
        </p>
      )}
      {ad.rawMetar ? (
        <p className="mt-1 font-mono text-[10px] text-muted-foreground break-all">{ad.rawMetar}</p>
      ) : null}
      {showPaste && (
        <div className="mt-2 flex items-start gap-2">
          <textarea
            rows={2}
            value={rawPaste}
            onChange={(e) => setRawPaste(e.target.value)}
            placeholder="EBCI 051220Z 24008KT 9999 18/12 Q1015"
            className="flex-1 rounded-md border border-input bg-background p-1.5 font-mono text-[11px] focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <button
            type="button"
            onClick={parsePaste}
            className="h-8 px-2.5 rounded-md border border-navy text-navy text-[11px] font-semibold hover:bg-navy hover:text-white transition-colors cursor-pointer"
          >
            Extraire
          </button>
        </div>
      )}
    </div>
  );
}

export function PerfSection({
  perf,
  computed,
  onChangeAero,
  onChange,
}: {
  perf: PerfInputs;
  computed: PerfComputed;
  onChangeAero: (which: Which, patch: Partial<AerodromeInput>) => void;
  onChange: (patch: Partial<Pick<PerfInputs, "toda" | "ldaDest" | "ldaAlt">>) => void;
}) {
  const d = computed.dep;
  const l = computed.ldg;

  function handleRunway(which: Which, rw: RunwayPick) {
    if (which === "dep") onChange({ toda: rw.toda });
    else if (which === "dest") onChange({ ldaDest: rw.lda });
    else onChange({ ldaAlt: rw.lda });
  }

  function copyFromDep(target: "dest" | "alt") {
    const s = perf.dep;
    onChangeAero(target, {
      icao: s.icao,
      rwy: s.rwy,
      elev: s.elev,
      qnh: s.qnh,
      oat: s.oat,
      wdir: s.wdir,
      wspd: s.wspd,
      rawMetar: s.rawMetar,
    });
    const rec = findAerodrome(s.icao);
    const rw = rec?.runways.find((r) => r.heading === s.rwy);
    if (rw) {
      if (target === "dest") onChange({ ldaDest: rw.lda });
      else onChange({ ldaAlt: rw.lda });
    }
  }

  const depHasIcao = !!perf.dep.icao?.trim();

  return (
    <div className="space-y-4">
      {/* Conditions par aérodrome */}
      <div className="space-y-2">
        <p className={MB.groupLabel}>Conditions &amp; pistes</p>
        <AeroRow
          label="Départ"
          ad={perf.dep}
          onChange={(p) => onChangeAero("dep", p)}
          onRunway={(rw) => handleRunway("dep", rw)}
        />
        <AeroRow
          label="Destination"
          ad={perf.dest}
          canCopyDep={depHasIcao}
          onCopyDep={() => copyFromDep("dest")}
          onChange={(p) => onChangeAero("dest", p)}
          onRunway={(rw) => handleRunway("dest", rw)}
        />
        <AeroRow
          label="Alternate"
          ad={perf.alt}
          narrow
          canCopyDep={depHasIcao}
          onCopyDep={() => copyFromDep("alt")}
          onChange={(p) => onChangeAero("alt", p)}
          onRunway={(rw) => handleRunway("alt", rw)}
        />
      </div>

      {/* Résultats */}
      <div className="grid gap-3 lg:grid-cols-2">
        {/* Décollage */}
        <div className="rounded-lg border border-border bg-white px-3 py-2.5 space-y-2">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <h3 className="text-xs font-bold text-navy uppercase tracking-wide">Décollage — TODR</h3>
            <NumberField label="TODA m (départ)" value={perf.toda} onChange={(v) => onChange({ toda: v })} size="md" />
          </div>
          <div className="flex flex-wrap gap-1.5">
            <Kv label="X-wind" value={d.xwind != null ? `${d.xwind} kt` : "—"} bad={d.xwind != null && d.xwind > 20} />
            <Kv label="PA" value={d.pa != null ? `${d.pa} ft` : "—"} />
            <Kv label="DA" value={d.da != null ? `${d.da} ft` : "—"} />
            <Kv label="TODR" value={d.error ?? (d.todr != null ? `${d.todr} m` : "—")} />
            <Kv label="× 1.25" value={d.todr125 != null ? `${d.todr125} m` : "—"} />
          </div>
          <VerdictBox status={d.verdict.status} message={d.verdict.message} className="!py-1.5 !text-[11px]" />
        </div>

        {/* Atterrissage */}
        <div className="rounded-lg border border-border bg-white px-3 py-2.5 space-y-2">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <h3 className="text-xs font-bold text-navy uppercase tracking-wide">Atterrissage — LDR</h3>
            <div className="flex gap-2">
              <NumberField label="LDA dest. m" value={perf.ldaDest} onChange={(v) => onChange({ ldaDest: v })} size="md" />
              <NumberField label="LDA alt. m" value={perf.ldaAlt} onChange={(v) => onChange({ ldaAlt: v })} size="md" />
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <Kv label="X-wind" value={l.xwind != null ? `${l.xwind} kt` : "—"} bad={l.xwind != null && l.xwind > 20} />
            <Kv label="PA" value={l.pa != null ? `${l.pa} ft` : "—"} />
            <Kv label="DA" value={l.da != null ? `${l.da} ft` : "—"} />
            <Kv label="LDR" value={l.error ?? (l.ldr != null ? `${l.ldr} m` : "—")} />
          </div>
          <VerdictBox status={l.verdictDest.status} message={l.verdictDest.message} className="!py-1.5 !text-[11px]" />
          <VerdictBox status={l.verdictAlt.status} message={l.verdictAlt.message} className="!py-1.5 !text-[11px]" />
        </div>
      </div>
    </div>
  );
}
