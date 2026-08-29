import React from "react";
import { Document, Page, Text, View, Image } from "@react-pdf/renderer";

const NAVY  = "#0b2238";
const GOLD  = "#F2B705";
const WHITE = "#ffffff";
const MUTED = "#64748b";
const BG    = "#f5f5f7";

// Même nommage que les packs vendus sur le site (voir components/admin/ProductForm.tsx)
const PACK_NAMES: Record<number, string> = {
  30: "Découverte",
  60: "Exploration",
  90: "Immersion",
  120: "Ultime",
};
function packLabel(duree: number): string {
  const nom = PACK_NAMES[duree] ?? "Vol";
  const dureeStr = duree < 60 ? `${duree} min` : duree % 60 === 0 ? `${duree / 60}h` : `${Math.floor(duree / 60)}h${duree % 60}`;
  return `${nom} · ${dureeStr}`;
}

// Code-barres purement décoratif (façon vrai billet), largeurs pseudo-aléatoires
// mais reproductibles à partir d'une graine (le numéro de vol).
function barcodeWidths(seed: string, count: number): number[] {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  const widths: number[] = [];
  for (let i = 0; i < count; i++) {
    h = (h * 1103515245 + 12345) >>> 0;
    widths.push(1 + (h % 3));
  }
  return widths;
}

function Barcode({ seed, vertical }: { seed: string; vertical: boolean }) {
  const widths = barcodeWidths(seed, vertical ? 26 : 40);
  return (
    <View style={{ flexDirection: vertical ? "column" : "row", alignItems: vertical ? "flex-start" : "flex-end" }}>
      {widths.map((w, i) => (
        <View key={i} style={vertical
          ? { height: w, width: 48, backgroundColor: "#111827", marginBottom: 1.6 }
          : { width: w, height: i % 5 === 0 ? 30 : 22, backgroundColor: "#111827", marginRight: 1.6 }
        } />
      ))}
    </View>
  );
}

interface Props {
  packTitle: string;    // ex. "Exploration · 60 min"
  flightNumber: string; // ex. "FH056"
  dateStr: string;      // "DD/MM"
  heureStr: string;     // "HH:MM"
  routeText: string;    // points de l'itinéraire, séparés par " → "
  logoDataUrl: string;
}

