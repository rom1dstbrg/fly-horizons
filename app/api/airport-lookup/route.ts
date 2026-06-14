import { NextRequest, NextResponse } from "next/server";

interface AirportResult {
  nom: string;
  lat: number;
  lng: number;
  source: "noaa" | "osm";
}

// ── 1. NOAA Aviation Weather ───────────────────────────────────
async function tryNoaa(icao: string): Promise<AirportResult | null> {
  try {
    const r = await fetch(
      `https://api.aviationweather.gov/api/data/airport?ids=${icao}&format=json`,
      { signal: AbortSignal.timeout(5000) }
    );
    if (!r.ok) return null;
    const data = await r.json() as Array<{
      station_id: string; site: string; latitude_deg: number; longitude_deg: number;
    }>;
    const a = data?.[0];
    if (!a?.latitude_deg) return null;
    return { nom: a.site, lat: a.latitude_deg, lng: a.longitude_deg, source: "noaa" };
  } catch {
    return null;
  }
}

// ── 2. OpenStreetMap via Overpass API ─────────────────────────
async function tryOverpass(icao: string): Promise<AirportResult | null> {
  try {
    const query = `[out:json][timeout:10];
(
  node["aeroway"="aerodrome"]["icao"="${icao}"];
  way["aeroway"="aerodrome"]["icao"="${icao}"];
  relation["aeroway"="aerodrome"]["icao"="${icao}"];
);
out center 1;`;

    const r = await fetch("https://overpass-api.de/api/interpreter", {
      method: "POST",
      body: `data=${encodeURIComponent(query)}`,
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      signal: AbortSignal.timeout(10000),
    });
    if (!r.ok) return null;

    const data = await r.json() as {
      elements: Array<{
        type: string;
        lat?: number;
        lon?: number;
        center?: { lat: number; lon: number };
        tags?: Record<string, string>;
      }>;
    };

    const el = data.elements?.[0];
    if (!el) return null;

    const lat = el.center?.lat ?? el.lat;
    const lng = el.center?.lon ?? el.lon;
    if (!lat || !lng) return null;

    const tags = el.tags ?? {};
    const nom =
      tags["name:fr"] ??
      tags.name ??
      tags["name:en"] ??
      icao;

    return { nom, lat, lng, source: "osm" };
  } catch {
    return null;
  }
}

// ── Route ─────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const icao = req.nextUrl.searchParams.get("icao")?.toUpperCase().trim();

  if (!icao || !/^[A-Z]{4}$/.test(icao)) {
    return NextResponse.json({ error: "Code ICAO invalide (4 lettres requis)" }, { status: 400 });
  }

  // Try NOAA first, then OSM
  const result = (await tryNoaa(icao)) ?? (await tryOverpass(icao));

  if (!result) {
    return NextResponse.json(
      { error: "Aérodrome introuvable (NOAA + OSM). Saisissez les coordonnées manuellement." },
      { status: 404 }
    );
  }

  return NextResponse.json(result, {
    headers: { "Cache-Control": "public, max-age=86400" }, // 24h cache
  });
}
