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
import { CG_AFT, MASS_MAX, cgFwd } from "@/lib/mass-balance/da40-data";

export interface MassBalancePDFData {
  aircraftReg: string;
  flightDate: string | null;
  clientLabel?: string | null;
  inputs: MassBalanceInputs;
  computed: MassBalanceComputed;
}

// La police Helvetica du PDF n'a ni l'espace fine insécable (séparateur des
// milliers en fr-FR, rendu « 1/093 ») ni « ≤ » (rendu « d ») : on les remplace.
const pdfSafe = (t: string) => t.replace(/[  ]/g, " ").replace(/≤/g, "<=").replace(/≥/g, ">=");

function fr(v: number | null | undefined, d = 1): string {
  if (v == null || Number.isNaN(v)) return "—";
  return pdfSafe(v.toLocaleString("fr-FR", { minimumFractionDigits: d, maximumFractionDigits: d }));
}

function dateLabel(d: string | null): string {
  if (!d) return "—";
  const raw = d.length === 10 ? d + "T12:00:00Z" : d;
  return new Date(raw).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
}

function weatherSummary(a: MassBalanceInputs["perf"]["dep"]): string {
  const bits: string[] = [];
  if (a.oat != null) bits.push(`${fr(a.oat, 0)} °C`);
  if (a.qnh != null) bits.push(`QNH ${Math.round(a.qnh)}`);
  if (a.wdir != null || a.wspd != null)
    bits.push(`${a.wdir != null ? fr(a.wdir, 0) : "—"}°/${a.wspd != null ? fr(a.wspd, 0) : "—"} kt`);
  return bits.length ? bits.join("   ·   ") : "—";
}

// ── Enveloppe de centrage (SVG @react-pdf) ───────────────────────────────────

function EnvelopePdf({ computed }: { computed: MassBalanceComputed }) {
  const g = buildEnvelopeGeometry(computed.points);
  const c = g.colors;
  return (
    <Svg viewBox={`0 0 ${g.width} ${g.height}`} style={{ width: 240, height: 172 }}>
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

// ── Mise en page « Studio » (refaite le 24/09, même logique que la page M&B) ──
// Verdict en tête, chargement, enveloppe + tableau de calcul, jauges, puis les
// terrains en 3 colonnes. Toutes les données de l'ancienne feuille restent.

const S = {
  text: "#0f1117",
  text2: "#4d5463",
  muted: "#8a909c",
  line: "#e3e6eb",
  soft: "#f4f5f7",
  ink: "#0b2238",
  gold: "#c99700",
  ok: "#16794a", okSoft: "#e7f5ec",
  warn: "#b3560c", warnSoft: "#fff3e6",
  bad: "#c4372c", badSoft: "#fdecea",
};

const toneOf = (s: Verdict["status"]) =>
  s === "ok" ? { c: S.ok, bg: S.okSoft } : s === "ko" ? { c: S.bad, bg: S.badSoft } : { c: S.warn, bg: S.warnSoft };

function SectionTitle({ children, right }: { children: React.ReactNode; right?: string }) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", marginBottom: 5 }}>
      <Text style={{ fontSize: 9, fontFamily: "Helvetica-Bold", color: S.text }}>{children}</Text>
      {right ? <Text style={{ fontSize: 6.5, color: S.muted }}>{right}</Text> : null}
    </View>
  );
}

function Figure({ label, value, color, sub }: { label: string; value: string; color?: string; sub?: string }) {
  return (
    <View style={{ flex: 1, paddingHorizontal: 8 }}>
      <Text style={{ fontSize: 6.5, color: S.muted }}>{label}</Text>
      <Text style={{ fontSize: 11, fontFamily: "Helvetica-Bold", color: color ?? S.text, marginTop: 1 }}>{value}</Text>
      {sub ? <Text style={{ fontSize: 6, color: S.muted, marginTop: 1 }}>{sub}</Text> : null}
    </View>
  );
}

