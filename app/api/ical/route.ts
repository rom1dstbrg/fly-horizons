import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const date  = searchParams.get("date");   // "2026-05-24"
  const heure = searchParams.get("heure");  // "09h30"
  const duree = parseInt(searchParams.get("duree") ?? "60", 10);

  if (!date || !heure || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: "Paramètres invalides" }, { status: 400 });
  }

  const parts  = heure.replace("h", ":").split(":");
  const startH = parseInt(parts[0] ?? "0", 10);
  const startM = parseInt(parts[1] ?? "0", 10);

  if (isNaN(startH) || isNaN(startM)) {
    return NextResponse.json({ error: "Heure invalide" }, { status: 400 });
  }

  const endTotal = startH * 60 + startM + duree;
  const endH     = Math.floor(endTotal / 60) % 24;
  const endM     = endTotal % 60;
  const pad      = (n: number) => String(n).padStart(2, "0");

  const dateCompact = date.replace(/-/g, "");
  const dtStart  = `${dateCompact}T${pad(startH)}${pad(startM)}00`;
  const dtEnd    = `${dateCompact}T${pad(endH)}${pad(endM)}00`;
  const dtstamp  = new Date().toISOString().replace(/[-:.]/g, "").slice(0, 15) + "Z";
  const uid      = `fly-horizons-${date}-${heure.replace(":", "")}@fly-horizons.com`;

  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Fly Horizons//Vol//FR",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${dtstamp}`,
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    `SUMMARY:Vol Fly Horizons (${duree} min)`,
    "DESCRIPTION:Vol en avion léger avec Romain — Fly Horizons\\nhttps://fly-horizons.com",
    "LOCATION:Aéroport de Charleroi (EBCI)\\, Rue des Frères Wright 8\\, Gosselies",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");

  return new NextResponse(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="vol-fly-horizons-${date}.ics"`,
      "Cache-Control": "no-store",
    },
  });
}
