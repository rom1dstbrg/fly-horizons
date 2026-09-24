"use client";

import { useState } from "react";
import { Cloud, Loader2, CornerDownLeft } from "lucide-react";
import type { AerodromeInput } from "@/lib/mass-balance/da40-calc";
import { extractFromRawMetar } from "@/lib/mass-balance/da40-calc";
import { findAerodrome } from "@/lib/mass-balance/aerodromes";
import { MB, NumberField } from "./fields";

// Saisie complète d'un terrain (OACI, pistes, METAR ou météo à la main,
// TODA / LDA) — ouverte depuis le crayon d'une colonne de MbTerrains.


export interface RunwayPick {
  heading: number;
  elev: number;
  toda: number | null;
  lda: number | null;
}

export function AeroRow({
  label,
  ad,
  narrow,
  canCopyDep,
  extra,
  onChange,
  onRunway,
  onCopyDep,
}: {
  label: string;
  ad: AerodromeInput;
  narrow?: boolean;
  canCopyDep?: boolean;
  /** Champ additionnel rattaché à cet aérodrome (TODA au départ, LDA à destination/alternate). */
  extra?: React.ReactNode;
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
    <div className="rounded-[16px] border border-st-line bg-white p-3.5">
      {/* Ligne 1 : identité + actions */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="w-full text-[13px] font-semibold text-st-text sm:w-24 sm:shrink-0">{label}</span>
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
          className="inline-flex h-10 cursor-pointer items-center gap-1.5 rounded-[11px] border border-st-line bg-white px-3 text-[12.5px] font-[550] text-st-text shadow-st-sm transition-colors hover:bg-st-surface disabled:opacity-50"
        >
          {loading ? <Loader2 size={11} className="animate-spin" /> : <Cloud size={11} />}
          METAR
        </button>
        {canCopyDep && (
          <button
            type="button"
            onClick={onCopyDep}
            title="Reprendre l'aérodrome de départ"
            className="inline-flex h-10 cursor-pointer items-center gap-1.5 rounded-[11px] border border-st-line bg-white px-3 text-[12.5px] font-[550] text-st-text-2 transition-colors hover:bg-st-surface"
          >
            <CornerDownLeft size={11} />= Départ
          </button>
        )}
        {rec && (
          <span className="inline-flex items-center gap-1">
            <span className="text-[12px] text-st-muted">Pistes</span>
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
                className={`h-10 min-w-10 cursor-pointer rounded-[10px] border px-2 font-mono text-[12.5px] font-semibold transition-colors ${
                  selRwy === r.ident
                    ? "border-st-ink bg-st-ink text-white"
                    : "border-st-line bg-white text-st-text hover:bg-st-surface"
                }`}
              >
                {r.ident}
              </button>
            ))}
            <span className="text-[12px] text-st-muted">· {rec.elevation} ft</span>
          </span>
        )}
        <button
          type="button"
          onClick={() => setShowPaste((s) => !s)}
          className="cursor-pointer text-[12px] text-st-muted underline underline-offset-2 hover:text-st-text"
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
        {extra}
      </div>

      {status.msg && (
        <p
          className={`mt-1.5 text-[11px] ${
            status.tone === "ok" ? "text-st-ok" : status.tone === "ko" ? "text-st-bad" : "text-st-muted"
          }`}
        >
          {status.msg}
        </p>
      )}
      {ad.rawMetar ? (
        <p className="mt-1 break-all font-mono text-[11px] text-st-muted">{ad.rawMetar}</p>
      ) : null}
      {showPaste && (
        <div className="mt-2 flex items-start gap-2">
          <textarea
            rows={2}
            value={rawPaste}
            onChange={(e) => setRawPaste(e.target.value)}
            placeholder="EBCI 051220Z 24008KT 9999 18/12 Q1015"
            className="flex-1 rounded-[11px] border border-st-line bg-white p-2 font-mono text-[16px] text-st-text outline-none focus:border-st-ink focus:ring-4 focus:ring-st-ink-soft sm:text-[12px]"
          />
          <button
            type="button"
            onClick={parsePaste}
            className="h-10 cursor-pointer rounded-[11px] bg-st-ink px-3 text-[12.5px] font-[550] text-white transition-colors hover:bg-st-ink-hover"
          >
            Extraire
          </button>
        </div>
      )}
    </div>
  );
}
