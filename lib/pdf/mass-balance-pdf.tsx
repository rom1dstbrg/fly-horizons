import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  Svg,
  Line,
  Polyline,
  Polygon,
  Rect,
  Circle,
  G,
  Text as SvgText,
} from "@react-pdf/renderer";
import type { MassBalanceInputs, MassBalanceComputed, Verdict } from "@/lib/mass-balance/da40-calc";
import { buildEnvelopeGeometry } from "@/lib/mass-balance/envelope-geometry";

const NAVY = "#062548";
const GOLD = "#F6C000";
const INK = "#1c2733";
const MUTED = "#64748b";
const BORDER = "#c9d2db";
const BAND = "#e7ecf2";
const BG = "#f3f5f8";
const RED = "#b3261e";
const GREEN = "#1f7a4d";

export interface MassBalancePDFData {
  aircraftReg: string;
  flightDate: string | null;
  clientLabel?: string | null;
  inputs: MassBalanceInputs;
  computed: MassBalanceComputed;
}

function fr(v: number | null | undefined, d = 1): string {
  if (v == null || Number.isNaN(v)) return "—";
  return v.toLocaleString("fr-FR", { minimumFractionDigits: d, maximumFractionDigits: d });
}

function dateLabel(d: string | null): string {
  if (!d) return "—";
  const raw = d.length === 10 ? d + "T12:00:00Z" : d;
  return new Date(raw).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
}

function verdictColor(v: Verdict): string {
  return v.status === "ok" ? GREEN : v.status === "ko" ? RED : MUTED;
}

function weatherSummary(a: MassBalanceInputs["perf"]["dep"]): string {
  const bits: string[] = [];
  if (a.oat != null) bits.push(`${fr(a.oat, 0)} °C`);
  if (a.qnh != null) bits.push(`QNH ${fr(a.qnh, 0)}`);
  if (a.wdir != null || a.wspd != null)
    bits.push(`${a.wdir != null ? fr(a.wdir, 0) : "—"}°/${a.wspd != null ? fr(a.wspd, 0) : "—"} kt`);
  return bits.length ? bits.join("   ·   ") : "—";
}

// ── Enveloppe de centrage (SVG @react-pdf) ───────────────────────────────────

function EnvelopePdf({ computed }: { computed: MassBalanceComputed }) {
  const g = buildEnvelopeGeometry(computed.points);
  const c = g.colors;
  return (
    <Svg viewBox={`0 0 ${g.width} ${g.height}`} style={{ width: 232, height: 166 }}>
      {g.gridX.map((gx, i) => (
        <G key={`x${i}`}>
          <Line x1={gx.x} y1={g.gridTop} x2={gx.x} y2={g.gridBottom} stroke={c.grid} strokeWidth={1} />
          <SvgText x={gx.x} y={g.gridBottom + 18} textAnchor="middle" style={{ fontSize: 12, fill: c.muted }}>
            {gx.label}
          </SvgText>
        </G>
      ))}
      {g.gridY.map((gy, i) => (
        <G key={`y${i}`}>
          <Line x1={g.gridLeft} y1={gy.y} x2={g.gridRight} y2={gy.y} stroke={c.grid} strokeWidth={1} />
          <SvgText x={g.gridLeft - 8} y={gy.y + 4} textAnchor="end" style={{ fontSize: 12, fill: c.muted }}>
            {gy.label}
          </SvgText>
        </G>
      ))}
      <SvgText x={g.axisX.x} y={g.axisX.y} textAnchor="middle" style={{ fontSize: 12, fill: c.ink }}>
        {g.axisX.text}
      </SvgText>
      <Polygon points={g.envelopePoints} fill={c.fill} stroke={c.navy} strokeWidth={2} />
      <Line
        x1={g.utilityLine.x1}
        y1={g.utilityLine.y1}
        x2={g.utilityLine.x2}
        y2={g.utilityLine.y2}
        stroke={c.navy}
        strokeWidth={1.5}
      />
      {g.staticLabels.map((l, i) => (
        <SvgText
          key={`l${i}`}
          x={l.x}
          y={l.y}
          textAnchor="middle"
          style={{ fontSize: l.size, fill: i < 2 ? c.navy : c.muted }}
        >
          {l.text}
        </SvgText>
      ))}
      <Polyline points={g.trajectory} fill="none" stroke={c.muted} strokeWidth={1.5} strokeDasharray="4 3" />
      {g.markers.map((m, i) => (
        <G key={`m${i}`}>
          {m.type === "circle" && <Circle cx={m.x} cy={m.y} r={6} fill={m.color} />}
          {m.type === "square" && <Rect x={m.x - 5.5} y={m.y - 5.5} width={11} height={11} fill={m.color} />}
          {m.type === "triangle" && (
            <Polygon points={`${m.x},${m.y - 7} ${m.x - 6.5},${m.y + 5} ${m.x + 6.5},${m.y + 5}`} fill={m.color} />
          )}
          <SvgText x={m.x + 10} y={m.y + 4} style={{ fontSize: 12, fill: m.color }}>
            {m.label}
          </SvgText>
        </G>
      ))}
    </Svg>
  );
}