function BoardingPassPDF({ packTitle, flightNumber, dateStr, heureStr, routeText, logoDataUrl }: Props) {
  return (
    <Document>
      <Page size={[720, 306]} style={{ fontFamily: "Helvetica", backgroundColor: BG }}>
        <View style={{
          margin: 20, borderRadius: 14, overflow: "hidden",
          borderWidth: 1, borderColor: "#e0e5ef", backgroundColor: WHITE,
        }}>

          {/* ── Bandeau ─────────────────────────────────────────── */}
          <View style={{
            backgroundColor: NAVY, height: 66,
            flexDirection: "row", alignItems: "center",
            paddingLeft: 22, paddingRight: 22,
          }}>
            <Image src={logoDataUrl} style={{ height: 20, width: 100, objectFit: "contain" }} />

            <View style={{ flex: 1 }} />

            <View style={{ alignItems: "flex-end", marginRight: 34 }}>
              <Text style={{ color: WHITE, fontSize: 11, fontFamily: "Helvetica-Bold", letterSpacing: 0.5 }}>
                {packTitle.toUpperCase()}
              </Text>
              <Text style={{ color: "rgba(255,255,255,0.6)", fontSize: 8.5, marginTop: 2 }}>
                Flight : {flightNumber}
              </Text>
            </View>

            <View style={{ alignItems: "flex-end", marginRight: 34 }}>
              <Text style={{ color: WHITE, fontSize: 12, fontFamily: "Helvetica-Bold", letterSpacing: 0.5 }}>BOARDING</Text>
              <Text style={{ color: GOLD, fontSize: 12, fontFamily: "Helvetica-Bold", letterSpacing: 0.5 }}>PASS</Text>
            </View>

            <View style={{ alignItems: "flex-end" }}>
              <Text style={{ color: "rgba(255,255,255,0.6)", fontSize: 8 }}>Flight</Text>
              <Text style={{ color: WHITE, fontSize: 11, fontFamily: "Helvetica-Bold" }}>{flightNumber}</Text>
            </View>
          </View>

          {/* ── Corps ───────────────────────────────────────────── */}
          <View style={{ flexDirection: "row", height: 192 }}>

            {/* Section principale */}
            <View style={{ flex: 1, paddingLeft: 22, paddingRight: 18, paddingTop: 16, paddingBottom: 16 }}>

              <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
                <View>
                  <Text style={{ fontSize: 8, fontFamily: "Helvetica-Bold", color: NAVY, letterSpacing: 1 }}>CHARLEROI</Text>
                  <Text style={{ fontSize: 30, fontFamily: "Helvetica-Bold", color: "#111827" }}>CRL</Text>
                </View>
                <Text style={{ flex: 1, textAlign: "center", fontSize: 16, color: MUTED }}>{"—>"}</Text>
                <View style={{ alignItems: "flex-end" }}>
                  <Text style={{ fontSize: 8, fontFamily: "Helvetica-Bold", color: NAVY, letterSpacing: 1 }}>CHARLEROI</Text>
                  <Text style={{ fontSize: 30, fontFamily: "Helvetica-Bold", color: "#111827" }}>CRL</Text>
                </View>
              </View>

              <View style={{
                backgroundColor: BG, borderRadius: 7, paddingLeft: 12, paddingRight: 12, paddingTop: 8, paddingBottom: 8,
                marginBottom: 14,
              }}>
                <Text style={{ fontSize: 8, color: "#334155", lineHeight: 1.5 }}>
                  {routeText}
                </Text>
              </View>

              <View style={{ flexDirection: "row" }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 7, fontFamily: "Helvetica-Bold", color: MUTED, letterSpacing: 1 }}>TERMINAL</Text>
                  <Text style={{ fontSize: 11, fontFamily: "Helvetica-Bold", color: "#111827", marginTop: 2 }}>SUD</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 7, fontFamily: "Helvetica-Bold", color: MUTED, letterSpacing: 1 }}>DATE</Text>
                  <Text style={{ fontSize: 11, fontFamily: "Helvetica-Bold", color: "#111827", marginTop: 2 }}>{dateStr}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 7, fontFamily: "Helvetica-Bold", color: MUTED, letterSpacing: 1 }}>TIME</Text>
                  <Text style={{ fontSize: 11, fontFamily: "Helvetica-Bold", color: "#111827", marginTop: 2 }}>{heureStr}</Text>
                </View>
              </View>
            </View>

            {/* Séparation en pointillés + code-barres décoratif */}
            <View style={{ width: 90, alignItems: "center", justifyContent: "center", position: "relative" }}>
              <View style={{
                position: "absolute", left: 0, top: 8, bottom: 8, width: 1,
                borderLeftWidth: 1.5, borderLeftColor: "#cbd5e1", borderStyle: "dashed",
              }} />
              <View style={{
                position: "absolute", right: 0, top: 8, bottom: 8, width: 1,
                borderLeftWidth: 1.5, borderLeftColor: "#cbd5e1", borderStyle: "dashed",
              }} />
              <Barcode seed={flightNumber} vertical />
            </View>

            {/* Souche */}
            <View style={{
              width: 176, backgroundColor: WHITE,
              paddingLeft: 18, paddingRight: 18, paddingTop: 16, paddingBottom: 16,
              justifyContent: "space-between",
            }}>
              <View>
                <Text style={{ fontSize: 8, fontFamily: "Helvetica-Bold", color: NAVY, letterSpacing: 1, marginBottom: 10 }}>
                  CHARLEROI
                </Text>

                <View style={{ flexDirection: "row", marginBottom: 10 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 7, fontFamily: "Helvetica-Bold", color: MUTED, letterSpacing: 1 }}>TERMINAL</Text>
                    <Text style={{ fontSize: 10, fontFamily: "Helvetica-Bold", color: "#111827", marginTop: 2 }}>SUD</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 7, fontFamily: "Helvetica-Bold", color: MUTED, letterSpacing: 1 }}>DATE</Text>
                    <Text style={{ fontSize: 10, fontFamily: "Helvetica-Bold", color: "#111827", marginTop: 2 }}>{dateStr}</Text>
                  </View>
                </View>

                <View style={{ flexDirection: "row" }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 7, fontFamily: "Helvetica-Bold", color: MUTED, letterSpacing: 1 }}>DESTINATION</Text>
                    <Text style={{ fontSize: 10, fontFamily: "Helvetica-Bold", color: "#111827", marginTop: 2 }}>CHARLEROI{"\n"}CRL/EBCI</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 7, fontFamily: "Helvetica-Bold", color: MUTED, letterSpacing: 1 }}>TIME</Text>
                    <Text style={{ fontSize: 10, fontFamily: "Helvetica-Bold", color: "#111827", marginTop: 2 }}>{heureStr}</Text>
                  </View>
                </View>
              </View>

              <Barcode seed={flightNumber + "-stub"} vertical={false} />
            </View>
          </View>
        </View>
      </Page>
    </Document>
  );
}

// ── Interface publique ────────────────────────────────────────────────────

export interface BoardingPassPDFParams {
  dateVol: string;          // "2026-09-15"
  heureVol: string;         // "14:00" ou "14:00:00"
  duree: number;            // minutes
  waypointNames: string[];  // points de l'itinéraire, dans l'ordre
}

export async function generateBoardingPassPDFBuffer(params: BoardingPassPDFParams): Promise<Buffer> {
  const { renderToBuffer } = await import("@react-pdf/renderer");
  const fs   = await import("fs");
  const path = await import("path");

  let logoDataUrl: string;
  try {
    const logoBuf = fs.default.readFileSync(path.default.join(process.cwd(), "public", "logo-white.png"));
    logoDataUrl = "data:image/png;base64," + logoBuf.toString("base64");
  } catch {
    logoDataUrl = "https://fly-horizons.com/logo-white.png";
  }

  const flightNumber = "FH" + String(Math.floor(Math.random() * 899) + 100);

  const dateStr = new Date(params.dateVol + "T12:00:00Z").toLocaleDateString("fr-BE", {
    day: "2-digit", month: "2-digit",
  });
  const heureStr = params.heureVol.slice(0, 5);
  const routeText = params.waypointNames.length > 0
    ? params.waypointNames.join("  —  ")
    : "Itinéraire à confirmer par le pilote";

  return renderToBuffer(
    <BoardingPassPDF
      packTitle={packLabel(params.duree)}
      flightNumber={flightNumber}
      dateStr={dateStr}
      heureStr={heureStr}
      routeText={routeText}
      logoDataUrl={logoDataUrl}
    />
  );
}
