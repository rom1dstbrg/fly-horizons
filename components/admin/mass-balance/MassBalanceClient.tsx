"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, Download, RotateCcw, Save, Users } from "lucide-react";
import {
  computeMassBalance,
  defaultInputs,
  splitPassengerWeight,
  type MassBalanceInputs,
  type AerodromeInput,
  type PerfInputs,
} from "@/lib/mass-balance/da40-calc";
import { AIRCRAFT, FUEL_MAX_GAL } from "@/lib/mass-balance/da40-data";
import { saveMassBalanceSheet, updateMassBalanceSheet } from "@/lib/actions/mass-balance";
import { CgEnvelopeChart } from "./CgEnvelopeChart";
import { PerfSection } from "./PerfSection";
import { SheetsList, type MbSheetRow } from "./SheetsList";

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

// ── Petits blocs de structure ─────────────────────────────────────────────

function Section({
  n,
  title,
  subtitle,
  children,
}: {
  n: string;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="card-premium p-4 sm:p-5">
      <div className="mb-4 flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
        <span className="flex h-6 w-6 shrink-0 translate-y-0.5 items-center justify-center rounded-full bg-navy text-[11px] font-bold text-white">
          {n}
        </span>
        <h2 className="text-base font-semibold text-foreground">{title}</h2>
        {subtitle && <span className="text-[11px] text-muted-foreground">{subtitle}</span>}
      </div>
      {children}
    </section>
  );
}

