import React from "react";
import { Document, Page, Text, View } from "@react-pdf/renderer";
import { bilanTransactions, formatMinutes, type PiloteTransaction } from "@/lib/pilote/transactions-shared";

// Relevé annuel des vols à frais partagés d'un pilote (maquette Transactions
// validée le 27/09). Une ligne par vol : les passagers d'un même vol (vente à
// la place) sont regroupés, pour que le coût et la part du pilote ne comptent
// qu'une fois. Page blanche, typographie sobre, comme le PDF M&B refait le 24/09.

const INK = "#0b2238";
const TEXT = "#0f1117";
const TEXT2 = "#4d5463";
const MUTED = "#9aa0ac";
const LINE = "#eceef2";
const SURFACE = "#f4f5f7";

export interface ReleveData {
  annee: string;
  piloteNom: string;
  licence: string | null;
  rows: PiloteTransaction[];
}

type Vol = {
  date: string;
  titre: string;
  passagers: string[];
  duree: number | null;
  cout: number | null;
  paye: number;
  part: number | null;
  aRecevoir: number;
  effectue: boolean;
};

function grouper(rows: PiloteTransaction[]): Vol[] {
  const map = new Map<string, Vol>();
  for (const t of [...rows].sort((a, b) => a.date.localeCompare(b.date))) {
    const key = t.annonceId ? `${t.annonceId}|${t.date}` : t.id;
    const v = map.get(key) ?? {
      date: t.date, titre: t.titre, passagers: [], duree: t.dureeReelle ?? t.duree,
      cout: t.cout, paye: 0, part: t.part, aRecevoir: 0, effectue: t.effectue,
    };
    v.passagers.push(t.passagers && t.passagers > 1 ? `${t.client} (${t.passagers})` : t.client);
    if (t.etat === "recu") v.paye += t.montant ?? 0;
    else v.aRecevoir += t.montant ?? 0;
    v.effectue ||= t.effectue;
    map.set(key, v);
  }
  return [...map.values()];
}

const euros = (n: number | null) =>
  n == null ? "—" : n.toLocaleString("fr-BE", { minimumFractionDigits: 0, maximumFractionDigits: 2 }) + " €";
const dateCourte = (d: string) =>
  new Date(d + "T12:00:00Z").toLocaleDateString("fr-BE", { day: "2-digit", month: "2-digit", year: "numeric" });

// 499 pt = largeur utile de l'A4 (595 − 2 × 40 de marge − 2 × 8 de padding).
const W = { date: 50, vol: 100, pax: 95, duree: 36, cout: 50, paye: 54, part: 48, paiement: 66 };

function Cell({ w, children, align = "left", bold = false, color = TEXT }: {
  w: number; children: React.ReactNode; align?: "left" | "right"; bold?: boolean; color?: string;
}) {
  return (
    <Text style={{ width: w, paddingRight: align === "left" ? 6 : 0, paddingLeft: align === "right" ? 4 : 0, textAlign: align, fontFamily: bold ? "Helvetica-Bold" : "Helvetica", color }}>
      {children}
    </Text>
  );
}

