"use client";

import { useEffect, useRef, useState } from "react";
import { Pencil, CornerDownLeft, Cloud, ChevronUp } from "lucide-react";
import type { AerodromeInput, PerfComputed, PerfInputs } from "@/lib/mass-balance/da40-calc";
import { extractFromRawMetar } from "@/lib/mass-balance/da40-calc";
import { findAerodrome } from "@/lib/mass-balance/aerodromes";
import { Button } from "@/components/pilote/studio";
import { cn } from "@/lib/utils";
import { MB, NumberField } from "./fields";

// ── Terrains et performances (24/09) ───────────────────────────────────────
// Une colonne par terrain, dans l'ordre du vol : Départ, Destination,
// Dégagement. Tout se fait dans la colonne (plus de tiroir, demande de
// Romain) : on tape l'OACI, le METAR arrive tout seul dès les 4 lettres, on
// touche la piste (le TODA / LDA se remplit) ; « Modifier » déplie la saisie
// à la main (météo, distance, METAR brut) juste en dessous.

type Which = "dep" | "dest" | "alt";

const ROLE: Record<Which, { label: string; dist: "TODA" | "LDA" }> = {
  dep: { label: "Départ", dist: "TODA" },
  dest: { label: "Destination", dist: "LDA" },
  alt: { label: "Dégagement", dist: "LDA" },
};

const nf = (n: number) => n.toLocaleString("fr-BE");

function wxLine(ad: AerodromeInput): string | null {
  if (ad.qnh == null && ad.oat == null && ad.wdir == null && ad.wspd == null) return null;
  const wind = ad.wdir != null || ad.wspd != null ? `${ad.wdir ?? "—"}° / ${ad.wspd ?? "—"} kt` : null;
  return [wind, ad.oat != null ? `${ad.oat} °C` : null, ad.qnh != null ? `Q${ad.qnh}` : null].filter(Boolean).join(" · ");
}