// ── Petits blocs ─────────────────────────────────────────────────────────────

function LoadCell({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flex: 1, paddingHorizontal: 7, paddingVertical: 4, borderRightWidth: 1, borderRightColor: BORDER }}>
      <Text style={{ fontSize: 6, color: MUTED }}>{label}</Text>
      <Text style={{ fontSize: 8.5, fontFamily: "Helvetica-Bold", color: INK }}>{value}</Text>
    </View>
  );
}

function Kv({ label, value, danger }: { label: string; value: string; danger?: boolean }) {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: BG,
        borderWidth: 1,
        borderColor: BORDER,
        borderRadius: 3,
        paddingHorizontal: 6,
        paddingVertical: 4,
      }}
    >
      <Text style={{ fontSize: 6, color: MUTED }}>{label}</Text>
      <Text style={{ fontSize: 9, fontFamily: "Helvetica-Bold", color: danger ? RED : INK }}>{value}</Text>
    </View>
  );
}

function VerdictLine({ v, style }: { v: Verdict; style?: object }) {
  return (
    <Text
      style={{
        fontSize: 7.5,
        fontFamily: "Helvetica-Bold",
        color: verdictColor(v),
        borderWidth: 1,
        borderColor: verdictColor(v),
        borderRadius: 3,
        paddingHorizontal: 6,
        paddingVertical: 3,
        ...(style ?? {}),
      }}
    >
      {v.message}
    </Text>
  );
}

// ── Tableau M&B ──────────────────────────────────────────────────────────────

