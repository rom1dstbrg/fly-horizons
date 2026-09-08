import { NextRequest, NextResponse } from "next/server";
import { extractFromRawMetar } from "@/lib/mass-balance/da40-calc";
import { requireAdminOrActivePilote } from "@/lib/actions/auth-guards";

/**
 * Proxy serveur du METAR (évite le blocage CORS côté navigateur).
 * Source : aviationweather.gov (JSON), repli metar.vatsim.net (texte brut).
 * Ouvert à l'admin et aux pilotes actifs (utilisé par la section Performances du M&B).
 */
export async function GET(req: NextRequest) {
  try {
    await requireAdminOrActivePilote();
  } catch {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const icao = (req.nextUrl.searchParams.get("icao") || "").trim().toUpperCase();
  if (!/^[A-Z0-9]{3,4}$/.test(icao)) {
    return NextResponse.json({ error: "Code ICAO invalide" }, { status: 400 });
  }

  // 1) aviationweather.gov (JSON)
  try {
    const res = await fetch(
      `https://aviationweather.gov/api/data/metar?ids=${encodeURIComponent(icao)}&format=json`,
      { next: { revalidate: 300 } },
    );
    if (res.ok) {
      const data = await res.json();
      const m = Array.isArray(data) ? data[0] : Array.isArray(data?.data) ? data.data[0] : null;
      if (m) {
        return NextResponse.json({
          oat: typeof m.temp === "number" ? Math.round(m.temp) : null,
          qnh: typeof m.altim === "number" ? Math.round(m.altim) : null,
          wdir: typeof m.wdir === "number" ? m.wdir : null,
          wspd: typeof m.wspd === "number" ? m.wspd : null,
          raw: m.rawOb || "",
          vrb: m.wdir === "VRB",
          source: "aviationweather.gov",
        });
      }
    }
  } catch {
    /* repli ci-dessous */
  }

  // 2) metar.vatsim.net (texte brut, CORS ouvert)
  try {
    const res = await fetch(`https://metar.vatsim.net/${encodeURIComponent(icao)}`, {
      next: { revalidate: 300 },
    });
    if (res.ok) {
      const text = (await res.text()).trim();
      if (text && !/not found|no metar/i.test(text)) {
        const p = extractFromRawMetar(text);
        if (p.found) {
          return NextResponse.json({
            oat: p.oat,
            qnh: p.qnh,
            wdir: p.wdir,
            wspd: p.wspd,
            raw: text,
            vrb: p.vrb,
            source: "metar.vatsim.net",
          });
        }
      }
    }
  } catch {
    /* échec final */
  }

  return NextResponse.json({ error: "METAR indisponible" }, { status: 502 });
}