function RelevePDF({ data }: { data: ReleveData }) {
  const vols = grouper(data.rows);
  const b = bilanTransactions(data.rows);
  const tot = vols.reduce(
    (s, v) => ({ cout: s.cout + (v.cout ?? 0), paye: s.paye + v.paye, part: s.part + (v.part ?? 0) }),
    { cout: 0, paye: 0, part: 0 },
  );
  const edite = new Date().toLocaleDateString("fr-BE", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "Europe/Brussels" });

  return (
    <Document title={`Relevé ${data.annee} · ${data.piloteNom}`} author="Fly Horizons">
      <Page size="A4" style={{ paddingHorizontal: 40, paddingTop: 40, paddingBottom: 56, fontFamily: "Helvetica", fontSize: 8, color: TEXT }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
          <View>
            <Text style={{ fontSize: 16, fontFamily: "Helvetica-Bold", color: INK }}>Relevé des vols à frais partagés</Text>
            <Text style={{ fontSize: 9, color: MUTED, marginTop: 3 }}>Année {data.annee} · édité le {edite}</Text>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={{ fontSize: 10, fontFamily: "Helvetica-Bold" }}>{data.piloteNom}</Text>
            {data.licence && <Text style={{ fontSize: 8.5, color: TEXT2, marginTop: 2 }}>Licence {data.licence}</Text>}
            <Text style={{ fontSize: 8.5, color: MUTED, marginTop: 2 }}>via Fly Horizons</Text>
          </View>
        </View>

        <View style={{ flexDirection: "row", borderWidth: 1, borderColor: LINE, borderRadius: 8, marginBottom: 18 }}>
          {[
            ["Coût total des vols", euros(b.coutTotal)],
            ["Payé par les passagers", euros(b.recu)],
            ["Votre part", `${euros(b.partTotal)}${b.coutTotal > 0 ? ` · ${Math.round((b.partTotal / b.coutTotal) * 100)} %` : ""}`],
            ["Vols effectués", `${b.vols}${b.minutes ? ` · ${formatMinutes(b.minutes)}` : ""}`],
          ].map(([l, v], i) => (
            <View key={l} style={{ flex: 1, paddingHorizontal: 10, paddingVertical: 8, borderLeftWidth: i ? 1 : 0, borderColor: LINE }}>
              <Text style={{ fontSize: 7.5, color: MUTED }}>{l}</Text>
              <Text style={{ fontSize: 11, fontFamily: "Helvetica-Bold", marginTop: 2 }}>{v}</Text>
            </View>
          ))}
        </View>

        <View style={{ flexDirection: "row", backgroundColor: SURFACE, borderRadius: 5, paddingHorizontal: 8, paddingVertical: 6, color: MUTED }}>
          <Cell w={W.date} color={MUTED}>Date</Cell>
          <Cell w={W.vol} color={MUTED}>Vol</Cell>
          <Cell w={W.pax} color={MUTED}>Passagers</Cell>
          <Cell w={W.duree} align="right" color={MUTED}>Durée</Cell>
          <Cell w={W.cout} align="right" color={MUTED}>Coût du vol</Cell>
          <Cell w={W.paye} align="right" color={MUTED}>Payé passagers</Cell>
          <Cell w={W.part} align="right" color={MUTED}>Votre part</Cell>
          <Cell w={W.paiement} align="right" color={MUTED}>Paiement</Cell>
        </View>
        {vols.map((v, i) => (
          <View key={i} wrap={false} style={{ flexDirection: "row", paddingHorizontal: 8, paddingVertical: 6, borderBottomWidth: 1, borderColor: LINE }}>
            <Cell w={W.date}>{dateCourte(v.date)}</Cell>
            <Cell w={W.vol}>{v.titre}</Cell>
            <Cell w={W.pax} color={TEXT2}>{v.passagers.join(", ")}</Cell>
            <Cell w={W.duree} align="right">{v.duree ? `${v.duree} min` : "—"}</Cell>
            <Cell w={W.cout} align="right">{euros(v.cout)}</Cell>
            <Cell w={W.paye} align="right">{euros(v.paye)}</Cell>
            <Cell w={W.part} align="right">{euros(v.part)}</Cell>
            <Cell w={W.paiement} align="right" color={v.aRecevoir > 0 ? "#b3560c" : "#16794a"}>
              {v.aRecevoir > 0 ? `${euros(v.aRecevoir)} à recevoir` : "Reçu"}
            </Cell>
          </View>
        ))}
        <View wrap={false} style={{ flexDirection: "row", backgroundColor: SURFACE, borderRadius: 5, paddingHorizontal: 8, paddingVertical: 6, marginTop: 4 }}>
          <Cell w={W.date + W.vol + W.pax + W.duree} bold>Total · {vols.length} vol{vols.length > 1 ? "s" : ""}</Cell>
          <Cell w={W.cout} align="right" bold>{euros(tot.cout)}</Cell>
          <Cell w={W.paye} align="right" bold>{euros(tot.paye)}</Cell>
          <Cell w={W.part} align="right" bold>{euros(tot.part)}</Cell>
          <Cell w={W.paiement} align="right"> </Cell>
        </View>

        <Text style={{ fontSize: 7.5, color: MUTED, marginTop: 18, lineHeight: 1.5 }}>
          Vols non commerciaux à frais partagés (règlement (UE) n° 965/2012, NCO.GEN.104) : les coûts directs du vol sont
          répartis entre les occupants, pilote compris. Les passagers paient le pilote par virement direct ; Fly Horizons
          n&apos;encaisse rien. « Payé passagers » ne compte que les paiements marqués reçus par le pilote.
        </Text>

        <View fixed style={{ position: "absolute", bottom: 24, left: 40, right: 40, flexDirection: "row", justifyContent: "space-between" }}>
          <Text style={{ fontSize: 7, color: MUTED }}>Fly Horizons · fly-horizons.com</Text>
          <Text style={{ fontSize: 7, color: MUTED }} render={({ pageNumber, totalPages }) => `Page ${pageNumber} / ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}

export async function generateReleveBuffer(data: ReleveData): Promise<Buffer> {
  const { renderToBuffer } = await import("@react-pdf/renderer");
  return renderToBuffer(<RelevePDF data={data} />);
}
