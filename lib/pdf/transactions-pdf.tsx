import React from "react";
import { Document, Page, Text, View, Image } from "@react-pdf/renderer";
import type { LigneVol, LigneVoucher, Depense, SoldeStats } from "@/components/admin/TransactionsClient";

const NAVY   = "#062548";
const GOLD   = "#F6C000";
const WHITE  = "#ffffff";
const SLATE  = "#334155";
const MUTED  = "#64748b";
const RED    = "#dc2626";
const GREEN  = "#16a34a";
const BG     = "#f8fafc";
const BORDER = "#e2e8f0";

export interface TransactionsPDFData {
  vols: LigneVol[];
  vouchers: LigneVoucher[];
  depenses: Depense[];
  soldeGlobal: SoldeStats;
}

function euros(n: number | null) {
  if (n == null) return "—";
  return n.toLocaleString("fr-BE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
}

function pct(n: number | null) {
  return n == null ? "—" : `${n}%`;
}

function dateStr(d: string) {
  const raw = d.length === 10 ? d + "T12:00:00Z" : d;
  return new Date(raw).toLocaleDateString("fr-BE", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function Kpi({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <View style={{
      backgroundColor: BG, borderRadius: 6, borderWidth: 1, borderColor: BORDER,
      paddingHorizontal: 12, paddingVertical: 8, flex: 1,
    }}>
      <Text style={{ fontSize: 6.5, fontFamily: "Helvetica-Bold", color: MUTED, letterSpacing: 1, marginBottom: 3 }}>
        {label}
      </Text>
      <Text style={{ fontSize: 11, fontFamily: "Helvetica-Bold", color: color ?? NAVY }}>
        {value}
      </Text>
    </View>
  );
}

const COLS = {
  date: 46, client: 90, type: 60, duree: 40,
  cout: 55, net: 55, partEur: 55, partPct: 42, partAttendue: 48, resultat: 55,
};

function VolsHeader() {
  const cell = (w: number, label: string, align: "left" | "right" = "right") => (
    <Text style={{ width: w, fontSize: 7, fontFamily: "Helvetica-Bold", color: WHITE, textAlign: align }}>
      {label}
    </Text>
  );
  return (
    <View style={{
      flexDirection: "row", backgroundColor: NAVY,
      paddingHorizontal: 10, paddingVertical: 6, borderRadius: 4, marginBottom: 2,
    }}>
      {cell(COLS.date, "Date", "left")}
      {cell(COLS.client, "Client", "left")}
      {cell(COLS.type, "Type", "left")}
      {cell(COLS.duree, "Durée")}
      {cell(COLS.cout, "Coût avion")}
      {cell(COLS.net, "Net passagers")}
      {cell(COLS.partEur, "Part pilote")}
      {cell(COLS.partPct, "%")}
      {cell(COLS.partAttendue, "% attendu")}
      {cell(COLS.resultat, "Résultat")}
    </View>
  );
}

function VolRow({ v, i }: { v: LigneVol; i: number }) {
  const cell = (w: number, text: string, align: "left" | "right" = "right", color?: string) => (
    <Text style={{ width: w, fontSize: 7, color: color ?? SLATE, textAlign: align }}>{text}</Text>
  );
  const partColor = v.part_pilote_pct == null ? MUTED
    : v.part_pilote_pct < 0.5 ? RED
    : v.part_attendue_pct != null && v.part_pilote_pct < v.part_attendue_pct * 0.6 ? "#b45309"
    : GREEN;
  return (
    <View style={{
      flexDirection: "row", paddingHorizontal: 10, paddingVertical: 5,
      backgroundColor: i % 2 === 0 ? WHITE : BG, borderBottomWidth: 1, borderColor: BORDER,
    }}>
      {cell(COLS.date, dateStr(v.date), "left")}
      {cell(COLS.client, v.client, "left")}
      {cell(COLS.type, v.type_resa === "perso" ? "Sur mesure" : "Standard", "left")}
      {cell(COLS.duree, v.duree_reelle != null ? `${v.duree_reelle} min` : "—")}
      {cell(COLS.cout, euros(v.cout_avion))}
      {cell(COLS.net, euros(v.net_client))}
      {cell(COLS.partEur, euros(v.part_pilote), "right", partColor)}
      {cell(COLS.partPct, pct(v.part_pilote_pct), "right", partColor)}
      {cell(COLS.partAttendue, pct(v.part_attendue_pct))}
      {cell(COLS.resultat, euros(v.resultat), "right", v.resultat != null && v.resultat < 0 ? RED : GREEN)}
    </View>
  );
}

function SimpleTable({
  title, headers, rows,
}: {
  title: string;
  headers: string[];
  rows: string[][];
}) {
  if (rows.length === 0) return null;
  const w = `${100 / headers.length}%` as const;
  return (
    <View style={{ marginTop: 20 }}>
      <Text style={{ fontSize: 11, fontFamily: "Helvetica-Bold", color: NAVY, marginBottom: 6 }}>{title}</Text>
      <View style={{ flexDirection: "row", backgroundColor: NAVY, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 4 }}>
        {headers.map((h, i) => (
          <Text key={i} style={{ width: w, fontSize: 7, fontFamily: "Helvetica-Bold", color: WHITE }}>{h}</Text>
        ))}
      </View>
      {rows.map((r, i) => (
        <View key={i} style={{
          flexDirection: "row", paddingHorizontal: 10, paddingVertical: 5,
          backgroundColor: i % 2 === 0 ? WHITE : BG, borderBottomWidth: 1, borderColor: BORDER,
        }}>
          {r.map((val, j) => (
            <Text key={j} style={{ width: w, fontSize: 7, color: SLATE }}>{val}</Text>
          ))}
        </View>
      ))}
    </View>
  );
}

function TransactionsPDF({ data, logoDataUrl }: { data: TransactionsPDFData; logoDataUrl: string }) {
  const { vols, vouchers, depenses, soldeGlobal } = data;
  const generatedAt = new Date().toLocaleDateString("fr-BE", { day: "numeric", month: "long", year: "numeric" });
  const vouchersDispos = vouchers.filter(v => v.type !== "offered");

  return (
    <Document>
      <Page size="A4" orientation="landscape" style={{ fontFamily: "Helvetica", backgroundColor: WHITE, padding: 0 }}>

        {/* Header */}
        <View style={{ backgroundColor: NAVY, paddingHorizontal: 32, paddingTop: 22, paddingBottom: 18 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
            <View>
              <Image src={logoDataUrl} style={{ height: 16, width: 72, objectFit: "contain", marginBottom: 8 }} />
              <Text style={{ color: WHITE, fontSize: 14, fontFamily: "Helvetica-Bold" }}>Rapport Transactions</Text>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Text style={{ color: "rgba(255,255,255,0.6)", fontSize: 8 }}>Généré le {generatedAt}</Text>
              <Text style={{ color: "rgba(255,255,255,0.6)", fontSize: 8 }}>{vols.length} vol{vols.length > 1 ? "s" : ""}</Text>
            </View>
          </View>
        </View>
        <View style={{ backgroundColor: GOLD, height: 2 }} />

        <View style={{ paddingHorizontal: 32, paddingTop: 18, paddingBottom: 24 }}>

          {/* KPIs */}
          <View style={{ flexDirection: "row", gap: 10, marginBottom: 18 }}>
            <Kpi label="TOTAL ENCAISSÉ" value={euros(soldeGlobal.encaisse)} color={GREEN} />
            <Kpi label="COÛTS AVION" value={euros(soldeGlobal.cout_avion)} color={RED} />
            <Kpi
              label="PART PILOTE MOYENNE"
              value={soldeGlobal.part_pilote_moyenne_pct != null ? `${soldeGlobal.part_pilote_moyenne_pct}%` : "—"}
              color={soldeGlobal.part_pilote_moyenne_pct != null && soldeGlobal.part_pilote_moyenne_pct < 10 ? RED : GREEN}
            />
            <Kpi label="DÉPENSES AUTRES" value={euros(soldeGlobal.depenses)} color={RED} />
            <Kpi
              label="SOLDE NET"
              value={euros(soldeGlobal.solde_net)}
              color={soldeGlobal.solde_net >= 0 ? GREEN : RED}
            />
          </View>

          {/* Table vols */}
          <Text style={{ fontSize: 11, fontFamily: "Helvetica-Bold", color: NAVY, marginBottom: 6 }}>Vols</Text>
          <VolsHeader />
          {vols.map((v, i) => <VolRow key={v.id} v={v} i={i} />)}

          {/* Vouchers non utilisés */}
          <SimpleTable
            title="Vouchers non utilisés"
            headers={["Date", "Destinataire", "Type", "Minutes", "Montant"]}
            rows={vouchersDispos.map(v => [
              dateStr(v.date), v.destinataire,
              v.type === "boutique" ? "Boutique" : "Cash",
              `${v.minutes} min`, euros(v.montant),
            ])}
          />

          {/* Dépenses */}
          <SimpleTable
            title="Dépenses"
            headers={["Date", "Description", "Montant"]}
            rows={depenses.map(d => [dateStr(d.date), d.description, euros(d.montant)])}
          />

          <Text style={{ fontSize: 7, color: MUTED, marginTop: 20 }}>
            « Part pilote » = coût total de l&apos;avion moins le net encaissé des passagers, pour ce vol.
            « % attendu » = quote-part si le pilote payait comme un occupant parmi les autres (1 / (1 + nombre de passagers)).
          </Text>
        </View>

        {/* Footer */}
        <View style={{
          position: "absolute", bottom: 0, left: 0, right: 0,
          backgroundColor: NAVY, paddingHorizontal: 32, paddingVertical: 8,
          flexDirection: "row", justifyContent: "space-between",
        }} fixed>
          <Text style={{ color: GOLD, fontSize: 7, fontFamily: "Helvetica-Bold", letterSpacing: 1 }}>FLY HORIZONS</Text>
          <Text style={{ color: "#4e7096", fontSize: 7 }} render={({ pageNumber, totalPages }) => `Page ${pageNumber} / ${totalPages}`} />
          <Text style={{ color: "#4e7096", fontSize: 7 }}>fly-horizons.com</Text>
        </View>

      </Page>
    </Document>
  );
}

export async function generateTransactionsPDFBuffer(data: TransactionsPDFData): Promise<Buffer> {
  const { renderToBuffer } = await import("@react-pdf/renderer");
  const fs   = await import("fs");
  const path = await import("path");

  let logoDataUrl: string;
  try {
    const logoBuf = fs.default.readFileSync(
      path.default.join(process.cwd(), "public", "logo-white.png")
    );
    logoDataUrl = "data:image/png;base64," + logoBuf.toString("base64");
  } catch {
    logoDataUrl = "https://fly-horizons.com/logo-white.png";
  }

  return renderToBuffer(<TransactionsPDF data={data} logoDataUrl={logoDataUrl} />);
}