function TerrainColumn({
  which, ad, avail, need, needLabel, error, canCopyDep,
  onChange, onDist, onCopyDep,
}: {
  which: Which;
  ad: AerodromeInput;
  avail: number | null;
  need: number | null;
  needLabel: string;
  error?: string;
  canCopyDep: boolean;
  onChange: (p: Partial<AerodromeInput>) => void;
  onDist: (v: number | null) => void;
  onCopyDep: () => void;
}) {
  const rec = findAerodrome(ad.icao);
  const [editing, setEditing] = useState(false);
  const [metar, setMetar] = useState<{ state: "idle" | "loading" | "ok" | "ko"; msg?: string }>({ state: ad.rawMetar ? "ok" : "idle" });
  const [raw, setRaw] = useState("");
  const tried = useRef<string | null>(null);
  // Numéro de la dernière requête : une réponse arrivée après un changement
  // d'OACI est ignorée.
  const reqId = useRef(0);

  async function fetchMetar(icao: string) {
    const id = ++reqId.current;
    setMetar({ state: "loading" });
    try {
      const res = await fetch(`/api/admin/metar?icao=${encodeURIComponent(icao)}`);
      const data = await res.json();
      if (id !== reqId.current) return;
      if (!res.ok) throw new Error();
      onChange({ oat: data.oat ?? ad.oat, qnh: data.qnh ?? ad.qnh, wdir: data.wdir ?? ad.wdir, wspd: data.wspd ?? ad.wspd, rawMetar: data.raw || "" });
      setMetar({ state: "ok" });
    } catch {
      if (id !== reqId.current) return;
      setMetar({ state: "ko", msg: "METAR indisponible : saisie à la main ou METAR brut" });
    }
  }

  // METAR frais importé tout seul dès qu'un OACI complet (4 lettres) est présent :
  // saisi, recopié du départ ou venant d'une feuille enregistrée (on ne garde pas
  // un METAR périmé). Effacer puis retaper le même code relance l'import.
  useEffect(() => {
    const icao = (ad.icao || "").trim().toUpperCase();
    if (icao.length !== 4) {
      tried.current = null;
      reqId.current++;
      setMetar((m) => (m.state === "loading" ? { state: "idle" } : m));
      return;
    }
    if (tried.current === icao) return;
    tried.current = icao;
    void fetchMetar(icao);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ad.icao]);

  function setIcao(v: string) {
    const icao = v.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 4);
    const found = findAerodrome(icao);
    onChange({ icao, rawMetar: "", ...(found ? { elev: found.elevation } : {}) });
    // OACI complet tapé : on déroule la météo, comme un clic sur « Modifier ».
    if (icao.length === 4) setEditing(true);
  }

  function pickRunway(ident: string) {
    const rw = rec?.runways.find((r) => r.ident === ident);
    if (!rec || !rw) return;
    onChange({ rwy: rw.heading, elev: rec.elevation });
    onDist(which === "dep" ? rw.toda : rw.lda);
  }

  function parseRaw() {
    const p = extractFromRawMetar(raw);
    if (!p.found) { setMetar({ state: "ko", msg: "Rien reconnu dans ce METAR" }); return; }
    onChange({ oat: p.oat ?? ad.oat, qnh: p.qnh ?? ad.qnh, wdir: p.wdir ?? ad.wdir, wspd: p.wspd ?? ad.wspd, rawMetar: raw.trim().toUpperCase() });
    setMetar({ state: "ok" });
    setRaw("");
  }

  const margin = need != null && avail != null ? avail - need : null;
  const wx = wxLine(ad);

  return (
    <div className="min-w-0 space-y-2.5 px-4 py-3.5 sm:px-5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[12.5px] text-st-muted">{ROLE[which].label}</span>
        {canCopyDep && !ad.icao && (
          <button type="button" onClick={onCopyDep} className="inline-flex cursor-pointer items-center gap-1 text-[12px] font-[550] text-st-ink hover:underline">
            <CornerDownLeft size={12} /> Comme le départ
          </button>
        )}
      </div>

      {/* OACI + pistes */}
      <div className="flex flex-wrap items-center gap-1.5">
        <input
          value={ad.icao}
          onChange={(e) => setIcao(e.target.value)}
          placeholder="OACI"
          aria-label={`OACI ${ROLE[which].label}`}
          maxLength={4}
          className={cn("w-[74px] px-2 text-center font-mono font-bold uppercase tracking-wide", MB.input)}
        />
        {rec?.runways.map((r) => (
          <button
            key={r.ident}
            type="button"
            onClick={() => pickRunway(r.ident)}
            title={`Piste ${r.ident} · cap ${r.heading}°`}
            className={cn(
              "h-10 min-w-10 cursor-pointer rounded-[10px] border px-2 font-mono text-[12.5px] font-semibold transition-colors",
              ad.rwy === r.heading ? "border-st-ink bg-st-ink text-white" : "border-st-line bg-white text-st-text hover:bg-st-surface",
            )}
          >
            {r.ident}
          </button>
        ))}
        {ad.icao && ad.icao.length === 4 && !rec && <span className="text-[11.5px] text-st-muted">terrain inconnu : pistes à la main</span>}
      </div>

      {/* Météo */}
      <div className="flex items-center gap-1.5 text-[11.5px] text-st-text-2">
        <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", metar.state === "ok" ? "bg-st-ok" : metar.state === "ko" ? "bg-st-bad" : "bg-st-line-strong")} />
        <span className="min-w-0 flex-1 truncate">
          {metar.state === "loading" ? "METAR en cours…" : wx ?? (metar.state === "ko" ? metar.msg : "Météo à renseigner")}
        </span>
        {ad.icao && (
          <button type="button" onClick={() => setEditing((v) => !v)} aria-expanded={editing} className="inline-flex shrink-0 cursor-pointer items-center gap-1 rounded-[8px] px-1.5 py-1 font-[550] text-st-ink hover:bg-st-surface">
            {editing ? <ChevronUp size={13} /> : <Pencil size={12} />} {editing ? "Fermer" : "Modifier"}
          </button>
        )}
      </div>

      {editing && (
        <div className="space-y-2.5 rounded-[14px] bg-st-surface p-3">
          <div className="flex flex-wrap items-end gap-2">
            {which !== "alt" && <NumberField label="Piste °" size="sm" value={ad.rwy} onChange={(v) => onChange({ rwy: v })} min={0} max={360} />}
            {which !== "alt" && <NumberField label="Élév. ft" value={ad.elev} onChange={(v) => onChange({ elev: v })} />}
            <NumberField label="QNH" value={ad.qnh} onChange={(v) => onChange({ qnh: v })} />
            <NumberField label="OAT °C" size="sm" value={ad.oat} onChange={(v) => onChange({ oat: v })} />
            <NumberField label="Vent °" size="sm" value={ad.wdir} onChange={(v) => onChange({ wdir: v })} min={0} max={360} />
            <NumberField label="Vent kt" size="sm" value={ad.wspd} onChange={(v) => onChange({ wspd: v })} min={0} />
            <NumberField label={`${ROLE[which].dist} m`} value={avail} onChange={onDist} />
          </div>
          <div className="flex gap-2">
            <input value={raw} onChange={(e) => setRaw(e.target.value)} placeholder="Coller un METAR brut" aria-label="METAR brut" className={cn("min-w-0 flex-1 px-2.5 font-mono text-[12px]", MB.input)} />
            <Button variant="secondary" size="sm" className="h-10" onClick={parseRaw} disabled={!raw.trim()}>Extraire</Button>
            <Button variant="secondary" size="sm" className="h-10" onClick={() => fetchMetar(ad.icao.toUpperCase())} disabled={ad.icao.length < 3} aria-label="Recharger le METAR">
              <Cloud />
            </Button>
          </div>
          {ad.rawMetar && <p className="break-all font-mono text-[10.5px] text-st-muted">{ad.rawMetar}</p>}
        </div>
      )}

      {/* Distance nécessaire / disponible */}
      <div>
        <div className="flex items-baseline justify-between gap-2 text-[12px]">
          <span className="truncate text-st-muted">
            {error ?? (need != null && avail != null ? `${needLabel} ${nf(need)} / ${ROLE[which].dist} ${nf(avail)} m` : avail == null ? "Choisissez une piste" : `${ROLE[which].dist} ${nf(avail)} m`)}
          </span>
          {margin != null && (
            <b className={cn("st-num shrink-0 font-semibold", margin >= 0 ? "text-st-ok" : "text-st-bad")}>
              {margin >= 0 ? "+" : ""}{nf(margin)} m
            </b>
          )}
        </div>
        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-st-surface-hover">
          {need != null && avail != null && avail > 0 && (
            <div className={cn("h-full rounded-full", margin != null && margin < 0 ? "bg-st-bad" : "bg-st-ink")} style={{ width: `${Math.min(100, (need / avail) * 100)}%` }} />
          )}
        </div>
      </div>
    </div>
  );
}

