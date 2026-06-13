import React from "react";
import { Document, Page, Text, View, Image } from "@react-pdf/renderer";
import QRCode from "qrcode";

const NAVY   = "#0b2238";
const GOLD   = "#F2B705";
const WHITE  = "#ffffff";
const SLATE  = "#334155";
const MUTED  = "#64748b";
const BG     = "#f8fafc";
const BORDER = "#e2e8f0";

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDurationBadge(minutes: number): string {
  if (minutes < 60) return `${minutes} MIN DE VOL`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h}H DE VOL` : `${h}H${String(m).padStart(2, "0")} DE VOL`;
}

function formatDurationLabel(minutes: number): string {
  if (minutes < 60) return `Vol de ${minutes} minutes`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `Vol de ${h}h` : `Vol de ${h}h${String(m).padStart(2, "0")}`;
}

// ── Component ─────────────────────────────────────────────────────────────────

interface VoucherPDFProps {
  code: string;
  duration_minutes: number;
  product_title: string;
  expiresAtStr: string;
  qrCodeDataUrl: string;
}

function VoucherPDF({ code, duration_minutes, product_title, expiresAtStr, qrCodeDataUrl }: VoucherPDFProps) {
  const title = product_title || formatDurationLabel(duration_minutes);
  const badge = formatDurationBadge(duration_minutes);

  return (
    <Document>
      <Page size="A5" style={{ fontFamily: "Helvetica", backgroundColor: WHITE }}>

        {/* ── Header navy ────────────────────────────────────────────────── */}
        <View style={{
          backgroundColor: NAVY,
          paddingTop: 18, paddingBottom: 18,
          paddingLeft: 28, paddingRight: 28,
          alignItems: "center",
        }}>
          <Image
            src="https://fly-horizons.com/logo-email.png"
            style={{ width: 100, height: 20, marginBottom: 10 }}
          />
          <Text style={{
            color: GOLD, fontSize: 11,
            fontFamily: "Helvetica-Bold",
            textAlign: "center",
            letterSpacing: 0.4,
            marginBottom: 8,
          }}>
            {title}
          </Text>
          <View style={{
            backgroundColor: GOLD,
            paddingLeft: 12, paddingRight: 12,
            paddingTop: 4, paddingBottom: 4,
          }}>
            <Text style={{ color: NAVY, fontSize: 8.5, fontFamily: "Helvetica-Bold", letterSpacing: 1.5 }}>
              {badge}
            </Text>
          </View>
        </View>

        {/* ── Gold bar ───────────────────────────────────────────────────── */}
        <View style={{ backgroundColor: GOLD, height: 3 }} />

        {/* ���─ Body ───────��──────────────────────────────────────────────── */}
        <View style={{ paddingLeft: 24, paddingRight: 24, paddingTop: 18, paddingBottom: 14 }}>

          {/* Code */}
          <Text style={{
            color: MUTED, fontSize: 7,
            fontFamily: "Helvetica-Bold",
            letterSpacing: 2, textAlign: "center",
            marginBottom: 6,
          }}>
            VOTRE CODE D&apos;ACCÈS
          </Text>
          <View style={{
            backgroundColor: NAVY,
            paddingTop: 11, paddingBottom: 11,
            marginBottom: 16, borderRadius: 3,
          }}>
            <Text style={{
              color: GOLD, fontSize: 20,
              fontFamily: "Courier-Bold",
              letterSpacing: 3, textAlign: "center",
            }}>
              {code}
            </Text>
          </View>

          {/* Two columns: QR | Steps */}
          <View style={{ flexDirection: "row", marginBottom: 14 }}>

            {/* Left — QR */}
            <View style={{ width: "36%", alignItems: "center", paddingRight: 14 }}>
              <View style={{ borderWidth: 2, borderColor: NAVY, padding: 3, marginBottom: 5 }}>
                <Image src={qrCodeDataUrl} style={{ width: 76, height: 76 }} />
              </View>
              <Text style={{
                color: NAVY, fontSize: 7,
                fontFamily: "Helvetica-Bold",
                textAlign: "center", letterSpacing: 0.3,
                marginBottom: 3,
              }}>
                fly-horizons.com
              </Text>
              <Text style={{ color: MUTED, fontSize: 6.5, textAlign: "center", lineHeight: 1.4 }}>
                Scannez pour réserver
              </Text>
            </View>

            {/* Right — Steps */}
            <View style={{ flex: 1 }}>
              <Text style={{
                color: NAVY, fontSize: 7.5,
                fontFamily: "Helvetica-Bold",
                letterSpacing: 1, marginBottom: 9,
              }}>
                COMMENT UTILISER CE BON
              </Text>

              {[
                "Rendez-vous sur fly-horizons.com/reservation ou scannez le QR code.",
                "Choisissez votre date et saisissez votre code lors de la réservation.",
                "Présentez-vous 15 min avant le décollage à l'aéroport de Charleroi (EBCI).",
              ].map((text, i) => (
                <View key={i} style={{ flexDirection: "row", marginBottom: i < 2 ? 7 : 0, alignItems: "flex-start" }}>
                  <View style={{
                    backgroundColor: GOLD,
                    width: 14, height: 14,
                    marginRight: 7, flexShrink: 0,
                    paddingTop: 2,
                  }}>
                    <Text style={{ color: NAVY, fontSize: 7, fontFamily: "Helvetica-Bold", textAlign: "center" }}>
                      {i + 1}
                    </Text>
                  </View>
                  <Text style={{ color: SLATE, fontSize: 7.5, lineHeight: 1.45, flex: 1 }}>
                    {text}
                  </Text>
                </View>
              ))}
            </View>
          </View>

          {/* Divider */}
          <View style={{ borderTopWidth: 1, borderTopColor: BORDER, marginBottom: 12 }} />

          {/* Infos pratiques */}
          <View style={{
            backgroundColor: BG,
            borderWidth: 1, borderColor: BORDER,
            borderLeftWidth: 3, borderLeftColor: GOLD,
            paddingLeft: 12, paddingRight: 12,
            paddingTop: 10, paddingBottom: 10,
            borderRadius: 2,
          }}>
            <Text style={{
              color: NAVY, fontSize: 7.5,
              fontFamily: "Helvetica-Bold",
              letterSpacing: 1, marginBottom: 8,
            }}>
              INFORMATIONS PRATIQUES
            </Text>

            {[
              ["Lieu", "Aéroport de Charleroi (EBCI) — Rue des Frères Wright 8, 6041 Gosselies"],
              ["Arrivée", "Présentez-vous 15 min avant le décollage. Romain vous accueillera sur place."],
              ["Tenue", "Vêtements confortables. Prévoir une couche chaude, même en été."],
              ["Météo", "Vol par beau temps uniquement. En cas de conditions défavorables, reporté sans frais."],
            ].map(([label, value], i, arr) => (
              <View key={i} style={{ flexDirection: "row", marginBottom: i < arr.length - 1 ? 5 : 0 }}>
                <Text style={{ color: NAVY, fontSize: 7.5, fontFamily: "Helvetica-Bold", width: 40, flexShrink: 0 }}>
                  {label}
                </Text>
                <Text style={{ color: MUTED, fontSize: 7.5, flex: 1, lineHeight: 1.45 }}>
                  {value}
                </Text>
              </View>
            ))}
          </View>

        </View>

        {/* ── Footer navy ────────────────────────────────────────────────── */}
        <View style={{
          backgroundColor: NAVY,
          paddingLeft: 24, paddingRight: 24,
          paddingTop: 9, paddingBottom: 9,
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
        }}>
          <Text style={{ color: GOLD, fontSize: 7, fontFamily: "Helvetica-Bold", letterSpacing: 0.5 }}>
            fly-horizons.com
          </Text>
          <Text style={{ color: "#4e7096", fontSize: 7, letterSpacing: 0.2 }}>
            Valable jusqu&apos;au {expiresAtStr} · 1 vol inclus
          </Text>
          <Text style={{ color: "#4e7096", fontSize: 7 }}>
            info@fly-horizons.com
          </Text>
        </View>

      </Page>
    </Document>
  );
}

// ── Public interface ──────��───────────────────────────────────────────────────

export interface VoucherPDFParams {
  code: string;
  duration_minutes: number;
  product_title: string;
  expiresAt: Date;
}

export async function generateVoucherPDFBuffer(params: VoucherPDFParams): Promise<Buffer> {
  const { renderToBuffer } = await import("@react-pdf/renderer");

  const reservationUrl = `https://fly-horizons.com/reservation?duree=${params.duration_minutes}&code=${encodeURIComponent(params.code)}`;

  const qrCodeDataUrl = await QRCode.toDataURL(reservationUrl, {
    width: 180,
    margin: 1,
    color: { dark: NAVY, light: WHITE },
  });

  const expiresAtStr = params.expiresAt.toLocaleDateString("fr-BE", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return renderToBuffer(
    <VoucherPDF
      code={params.code}
      duration_minutes={params.duration_minutes}
      product_title={params.product_title}
      expiresAtStr={expiresAtStr}
      qrCodeDataUrl={qrCodeDataUrl}
    />
  );
}
