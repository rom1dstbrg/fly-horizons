import React from "react";
import { Document, Page, Text, View, Image } from "@react-pdf/renderer";
import QRCode from "qrcode";

const NAVY   = "#062548";
const GOLD   = "#F6C000";
const WHITE  = "#ffffff";
const SLATE  = "#334155";
const MUTED  = "#64748b";
const BG     = "#f8fafc";
const BORDER = "#f1f5f9";

function formatTitle(minutes: number): string {
  if (minutes < 60) return `Vol de ${minutes} minutes`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `Vol de ${h}h` : `Vol de ${h}h${String(m).padStart(2, "0")}`;
}

interface Props {
  code: string;
  product_title: string;
  expiresAtStr: string;
  qrDataUrl: string;
  heroImageDataUrl: string;
}

function VoucherPDF({ code, product_title, expiresAtStr, qrDataUrl, heroImageDataUrl }: Props) {
  return (
    <Document>
      <Page size="A4" style={{ fontFamily: "Helvetica", backgroundColor: WHITE, flexDirection: "column" }}>

        {/* ── Hero photo ───────────────────────────────────────────── */}
        <View style={{ height: 195, position: "relative" }}>
          <Image
            src={heroImageDataUrl}
            style={{ position: "absolute", top: 0, left: 0, width: 595, height: 195, objectFit: "cover" }}
          />
          {/* Dark gradient overlay */}
          <View style={{
            position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: "rgba(6,37,72,0.72)",
          }} />
          {/* Logo */}
          <Image
            src="https://fly-horizons.com/logo-fly-horizons-navy.png"
            style={{ position: "absolute", top: 20, left: 28, height: 20, width: 88, objectFit: "contain" }}
          />
          {/* Hero text */}
          <View style={{ position: "absolute", bottom: 24, left: 28, right: 28 }}>
            <View style={{
              backgroundColor: GOLD,
              paddingLeft: 13, paddingRight: 13, paddingTop: 4, paddingBottom: 4,
              borderRadius: 20, alignSelf: "flex-start", marginBottom: 11,
            }}>
              <Text style={{ color: NAVY, fontSize: 8, fontFamily: "Helvetica-Bold", letterSpacing: 1.5 }}>
                VOUCHER
              </Text>
            </View>
            <Text style={{ color: WHITE, fontSize: 26, fontFamily: "Helvetica-Bold", marginBottom: 7, letterSpacing: -0.3 }}>
              {product_title}
            </Text>
            <Text style={{ color: "rgba(255,255,255,0.75)", fontSize: 9.5, marginBottom: 4 }}>
              Volez où vous voulez. À votre façon.
            </Text>
            <Text style={{ color: "rgba(255,255,255,0.5)", fontSize: 8.5, fontStyle: "italic" }}>
              {"Baptême de l'air en avion léger depuis l'aéroport de Charleroi (EBCI)."}
            </Text>
          </View>
        </View>

        {/* ── Gold bar ─────────────────────────────────────────────── */}
        <View style={{ backgroundColor: GOLD, height: 3 }} />

        {/* ── Body ─────────────────────────────────────────────────── */}
        <View style={{ flex: 1, paddingLeft: 32, paddingRight: 32, paddingTop: 14, paddingBottom: 14 }}>

          {/* Code */}
          <View style={{
            alignItems: "center",
            paddingTop: 11, paddingBottom: 11, marginBottom: 12,
            borderRadius: 12, borderWidth: 1, borderColor: BORDER,
          }}>
            <Text style={{ fontSize: 7, fontFamily: "Helvetica-Bold", color: MUTED, letterSpacing: 2.5, marginBottom: 5 }}>
              VOTRE CODE
            </Text>
            <Text style={{ fontSize: 24, fontFamily: "Courier-Bold", color: NAVY, letterSpacing: 5, marginBottom: 4 }}>
              {code}
            </Text>
            <Text style={{ fontSize: 8, color: MUTED }}>
              À saisir lors de la réservation, valable jusqu&apos;au {expiresAtStr}
            </Text>
          </View>

          {/* QR + Steps */}
          <View style={{
            flexDirection: "row",
            backgroundColor: BG, borderRadius: 10, borderWidth: 1, borderColor: BORDER,
            paddingLeft: 20, paddingRight: 20, paddingTop: 14, paddingBottom: 14,
            marginBottom: 10,
          }}>
            {/* QR code */}
            <View style={{ alignItems: "center", width: 115, paddingRight: 14 }}>
              <View style={{ borderWidth: 2, borderColor: NAVY, padding: 5, borderRadius: 6, marginBottom: 7 }}>
                <Image src={qrDataUrl} style={{ width: 88, height: 88 }} />
              </View>
              <Text style={{ fontSize: 7.5, fontFamily: "Helvetica-Bold", color: NAVY, marginBottom: 3 }}>
                fly-horizons.com
              </Text>
              <Text style={{ fontSize: 7, color: MUTED, textAlign: "center", lineHeight: 1.4 }}>
                {"Scannez pour\nréserver en ligne"}
              </Text>
            </View>

            {/* Steps */}
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 7.5, fontFamily: "Helvetica-Bold", color: MUTED, letterSpacing: 1.5, marginBottom: 10 }}>
                COMMENT RÉSERVER
              </Text>
              {([
                ["Accédez au formulaire", "Scannez le QR code ou rendez-vous sur fly-horizons.com/reservation."],
                ["Choisissez votre date", "Sélectionnez un créneau disponible et saisissez votre code cadeau."],
                ["Confirmation sous 48h", "Votre pilote valide votre créneau et vous envoie votre itinéraire de vol par email avant le décollage."],
              ] as [string, string][]).map(([title, desc], i) => (
                <View key={i} style={{ flexDirection: "row", marginBottom: i < 2 ? 8 : 0 }}>
                  <View style={{
                    backgroundColor: GOLD, width: 20, height: 20, borderRadius: 10,
                    marginRight: 10, flexShrink: 0, paddingTop: 3,
                  }}>
                    <Text style={{ color: NAVY, fontSize: 8.5, fontFamily: "Helvetica-Bold", textAlign: "center" }}>
                      {i + 1}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 8.5, fontFamily: "Helvetica-Bold", color: NAVY, marginBottom: 2 }}>{title}</Text>
                    <Text style={{ fontSize: 8, color: SLATE, lineHeight: 1.5 }}>{desc}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>

          {/* Info cards */}
          <View style={{ flexDirection: "row", marginBottom: 10 }}>
            {([
              ["LIEU",        "Aéroport de Charleroi (EBCI)\nRue des Frères Wright 8\n6041 Gosselies"],
              ["AVANT LE VOL","Votre pilote confirme l'heure exacte et vous envoie votre itinéraire quelques jours avant le départ."],
              ["TENUE",       "Vêtements confortables.\nPrévoir une couche chaude,\nmême en été."],
              ["MÉTÉO",       "Vol par beau temps.\nReporté sans frais en cas\nde conditions défavorables."],
            ] as [string, string][]).map(([label, text], i) => (
              <View key={i} style={{
                flex: 1, marginLeft: i > 0 ? 8 : 0,
                paddingLeft: 11, paddingRight: 11, paddingTop: 9, paddingBottom: 9,
                borderWidth: 1, borderColor: BORDER, borderRadius: 8,
              }}>
                <Text style={{ fontSize: 7.5, fontFamily: "Helvetica-Bold", color: NAVY, letterSpacing: 0.3, marginBottom: 6 }}>
                  {label}
                </Text>
                <Text style={{ fontSize: 7.5, color: MUTED, lineHeight: 1.55 }}>{text}</Text>
              </View>
            ))}
          </View>

          {/* FAQ */}
          <View>
            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
              <View style={{ flex: 1, height: 1, backgroundColor: BORDER }} />
              <Text style={{ fontSize: 7.5, fontFamily: "Helvetica-Bold", color: MUTED, letterSpacing: 2, marginLeft: 12, marginRight: 12 }}>
                QUESTIONS FRÉQUENTES
              </Text>
              <View style={{ flex: 1, height: 1, backgroundColor: BORDER }} />
            </View>
            <View style={{ flexDirection: "row" }}>
              <View style={{ flex: 1, marginRight: 6 }}>
                {([
                  ["Mauvaise météo : que se passe-t-il ?",
                   "Le vol est reporté sans frais. La décision appartient au pilote. Vous êtes prévenu par email ou téléphone dès que possible."],
                  ["Combien de passagers à bord ?",
                   "L'avion accueille le pilote et jusqu'à 3 passagers. Si vous êtes plus de 3, plusieurs vols seront nécessaires."],
                ] as [string, string][]).map(([q, a], i) => (
                  <View key={i} style={{
                    backgroundColor: BG, borderRadius: 7, borderWidth: 1, borderColor: BORDER,
                    paddingLeft: 11, paddingRight: 11, paddingTop: 7, paddingBottom: 7,
                    marginBottom: i === 0 ? 7 : 0,
                  }}>
                    <Text style={{ fontSize: 7.5, fontFamily: "Helvetica-Bold", color: NAVY, marginBottom: 4 }}>{q}</Text>
                    <Text style={{ fontSize: 7.5, color: MUTED, lineHeight: 1.55 }}>{a}</Text>
                  </View>
                ))}
              </View>
              <View style={{ flex: 1, marginLeft: 6 }}>
                {([
                  ["Puis-je annuler ou reporter ?",
                   "Annulation sans frais jusqu'à 48h avant le vol. Pour reporter, connectez-vous à votre espace client sur fly-horizons.com."],
                  ["Photos et vidéos pendant le vol ?",
                   "Oui, sans restriction. Pensez à charger vos appareils avant le vol et à les sécuriser à bord."],
                ] as [string, string][]).map(([q, a], i) => (
                  <View key={i} style={{
                    backgroundColor: BG, borderRadius: 7, borderWidth: 1, borderColor: BORDER,
                    paddingLeft: 11, paddingRight: 11, paddingTop: 7, paddingBottom: 7,
                    marginBottom: i === 0 ? 7 : 0,
                  }}>
                    <Text style={{ fontSize: 7.5, fontFamily: "Helvetica-Bold", color: NAVY, marginBottom: 4 }}>{q}</Text>
                    <Text style={{ fontSize: 7.5, color: MUTED, lineHeight: 1.55 }}>{a}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>

        </View>

        {/* ── Footer ───────────────────────────────────────────────── */}
        <View style={{
          backgroundColor: NAVY,
          paddingLeft: 32, paddingRight: 32, paddingTop: 11, paddingBottom: 11,
          flexDirection: "row", justifyContent: "space-between", alignItems: "center",
        }}>
          <Text style={{ color: GOLD, fontSize: 8, fontFamily: "Helvetica-Bold", letterSpacing: 1.5 }}>
            FLY HORIZONS
          </Text>
          <Text style={{ color: "#4e7096", fontSize: 7.5 }}>
            info@fly-horizons.com
          </Text>
          <Text style={{ color: "#4e7096", fontSize: 7.5 }}>
            fly-horizons.com
          </Text>
        </View>

      </Page>
    </Document>
  );
}

// ── Public interface ──────────────────────────────────────────────────────────

export interface VoucherPDFParams {
  code: string;
  duration_minutes: number;
  product_title: string;
  expiresAt: Date;
}

export async function generateVoucherPDFBuffer(params: VoucherPDFParams): Promise<Buffer> {
  const { renderToBuffer } = await import("@react-pdf/renderer");
  const fs   = await import("fs");
  const path = await import("path");

  const reservationUrl = `https://fly-horizons.com/reservation?duree=${params.duration_minutes}&code=${encodeURIComponent(params.code)}`;

  const qrDataUrl = await QRCode.toDataURL(reservationUrl, {
    width: 200,
    margin: 1,
    color: { dark: "#062548", light: "#ffffff" },
  });

  const expiresAtStr = params.expiresAt.toLocaleDateString("fr-BE", {
    day: "numeric", month: "long", year: "numeric",
  });

  // Hero image — filesystem first (local/Netlify), URL fallback
  let heroImageDataUrl: string;
  try {
    const imgBuf = fs.default.readFileSync(path.default.join(process.cwd(), "public", "gallery", "2.png"));
    heroImageDataUrl = "data:image/png;base64," + imgBuf.toString("base64");
  } catch {
    heroImageDataUrl = "https://fly-horizons.com/gallery/2.png";
  }

  const title = params.product_title || formatTitle(params.duration_minutes);

  return renderToBuffer(
    <VoucherPDF
      code={params.code}
      product_title={title}
      expiresAtStr={expiresAtStr}
      qrDataUrl={qrDataUrl}
      heroImageDataUrl={heroImageDataUrl}
    />
  );
}