// Jauge simple : fond gris, remplissage (ou zone + repère).
function Bar({ pct, color = S.ink, zone, mark }: { pct?: number; color?: string; zone?: [number, number]; mark?: number }) {
  const clamp = (n: number) => Math.max(0, Math.min(100, n));
  return (
    <View style={{ height: 5, borderRadius: 3, backgroundColor: "#e9ebef", marginTop: 4, position: "relative" }}>
      {zone ? (
        <View style={{ position: "absolute", top: 0, bottom: 0, left: `${clamp(zone[0])}%`, width: `${clamp(zone[1]) - clamp(zone[0])}%`, backgroundColor: "#c9e7d5", borderRadius: 3 }} />
      ) : null}
      {pct != null ? <View style={{ position: "absolute", top: 0, bottom: 0, left: 0, width: `${clamp(pct)}%`, backgroundColor: color, borderRadius: 3 }} /> : null}
      {mark != null ? <View style={{ position: "absolute", top: -2, height: 9, width: 2, left: `${clamp(mark)}%`, backgroundColor: color, borderRadius: 1 }} /> : null}
    </View>
  );
}

function LoadCell({ label, value, sub, last }: { label: string; value: string; sub?: string; last?: boolean }) {
  return (
    <View style={{ flex: 1, paddingHorizontal: 7, paddingVertical: 6, borderRightWidth: last ? 0 : 1, borderRightColor: S.line }}>
      <Text style={{ fontSize: 6.5, color: S.muted }}>{label}</Text>
      <Text style={{ fontSize: 9, fontFamily: "Helvetica-Bold", color: S.text, marginTop: 1 }}>{value}</Text>
      {sub ? <Text style={{ fontSize: 5.8, color: S.muted, marginTop: 1 }}>{sub}</Text> : null}
    </View>
  );
}

function Kv({ label, value, bold, color }: { label: string; value: string; bold?: boolean; color?: string }) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 2.2, borderTopWidth: 0.5, borderTopColor: S.line }}>
      <Text style={{ fontSize: 7, color: S.text2 }}>{label}</Text>
      <Text style={{ fontSize: 7, fontFamily: bold ? "Helvetica-Bold" : "Helvetica", color: color ?? S.text }}>{value}</Text>
    </View>
  );
}

function VerdictPill({ v }: { v: Verdict }) {
  const t = toneOf(v.status);
  return (
    <Text style={{ fontSize: 6.5, fontFamily: "Helvetica-Bold", color: t.c, backgroundColor: t.bg, borderRadius: 4, paddingHorizontal: 5, paddingVertical: 3, marginTop: 5 }}>
      {pdfSafe(v.message)}
    </Text>
  );
}

function MbTable({ computed }: { computed: MassBalanceComputed }) {
  const cols = [3, 1.3, 1.1, 1.5];
  return (
    <View>
      <View style={{ flexDirection: "row", backgroundColor: S.soft, borderRadius: 4 }}>
        {["Poste", "Masse (kg)", "Bras (m)", "Moment (kgm)"].map((h, i) => (
          <Text key={h} style={{ flex: cols[i], fontSize: 6.5, color: S.muted, paddingHorizontal: 5, paddingVertical: 4, textAlign: i === 0 ? "left" : "right" }}>
            {h}
          </Text>
        ))}
      </View>
      {computed.rows.map((r, idx) => {
        const color = r.out ? S.bad : S.text;
        const font = r.total ? "Helvetica-Bold" : "Helvetica";
        return (
          <View key={idx} style={{ flexDirection: "row", backgroundColor: r.total ? S.soft : "#ffffff", borderRadius: r.total ? 4 : 0, borderTopWidth: r.total ? 0 : 0.5, borderTopColor: S.line }}>
            <View style={{ flex: cols[0], paddingHorizontal: 5, paddingVertical: 3.2 }}>
              <Text style={{ fontSize: 7, fontFamily: font, color }}>{r.poste}</Text>
              {r.sub ? <Text style={{ fontSize: 5.8, color: S.muted }}>{r.sub}</Text> : null}
            </View>
            <Text style={{ flex: cols[1], fontSize: 7, fontFamily: font, color, textAlign: "right", paddingHorizontal: 5, paddingVertical: 3.2 }}>{fr(r.masse, 1)}</Text>
            <Text style={{ flex: cols[2], fontSize: 7, color, textAlign: "right", paddingHorizontal: 5, paddingVertical: 3.2 }}>
              {r.bras == null ? "—" : fr(r.bras, r.total ? 3 : r.bras < 3 ? 2 : 3)}
            </Text>
            <Text style={{ flex: cols[3], fontSize: 7, fontFamily: font, color, textAlign: "right", paddingHorizontal: 5, paddingVertical: 3.2 }}>{fr(r.moment, 2)}</Text>
          </View>
        );
      })}
    </View>
  );
}

