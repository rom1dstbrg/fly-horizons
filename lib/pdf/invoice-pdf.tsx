import React from "react";
import { Document, Page, Text, View, Image } from "@react-pdf/renderer";

const NAVY   = "#062548";
const GOLD   = "#F6C000";
const WHITE  = "#ffffff";
const SLATE  = "#334155";
const MUTED  = "#64748b";
const BG     = "#f8fafc";
const BORDER = "#e2e8f0";

export interface InvoiceItem {
  title: string;
  quantity: number;
  unit_price: number;
}

export interface InvoiceData {
  orderId: string;
  createdAt: Date;
  paidAt?: Date | null;
  customerName: string;
  customerEmail: string;
  items: InvoiceItem[];
  subtotal: number;
  shippingCost: number;
  discountAmount: number;
  couponCode: string | null;
  total: number;
  shippingAddress?: {
    full_name?: string;
    line1?: string;
    line2?: string;
    postal_code?: string;
    city?: string;
    country?: string;
  } | null;
}

function euros(n: number) {
  return n.toLocaleString("fr-BE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
      <Text style={{ fontSize: 9, color: bold ? NAVY : MUTED, fontFamily: bold ? "Helvetica-Bold" : "Helvetica" }}>
        {label}
      </Text>
      <Text style={{ fontSize: 9, color: bold ? NAVY : SLATE, fontFamily: bold ? "Helvetica-Bold" : "Helvetica" }}>
        {value}
      </Text>
    </View>
  );
}

