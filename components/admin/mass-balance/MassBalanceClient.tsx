"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Download, RotateCcw, Save, Users, CheckCircle2, AlertTriangle, Clock, Files, CopyPlus, ChevronDown, Table2 } from "lucide-react";
import {
  computeMassBalance,
  defaultInputs,
  splitPassengerWeight,
  type MassBalanceInputs,
  type AerodromeInput,
  type PerfInputs,
} from "@/lib/mass-balance/da40-calc";
import { CG_AFT, MASS_MAX, cgFwd } from "@/lib/mass-balance/da40-data";
import { saveMassBalanceSheet, updateMassBalanceSheet } from "@/lib/actions/mass-balance";
import {
  Badge, Button, ButtonLabel, Card, Input, PageHeader, Sheet, SheetBody, SheetHeader,
} from "@/components/pilote/studio";
import { cn } from "@/lib/utils";
import { CgEnvelopeChart } from "./CgEnvelopeChart";
import { MbAircraftLoad } from "./MbAircraftLoad";
import { MbTerrains } from "./MbTerrains";
import { SheetsList, type MbSheetRow } from "./SheetsList";

// ── Outil Masse & centrage DA40 (admin + pilote) — maquette v2 validée le 24/09 ──
// Structure des applis de référence (ForeFlight, Garmin Pilot) : une bande de
// verdict en haut (collée en haut au téléphone), le chargement saisi sur
// l'avion vu de dessus, le résultat à côté (enveloppe + jauges), les terrains
// en dessous. Ordre de préparation : poids → carburant → terrains.
// Calculs, PDF et METAR inchangés.

export interface ResaContext {
  id: string;
  date_vol: string | null;
  passagers: number | null;
  poids_total: number | null;
  clientLabel: string | null;
}

function fr(v: number | null | undefined, d = 1): string {
  if (v == null || Number.isNaN(v)) return "—";
  return v.toLocaleString("fr-FR", { minimumFractionDigits: d, maximumFractionDigits: d });
}

function buildInitialInputs(resa: ResaContext | null, sheet: MbSheetRow | null): MassBalanceInputs {
  if (sheet) return sheet.inputs;
  const base = defaultInputs();
  if (resa) {
    const split = splitPassengerWeight(resa.poids_total ?? 0, resa.passagers ?? 1);
    return {
      ...base,
      pilot: 82,
      fpax: split.fpax,
      rpax1: split.rpax1,
      rpax2: split.rpax2,
      flightDate: resa.date_vol ?? base.flightDate,
    };
  }
  return base;
}