function MassBalancePDF({ data }: { data: MassBalancePDFData }) {
  const { computed, inputs } = data;
  const p = computed.perf;

  // Verdict combiné, même règle que la page.
  const perfVerdicts = [p.dep.verdict, p.ldg.verdictDest, p.ldg.verdictAlt];
  const perfKo = perfVerdicts.filter((v) => v.status === "ko");
  const overall: Verdict["status"] = !computed.withinLimits || perfKo.length ? "ko" : perfVerdicts.some((v) => v.status === "pending") ? "pending" : "ok";
  const vt = toneOf(overall);
  const vTitle = overall === "ok" ? "GO · vol autorisé" : overall === "pending" ? "Incomplet · performances à renseigner" : "NO-GO · vol non autorisé en l'état";
  const vSub = overall === "ko"
    ? [...(!computed.withinLimits ? computed.issues : []), ...perfKo.map((v) => v.message)].join(" · ")
    : overall === "ok" ? `Masse, centrage et performances dans les limites · catégorie ${computed.category}` : "Masse et centrage dans les limites";

  const depMargin = p.dep.todr125 != null && p.dep.toda != null ? p.dep.toda - p.dep.todr125 : null;
  const destMargin = p.ldg.ldr != null && p.ldg.ldaDest != null ? p.ldg.ldaDest - p.ldg.ldr : null;
  const altMargin = p.ldg.ldr != null && p.ldg.ldaAlt != null ? p.ldg.ldaAlt - p.ldg.ldr : null;
  const ldgMargin = [destMargin, altMargin].filter((m): m is number => m != null).reduce<number | null>((a, b) => (a == null ? b : Math.min(a, b)), null);
  const signed = (n: number | null) => (n == null ? "—" : `${n >= 0 ? "+" : ""}${fr(n, 0)} m`);
  const mColor = (n: number | null) => (n == null ? S.muted : n >= 0 ? S.ok : S.bad);

  const fwd = cgFwd(computed.tom);
  const cgPos = (cg: number) => ((cg - 2.36) / 0.26) * 100;
  const massOver = computed.tom > MASS_MAX;
  const cgOut = computed.cgTom < fwd || computed.cgTom > CG_AFT;

  const terrains = [
    { role: "Départ", ad: inputs.perf.dep },
    { role: "Destination", ad: inputs.perf.dest },
    { role: "Dégagement", ad: inputs.perf.alt },
  ];

  return (
    <Document>
      <Page size="A4" style={{ paddingVertical: 28, paddingHorizontal: 32, fontFamily: "Helvetica", color: S.text }}>
        {/* En-tête */}
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 12 }}>
          <View>
            <Text style={{ fontSize: 16, fontFamily: "Helvetica-Bold", color: S.ink }}>Masse et centrage</Text>
            <Text style={{ fontSize: 8, color: S.text2, marginTop: 2 }}>
              DA40 · {dateLabel(data.flightDate)}{data.clientLabel ? ` · ${data.clientLabel}` : ""}
            </Text>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={{ fontSize: 13, fontFamily: "Helvetica-Bold", color: S.ink }}>{data.aircraftReg}</Text>
            <Text style={{ fontSize: 6.5, color: S.muted, marginTop: 1 }}>Réf. checklist NewCAG rév. 4.1</Text>
          </View>
        </View>

        {/* Verdict */}
        <View style={{ backgroundColor: vt.bg, borderRadius: 8, paddingVertical: 9, paddingHorizontal: 10, flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
          <View style={{ width: 170 }}>
            <Text style={{ fontSize: 12, fontFamily: "Helvetica-Bold", color: vt.c }}>{vTitle}</Text>
            <Text style={{ fontSize: 6.5, color: vt.c, marginTop: 2 }}>{pdfSafe(vSub)}</Text>
          </View>
          <Figure label="Masse au décollage" value={`${fr(computed.tom, 1)} kg`} color={massOver ? S.bad : S.text} sub={`max ${fr(MASS_MAX, 0)} kg`} />
          <Figure label="Centrage au décollage" value={`${fr(computed.cgTom, 3)} m`} color={cgOut ? S.bad : S.text} />
          <Figure label="Marge décollage" value={signed(depMargin)} color={mColor(depMargin)} />
          <Figure label="Marge atterrissage" value={signed(ldgMargin)} color={mColor(ldgMargin)} sub="pire cas dest. / dégagement" />
        </View>

        {/* Chargement */}
        <SectionTitle right={`Masse à vide ${fr(computed.bem, 1)} kg · bras ${fr(computed.bemArm, 3)} m`}>Chargement</SectionTitle>
        <View style={{ flexDirection: "row", borderWidth: 1, borderColor: S.line, borderRadius: 6, marginBottom: 12 }}>
          <LoadCell label="Pilote" value={`${fr(inputs.pilot, 0)} kg`} />
          <LoadCell label="Passager avant" value={`${fr(inputs.fpax, 0)} kg`} />
          <LoadCell label="Arrière gauche" value={`${fr(inputs.rpax1, 0)} kg`} />
          <LoadCell label="Arrière droit" value={`${fr(inputs.rpax2, 0)} kg`} />
          <LoadCell label="Bagages" value={`${fr(inputs.bag, 0)} kg`} sub="max 30 kg" />
          <LoadCell label="Carburant" value={`${fr(computed.fuelGal, 1)} gal`} sub={`${fr(computed.fuelL, 0)} l · ${fr(computed.fuelKg, 1)} kg · consommé ${fr(inputs.tripGal, 1)} gal`} last />
        </View>

        {/* Enveloppe | tableau */}
        <View style={{ flexDirection: "row", gap: 14, marginBottom: 10 }}>
          <View style={{ width: 240 }}>
            <SectionTitle>Enveloppe de centrage</SectionTitle>
            <EnvelopePdf computed={computed} />
          </View>
          <View style={{ flex: 1 }}>
            <SectionTitle>Tableau de calcul</SectionTitle>
            <MbTable computed={computed} />
          </View>
        </View>

        {/* Jauges */}
        <View style={{ flexDirection: "row", gap: 14, marginBottom: 12 }}>
          <View style={{ flex: 1, borderWidth: 1, borderColor: S.line, borderRadius: 6, padding: 7 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <Text style={{ fontSize: 7, color: S.text2 }}>Masse au décollage</Text>
              <Text style={{ fontSize: 7, fontFamily: "Helvetica-Bold", color: massOver ? S.bad : S.text }}>{fr(computed.tom, 1)} / {fr(MASS_MAX, 0)} kg</Text>
            </View>
            <Bar pct={(computed.tom / MASS_MAX) * 100} color={massOver ? S.bad : S.ink} />
            <Text style={{ fontSize: 6, color: S.muted, marginTop: 3 }}>
              {massOver ? `${fr(computed.tom - MASS_MAX, 1)} kg de trop` : `Reste ${fr(MASS_MAX - computed.tom, 1)} kg`} · atterrissage {fr(computed.lm, 1)} kg
            </Text>
          </View>
          <View style={{ flex: 1, borderWidth: 1, borderColor: S.line, borderRadius: 6, padding: 7 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <Text style={{ fontSize: 7, color: S.text2 }}>Centrage au décollage</Text>
              <Text style={{ fontSize: 7, fontFamily: "Helvetica-Bold", color: cgOut ? S.bad : S.text }}>{fr(computed.cgTom, 3)} m</Text>
            </View>
            <Bar zone={[cgPos(fwd), cgPos(CG_AFT)]} mark={cgPos(computed.cgTom)} color={cgOut ? S.bad : S.ink} />
            <Text style={{ fontSize: 6, color: S.muted, marginTop: 3 }}>Limites {fr(fwd, 3)} à {fr(CG_AFT, 2)} m · catégorie {computed.category}</Text>
          </View>
        </View>

        {/* Terrains et performances */}
        <SectionTitle right="Distances interpolées depuis les abaques AFM digitalisées">Terrains et performances</SectionTitle>
        <View style={{ flexDirection: "row", borderWidth: 1, borderColor: S.line, borderRadius: 6 }}>
          {terrains.map(({ role, ad }, i) => {
            const leg = i === 0 ? p.dep : p.ldg;
            const avail = i === 0 ? p.dep.toda : i === 1 ? p.ldg.ldaDest : p.ldg.ldaAlt;
            const need = i === 0 ? p.dep.todr125 : p.ldg.ldr;
            const margin = i === 0 ? depMargin : i === 1 ? destMargin : altMargin;
            const v = i === 0 ? p.dep.verdict : i === 1 ? p.ldg.verdictDest : p.ldg.verdictAlt;
            return (
              <View key={role} style={{ flex: 1, padding: 8, borderLeftWidth: i === 0 ? 0 : 1, borderLeftColor: S.line }}>
                <Text style={{ fontSize: 6.5, color: S.muted }}>{role}</Text>
                <Text style={{ fontSize: 11, fontFamily: "Helvetica-Bold", color: S.text, marginTop: 1 }}>
                  {ad.icao ? ad.icao.toUpperCase() : "—"}
                  {ad.rwy != null ? `  ·  RWY ${fr(ad.rwy, 0)}°` : ""}
                </Text>
                <Text style={{ fontSize: 6.3, color: S.text2, marginTop: 2, marginBottom: 4 }}>{weatherSummary(ad)}</Text>
                {i < 2 && (
                  <>
                    <Kv label="Vent traversier (max 20 kt)" value={leg.xwind != null ? `${fr(leg.xwind, 1)} kt` : "—"} color={leg.xwind != null && leg.xwind > 20 ? S.bad : undefined} />
                    <Kv label="Altitude pression" value={leg.pa != null ? `${fr(leg.pa, 0)} ft` : "—"} />
                    <Kv label="Altitude densité" value={leg.da != null ? `${fr(leg.da, 0)} ft` : "—"} />
                  </>
                )}
                {i === 0 ? (
                  <>
                    <Kv label="TODR (masse décollage)" value={p.dep.error ?? (p.dep.todr != null ? `${fr(p.dep.todr, 0)} m` : "—")} />
                    <Kv label="TODR × 1,25" value={p.dep.todr125 != null ? `${fr(p.dep.todr125, 0)} m` : "—"} />
                    <Kv label="TODA" value={avail != null ? `${fr(avail, 0)} m` : "—"} />
                  </>
                ) : (
                  <>
                    <Kv label="LDR (masse atterrissage)" value={p.ldg.error ?? (p.ldg.ldr != null ? `${fr(p.ldg.ldr, 0)} m` : "—")} />
                    <Kv label="LDA" value={avail != null ? `${fr(avail, 0)} m` : "—"} />
                  </>
                )}
                <Kv label="Marge" value={signed(margin)} bold color={mColor(margin)} />
                {need != null && avail != null && avail > 0 ? <Bar pct={(need / avail) * 100} color={margin != null && margin < 0 ? S.bad : S.ink} /> : null}
                <VerdictPill v={v} />
              </View>
            );
          })}
        </View>

        {/* Signatures */}
        <View style={{ flexDirection: "row", gap: 24, marginTop: 22 }}>
          <Text style={{ flex: 1, fontSize: 7, color: S.text2, borderTopWidth: 1, borderTopColor: S.text, paddingTop: 4 }}>Nom et signature du pilote</Text>
          <Text style={{ flex: 1, fontSize: 7, color: S.text2, borderTopWidth: 1, borderTopColor: S.text, paddingTop: 4 }}>Visa</Text>
        </View>

        <Text style={{ fontSize: 6, color: S.muted, marginTop: 10, lineHeight: 1.35 }}>
          {"Cette masse et centrage est fournie à titre indicatif. Le pilote commandant de bord est seul " +
            "responsable de l'exactitude des données et du chargement de l'avion avant le vol. Distances de " +
            "performance interpolées depuis les abaques AFM digitalisées du DA40 : vérifier l'AFM en vigueur."}
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
