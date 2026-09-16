"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, Download, RotateCcw, Save, Users, Pencil, CheckCircle2, AlertTriangle } from "lucide-react";
import {
  computeMassBalance,
  defaultInputs,
  splitPassengerWeight,
  type MassBalanceInputs,
  type AerodromeInput,
  type PerfInputs,
} from "@/lib/mass-balance/da40-calc";
import { saveMassBalanceSheet, updateMassBalanceSheet } from "@/lib/actions/mass-balance";
import { CgEnvelopeChart } from "./CgEnvelopeChart";
import { PerfResultBlocks } from "./PerfResultBlocks";
import { MbEditModal } from "./MbEditModal";
import { SheetsList, type MbSheetRow } from "./SheetsList";
import { MB } from "./fields";

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

function NumBadge({ n }: { n: string }) {
  return (
    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-navy text-[10px] font-bold text-white">
      {n}
    </span>
  );
}

function SectionHeader({ n, title, onEdit }: { n: string; title: string; onEdit?: () => void }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-2">
      <div className="flex items-center gap-2">
        <NumBadge n={n} />
        <h2 className="text-[11px] font-bold text-foreground uppercase tracking-[1.4px]">{title}</h2>
      </div>
      {onEdit && (
        <button
          type="button"
          onClick={onEdit}
          className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md border border-border text-[11px] font-semibold text-foreground hover:bg-secondary transition-colors cursor-pointer"
        >
          <Pencil size={11} />
          Modifier
        </button>
      )}
    </div>
  );
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
  const [modalTab, setModalTab] = useState<"chargement" | "performances" | null>(null);

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
    setModalTab("chargement");
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
  }

  function duplicateSheet(s: MbSheetRow) {
    setInputs(s.inputs);
    setCurrentId(null);
    setLabel((s.label ?? "").trim() ? `${s.label} (copie)` : "");
    setSaved(false);
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

  const banner =
    overall === "go"
      ? { tone: "border-green-200 bg-green-50", dot: "bg-green-600", icon: CheckCircle2, iconCls: "text-white", title: "GO — vol autorisé", titleCls: "text-green-700", sub: `Masse, centrage et performances dans les limites — catégorie ${computed.category}.`, subCls: "text-green-800/70" }
      : overall === "incomplet"
        ? { tone: "border-amber-200 bg-amber-50", dot: "bg-amber-500", icon: AlertTriangle, iconCls: "text-white", title: "Incomplet — performances à renseigner", titleCls: "text-amber-800", sub: "Masse et centrage OK. Renseignez les conditions et TODA / LDA au § 3 pour conclure.", subCls: "text-amber-800/70" }
        : { tone: "border-red-200 bg-red-50", dot: "bg-red-600", icon: AlertTriangle, iconCls: "text-white", title: "NO-GO — vol non autorisé en l'état", titleCls: "text-red-700", sub: [...(!computed.withinLimits ? computed.issues : []), ...perfKo.map((v) => v.message)].join(" · ") || "Vérifiez la masse, le centrage et les performances.", subCls: "text-red-800/70" };
  const BannerIcon = banner.icon;

  return (
    <div className="space-y-4">
      {/* Contexte réservation */}
      {resa && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 rounded-xl border border-navy/15 bg-navy/5 px-4 py-3">
          <Users size={14} className="text-navy shrink-0" />
          <span className="text-sm font-semibold text-foreground">{resa.clientLabel ?? "Réservation liée"}</span>
          {resa.date_vol && (
            <span className="text-sm text-muted-foreground">
              {new Date(resa.date_vol + "T12:00:00Z").toLocaleDateString("fr-BE", {
                weekday: "long",
                day: "numeric",
                month: "long",
              })}
            </span>
          )}
          <span className={MB.help}>
            {resa.passagers ?? 1} pax ·{" "}
            {resa.poids_total != null ? `${resa.poids_total} kg au total` : "poids non renseigné"}
          </span>
          <button
            type="button"
            onClick={importFromResa}
            className="ml-auto inline-flex items-center gap-1.5 h-9 px-3 rounded-lg bg-navy text-white text-xs font-semibold hover:bg-navy/90 transition-colors cursor-pointer"
          >
            Importer les poids
          </button>
        </div>
      )}

      {/* ═══ GO / NO-GO ═══ */}
      <div className={`rounded-xl border ${banner.tone} px-4 sm:px-5 py-4 flex flex-wrap items-center gap-4`}>
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${banner.dot}`}>
          <BannerIcon size={20} className={banner.iconCls} />
        </div>
        <div className="min-w-[220px] flex-1">
          <p className={`text-lg font-extrabold tracking-tight ${banner.titleCls}`}>{banner.title}</p>
          <p className={`text-xs mt-0.5 ${banner.subCls}`}>{banner.sub}</p>
        </div>
        <div className="flex flex-wrap gap-x-6 gap-y-2 sm:pl-5 sm:border-l sm:border-black/10">
          <div>
            <span className="block text-[9px] font-bold uppercase tracking-wide text-muted-foreground/70">Masse totale</span>
            <span className="font-mono text-sm font-bold text-foreground">
              {fr(computed.tom, 1)} <span className="text-[10px] font-semibold text-muted-foreground">/ 1150 kg</span>
            </span>
          </div>
          <div>
            <span className="block text-[9px] font-bold uppercase tracking-wide text-muted-foreground/70">Centrage</span>
            <span className="font-mono text-sm font-bold text-foreground">{fr(computed.cgTom, 3)} m</span>
          </div>
          <div>
            <span className="block text-[9px] font-bold uppercase tracking-wide text-muted-foreground/70">Marge décollage</span>
            <span className="font-mono text-sm font-bold text-foreground">
              {depMargin != null ? `${depMargin >= 0 ? "+" : ""}${depMargin} m` : "—"}
            </span>
          </div>
          <div>
            <span className="block text-[9px] font-bold uppercase tracking-wide text-muted-foreground/70">Marge atterrissage</span>
            <span className="font-mono text-sm font-bold text-foreground">
              {ldgMargin != null ? `${ldgMargin >= 0 ? "+" : ""}${ldgMargin} m` : "—"}
            </span>
          </div>
        </div>
      </div>

      <div className="space-y-5">

        {/* ═══ 1 · CHARGEMENT ═══ */}
        <div>
          <SectionHeader n="1" title="Chargement" onEdit={() => setModalTab("chargement")} />
          <div className="card-premium p-4 sm:p-5 max-w-[900px] space-y-4">
            {/* Résumé — une seule info, pas reprise ailleurs (le carburant est déjà dans le tableau) */}
            <p className="text-sm font-semibold text-foreground pb-3 border-b border-border">
              {1 + [inputs.fpax, inputs.rpax1, inputs.rpax2].filter((v) => v > 0).length} occupant
              {inputs.fpax + inputs.rpax1 + inputs.rpax2 > 0 ? "s" : ""}
              {inputs.bag > 0 ? " + bagages" : ""}
            </p>

            {/* Tableau et enveloppe — même poids visuel, même hauteur, une seule paire */}
            <div className="flex flex-col lg:flex-row lg:items-start gap-6">
              <div className="lg:w-[400px] shrink-0 min-w-0 overflow-x-auto">
                <table className="w-full border-collapse text-xs">
                  <thead>
                    <tr>
                      {["Poste", "Masse", "Bras", "Moment"].map((h, i) => (
                        <th
                          key={h}
                          className={`border border-border bg-secondary px-1.5 py-1 font-semibold ${
                            i === 0 ? "text-left" : "text-right"
                          }`}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="font-mono tabular-nums">
                    {computed.rows.map((row, i) => (
                      <tr key={i} className={row.total ? "bg-secondary font-semibold" : ""}>
                        <td
                          className={`border border-border px-1.5 py-1 text-left font-sans ${
                            row.out ? "text-red-600 font-semibold" : ""
                          }`}
                        >
                          {row.poste}
                          {row.sub && (
                            <span className={`block ${MB.help} font-normal`}>{row.sub}</span>
                          )}
                        </td>
                        <td className={`border border-border px-1.5 py-1 text-right ${row.out ? "text-red-600" : ""}`}>
                          {fr(row.masse, 1)}
                        </td>
                        <td className="border border-border px-1.5 py-1 text-right">
                          {row.bras == null ? "—" : fr(row.bras, row.total ? 3 : row.bras < 3 ? 2 : 3)}
                        </td>
                        <td className={`border border-border px-1.5 py-1 text-right ${row.out ? "text-red-600" : ""}`}>
                          {fr(row.moment, 2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="lg:w-[420px] shrink-0 min-w-0">
                <div className="flex items-center justify-between mb-2">
                  <p className={MB.groupLabel}>Enveloppe de centrage</p>
                  {computed.withinLimits ? (
                    <span className="text-xs font-semibold text-green-700">Catégorie {computed.category}</span>
                  ) : (
                    <span className="text-xs font-semibold text-red-700">Hors limites</span>
                  )}
                </div>
                <CgEnvelopeChart points={computed.points} />
              </div>
            </div>

            {/* Note de référence — partagée, une seule fois, sous la paire */}
            {!computed.withinLimits && (
              <ul className="ml-4 list-disc text-xs text-red-700">
                {computed.issues.map((it, i) => (
                  <li key={i}>{it}</li>
                ))}
              </ul>
            )}
            <p className={MB.help}>
              Limites : avant 2,40 m (jusqu&apos;à 980 kg) → 2,46 m à 1150 kg ; arrière 2,59 m ; Utility ≤ 980 kg ; mini
              780 kg. Réf. NewCAG rév. 4.1 — vérifier l&apos;AFM.
            </p>
          </div>
        </div>

        {/* ═══ 2 · PERFORMANCES ═══ */}
        <div className="space-y-3">
          <SectionHeader n="2" title="Performances" onEdit={() => setModalTab("performances")} />
          <PerfResultBlocks perf={inputs.perf} computed={computed.perf} />

          {/* Enregistrement */}
          <div className="card-premium p-4 sm:p-5 space-y-3">
            <label className="block space-y-1 max-w-sm">
              <span className="text-xs font-medium text-foreground">Libellé de la feuille (optionnel)</span>
              <input
                type="text"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="ex. Baptême Dupont"
                className={`w-full ${MB.input} px-2.5`}
              />
            </label>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => save(false)}
                disabled={isPending}
                className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg bg-navy text-white text-sm font-semibold hover:bg-navy/90 transition-colors disabled:opacity-50 cursor-pointer"
              >
                {isPending ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                {currentId ? "Mettre à jour" : "Enregistrer"}
              </button>
              {currentId && (
                <button
                  type="button"
                  onClick={() => save(true)}
                  disabled={isPending}
                  className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-navy text-navy text-sm font-semibold hover:bg-navy hover:text-white transition-colors disabled:opacity-50 cursor-pointer"
                >
                  Enregistrer comme nouvelle
                </button>
              )}
              <button
                type="button"
                onClick={previewPdf}
                disabled={previewing}
                className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-border text-sm font-semibold hover:bg-secondary transition-colors disabled:opacity-50 cursor-pointer"
              >
                {previewing ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                Aperçu PDF
              </button>
              <button
                type="button"
                onClick={reset}
                className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-border text-sm font-medium hover:bg-secondary transition-colors cursor-pointer"
              >
                <RotateCcw size={14} /> Réinitialiser
              </button>
            </div>
            {saved && (
              <p className="inline-flex items-center gap-1 text-xs font-medium text-green-600">
                <Check size={13} /> Enregistré
              </p>
            )}
            {error && <p className="text-xs text-red-600">{error}</p>}
          </div>
        </div>
      </div>

      {/* ═══ Historique ═══ */}
      <div className="space-y-3">
        <h2 className="text-base font-semibold text-foreground">Feuilles enregistrées</h2>
        <SheetsList
          sheets={sheets}
          currentId={currentId}
          onOpen={openSheet}
          onDuplicate={duplicateSheet}
          viewerRole={viewerRole}
        />
      </div>

      {modalTab && (
        <MbEditModal
          inputs={inputs}
          computedFuelL={computed.fuelL}
          computedFuelKg={computed.fuelKg}
          tab={modalTab}
          onTabChange={setModalTab}
          onClose={() => setModalTab(null)}
          patch={patch}
          patchAero={patchAero}
          patchPerf={patchPerf}
        />
      )}
    </div>
  );
}