function LoadRow({
  label,
  sub,
  value,
  onChange,
  step = 1,
  bad,
}: {
  label: string;
  sub?: string;
  value: number;
  onChange: (n: number) => void;
  step?: number;
  bad?: boolean;
}) {
  return (
    <label className="flex items-center justify-between gap-2 min-w-0">
      <span className="text-xs text-foreground truncate">
        {label}
        {sub && <span className="text-[11px] text-muted-foreground"> · {sub}</span>}
      </span>
      <input
        type="number"
        inputMode="decimal"
        min={0}
        step={step}
        value={value}
        onChange={(e) => onChange(e.target.value === "" ? 0 : Number(e.target.value))}
        className={`w-[74px] shrink-0 h-8 px-2 rounded-md border bg-background text-sm font-mono tabular-nums text-right focus:outline-none focus:ring-2 focus:ring-ring [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${
          bad ? "border-red-500 bg-red-50" : "border-input"
        }`}
      />
    </label>
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

// ── Composant ─────────────────────────────────────────────────────────────

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

  const computed = useMemo(() => computeMassBalance(inputs), [inputs]);

  const patch = (p: Partial<MassBalanceInputs>) => setInputs((prev) => ({ ...prev, ...p }));
  const patchAero = (which: "dep" | "dest" | "alt", p: Partial<AerodromeInput>) =>
    setInputs((prev) => ({
      ...prev,
      perf: { ...prev.perf, [which]: { ...prev.perf[which], ...p } },
    }));
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

  const [reg, bem, bemArm] = AIRCRAFT.find((a) => a[0] === inputs.aircraftReg) ?? AIRCRAFT[0];

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
          <span className="text-xs text-muted-foreground">
            {resa.passagers ?? 1} pax ·{" "}
            {resa.poids_total != null ? `${resa.poids_total} kg au total` : "poids non renseigné"}
          </span>
          <button
            type="button"
            onClick={importFromResa}
            className="ml-auto inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-navy text-white text-xs font-semibold hover:bg-navy/90 transition-colors cursor-pointer"
          >
            Importer les poids
          </button>
        </div>
      )}

      {/* ═══ 1 · LE VOL ═══ */}
      <Section n="1" title="Le vol">
        <div className="flex flex-wrap items-end gap-4">
          <label className="space-y-1">
            <span className="block text-[11px] font-medium text-muted-foreground">Avion</span>
            <select
              value={inputs.aircraftReg}
              onChange={(e) => patch({ aircraftReg: e.target.value })}
              className="h-9 px-2.5 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring cursor-pointer"
            >
              {AIRCRAFT.map(([r]) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1">
            <span className="block text-[11px] font-medium text-muted-foreground">Date du vol</span>
            <input
              type="date"
              value={inputs.flightDate}
              onChange={(e) => patch({ flightDate: e.target.value })}
              className="h-9 px-2.5 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </label>
          <p className="text-[11px] text-muted-foreground pb-2">
            {reg} — masse à vide <span className="font-mono">{fr(bem)}</span> kg · bras{" "}
            <span className="font-mono">{fr(bemArm, 3)}</span> m
          </p>
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">
          Les aérodromes (départ, destination, alternate) et la météo se règlent au § 3.
        </p>
      </Section>

      {/* ═══ 2 · CHARGEMENT ═══ */}
      <Section n="2" title="Chargement" subtitle="masse et centrage">
        <div className="grid gap-5 lg:grid-cols-[minmax(0,360px)_1fr] lg:items-start">
          {/* saisie */}
          <div className="space-y-3">
            <div className="space-y-1.5">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Carburant</p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                <LoadRow
                  label="Plein"
                  sub="gal"
                  value={inputs.fuelGal}
                  onChange={(v) => patch({ fuelGal: v })}
                  step={0.5}
                  bad={inputs.fuelGal > FUEL_MAX_GAL}
                />
                <LoadRow
                  label="Trajet"
                  sub="gal"
                  value={inputs.tripGal}
                  onChange={(v) => patch({ tripGal: v })}
                  step={0.5}
                  bad={inputs.tripGal > inputs.fuelGal}
                />
              </div>
              <p className="text-[11px] text-muted-foreground">
                Plein max {FUEL_MAX_GAL} gal · embarqué {fr(computed.fuelL, 0)} l / {fr(computed.fuelKg, 1)} kg · roulage − 1,5 kg.
              </p>
            </div>

            <div className="space-y-1.5 border-t border-border pt-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Occupants &amp; bagages</p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                <LoadRow label="Pilote" sub="2,30 m" value={inputs.pilot} onChange={(v) => patch({ pilot: v })} />
                <LoadRow label="Pax avant" sub="2,30 m" value={inputs.fpax} onChange={(v) => patch({ fpax: v })} />
                <LoadRow label="Pax arrière 1" sub="3,25 m" value={inputs.rpax1} onChange={(v) => patch({ rpax1: v })} />
                <LoadRow label="Pax arrière 2" sub="3,25 m" value={inputs.rpax2} onChange={(v) => patch({ rpax2: v })} />
                <LoadRow
                  label="Bagages"
                  sub="≤ 30 · 3,65 m"
                  value={inputs.bag}
                  onChange={(v) => patch({ bag: v })}
                  bad={inputs.bag > 30}
                />
              </div>
            </div>
          </div>

          {/* résultat */}
          <div className="space-y-3 min-w-0">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr>
                    {["Poste", "Masse (kg)", "Bras (m)", "Moment (kgm)"].map((h, i) => (
                      <th
                        key={h}
                        className={`border border-border bg-secondary px-2 py-1.5 font-semibold ${
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
                        className={`border border-border px-2 py-1.5 text-left font-sans ${
                          row.out ? "text-red-600 font-semibold" : ""
                        }`}
                      >
                        {row.poste}
                        {row.sub && (
                          <span className="block text-[11px] text-muted-foreground font-normal">{row.sub}</span>
                        )}
                      </td>
                      <td className={`border border-border px-2 py-1.5 text-right ${row.out ? "text-red-600" : ""}`}>
                        {fr(row.masse, 1)}
                      </td>
                      <td className="border border-border px-2 py-1.5 text-right">
                        {row.bras == null ? "—" : fr(row.bras, row.total ? 3 : row.bras < 3 ? 2 : 3)}
                      </td>
                      <td className={`border border-border px-2 py-1.5 text-right ${row.out ? "text-red-600" : ""}`}>
                        {fr(row.moment, 2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
              <div className="space-y-2 order-2 sm:order-1">
                {computed.withinLimits ? (
                  <p className="rounded-lg border border-green-300 bg-green-50 px-3 py-2 text-sm font-semibold text-green-700">
                    Centrage dans l&apos;enveloppe — catégorie {computed.category}
                  </p>
                ) : (
                  <div className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
                    Centrage hors limites
                    <ul className="mt-1.5 ml-4 list-disc text-xs font-normal">
                      {computed.issues.map((it, i) => (
                        <li key={i}>{it}</li>
                      ))}
                    </ul>
                  </div>
                )}
                <p className="text-[11px] text-muted-foreground">
                  Limites : avant 2,40 m (jusqu&apos;à 980 kg) → 2,46 m à 1150 kg ; arrière 2,59 m ; Utility ≤ 980 kg ;
                  mini 780 kg. Réf. NewCAG rév. 4.1 — vérifier l&apos;AFM.
                </p>
              </div>
              <div className="order-1 sm:order-2 w-full sm:w-[300px] mx-auto sm:mx-0">
                <CgEnvelopeChart points={computed.points} />
              </div>
            </div>
          </div>
        </div>
      </Section>

      {/* ═══ 3 · PERFORMANCES ═══ */}
      <Section
        n="3"
        title="Performances"
        subtitle="TODR / LDR — ICAO connu (EBCI, EBNM, LFAT, EHMZ) → METAR, pistes, cap, élévation, TODA / LDA"
      >
        <PerfSection perf={inputs.perf} computed={computed.perf} onChangeAero={patchAero} onChange={patchPerf} />
      </Section>

      {/* ═══ 4 · VERDICT ═══ */}
      <Section n="4" title="Verdict &amp; feuille">
        {overall === "go" && (
          <p className="rounded-lg border border-green-300 bg-green-50 px-4 py-3 text-base font-bold text-green-700">
            GO — masse, centrage et performances dans les limites.
          </p>
        )}
        {overall === "incomplet" && (
          <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
            Masse et centrage OK. Performances incomplètes — renseignez TODA / LDA (et METAR) au § 3 pour conclure.
          </div>
        )}
        {overall === "nogo" && (
          <div className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            <p className="text-base font-bold">NO-GO — vol non autorisé en l&apos;état.</p>
            <ul className="mt-1.5 ml-4 list-disc text-xs font-normal">
              {!computed.withinLimits && computed.issues.map((it, i) => <li key={`c${i}`}>{it}</li>)}
              {perfKo.map((v, i) => (
                <li key={`p${i}`}>{v.message}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-4 space-y-3 border-t border-border pt-4">
          <label className="block space-y-1 max-w-sm">
            <span className="text-xs font-medium text-foreground">Libellé de la feuille (optionnel)</span>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="ex. Baptême Dupont"
              className="w-full h-9 px-2.5 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
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
      </Section>

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
    </div>
  );
}
