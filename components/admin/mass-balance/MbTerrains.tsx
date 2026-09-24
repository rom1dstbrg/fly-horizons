"use client";

import { useEffect, useRef, useState } from "react";
import { Pencil, Plus } from "lucide-react";
import type { AerodromeInput, PerfComputed, PerfInputs } from "@/lib/mass-balance/da40-calc";
import { findAerodrome } from "@/lib/mass-balance/aerodromes";
import { Button, Sheet, SheetBody, SheetFooter, SheetHeader } from "@/components/pilote/studio";
import { cn } from "@/lib/utils";
import { AeroRow, type RunwayPick } from "./PerfSection";
import { NumberField } from "./fields";

// ── Terrains et performances (maquette v2 validée, 24/09) ─────────────────
// Une colonne par terrain, dans l'ordre du vol : Départ, Destination,
// Dégagement. On touche la piste, le TODA / LDA se remplit ; le METAR est
// importé tout seul dès qu'un terrain connu est saisi. « Modifier » ouvre la
// saisie complète (OACI, météo à la main, METAR brut) dans un tiroir.

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
  which,
  ad,
  avail,
  need,
  needLabel,
  error,
  onChange,
  onRunway,
  onEdit,
}: {
  which: Which;
  ad: AerodromeInput;
  avail: number | null;
  need: number | null;
  needLabel: string;
  error?: string;
  onChange: (p: Partial<AerodromeInput>) => void;
  onRunway: (rw: RunwayPick) => void;
  onEdit: () => void;
}) {
  const rec = findAerodrome(ad.icao);
  const [metarState, setMetarState] = useState<"idle" | "loading" | "ok" | "ko">(ad.rawMetar ? "ok" : "idle");
  const tried = useRef<string | null>(null);

  // METAR importé tout seul pour un terrain connu, une fois par OACI.
  useEffect(() => {
    const icao = (ad.icao || "").trim().toUpperCase();
    if (!rec || ad.rawMetar || tried.current === icao) return;
    tried.current = icao;
    let cancelled = false;
    (async () => {
      setMetarState("loading");
      try {
        const res = await fetch(`/api/admin/metar?icao=${encodeURIComponent(icao)}`);
        const data = await res.json();
        if (!res.ok) throw new Error();
        if (cancelled) return;
        onChange({ oat: data.oat ?? ad.oat, qnh: data.qnh ?? ad.qnh, wdir: data.wdir ?? ad.wdir, wspd: data.wspd ?? ad.wspd, rawMetar: data.raw || "" });
        setMetarState("ok");
      } catch {
        if (!cancelled) setMetarState("ko");
      }
    })();
    return () => { cancelled = true; };
  }, [ad.icao, ad.rawMetar, rec, ad.oat, ad.qnh, ad.wdir, ad.wspd, onChange]);

  function pickRunway(ident: string) {
    if (!rec) return;
    const rw = rec.runways.find((r) => r.ident === ident);
    if (!rw) return;
    onChange({ rwy: rw.heading, elev: rec.elevation });
    onRunway({ heading: rw.heading, elev: rec.elevation, toda: rw.toda, lda: rw.lda });
  }

  const hasIcao = !!ad.icao?.trim();
  const margin = need != null && avail != null ? avail - need : null;
  const wx = wxLine(ad);

  return (
    <div className="min-w-0 px-4 py-3.5 sm:px-5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[12.5px] text-st-muted">{ROLE[which].label}</span>
        {hasIcao && (
          <button type="button" onClick={onEdit} aria-label={`Modifier ${ROLE[which].label}`} className="grid h-7 w-7 cursor-pointer place-items-center rounded-[8px] text-st-muted transition-colors hover:bg-st-surface hover:text-st-text">
            <Pencil size={14} />
          </button>
        )}
      </div>

      {!hasIcao ? (
        <Button variant="secondary" size="sm" className="mt-2" onClick={onEdit}>
          <Plus /> Ajouter le terrain
        </Button>
      ) : (
        <>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <b className="mr-1 font-mono text-[17px] font-bold text-st-text">{ad.icao.toUpperCase()}</b>
            {rec?.runways.map((r) => (
              <button
                key={r.ident}
                type="button"
                onClick={() => pickRunway(r.ident)}
                title={`Piste ${r.ident} · cap ${r.heading}°`}
                className={cn(
                  "h-[30px] min-w-[38px] cursor-pointer rounded-[9px] border px-2 font-mono text-[12px] font-semibold transition-colors",
                  ad.rwy === r.heading ? "border-st-ink bg-st-ink text-white" : "border-st-line bg-white text-st-text hover:bg-st-surface",
                )}
              >
                {r.ident}
              </button>
            ))}
          </div>
          <p className="mt-1.5 flex min-w-0 items-center gap-1.5 text-[11.5px] text-st-text-2">
            <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", metarState === "ok" ? "bg-st-ok" : metarState === "ko" ? "bg-st-bad" : "bg-st-line-strong")} />
            <span className="truncate">
              {metarState === "loading" ? "METAR en cours…" : wx ?? (metarState === "ko" ? "METAR indisponible, saisie à la main" : "Météo à renseigner")}
            </span>
          </p>
          <div className="mt-2.5">
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
        </>
      )}
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
  const [editing, setEditing] = useState<Which | null>(null);

  function handleRunway(which: Which, rw: RunwayPick) {
    if (which === "dep") onChange({ toda: rw.toda });
    else if (which === "dest") onChange({ ldaDest: rw.lda });
    else onChange({ ldaAlt: rw.lda });
  }

  function copyFromDep(target: "dest" | "alt") {
    const s = perf.dep;
    onChangeAero(target, { icao: s.icao, rwy: s.rwy, elev: s.elev, qnh: s.qnh, oat: s.oat, wdir: s.wdir, wspd: s.wspd, rawMetar: s.rawMetar });
    const rw = findAerodrome(s.icao)?.runways.find((r) => r.heading === s.rwy);
    if (rw) onChange(target === "dest" ? { ldaDest: rw.lda } : { ldaAlt: rw.lda });
  }

  const d = computed.dep;
  const l = computed.ldg;
  const distField = (which: Which) =>
    which === "dep" ? (
      <NumberField label="TODA m" value={perf.toda} onChange={(v) => onChange({ toda: v })} />
    ) : which === "dest" ? (
      <NumberField label="LDA m" value={perf.ldaDest} onChange={(v) => onChange({ ldaDest: v })} />
    ) : (
      <NumberField label="LDA m" value={perf.ldaAlt} onChange={(v) => onChange({ ldaAlt: v })} />
    );

  return (
    <>
      <div className="grid grid-cols-1 divide-y divide-st-line sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        <TerrainColumn which="dep" ad={perf.dep} avail={perf.toda} need={d.todr125} needLabel="TODR ×1,25" error={d.error}
          onChange={(p) => onChangeAero("dep", p)} onRunway={(rw) => handleRunway("dep", rw)} onEdit={() => setEditing("dep")} />
        <TerrainColumn which="dest" ad={perf.dest} avail={perf.ldaDest} need={l.ldr} needLabel="LDR" error={l.error}
          onChange={(p) => onChangeAero("dest", p)} onRunway={(rw) => handleRunway("dest", rw)} onEdit={() => setEditing("dest")} />
        <TerrainColumn which="alt" ad={perf.alt} avail={perf.ldaAlt} need={l.ldr} needLabel="LDR" error={l.error}
          onChange={(p) => onChangeAero("alt", p)} onRunway={(rw) => handleRunway("alt", rw)} onEdit={() => setEditing("alt")} />
      </div>

      <Sheet value={editing} onClose={() => setEditing(null)} width="lg">
        {(w) => (
          <>
            <SheetHeader title={ROLE[w].label} subtitle="Terrain, piste et météo" onClose={() => setEditing(null)} />
            <SheetBody>
              <AeroRow
                label={ROLE[w].label}
                ad={perf[w]}
                narrow={w === "alt"}
                canCopyDep={w !== "dep" && !!perf.dep.icao?.trim()}
                onCopyDep={() => w !== "dep" && copyFromDep(w)}
                onChange={(p) => onChangeAero(w, p)}
                onRunway={(rw) => handleRunway(w, rw)}
                extra={distField(w)}
              />
            </SheetBody>
            <SheetFooter>
              <Button fullWidth size="lg" onClick={() => setEditing(null)}>Terminer</Button>
            </SheetFooter>
          </>
        )}
      </Sheet>
    </>
  );
}