function MbTable({ computed }: { computed: MassBalanceComputed }) {
  return (
    <View style={{ borderWidth: 1, borderColor: BORDER }}>
      {/* en-tête */}
      <View style={{ flexDirection: "row", backgroundColor: BAND }}>
        {["Poste", "Masse (kg)", "Bras (m)", "Moment (kgm)"].map((h, i) => (
          <Text
            key={h}
            style={{
              flex: i === 0 ? 3 : 1.4,
              fontSize: 7,
              fontFamily: "Helvetica-Bold",
              padding: 4,
              textAlign: i === 0 ? "left" : "right",
              borderRightWidth: i < 3 ? 1 : 0,
              borderRightColor: BORDER,
            }}
          >
            {h}
          </Text>
        ))}
      </View>
      {computed.rows.map((r, idx) => {
        const color = r.out ? RED : INK;
        return (
          <View
            key={idx}
            style={{
              flexDirection: "row",
              borderTopWidth: 1,
              borderTopColor: BORDER,
              backgroundColor: r.total ? BAND : "#ffffff",
            }}
          >
            <View style={{ flex: 3, padding: 4, borderRightWidth: 1, borderRightColor: BORDER }}>
              <Text style={{ fontSize: 7, fontFamily: r.total ? "Helvetica-Bold" : "Helvetica", color }}>
                {r.poste}
              </Text>
              {r.sub && <Text style={{ fontSize: 5.5, color: MUTED }}>{r.sub}</Text>}
            </View>
            <Text
              style={{
                flex: 1.4,
                padding: 4,
                fontSize: 7,
                textAlign: "right",
                fontFamily: r.total ? "Helvetica-Bold" : "Helvetica",
                color,
                borderRightWidth: 1,
                borderRightColor: BORDER,
              }}
            >
              {fr(r.masse, 1)}
            </Text>
            <Text
              style={{
                flex: 1.4,
                padding: 4,
                fontSize: 7,
                textAlign: "right",
                color,
                borderRightWidth: 1,
                borderRightColor: BORDER,
              }}
            >
              {r.bras == null ? "—" : fr(r.bras, r.total ? 3 : r.bras < 3 ? 2 : 3)}
            </Text>
            <Text
              style={{
                flex: 1.4,
                padding: 4,
                fontSize: 7,
                textAlign: "right",
                fontFamily: r.total ? "Helvetica-Bold" : "Helvetica",
                color,
              }}
            >
              {fr(r.moment, 2)}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

// ── Document ─────────────────────────────────────────────────────────────────

function MassBalancePDF({ data }: { data: MassBalancePDFData }) {
  const { computed, inputs } = data;
  const p = computed.perf;
  const verdict: Verdict = computed.withinLimits
    ? { status: "ok", message: `Dans les limites — catégorie ${computed.category}` }
    : { status: "ko", message: "Hors limites — vol non autorisé en l'état : " + computed.issues.join(" ; ") };

  return (
    <Document>
      <Page size="A4" style={{ paddingVertical: 28, paddingHorizontal: 34, fontFamily: "Helvetica", color: INK }}>
        {/* En-tête */}
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "flex-end",
            borderBottomWidth: 2,
            borderBottomColor: NAVY,
            paddingBottom: 6,
            marginBottom: 10,
          }}
        >
          <View>
            <Text style={{ fontSize: 14, fontFamily: "Helvetica-Bold", color: NAVY }}>
              DA40 — Masse et centrage
            </Text>
            {data.clientLabel ? (
              <Text style={{ fontSize: 8, color: MUTED, marginTop: 2 }}>{data.clientLabel}</Text>
            ) : null}
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={{ fontSize: 10, fontFamily: "Helvetica-Bold", color: GOLD }}>{data.aircraftReg}</Text>
            <Text style={{ fontSize: 8, color: MUTED }}>{dateLabel(data.flightDate)}</Text>
            <Text style={{ fontSize: 7, color: MUTED }}>Réf. checklist NewCAG rév. 4.1</Text>
          </View>
        </View>

        {/* Bandeau chargement */}
        <View style={{ flexDirection: "row", borderWidth: 1, borderColor: BORDER, marginBottom: 10 }}>
          <LoadCell label="Avion" value={data.aircraftReg} />
          <LoadCell label="Pilote / pax avant" value={`${fr(inputs.pilot, 0)} / ${fr(inputs.fpax, 0)} kg`} />
          <LoadCell label="Pax arrière 1 / 2" value={`${fr(inputs.rpax1, 0)} / ${fr(inputs.rpax2, 0)} kg`} />
          <LoadCell
            label="Bagages / carburant"
            value={`${fr(inputs.bag, 0)} kg / ${fr(computed.fuelGal, 1)} gal`}
          />
        </View>

        {/* Ligne principale : enveloppe à gauche, tableau à droite */}
        <View style={{ flexDirection: "row", gap: 12 }}>
          <View style={{ width: 232 }}>
            <Text style={{ fontSize: 8, fontFamily: "Helvetica-Bold", color: NAVY, marginBottom: 4 }}>
              Enveloppe de centrage
            </Text>
            <EnvelopePdf computed={computed} />
          </View>
          <View style={{ flex: 1 }}>
            <MbTable computed={computed} />
          </View>
        </View>

        <VerdictLine v={verdict} style={{ marginTop: 8 }} />

        {/* Performance data */}
        <Text
          style={{
            fontSize: 9,
            fontFamily: "Helvetica-Bold",
            color: NAVY,
            marginTop: 14,
            borderTopWidth: 2,
            borderTopColor: NAVY,
            paddingTop: 6,
          }}
        >
          PERFORMANCE DATA
        </Text>
        <Text style={{ fontSize: 6.5, color: MUTED, marginBottom: 6 }}>
          (to be completed for departure, arrival and alternate airports)
        </Text>

        <View style={{ borderWidth: 1, borderColor: BORDER, marginBottom: 8 }}>
          {(
            [
              ["Departure", inputs.perf.dep],
              ["Destination", inputs.perf.dest],
              ["Alternate", inputs.perf.alt],
            ] as const
          ).map(([label, ad], i) => (
            <View
              key={label}
              style={{
                flexDirection: "row",
                borderTopWidth: i === 0 ? 0 : 1,
                borderTopColor: BORDER,
              }}
            >
              <Text style={{ width: 56, fontSize: 6.5, fontFamily: "Helvetica-Bold", color: NAVY, padding: 3 }}>
                {label}
              </Text>
              <Text style={{ width: 44, fontSize: 6.5, padding: 3, borderRightWidth: 1, borderRightColor: BORDER }}>
                {ad.icao ? ad.icao.toUpperCase() : "—"}
              </Text>
              <Text style={{ fontSize: 6.5, fontFamily: "Helvetica-Bold", color: NAVY, padding: 3 }}>Weather: </Text>
              <Text style={{ flex: 1, fontSize: 6.5, padding: 3 }}>{weatherSummary(ad)}</Text>
            </View>
          ))}
        </View>

        {/* Décollage */}
        <Text style={{ fontSize: 7.5, fontFamily: "Helvetica-Bold", color: NAVY, marginBottom: 3 }}>
          Départ — Take-off performance (TODR)
        </Text>
        <View style={{ flexDirection: "row", gap: 5, marginBottom: 4 }}>
          <Kv label="X-wind (max 20 kt)" value={p.dep.xwind != null ? `${fr(p.dep.xwind, 1)} kt` : "—"} danger={p.dep.xwind != null && p.dep.xwind > 20} />
          <Kv label="Pressure altitude" value={p.dep.pa != null ? `${fr(p.dep.pa, 0)} ft` : "—"} />
          <Kv label="Density altitude" value={p.dep.da != null ? `${fr(p.dep.da, 0)} ft` : "—"} />
        </View>
        <View style={{ flexDirection: "row", gap: 5, marginBottom: 4 }}>
          <Kv label="TODR (masse décollage)" value={p.dep.error ?? (p.dep.todr != null ? `${fr(p.dep.todr, 0)} m` : "—")} />
          <Kv label="TODR × 1.25" value={p.dep.todr125 != null ? `${fr(p.dep.todr125, 0)} m` : "—"} />
          <Kv label="Departure TODA" value={p.dep.toda != null ? `${fr(p.dep.toda, 0)} m` : "—"} />
        </View>
        <VerdictLine v={p.dep.verdict} style={{ marginBottom: 8 }} />

        {/* Atterrissage */}
        <Text style={{ fontSize: 7.5, fontFamily: "Helvetica-Bold", color: NAVY, marginBottom: 3 }}>
          Destination / Alternate — Landing performance (LDR)
        </Text>
        <View style={{ flexDirection: "row", gap: 5, marginBottom: 4 }}>
          <Kv label="X-wind (max 20 kt)" value={p.ldg.xwind != null ? `${fr(p.ldg.xwind, 1)} kt` : "—"} danger={p.ldg.xwind != null && p.ldg.xwind > 20} />
          <Kv label="Pressure altitude" value={p.ldg.pa != null ? `${fr(p.ldg.pa, 0)} ft` : "—"} />
          <Kv label="Density altitude" value={p.ldg.da != null ? `${fr(p.ldg.da, 0)} ft` : "—"} />
        </View>
        <View style={{ flexDirection: "row", gap: 5, marginBottom: 4 }}>
          <Kv label="LDR (masse atterrissage)" value={p.ldg.error ?? (p.ldg.ldr != null ? `${fr(p.ldg.ldr, 0)} m` : "—")} />
          <Kv label="Destination LDA" value={p.ldg.ldaDest != null ? `${fr(p.ldg.ldaDest, 0)} m` : "—"} />
          <Kv label="Alternate LDA" value={p.ldg.ldaAlt != null ? `${fr(p.ldg.ldaAlt, 0)} m` : "—"} />
        </View>
        <VerdictLine v={p.ldg.verdictDest} style={{ marginBottom: 4 }} />
        <VerdictLine v={p.ldg.verdictAlt} />

        {/* Signatures */}
        <View style={{ flexDirection: "row", gap: 24, marginTop: 18 }}>
          <Text style={{ flex: 1, fontSize: 7, borderTopWidth: 1, borderTopColor: INK, paddingTop: 4 }}>
            Nom et signature du pilote
          </Text>
          <Text style={{ flex: 1, fontSize: 7, borderTopWidth: 1, borderTopColor: INK, paddingTop: 4 }}>
            Visa
          </Text>
        </View>

        <Text style={{ fontSize: 6, color: MUTED, marginTop: 10, lineHeight: 1.3 }}>
          {"Cette masse et centrage est fournie à titre indicatif. Le pilote commandant de bord est seul " +
            "responsable de l'exactitude des données et du chargement de l'avion avant le vol. Distances de " +
            "performance interpolées depuis les abaques AFM digitalisées du DA40 — vérifier l'AFM en vigueur."}
        </Text>
      </Page>
    </Document>
  );
}

// ── Interface publique ───────────────────────────────────────────────────────

export async function generateMassBalancePDFBuffer(data: MassBalancePDFData): Promise<Buffer> {
  const { renderToBuffer } = await import("@react-pdf/renderer");
  return renderToBuffer(<MassBalancePDF data={data} />);
}