export function MbTerrains({
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
  function copyFromDep(target: "dest" | "alt") {
    const s = perf.dep;
    onChangeAero(target, { icao: s.icao, rwy: s.rwy, elev: s.elev, qnh: s.qnh, oat: s.oat, wdir: s.wdir, wspd: s.wspd, rawMetar: s.rawMetar });
    const rw = findAerodrome(s.icao)?.runways.find((r) => r.heading === s.rwy);
    if (rw) onChange(target === "dest" ? { ldaDest: rw.lda } : { ldaAlt: rw.lda });
  }

  const d = computed.dep;
  const l = computed.ldg;
  const depSet = !!perf.dep.icao?.trim();

  return (
    <div className="grid grid-cols-1 divide-y divide-st-line lg:grid-cols-3 lg:divide-x lg:divide-y-0">
      <TerrainColumn which="dep" ad={perf.dep} avail={perf.toda} need={d.todr125} needLabel="TODR ×1,25" error={d.error} canCopyDep={false}
        onChange={(p) => onChangeAero("dep", p)} onDist={(v) => onChange({ toda: v })} onCopyDep={() => {}} />
      <TerrainColumn which="dest" ad={perf.dest} avail={perf.ldaDest} need={l.ldr} needLabel="LDR" error={l.error} canCopyDep={depSet}
        onChange={(p) => onChangeAero("dest", p)} onDist={(v) => onChange({ ldaDest: v })} onCopyDep={() => copyFromDep("dest")} />
      <TerrainColumn which="alt" ad={perf.alt} avail={perf.ldaAlt} need={l.ldr} needLabel="LDR" error={l.error} canCopyDep={depSet}
        onChange={(p) => onChangeAero("alt", p)} onDist={(v) => onChange({ ldaAlt: v })} onCopyDep={() => copyFromDep("alt")} />
    </div>
  );
}
