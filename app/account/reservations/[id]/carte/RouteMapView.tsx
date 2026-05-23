"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { ArrowLeft, Copy, Check, ExternalLink, Clock, Ruler } from "lucide-react";
import { formatDuration } from "@/lib/vouchers";

// ── Leaflet map (SSR-disabled) ─────────────────────────────────
const RouteMapLeaflet = dynamic(
  () => import("@/components/account/RouteMapLeaflet"),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full bg-[#0b1e30] flex items-center justify-center">
        <p className="text-sm text-white/40 animate-pulse">Chargement de la carte…</p>
      </div>
    ),
  }
);

// ── Types ──────────────────────────────────────────────────────
interface Waypoint {
  lat: number;
  lng: number;
  nom: string;
}

export interface RouteMapViewProps {
  waypoints: Waypoint[];
  dateVol: string;
  heureVol: string | null;
  duree: number;
  distKm: number | null;
  reservationId: string;
}

// ── Helpers ────────────────────────────────────────────────────
const EBCI = { lat: 50.4592, lng: 4.4538 };

/** Format décimal → ForeFlight : 50.45920°N/4.45380°E */
function fmtFF(lat: number, lng: number): string {
  return `${Math.abs(lat).toFixed(5)}°${lat >= 0 ? "N" : "S"}/${Math.abs(lng).toFixed(5)}°${lng >= 0 ? "E" : "W"}`;
}

// ── Sub-component ──────────────────────────────────────────────
function CoordRow({
  icon, isPlane, label, coord,
}: {
  icon: string;
  isPlane: boolean;
  label: string;
  coord: string;
}) {
  return (
    <div className="flex items-center gap-3 py-2.5 px-3 rounded-xl bg-secondary border border-border">
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 font-bold leading-none select-none ${
          isPlane
            ? "bg-[#113356] text-[#F2B705] text-base"
            : "bg-[#F2B705] text-[#113356] text-xs"
        }`}
      >
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-foreground truncate">{label}</p>
        <p className="text-[11px] font-mono text-muted-foreground mt-0.5 select-all break-all">
          {coord}
        </p>
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────
export function RouteMapView({
  waypoints, dateVol, heureVol, duree, distKm, reservationId,
}: RouteMapViewProps) {
  const [copied, setCopied] = useState(false);
  const ebciFF = fmtFF(EBCI.lat, EBCI.lng);

  // Lock body scroll so the footer doesn't appear
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  const dateStr = new Date(dateVol + "T12:00:00Z").toLocaleDateString("fr-BE", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });

  // All coords as a single string for copy (ForeFlight-ready)
  const allCoords = [
    ebciFF,
    ...waypoints.map(w => fmtFF(w.lat, w.lng)),
    ebciFF,
  ].join("\n");

  const mapsUrl = `https://www.google.com/maps/dir/${EBCI.lat},${EBCI.lng}/${
    waypoints.map(w => `${w.lat},${w.lng}`).join("/")
  }/${EBCI.lat},${EBCI.lng}`;

  function handleCopy() {
    navigator.clipboard.writeText(allCoords).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    });
  }

  return (
    /*
     * Fixed overlay from just below the header (top: 84px) to the bottom of the
     * viewport. The z-40 sits below the header (z-50) so it's always covered.
     */
    <div
      className="fixed left-0 right-0 bottom-0 z-40 bg-background flex flex-col"
      style={{ top: "84px" }}
    >
      <div className="flex flex-col lg:flex-row flex-1 min-h-0 overflow-hidden">

        {/* ── Leaflet map ───────────────────────────────────────── */}
        <div className="h-[45vh] lg:h-full lg:flex-1 shrink-0 relative">
          <RouteMapLeaflet waypoints={waypoints} />
        </div>

        {/* ── Info panel ────────────────────────────────────────── */}
        <div className="lg:w-[380px] xl:w-[420px] shrink-0 overflow-y-auto border-l border-border bg-background">
          <div className="p-5 lg:p-6 space-y-5">

            {/* Back link */}
            <Link
              href={`/account/reservations/${reservationId}`}
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft size={15} />
              Retour à la réservation
            </Link>

            {/* Flight summary */}
            <div>
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-0.5">
                Vol sur mesure
              </p>
              <h1 className="text-base font-bold text-foreground capitalize">{dateStr}</h1>
              <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground flex-wrap">
                <span className="flex items-center gap-1">
                  <Clock size={11} className="opacity-60" />
                  {formatDuration(duree)}
                </span>
                {distKm && (
                  <span className="flex items-center gap-1">
                    <Ruler size={11} className="opacity-60" />
                    ~{Math.round(distKm)}&nbsp;km
                  </span>
                )}
                {heureVol && <span>{heureVol}</span>}
              </div>
            </div>

            <hr className="border-border" />

            {/* ForeFlight coordinates */}
            <div>
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                Coordonnées ForeFlight
              </p>
              <div className="space-y-2">
                <CoordRow icon="✈" isPlane label="Charleroi EBCI — Départ" coord={ebciFF} />
                {waypoints.map((wp, i) => (
                  <CoordRow
                    key={i}
                    icon={String(i + 1)}
                    isPlane={false}
                    label={wp.nom}
                    coord={fmtFF(wp.lat, wp.lng)}
                  />
                ))}
                <CoordRow icon="✈" isPlane label="Charleroi EBCI — Retour" coord={ebciFF} />
              </div>
            </div>

            {/* Copy button */}
            <button
              onClick={handleCopy}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[#113356] text-white rounded-xl text-sm font-bold hover:bg-[#0b2238] active:scale-[0.98] transition-all"
            >
              {copied ? <Check size={15} /> : <Copy size={15} />}
              {copied ? "Copié !" : "Copier les coordonnées"}
            </button>

            {/* Google Maps link */}
            <a
              href={mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border border-border rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:border-foreground/20 transition-colors"
            >
              <ExternalLink size={13} />
              Voir sur Google Maps
            </a>

          </div>
        </div>
      </div>
    </div>
  );
}
