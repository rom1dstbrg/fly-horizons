"use client";

import { useEffect } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { ArrowLeft, ExternalLink, Clock, Ruler, PlaneTakeoff } from "lucide-react";
import { formatDuration } from "@/lib/vouchers";

const RouteMapLeaflet = dynamic(
  () => import("@/components/account/RouteMapLeaflet"),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full bg-navy flex items-center justify-center">
        <p className="text-sm text-white/40 animate-pulse">Chargement de la carte…</p>
      </div>
    ),
  }
);

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

const EBCI = { lat: 50.4592, lng: 4.4538 };

export function RouteMapView({
  waypoints, dateVol, heureVol, duree, distKm, reservationId,
}: RouteMapViewProps) {
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  const dateStr = new Date(dateVol + "T12:00:00Z").toLocaleDateString("fr-BE", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });

  const mapsUrl = `https://www.google.com/maps/dir/${EBCI.lat},${EBCI.lng}/${
    waypoints.map(w => `${w.lat},${w.lng}`).join("/")
  }/${EBCI.lat},${EBCI.lng}`;

  return (
    <div
      className="fixed left-0 right-0 bottom-0 z-40 bg-background p-3 flex flex-col lg:flex-row gap-3"
      style={{ top: "84px" }}
    >
      {/* ── Carte Leaflet ─────────────────────────────────────── */}
      <div className="h-[42vh] lg:h-auto lg:flex-1 relative rounded-[var(--r-sm)] overflow-hidden shadow-[0_2px_16px_rgba(0,0,0,0.10)] border border-border">
        <RouteMapLeaflet waypoints={waypoints} />
      </div>

      {/* ── Panneau droit ─────────────────────────────────────── */}
      <div className="lg:w-[360px] xl:w-[400px] shrink-0 card-premium overflow-hidden flex flex-col">

        {/* En-tête */}
        <div className="px-5 pt-5 pb-4 border-b border-border">
          <p className="text-xs font-bold text-primary uppercase tracking-[3px] mb-1">
            Vol sur mesure
          </p>
          <h1 className="text-lg font-black text-foreground leading-tight capitalize">{dateStr}</h1>
          <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground flex-wrap">
            <span className="flex items-center gap-1">
              <Clock size={11} />
              {formatDuration(duree)}
            </span>
            {distKm && (
              <span className="flex items-center gap-1">
                <Ruler size={11} />
                ~{Math.round(distKm)}&nbsp;km
              </span>
            )}
            {heureVol && <span>{heureVol}</span>}
          </div>
        </div>

        {/* Contenu scrollable */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-5 space-y-5">

            {/* Retour */}
            <Link
              href={`/account/reservations/${reservationId}`}
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft size={15} />
              Retour à la réservation
            </Link>

            {/* Waypoints */}
            <div>
              <p className="text-[10px] font-bold text-primary uppercase tracking-[3px] mb-4">
                Lieux à survoler
              </p>
              <ol className="space-y-0">

                {/* Départ EBCI */}
                <li className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className="w-7 h-7 rounded-full bg-navy flex items-center justify-center shrink-0">
                      <PlaneTakeoff size={13} className="text-primary" />
                    </div>
                    <div className="w-px flex-1 bg-border my-1 min-h-[20px]" />
                  </div>
                  <div className="pb-3 pt-1">
                    <p className="text-sm font-semibold text-foreground">Charleroi EBCI</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">Départ</p>
                  </div>
                </li>

                {waypoints.map((wp, i) => (
                  <li key={i} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center shrink-0 text-[11px] font-black text-primary-foreground">
                        {i + 1}
                      </div>
                      <div className="w-px flex-1 bg-border my-1 min-h-[20px]" />
                    </div>
                    <div className="pb-3 pt-1">
                      <p className="text-sm font-semibold text-foreground">{wp.nom}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">≈ 2 min d&apos;observation</p>
                    </div>
                  </li>
                ))}

                {/* Retour EBCI */}
                <li className="flex gap-3">
                  <div className="w-7 h-7 rounded-full bg-navy flex items-center justify-center shrink-0">
                    <PlaneTakeoff size={13} className="text-primary scale-x-[-1]" />
                  </div>
                  <div className="pt-1">
                    <p className="text-sm font-semibold text-foreground">Charleroi EBCI</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">Retour</p>
                  </div>
                </li>

              </ol>
            </div>

          </div>
        </div>

        {/* Actions — collées en bas */}
        <div className="px-5 pb-5 pt-3 shrink-0 border-t border-border">
          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border border-border rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:border-foreground/20 transition-colors"
          >
            <ExternalLink size={13} />
            Voir sur Google Maps
          </a>
        </div>

      </div>
    </div>
  );
}
