"use client";

import dynamic from "next/dynamic";

// Carte d'itinéraire figée de la page produit : ni glisser ni zoomer (mode compact de
// RouteMapReadOnly), et pointer-events désactivés pour que le doigt / la molette fassent
// défiler la page et jamais la carte.
const RouteMapReadOnly = dynamic(() => import("@/components/maps/RouteMapReadOnly"), {
  ssr: false,
  loading: () => <div className="w-full h-full bg-secondary animate-pulse" />,
});

type Waypoint = { lat: number; lng: number; nom?: string };

export function RouteMapStatic({ waypoints }: { waypoints: Waypoint[] }) {
  return (
    <div className="relative h-[240px] lg:h-[360px] rounded-[10px] overflow-hidden bg-secondary pointer-events-none select-none" aria-label="Carte de l'itinéraire">
      <RouteMapReadOnly waypoints={waypoints} height="100%" compact />
    </div>
  );
}
