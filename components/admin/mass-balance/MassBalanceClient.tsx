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
    <div className="flex items-center justify-between gap-2 min-w-0">
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
        className={`w-[72px] shrink-0 h-8 px-2 rounded-md border bg-background text-sm font-mono tabular-nums text-right focus:outline-none focus:ring-2 focus:ring-ring [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${
          bad ? "border-red-500 bg-red-50" : "border-input"
        }`}
      />
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
    // Ouvre l'onglet tout de suite (dans le geste du clic) pour éviter le blocage popup.
    const win = window.open("", "_blank");
    try {
      const res = await fetch("/api/admin/mass-balance/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inputs,
          clientLabel: label || resa?.clientLabel || null,
        }),
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

  return (
    <div className="space-y-5">
      {/* Contexte réservation */}
      {resa && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 rounded-xl border border-navy/15 bg-navy/5 px-4 py-3">
          <Users size={14} className="text-navy shrink-0" />
          <span className="text-sm font-semibold text-foreground">
            {resa.clientLabel ?? "Réservation liée"}
          </span>
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

      <div className="flex flex-col gap-5 xl:flex-row xl:items-start">
        {/* ─── Chargement ─── */}
        <div className="card-premium p-4 space-y-3 h-fit xl:w-[440px] xl:shrink-0">
          <h2 className="text-base font-semibold text-foreground">Chargement</h2>

          <div className="grid grid-cols-[1fr_auto] gap-2 items-end">
            <label className="block space-y-1">
              <span className="text-[11px] font-medium text-muted-foreground">Avion</span>
              <select
                value={inputs.aircraftReg}
                onChange={(e) => patch({ aircraftReg: e.target.value })}
                className="w-full h-8 px-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring cursor-pointer"
              >
                {AIRCRAFT.map(([r]) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </label>
            <label className="block space-y-1">
              <span className="text-[11px] font-medium text-muted-foreground">Date</span>
              <input
                type="date"
                value={inputs.flightDate}
                onChange={(e) => patch({ flightDate: e.target.value })}
                className="h-8 px-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </label>
          </div>
          <p className="text-[11px] text-muted-foreground">
            {reg} — masse à vide {fr(bem)} kg · bras {fr(bemArm, 3)} m
          </p>

          <div className="border-t border-border pt-3 grid grid-cols-2 gap-x-4 gap-y-1.5">
            <LoadRow label="Pilote" sub="2,30" value={inputs.pilot} onChange={(v) => patch({ pilot: v })} />
            <LoadRow label="Pax avant" sub="2,30" value={inputs.fpax} onChange={(v) => patch({ fpax: v })} />
            <LoadRow label="Pax arrière 1" sub="3,25" value={inputs.rpax1} onChange={(v) => patch({ rpax1: v })} />
            <LoadRow label="Pax arrière 2" sub="3,25" value={inputs.rpax2} onChange={(v) => patch({ rpax2: v })} />
            <LoadRow
              label="Bagages"
              sub="≤30 · 3,65"
              value={inputs.bag}
              onChange={(v) => patch({ bag: v })}
              bad={inputs.bag > 30}
            />
          </div>

          <div className="border-t border-border pt-3 space-y-1.5">
            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
              <LoadRow
                label="Carburant"
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
            <p className="text-[11px] text-muted-foreground pt-0.5">
              Plein {FUEL_MAX_GAL} gal · embarqué = {fr(computed.fuelL, 0)} l / {fr(computed.fuelKg, 1)} kg · roulage − 1,5 kg.
            </p>
          </div>

          {/* Actions */}
          <div className="border-t border-border pt-3.5 space-y-3">
            <label className="block space-y-1">
              <span className="text-xs font-medium text-foreground">Libellé (optionnel)</span>
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
        </div>

        {/* ─── Résultat ─── */}
        <div className="card-premium p-5 space-y-4 min-w-0 xl:flex-1 xl:max-w-[900px]">
          <h2 className="text-base font-semibold text-foreground">Feuille de masse et centrage</h2>

          <div className="flex flex-col gap-5 lg:flex-row lg:items-start">
          <div className="min-w-0 flex-1 overflow-x-auto">
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
                {computed.rows.map((r, i) => (
                  <tr key={i} className={r.total ? "bg-secondary font-semibold" : ""}>
                    <td className={`border border-border px-2 py-1.5 text-left font-sans ${r.out ? "text-red-600 font-semibold" : ""}`}>
                      {r.poste}
                      {r.sub && <span className="block text-[11px] text-muted-foreground font-normal">{r.sub}</span>}
                    </td>
                    <td className={`border border-border px-2 py-1.5 text-right ${r.out ? "text-red-600" : ""}`}>
                      {fr(r.masse, 1)}
                    </td>
                    <td className="border border-border px-2 py-1.5 text-right">
                      {r.bras == null ? "—" : fr(r.bras, r.total ? 3 : r.bras < 3 ? 2 : 3)}
                    </td>
                    <td className={`border border-border px-2 py-1.5 text-right ${r.out ? "text-red-600" : ""}`}>
                      {fr(r.moment, 2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="w-full lg:w-[340px] lg:shrink-0 space-y-3">
            <div className="mx-auto w-full max-w-[400px] lg:mx-0">
              <CgEnvelopeChart points={computed.points} />
            </div>
            {computed.withinLimits ? (
              <p className="rounded-lg border border-green-300 bg-green-50 px-3 py-2.5 text-sm font-semibold text-green-700">
                Dans les limites — catégorie {computed.category}
              </p>
            ) : (
              <div className="rounded-lg border border-red-300 bg-red-50 px-3 py-2.5 text-sm font-semibold text-red-700">
                Hors limites — vol non autorisé en l&apos;état
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
          </div>
        </div>
      </div>

      {/* ─── Performances ─── */}
      <div className="card-premium p-5 space-y-3">
        <div className="flex items-baseline gap-3 flex-wrap">
          <h2 className="text-base font-semibold text-foreground">Performances</h2>
          <p className="text-[11px] text-muted-foreground">
            ICAO connu (EBCI, EBNM, LFAT, EHMZ) → METAR, pistes, cap, élévation, TODA / LDA. Abaques AFM DA40.
          </p>
        </div>
        <PerfSection
          perf={inputs.perf}
          computed={computed.perf}
          onChangeAero={patchAero}
          onChange={patchPerf}
        />
      </div>

      {/* ─── Historique ─── */}
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
