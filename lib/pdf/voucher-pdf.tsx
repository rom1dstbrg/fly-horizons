import React from "react";
import { Document, Page, Text, View, Image, StyleSheet } from "@react-pdf/renderer";
import QRCode from "qrcode";

const NAVY = "#0b2238";
const GOLD = "#F2B705";
const WHITE = "#ffffff";

const s = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    flexDirection: "column",
  },

  // ── Header ──────────────────────────────────────────────────────────
  header: {
    backgroundColor: NAVY,
    paddingLeft: 32,
    paddingRight: 32,
    paddingTop: 28,
    paddingBottom: 28,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 22,
  },
  brand: {
    color: WHITE,
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 3,
  },
  logoImg: {
    width: 100,
    height: 28,
    objectFit: "contain" as unknown as undefined,
  },
  badge: {
    backgroundColor: GOLD,
    color: NAVY,
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 1,
    paddingLeft: 8,
    paddingRight: 8,
    paddingTop: 4,
    paddingBottom: 4,
  },
  title: {
    color: WHITE,
    fontSize: 38,
    fontFamily: "Helvetica-Bold",
    textAlign: "center",
    lineHeight: 1,
    marginBottom: 8,
  },
  subtitle: {
    color: GOLD,
    fontSize: 13,
    fontFamily: "Helvetica-Bold",
    textAlign: "center",
    letterSpacing: 0.3,
  },

  // ── Gold divider ─────────────────────────────────────────────────────
  goldBar: {
    backgroundColor: GOLD,
    height: 4,
  },

  // ── Body ─────────────────────────────────────────────────────────────
  body: {
    flex: 1,
    backgroundColor: WHITE,
    paddingLeft: 32,
    paddingRight: 32,
    paddingTop: 28,
    paddingBottom: 24,
    flexDirection: "column",
  },

  codeLabel: {
    color: "#aaaaaa",
    fontSize: 7.5,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 2,
    textAlign: "center",
    marginBottom: 10,
  },
  codeBox: {
    backgroundColor: NAVY,
    paddingTop: 14,
    paddingBottom: 14,
    marginBottom: 26,
  },
  codeText: {
    color: GOLD,
    fontSize: 20,
    fontFamily: "Courier-Bold",
    letterSpacing: 2,
    textAlign: "center",
  },

  qrHint: {
    color: "#999999",
    fontSize: 8,
    textAlign: "center",
    marginBottom: 14,
    lineHeight: 1.4,
  },
  qrWrap: {
    alignSelf: "center",
    borderWidth: 3,
    borderColor: NAVY,
    borderStyle: "solid",
    padding: 5,
    marginBottom: 12,
  },
  qrImg: {
    width: 108,
    height: 108,
  },
  qrUrl: {
    color: NAVY,
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    textAlign: "center",
    letterSpacing: 0.3,
  },

  expiry: {
    color: "#cccccc",
    fontSize: 7,
    textAlign: "center",
    marginTop: "auto" as unknown as number,
    paddingTop: 14,
  },

  // ── Footer ────────────────────────────────────────────────────────────
  footer: {
    backgroundColor: GOLD,
    paddingLeft: 32,
    paddingRight: 32,
    paddingTop: 10,
    paddingBottom: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  footerText: {
    color: NAVY,
    fontSize: 7.5,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 0.8,
  },
});

interface VoucherPDFProps {
  code: string;
  duration_minutes: number;
  product_title: string;
  expiresAtStr: string;
  qrCodeDataUrl: string;
}

function formatDurationBadge(minutes: number): string {
  if (minutes < 60) return `${minutes} MIN`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h}H` : `${h}H${String(m).padStart(2, "0")}`;
}

function VoucherPDF({ code, duration_minutes, product_title, expiresAtStr, qrCodeDataUrl }: VoucherPDFProps) {
  const durationLabel =
    duration_minutes >= 60
      ? `Vol de ${duration_minutes / 60}h en ULM`
      : `Vol de ${duration_minutes} minutes en ULM`;

  const displayTitle = product_title || durationLabel;
  const durationBadge = formatDurationBadge(duration_minutes);

  return (
    <Document>
      <Page size="A5" style={s.page}>

        {/* Header navy */}
        <View style={s.header}>
          <View style={s.headerRow}>
            <Image src="https://fly-horizons.com/logo-email.png" style={s.logoImg} />
          </View>
          <Text style={s.title}>BON DE VOL</Text>
          <Text style={s.subtitle}>{displayTitle}</Text>
        </View>

        {/* Gold bar */}
        <View style={s.goldBar} />

        {/* Body white */}
        <View style={s.body}>
          <Text style={s.codeLabel}>VOTRE CODE D&apos;ACCÈS</Text>

          <View style={s.codeBox}>
            <Text style={s.codeText}>{code}</Text>
          </View>

          <Text style={s.qrHint}>Scannez pour réserver votre vol</Text>

          <View style={s.qrWrap}>
            <Image src={qrCodeDataUrl} style={s.qrImg} />
          </View>

          <Text style={s.qrUrl}>fly-horizons.com/reservation</Text>

          <Text style={s.expiry}>Valable jusqu&apos;au {expiresAtStr} · 1 vol inclus</Text>
        </View>

        {/* Footer gold */}
        <View style={s.footer}>
          <Text style={s.footerText}>fly-horizons.com</Text>
          <Text style={s.footerText}>info@fly-horizons.com</Text>
        </View>

      </Page>
    </Document>
  );
}

export interface VoucherPDFParams {
  code: string;
  duration_minutes: number;
  product_title: string;
  expiresAt: Date;
}

export async function generateVoucherPDFBuffer(params: VoucherPDFParams): Promise<Buffer> {
  const { renderToBuffer } = await import("@react-pdf/renderer");

  // QR code → page réservation avec duree + code pré-remplis
  const reservationUrl = `https://fly-horizons.com/reservation?duree=${params.duration_minutes}&code=${encodeURIComponent(params.code)}`;

  const qrCodeDataUrl = await QRCode.toDataURL(reservationUrl, {
    width: 220,
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