function InvoicePDF({
  data,
  detailed,
  logoDataUrl,
}: {
  data: InvoiceData;
  detailed: boolean;
  logoDataUrl: string;
}) {
  const ref = `FH-${data.orderId.slice(0, 8).toUpperCase()}`;
  const dateStr = data.createdAt.toLocaleDateString("fr-BE", { day: "numeric", month: "long", year: "numeric" });
  const paidStr = data.paidAt
    ? data.paidAt.toLocaleDateString("fr-BE", { day: "numeric", month: "long", year: "numeric" })
    : dateStr;

  return (
    <Document>
      <Page size="A4" style={{ fontFamily: "Helvetica", backgroundColor: WHITE, padding: 0 }}>

        {/* ── Header navy ──────────────────────────────────────────── */}
        <View style={{ backgroundColor: NAVY, paddingLeft: 40, paddingRight: 40, paddingTop: 28, paddingBottom: 24 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
            {/* Logo + société */}
            <View>
              <Image src={logoDataUrl} style={{ height: 18, width: 80, objectFit: "contain", marginBottom: 10 }} />
              <Text style={{ color: "rgba(255,255,255,0.7)", fontSize: 8, lineHeight: 1.7 }}>
                {"DESTANBERG Romain\nAéroport de Charleroi (EBCI)\nRue des Frères Wright 8 · 6041 Gosselies\ninfo@fly-horizons.com · fly-horizons.com"}
              </Text>
            </View>

            {/* Facture info */}
            <View style={{ alignItems: "flex-end" }}>
              <View style={{ backgroundColor: GOLD, paddingLeft: 10, paddingRight: 10, paddingTop: 4, paddingBottom: 4, borderRadius: 4, marginBottom: 8 }}>
                <Text style={{ color: NAVY, fontSize: 10, fontFamily: "Helvetica-Bold", letterSpacing: 1 }}>
                  {detailed ? "FACTURE DÉTAILLÉE" : "FACTURE"}
                </Text>
              </View>
              <Text style={{ color: WHITE, fontSize: 11, fontFamily: "Helvetica-Bold", marginBottom: 4 }}>{ref}</Text>
              <Text style={{ color: "rgba(255,255,255,0.6)", fontSize: 8 }}>Émise le {dateStr}</Text>
              <Text style={{ color: "rgba(255,255,255,0.6)", fontSize: 8 }}>Payée le {paidStr}</Text>
            </View>
          </View>
        </View>

        {/* Gold bar */}
        <View style={{ backgroundColor: GOLD, height: 3 }} />

        {/* ── Body ─────────────────────────────────────────────────── */}
        <View style={{ paddingLeft: 40, paddingRight: 40, paddingTop: 30, paddingBottom: 30 }}>

          {/* Client */}
          <View style={{
            backgroundColor: BG, borderRadius: 8, borderWidth: 1, borderColor: BORDER,
            paddingLeft: 20, paddingRight: 20, paddingTop: 14, paddingBottom: 14, marginBottom: 24,
          }}>
            <Text style={{ fontSize: 7.5, fontFamily: "Helvetica-Bold", color: MUTED, letterSpacing: 2, marginBottom: 8 }}>
              FACTURÉ À
            </Text>
            <Text style={{ fontSize: 10, fontFamily: "Helvetica-Bold", color: NAVY, marginBottom: 3 }}>
              {data.customerName || data.customerEmail}
            </Text>
            <Text style={{ fontSize: 8.5, color: MUTED, marginBottom: 2 }}>{data.customerEmail}</Text>
            {data.shippingAddress?.line1 && (
              <>
                <Text style={{ fontSize: 8.5, color: MUTED }}>{data.shippingAddress.line1}</Text>
                {data.shippingAddress.line2 && (
                  <Text style={{ fontSize: 8.5, color: MUTED }}>{data.shippingAddress.line2}</Text>
                )}
                <Text style={{ fontSize: 8.5, color: MUTED }}>
                  {data.shippingAddress.postal_code} {data.shippingAddress.city}
                  {data.shippingAddress.country ? ` · ${data.shippingAddress.country}` : ""}
                </Text>
              </>
            )}
          </View>

          {/* Items table (détaillée seulement) */}
          {detailed && (
            <View style={{ marginBottom: 20 }}>
              {/* Header */}
              <View style={{
                flexDirection: "row", backgroundColor: NAVY,
                paddingLeft: 12, paddingRight: 12, paddingTop: 8, paddingBottom: 8,
                borderRadius: 6,
              }}>
                <Text style={{ flex: 1, fontSize: 8, fontFamily: "Helvetica-Bold", color: WHITE }}>Description</Text>
                <Text style={{ width: 40, fontSize: 8, fontFamily: "Helvetica-Bold", color: WHITE, textAlign: "center" }}>Qté</Text>
                <Text style={{ width: 70, fontSize: 8, fontFamily: "Helvetica-Bold", color: WHITE, textAlign: "right" }}>Prix unit.</Text>
                <Text style={{ width: 70, fontSize: 8, fontFamily: "Helvetica-Bold", color: WHITE, textAlign: "right" }}>Total</Text>
              </View>

              {/* Items */}
              {data.items.map((item, i) => (
                <View
                  key={i}
                  style={{
                    flexDirection: "row",
                    paddingLeft: 12, paddingRight: 12, paddingTop: 10, paddingBottom: 10,
                    borderBottomWidth: 1, borderColor: BORDER,
                    backgroundColor: i % 2 === 0 ? WHITE : BG,
                  }}
                >
                  <Text style={{ flex: 1, fontSize: 8.5, color: SLATE }}>{item.title}</Text>
                  <Text style={{ width: 40, fontSize: 8.5, color: SLATE, textAlign: "center" }}>{item.quantity}</Text>
                  <Text style={{ width: 70, fontSize: 8.5, color: SLATE, textAlign: "right" }}>{euros(item.unit_price)}</Text>
                  <Text style={{ width: 70, fontSize: 8.5, color: SLATE, textAlign: "right" }}>
                    {euros(item.unit_price * item.quantity)}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* Simple mode: just a summary line */}
          {!detailed && (
            <View style={{
              borderWidth: 1, borderColor: BORDER, borderRadius: 8,
              paddingLeft: 20, paddingRight: 20, paddingTop: 14, paddingBottom: 14, marginBottom: 20,
            }}>
              <Text style={{ fontSize: 7.5, fontFamily: "Helvetica-Bold", color: MUTED, letterSpacing: 2, marginBottom: 8 }}>
                OBJET
              </Text>
              <Text style={{ fontSize: 9, color: SLATE }}>
                {data.items.length === 1
                  ? data.items[0].title
                  : `${data.items.length} articles — Fly Horizons`}
              </Text>
            </View>
          )}

          {/* Totals */}
          <View style={{
            backgroundColor: BG, borderRadius: 8, borderWidth: 1, borderColor: BORDER,
            paddingLeft: 24, paddingRight: 24, paddingTop: 16, paddingBottom: 16,
            alignSelf: "flex-end", minWidth: 220,
          }}>
            {detailed && <Row label="Sous-total" value={euros(data.subtotal)} />}
            {detailed && data.shippingCost > 0 && (
              <Row label="Livraison" value={euros(data.shippingCost)} />
            )}
            {detailed && data.discountAmount > 0 && (
              <Row
                label={`Réduction${data.couponCode ? ` (${data.couponCode})` : ""}`}
                value={`−${euros(data.discountAmount)}`}
              />
            )}
            {detailed && <View style={{ height: 1, backgroundColor: BORDER, marginTop: 6, marginBottom: 8 }} />}
            <Row label="TOTAL TTC" value={euros(data.total)} bold />
            <Text style={{ fontSize: 7.5, color: MUTED, marginTop: 6 }}>
              TVA non applicable · Art. 56bis du Code TVA belge
            </Text>
          </View>

          {/* Payment note */}
          <View style={{ marginTop: 24, paddingTop: 16, borderTopWidth: 1, borderColor: BORDER }}>
            <Text style={{ fontSize: 8, color: MUTED }}>
              Paiement reçu le {paidStr} par carte bancaire via Stripe.
              Cette facture est établie à titre de justificatif de paiement.
            </Text>
          </View>
        </View>

        {/* ── Footer ───────────────────────────────────────────────── */}
        <View style={{
          position: "absolute", bottom: 0, left: 0, right: 0,
          backgroundColor: NAVY,
          paddingLeft: 40, paddingRight: 40, paddingTop: 10, paddingBottom: 10,
          flexDirection: "row", justifyContent: "space-between", alignItems: "center",
        }}>
          <Text style={{ color: GOLD, fontSize: 7.5, fontFamily: "Helvetica-Bold", letterSpacing: 1.5 }}>FLY HORIZONS</Text>
          <Text style={{ color: "#4e7096", fontSize: 7.5 }}>Réf : {ref}</Text>
          <Text style={{ color: "#4e7096", fontSize: 7.5 }}>fly-horizons.com</Text>
        </View>

      </Page>
    </Document>
  );
}

// ── Public interface ──────────────────────────────────────────────────────────

export async function generateInvoicePDFBuffer(data: InvoiceData, detailed: boolean): Promise<Buffer> {
  const { renderToBuffer } = await import("@react-pdf/renderer");
  const fs   = await import("fs");
  const path = await import("path");

  let logoDataUrl: string;
  try {
    const logoBuf = fs.default.readFileSync(
      path.default.join(process.cwd(), "public", "logo-fly-horizons-navy.png")
    );
    logoDataUrl = "data:image/png;base64," + logoBuf.toString("base64");
  } catch {
    logoDataUrl = "https://fly-horizons.com/logo-fly-horizons-navy.png";
  }

  return renderToBuffer(
    <InvoicePDF data={data} detailed={detailed} logoDataUrl={logoDataUrl} />
  );
}
