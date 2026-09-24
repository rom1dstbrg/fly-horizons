"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Download, RotateCcw, Save, Users, Pencil, CheckCircle2, AlertTriangle, Clock, Files, CopyPlus } from "lucide-react";
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
  Badge, Button, ButtonLabel, Card, CardSplit, Input, PageHeader, SectionHeader, Segmented,
  Sheet, SheetBody, SheetHeader,
} from "@/components/pilote/studio";
import { cn } from "@/lib/utils";
import { CgEnvelopeChart } from "./CgEnvelopeChart";
import { ChargementFields } from "./ChargementFields";
import { PerfResultBlocks } from "./PerfResultBlocks";
import { MbEditModal } from "./MbEditModal";
import { SheetsList, type MbSheetRow } from "./SheetsList";

// ── Outil Masse & centrage DA40 (admin + pilote), style « Studio » (24/09) ──
// Le verdict GO / NO-GO et les 4 chiffres qui comptent sont en haut ; au
// téléphone une barre compacte reste collée en haut et le reste se range en
// 3 onglets (Chargement, Perfs, Détail). Calculs, PDF et METAR inchangés.

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
  const [perfModalOpen, setPerfModalOpen] = useState(false);
  const [sheetsOpen, setSheetsOpen] = useState(false);
  // Téléphone : un onglet à la fois au lieu d'une longue page (bureau : tout visible).
  const [tab, setTab] = useState<"chargement" | "perfs" | "detail">("chargement");

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
    go: {
      icon: CheckCircle2, tile: "bg-st-ok", text: "text-st-ok", title: "GO · vol autorisé",
      sub: `Masse, centrage et performances dans les limites · catégorie ${computed.category}`,
    },
    incomplet: {
      icon: Clock, tile: "bg-st-warn", text: "text-st-warn", title: "Incomplet · performances à renseigner",
      sub: "Masse et centrage OK. Renseignez les conditions et TODA / LDA pour conclure.",
    },
    nogo: {
      icon: AlertTriangle, tile: "bg-st-bad", text: "text-st-bad", title: "NO-GO · vol non autorisé en l'état",
      sub: [...(!computed.withinLimits ? computed.issues : []), ...perfKo.map((v) => v.message)].join(" · ") || "Vérifiez la masse, le centrage et les performances.",
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
  const signed = (n: number | null) => (n == null ? "—" : `${n >= 0 ? "+" : ""}${n}`);
  const marginTone = (n: number | null) => (n == null ? "text-st-muted" : n >= 0 ? "text-st-ok" : "text-st-bad");
  const depIcao = inputs.perf.dep.icao?.trim();
  const destIcao = inputs.perf.dest.icao?.trim();
  const occupants = 1 + [inputs.fpax, inputs.rpax1, inputs.rpax2].filter((v) => v > 0).length;

  const resaChip = resa && (
    <div className="flex min-w-0 items-center gap-2 rounded-[14px] bg-st-surface py-1.5 pl-3 pr-1.5">
      <Users size={15} className="shrink-0 text-st-text-2" />
      <span className="min-w-0 flex-1 leading-tight">
        <span className="block truncate text-[13px] font-semibold text-st-text">
          {resa.clientLabel ?? "Réservation liée"}
          {resa.date_vol && (
            <span className="font-medium text-st-muted">
              {" · "}
              {new Date(resa.date_vol + "T12:00:00Z").toLocaleDateString("fr-BE", { weekday: "short", day: "numeric", month: "short" })}
            </span>
          )}
        </span>
        <span className="block truncate text-[12px] text-st-muted">
          {resa.passagers ?? 1} passager{(resa.passagers ?? 1) > 1 ? "s" : ""} · {resa.poids_total != null ? `${resa.poids_total} kg` : "poids non renseigné"}
        </span>
      </span>
      <Button variant="secondary" size="sm" onClick={importFromResa}>
        Importer les poids
      </Button>
    </div>
  );

  // Visible au bureau, ou sur l'onglet choisi au téléphone.
  const onTab = (t: typeof tab) => (tab === t ? "block" : "hidden lg:block");
  const bigNum = "st-num text-[24px] font-medium leading-tight tracking-[-0.03em]";

  return (
    <div className="space-y-5">
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

      {/* ═══ Verdict — téléphone : barre compacte collée en haut + onglets ═══ */}
      <div className="sticky top-[env(safe-area-inset-top)] z-20 -mx-4 space-y-2 bg-st-bg/90 px-4 pb-2 pt-1 backdrop-blur-xl sm:-mx-6 sm:px-6 lg:hidden">
        <div className="flex items-center gap-3 rounded-[18px] border border-st-line bg-white px-3.5 py-3 shadow-st-sm">
          <span className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-[12px] text-white", V.tile)}>
            <VIcon size={20} />
          </span>
          <div className="min-w-0 flex-1">
            <p className={cn("truncate text-[16px] font-semibold", V.text)}>{V.title}</p>
            <p className="st-num truncate text-[12.5px] text-st-muted">
              <span className={massOver ? "font-semibold text-st-bad" : ""}>{fr(computed.tom, 1)} / {MASS_MAX} kg</span>
              {" · "}
              <span className={cgOut ? "font-semibold text-st-bad" : ""}>CG {fr(computed.cgTom, 3)} m</span>
            </p>
          </div>
        </div>
        <Segmented
          fill
          value={tab}
          onChange={setTab}
          items={[
            { key: "chargement", label: "Chargement" },
            { key: "perfs", label: "Perfs" },
            { key: "detail", label: "Détail" },
          ]}
        />
      </div>
      {resa && <div className="lg:hidden">{resaChip}</div>}

      {/* ═══ Verdict — bureau : carte composée ═══ */}
      <Card padded={false} className="hidden overflow-hidden lg:block">
        <div className="flex items-center justify-between gap-4 p-5">
          <div className="flex min-w-0 items-center gap-3.5">
            <span className={cn("grid h-12 w-12 shrink-0 place-items-center rounded-[14px] text-white", V.tile)}>
              <VIcon size={24} />
            </span>
            <div className="min-w-0">
              <p className={cn("text-[22px] font-semibold tracking-[-0.02em]", V.text)}>{V.title}</p>
              <p className="text-[13px] text-st-muted">{V.sub}</p>
            </div>
          </div>
          {resa && <div className="max-w-[440px] shrink-0">{resaChip}</div>}
        </div>
        <CardSplit>
          <div>
            <p className="text-[12.5px] text-st-muted">Masse au décollage</p>
            <p className={cn(bigNum, massOver ? "text-st-bad" : "text-st-text")}>
              {fr(computed.tom, 1)} <span className="text-[14px] text-st-muted">/ {MASS_MAX} kg</span>
            </p>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-st-surface-hover">
              <div className={cn("h-full rounded-full", massOver ? "bg-st-bad" : "bg-st-ink")} style={{ width: `${massPct}%` }} />
            </div>
            <p className="mt-1.5 text-[12px] text-st-muted">
              {massOver ? `${fr(computed.tom - MASS_MAX, 1)} kg de trop` : `Reste ${fr(MASS_MAX - computed.tom, 1)} kg`}
            </p>
          </div>
          <div>
            <p className="text-[12.5px] text-st-muted">Centrage au décollage</p>
            <p className={cn(bigNum, cgOut ? "text-st-bad" : "text-st-text")}>
              {fr(computed.cgTom, 3)} <span className="text-[14px] text-st-muted">m</span>
            </p>
            <div className="relative mt-2 h-1.5 rounded-full bg-st-surface-hover">
              <div className="absolute inset-y-0 rounded-full bg-st-ok/25" style={{ left: `${pos(fwd)}%`, right: `${100 - pos(CG_AFT)}%` }} />
              <div className={cn("absolute -top-1 h-3.5 w-[3px] -translate-x-1/2 rounded-full", cgOut ? "bg-st-bad" : "bg-st-ink")} style={{ left: `${pos(computed.cgTom)}%` }} />
            </div>
            <p className="mt-1.5 text-[12px] text-st-muted">Limites {fr(fwd, 3)} à {fr(CG_AFT, 2)} m</p>
          </div>
          <div>
            <p className="text-[12.5px] text-st-muted">Marge décollage{depIcao ? ` · ${depIcao}` : ""}</p>
            <p className={cn(bigNum, marginTone(depMargin))}>
              {signed(depMargin)} <span className="text-[14px] text-st-muted">m</span>
            </p>
            <p className="mt-1.5 text-[12px] text-st-muted">
              {computed.perf.dep.todr125 != null ? `TODR×1,25 ${computed.perf.dep.todr125} m` : "TODR à calculer"}
              {computed.perf.dep.toda != null ? ` · TODA ${computed.perf.dep.toda} m` : ""}
            </p>
          </div>
          <div>
            <p className="text-[12.5px] text-st-muted">Marge atterrissage{destIcao ? ` · ${destIcao}` : ""}</p>
            <p className={cn(bigNum, marginTone(ldgMargin))}>
              {signed(ldgMargin)} <span className="text-[14px] text-st-muted">m</span>
            </p>
            <p className="mt-1.5 text-[12px] text-st-muted">
              {computed.perf.ldg.ldr != null ? `LDR ${computed.perf.ldg.ldr} m` : "LDR à calculer"} · pire cas dest. / alt.
            </p>
          </div>
        </CardSplit>
      </Card>

      {/* ═══ Chargement (largeur fixe) | Enveloppe et calcul (le reste) ═══
          Principe de composition : la saisie garde 380 px, le résultat prend
          toute la place restante ; à partir de xl l'enveloppe et le tableau
          s'y partagent la largeur à parts égales, alignés en haut. */}
      <div className="grid items-start gap-5 lg:grid-cols-[380px_minmax(0,1fr)]">
        <Card className={onTab("chargement")}>
          <SectionHeader
            title="Chargement"
            action={
              <span className="text-[12.5px] text-st-muted">
                {occupants} occupant{occupants > 1 ? "s" : ""}{inputs.bag > 0 ? " + bagages" : ""}
              </span>
            }
          />
          <div className="mt-3">
            <ChargementFields inputs={inputs} computedFuelL={computed.fuelL} computedFuelKg={computed.fuelKg} patch={patch} />
          </div>
        </Card>

        <Card className={onTab("detail")}>
          <SectionHeader
            title="Enveloppe et calcul"
            action={
              computed.withinLimits
                ? <Badge tone="success">Catégorie {computed.category}</Badge>
                : <Badge tone="danger">Hors limites</Badge>
            }
          />
          <div className="mt-3 grid items-start gap-5 xl:grid-cols-2">
            <div className="min-w-0">
              <CgEnvelopeChart points={computed.points} />
            </div>
            <div className="min-w-0 overflow-x-auto">
              <table className="st-num w-full border-separate border-spacing-0 text-[12.5px]">
                <thead>
                  <tr>
                    {["Poste", "Masse", "Bras", "Moment"].map((h, i) => (
                      <th
                        key={h}
                        className={cn(
                          "h-8 bg-st-surface px-2 font-medium text-st-muted first:rounded-l-[8px] last:rounded-r-[8px]",
                          i === 0 ? "text-left" : "text-right",
                        )}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {computed.rows.map((row, i) => {
                    const cell = cn(
                      "px-2 py-1.5 text-right",
                      row.total ? "bg-st-surface font-semibold" : "border-t border-st-line-soft",
                      row.out && "text-st-bad",
                    );
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
            </div>
          </div>
          {!computed.withinLimits && (
            <ul className="mt-3 list-disc space-y-0.5 pl-4 text-[12.5px] text-st-bad">
              {computed.issues.map((it, i) => <li key={i}>{it}</li>)}
            </ul>
          )}
          <p className="mt-3 text-[12px] text-st-muted">
            Limites : avant 2,40 m (jusqu&apos;à 980 kg) → 2,46 m à 1150 kg ; arrière 2,59 m ; Utility ≤ 980 kg ;
            mini 780 kg. Réf. NewCAG rév. 4.1, vérifier l&apos;AFM.
          </p>
        </Card>
      </div>

      {/* ═══ Performances ═══ */}
      <Card padded={false} className={cn("overflow-hidden", onTab("perfs"))}>
        <div className="px-4 pb-1 pt-4 sm:px-5 sm:pt-5">
          <SectionHeader
            title="Performances"
            action={
              <Button variant="secondary" size="sm" onClick={() => setPerfModalOpen(true)}>
                <Pencil /> Modifier
              </Button>
            }
          />
        </div>
        <PerfResultBlocks perf={inputs.perf} computed={computed.perf} />
      </Card>

      <MbEditModal
        open={perfModalOpen}
        inputs={inputs}
        onClose={() => setPerfModalOpen(false)}
        patchAero={patchAero}
        patchPerf={patchPerf}
      />

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