export function MassBalanceClient({
  resa,
  sheets,
  initialSheetId,
  viewerRole = "admin",
}: {
  resa: ResaContext | null;
  sheets: MbSheetRow[];
  initialSheetId?: string | null;
  viewerRole?: "admin" | "pilote";
}) {
  const router = useRouter();
  const initialSheet = initialSheetId ? sheets.find((s) => s.id === initialSheetId) ?? null : null;

  const [inputs, setInputs] = useState<MassBalanceInputs>(() => buildInitialInputs(resa, initialSheet));
  const [currentId, setCurrentId] = useState<string | null>(initialSheet?.id ?? null);
  const [label, setLabel] = useState(initialSheet?.label ?? "");
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [previewing, setPreviewing] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [sheetsOpen, setSheetsOpen] = useState(false);
  const [showTable, setShowTable] = useState(false);

  const computed = useMemo(() => computeMassBalance(inputs), [inputs]);

  const patch = (p: Partial<MassBalanceInputs>) => setInputs((prev) => ({ ...prev, ...p }));
  const patchAero = (which: "dep" | "dest" | "alt", p: Partial<AerodromeInput>) =>
    setInputs((prev) => ({ ...prev, perf: { ...prev.perf, [which]: { ...prev.perf[which], ...p } } }));
  const patchPerf = (p: Partial<Pick<PerfInputs, "toda" | "ldaDest" | "ldaAlt">>) =>
    setInputs((prev) => ({ ...prev, perf: { ...prev.perf, ...p } }));

  function importFromResa() {
    if (!resa) return;
    const split = splitPassengerWeight(resa.poids_total ?? 0, resa.passagers ?? 1);
    patch({
      pilot: 82,
      fpax: split.fpax,
      rpax1: split.rpax1,
      rpax2: split.rpax2,
      flightDate: resa.date_vol ?? inputs.flightDate,
    });
  }

  function save(asNew = false) {
    setError("");
    startTransition(async () => {
      const payload = { inputs, reservationId: resa?.id ?? null, label: label || null };
      const res =
        currentId && !asNew
          ? await updateMassBalanceSheet(currentId, payload)
          : await saveMassBalanceSheet(payload);
      if (res.error) {
        setError(res.error);
        return;
      }
      if (res.id) setCurrentId(res.id);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
      router.refresh();
    });
  }

  async function previewPdf() {
    setError("");
    setPreviewing(true);
    const win = window.open("", "_blank");
    try {
      const res = await fetch("/api/admin/mass-balance/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inputs, clientLabel: label || resa?.clientLabel || null }),
      });
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      if (win) win.location.href = url;
      else window.open(url, "_blank");
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch {
      win?.close();
      setError("Aperçu PDF indisponible.");
    } finally {
      setPreviewing(false);
    }
  }

  function openSheet(s: MbSheetRow) {
    setInputs(s.inputs);
    setCurrentId(s.id);
    setLabel(s.label ?? "");
    setSaved(false);
    setError("");
    setSheetsOpen(false);
  }

  function duplicateSheet(s: MbSheetRow) {
    setInputs(s.inputs);
    setCurrentId(null);
    setLabel((s.label ?? "").trim() ? `${s.label} (copie)` : "");
    setSaved(false);
    setSheetsOpen(false);
  }

  function reset() {
    setInputs(defaultInputs());
    setCurrentId(null);
    setLabel("");
    setSaved(false);
    setError("");
  }

  // ── Verdict combiné : masse + centrage + performances ────────────────────
  const perfVerdicts = [
    computed.perf.dep.verdict,
    computed.perf.ldg.verdictDest,
    computed.perf.ldg.verdictAlt,
  ];
  const perfKo = perfVerdicts.filter((v) => v.status === "ko");
  const perfPending = perfVerdicts.some((v) => v.status === "pending");
  const overall: "go" | "nogo" | "incomplet" = !computed.withinLimits
    ? "nogo"
    : perfKo.length > 0
      ? "nogo"
      : perfPending
        ? "incomplet"
        : "go";

  const depMargin =
    computed.perf.dep.todr125 != null && computed.perf.dep.toda != null
      ? computed.perf.dep.toda - computed.perf.dep.todr125
      : null;
  const ldgMargin = (() => {
    const l = computed.perf.ldg;
    const margins = [
      l.ldr != null && l.ldaDest != null ? l.ldaDest - l.ldr : null,
      l.ldr != null && l.ldaAlt != null ? l.ldaAlt - l.ldr : null,
    ].filter((m): m is number => m != null);
    return margins.length ? Math.min(...margins) : null;
  })();

  const V = {
    go: { icon: CheckCircle2, tile: "bg-st-ok", text: "text-st-ok", title: "GO · vol autorisé", sub: `Catégorie ${computed.category}` },
    incomplet: { icon: Clock, tile: "bg-st-warn", text: "text-st-warn", title: "Incomplet", sub: "Masse et centrage OK, terrains à renseigner" },
    nogo: {
      icon: AlertTriangle, tile: "bg-st-bad", text: "text-st-bad", title: "NO-GO",
      sub: [...(!computed.withinLimits ? computed.issues : []), ...perfKo.map((v) => v.message)].join(" · ") || "Vérifiez la masse, le centrage et les performances",
    },
  }[overall];
  const VIcon = V.icon;

  const massPct = Math.min(100, (computed.tom / MASS_MAX) * 100);
  const massOver = computed.tom > MASS_MAX;
  // Barre de centrage : échelle 2,36 → 2,62 m ; zone autorisée entre la limite
  // avant (qui dépend de la masse) et la limite arrière.
  const CG_MIN = 2.36;
  const CG_MAX = 2.62;
  const fwd = cgFwd(computed.tom);
  const pos = (cg: number) => Math.max(0, Math.min(100, ((cg - CG_MIN) / (CG_MAX - CG_MIN)) * 100));
  const cgOut = computed.cgTom < fwd || computed.cgTom > CG_AFT;
  const signed = (n: number | null) => (n == null ? "—" : `${n >= 0 ? "+" : ""}${n.toLocaleString("fr-BE")} m`);
  const marginTone = (n: number | null) => (n == null ? "text-st-muted" : n >= 0 ? "text-st-ok" : "text-st-bad");

  const massBar = (h = "h-2") => (
    <div className={cn("overflow-hidden rounded-full bg-st-surface-hover", h)}>
      <div className={cn("h-full rounded-full", massOver ? "bg-st-bad" : "bg-st-ink")} style={{ width: `${massPct}%` }} />
    </div>
  );
  const cgBar = (h = "h-2") => (
    <div className={cn("relative rounded-full bg-st-surface-hover", h)}>
      <div className="absolute inset-y-0 rounded-full bg-st-ok/25" style={{ left: `${pos(fwd)}%`, right: `${100 - pos(CG_AFT)}%` }} />
      <div className={cn("absolute -top-1 -bottom-1 w-[3px] -translate-x-1/2 rounded-full", cgOut ? "bg-st-bad" : "bg-st-ink")} style={{ left: `${pos(computed.cgTom)}%` }} />
    </div>
  );

  const resaChip = resa && (
    <div className="flex min-w-0 items-center gap-2">
      <span className="min-w-0 truncate rounded-[9px] bg-st-surface px-2.5 py-1.5 text-[12.5px] text-st-text-2">
        <Users size={13} className="mr-1.5 inline -translate-y-px" />
        <b className="font-semibold text-st-text">{resa.clientLabel ?? "Réservation liée"}</b>
        {resa.date_vol && ` · ${new Date(resa.date_vol + "T12:00:00Z").toLocaleDateString("fr-BE", { weekday: "short", day: "numeric", month: "short" })}`}
        {` · ${resa.passagers ?? 1} pax${resa.poids_total != null ? ` · ${resa.poids_total} kg` : ""}`}
      </span>
      <Button variant="secondary" size="sm" onClick={importFromResa}>Importer les poids</Button>
    </div>
  );

  return (
    <div className="space-y-4">
      <PageHeader
        title="Masse & centrage"
        actions={
          <>
            <Button variant="secondary" onClick={() => setSheetsOpen(true)} aria-label="Feuilles enregistrées">
              <Files />
              <span className="max-sm:hidden">Feuilles</span>
              {sheets.length > 0 && <span className="st-num text-st-muted max-sm:hidden">{sheets.length}</span>}
            </Button>
            <Button variant="secondary" onClick={previewPdf} loading={previewing} aria-label="Aperçu PDF">
              {!previewing && <Download />}
              <span className="max-sm:hidden">PDF</span>
            </Button>
            <Button onClick={() => save(false)} loading={isPending}>
              {!isPending && (saved ? <Check /> : <Save />)}
              {saved ? "Enregistré" : <ButtonLabel full={currentId ? "Mettre à jour" : "Enregistrer"} short={currentId ? "Mettre à jour" : "Enregistrer"} />}
            </Button>
          </>
        }
      />
      {error && <p className="rounded-[11px] bg-st-bad-soft px-3 py-2 text-[13px] font-medium text-st-bad">{error}</p>}

      {/* ═══ Bande de verdict — téléphone : collée en haut, verdict + 2 jauges ═══ */}
      <div className="sticky top-[env(safe-area-inset-top)] z-20 -mx-4 bg-st-bg/90 px-4 pb-2 pt-1 backdrop-blur-xl sm:-mx-6 sm:px-6 lg:hidden">
        <div className="flex items-center gap-3 rounded-[18px] border border-st-line bg-white px-3 py-2.5 shadow-st-sm">
          <span className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-[12px] text-white", V.tile)}>
            <VIcon size={19} />
          </span>
          <div className="min-w-0 flex-1">
            <p className={cn("truncate text-[15px] font-semibold", V.text)}>{V.title}</p>
            <div className="mt-1 grid grid-cols-2 gap-2">
              <div className="min-w-0">
                <p className={cn("st-num truncate text-[10.5px]", massOver ? "font-semibold text-st-bad" : "text-st-muted")}>{fr(computed.tom, 0)} / {MASS_MAX} kg</p>
                <div className="mt-1">{massBar("h-[5px]")}</div>
              </div>
              <div className="min-w-0">
                <p className={cn("st-num truncate text-[10.5px]", cgOut ? "font-semibold text-st-bad" : "text-st-muted")}>CG {fr(computed.cgTom, 3)} m</p>
                <div className="mt-1">{cgBar("h-[5px]")}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
      {resa && <div className="lg:hidden">{resaChip}</div>}

      {/* ═══ Bande de verdict — bureau : tout sur une ligne ═══ */}
      <div className="hidden items-center gap-4 rounded-[18px] border border-st-line bg-white px-4 py-2.5 shadow-st-sm lg:flex">
        <span className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-[12px] text-white", V.tile)}>
          <VIcon size={19} />
        </span>
        <div className="min-w-0 max-w-[260px]">
          <p className={cn("text-[16px] font-semibold", V.text)}>{V.title}</p>
          <p className="truncate text-[11.5px] text-st-muted" title={V.sub}>{V.sub}</p>
        </div>
        <div className="ml-2 flex gap-6">
          {[
            ["Masse", `${fr(computed.tom, 1)} kg`, massOver ? "text-st-bad" : "text-st-text"],
            ["Centrage", `${fr(computed.cgTom, 3)} m`, cgOut ? "text-st-bad" : "text-st-text"],
            ["Décollage", signed(depMargin), marginTone(depMargin)],
            ["Atterrissage", signed(ldgMargin), marginTone(ldgMargin)],
          ].map(([l, v, t]) => (
            <div key={l} className="leading-tight">
              <p className="text-[11.5px] text-st-muted">{l}</p>
              <p className={cn("st-num text-[15px] font-semibold", t)}>{v}</p>
            </div>
          ))}
        </div>
        <span className="flex-1" />
        {resaChip}
      </div>

      {/* ═══ L'avion | le résultat ═══
          Principe : la saisie se fait sur l'avion (largeur fixe 430 px), le
          résultat prend le reste ; les deux cartes ont la même hauteur. */}
      <div className="grid items-stretch gap-4 lg:grid-cols-[430px_minmax(0,1fr)]">
        <Card padded={false} className="overflow-hidden">
          <MbAircraftLoad inputs={inputs} patch={patch} computedFuelL={computed.fuelL} computedFuelKg={computed.fuelKg} />
        </Card>

        <Card padded={false} className="flex flex-col overflow-hidden">
          <div className="flex items-center justify-between gap-2 px-4 pt-4 sm:px-5">
            <h2 className="text-sm font-semibold text-st-text">Résultat</h2>
            {computed.withinLimits ? <Badge tone="success">Dans les limites</Badge> : <Badge tone="danger">Hors limites</Badge>}
          </div>
          <div className="flex flex-1 items-center justify-center px-3 py-2 sm:px-4">
            <div className="w-full max-w-[560px]">
              <CgEnvelopeChart points={computed.points} />
            </div>
          </div>
          <div className="grid grid-cols-2 border-t border-st-line">
            <div className="px-4 py-3 sm:px-5">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-[12.5px] text-st-muted">Masse au décollage</span>
                <b className={cn("st-num text-[18px] font-medium tracking-[-0.02em]", massOver ? "text-st-bad" : "text-st-text")}>
                  {fr(computed.tom, 1)} <span className="text-[12px] text-st-muted">/ {MASS_MAX}</span>
                </b>
              </div>
              <div className="mt-2">{massBar()}</div>
              <p className="mt-1.5 text-[11.5px] text-st-muted">
                {massOver ? `${fr(computed.tom - MASS_MAX, 1)} kg de trop` : `Reste ${fr(MASS_MAX - computed.tom, 1)} kg`}
              </p>
            </div>
            <div className="border-l border-st-line px-4 py-3 sm:px-5">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-[12.5px] text-st-muted">Centrage</span>
                <b className={cn("st-num text-[18px] font-medium tracking-[-0.02em]", cgOut ? "text-st-bad" : "text-st-text")}>
                  {fr(computed.cgTom, 3)} <span className="text-[12px] text-st-muted">m</span>
                </b>
              </div>
              <div className="mt-2">{cgBar()}</div>
              <p className="mt-1.5 flex justify-between text-[11.5px] text-st-muted">
                <span>avant {fr(fwd, 3)}</span>
                <span>arrière {fr(CG_AFT, 2)}</span>
              </p>
            </div>
          </div>
          {!computed.withinLimits && (
            <ul className="list-disc space-y-0.5 border-t border-st-line py-2.5 pl-8 pr-4 text-[12.5px] text-st-bad">
              {computed.issues.map((it, i) => <li key={i}>{it}</li>)}
            </ul>
          )}
          <button
            type="button"
            onClick={() => setShowTable((v) => !v)}
            aria-expanded={showTable}
            className="flex cursor-pointer items-center gap-2 border-t border-st-line px-4 py-3 text-left text-[12.5px] font-[550] text-st-text-2 transition-colors hover:bg-st-surface sm:px-5"
          >
            <Table2 size={15} />
            Tableau de calcul
            <ChevronDown size={15} className={cn("ml-auto text-st-muted transition-transform", showTable && "rotate-180")} />
          </button>
          {showTable && (
            <div className="overflow-x-auto px-4 pb-4 sm:px-5">
              <table className="st-num w-full border-separate border-spacing-0 text-[12.5px]">
                <thead>
                  <tr>
                    {["Poste", "Masse", "Bras", "Moment"].map((h, i) => (
                      <th key={h} className={cn("h-8 bg-st-surface px-2 font-medium text-st-muted first:rounded-l-[8px] last:rounded-r-[8px]", i === 0 ? "text-left" : "text-right")}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {computed.rows.map((row, i) => {
                    const cell = cn("px-2 py-1.5 text-right", row.total ? "bg-st-surface font-semibold" : "border-t border-st-line-soft", row.out && "text-st-bad");
                    return (
                      <tr key={i}>
                        <td className={cn(cell, "text-left", row.total && "rounded-l-[8px]")}>
                          {row.poste}
                          {row.sub && <span className="block text-[11px] font-normal text-st-muted">{row.sub}</span>}
                        </td>
                        <td className={cell}>{fr(row.masse, 1)}</td>
                        <td className={cell}>{row.bras == null ? "—" : fr(row.bras, row.total ? 3 : row.bras < 3 ? 2 : 3)}</td>
                        <td className={cn(cell, row.total && "rounded-r-[8px]")}>{fr(row.moment, 2)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <p className="mt-2 text-[11.5px] text-st-muted">
                Limites : avant 2,40 m (jusqu&apos;à 980 kg) → 2,46 m à 1150 kg ; arrière 2,59 m ; Utility ≤ 980 kg ; mini 780 kg.
                Réf. NewCAG rév. 4.1, vérifier l&apos;AFM.
              </p>
            </div>
          )}
        </Card>
      </div>

      {/* ═══ Terrains et performances ═══ */}
      <Card padded={false} className="overflow-hidden">
        <div className="flex items-center justify-between gap-2 px-4 pt-4 sm:px-5">
          <h2 className="text-sm font-semibold text-st-text">Terrains et performances</h2>
          <span className="text-[12px] text-st-muted max-sm:hidden">METAR importé automatiquement</span>
        </div>
        <MbTerrains perf={inputs.perf} computed={computed.perf} onChangeAero={patchAero} onChange={patchPerf} />
      </Card>

      {/* ═══ Feuilles enregistrées ═══ */}
      <Sheet value={sheetsOpen ? true : null} onClose={() => setSheetsOpen(false)} width="lg">
        {() => (
          <>
            <SheetHeader
              title="Feuilles"
              subtitle={`${sheets.length} enregistrée${sheets.length > 1 ? "s" : ""}`}
              onClose={() => setSheetsOpen(false)}
            />
            <SheetBody>
              <div className="space-y-3 rounded-[16px] bg-st-surface p-3.5">
                <p className="text-[12.5px] font-semibold text-st-text">{currentId ? "Feuille ouverte" : "Nouvelle feuille"}</p>
                <label className="block">
                  <span className="mb-1 block text-[12px] font-[550] text-st-text-2">Libellé (optionnel)</span>
                  <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="ex. Baptême Dupont" />
                </label>
                <div className="flex flex-wrap gap-2">
                  {currentId && (
                    <Button variant="secondary" size="sm" onClick={() => save(true)} loading={isPending}>
                      <CopyPlus /> Enregistrer comme nouvelle
                    </Button>
                  )}
                  <Button variant="ghost" size="sm" onClick={() => { reset(); setSheetsOpen(false); }}>
                    <RotateCcw /> Repartir de zéro
                  </Button>
                </div>
              </div>
              <SheetsList sheets={sheets} currentId={currentId} onOpen={openSheet} onDuplicate={duplicateSheet} viewerRole={viewerRole} />
            </SheetBody>
          </>
        )}
      </Sheet>
    </div>
  );
}
