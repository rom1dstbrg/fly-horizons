"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const EBCI = { lat: 50.4592, lng: 4.4538 };

const PLANE_SVG =
  `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="#F2B705">` +
  `<path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/>` +
  `</svg>`;

interface Waypoint { lat: number; lng: number; nom?: string }

interface Props {
  waypoints: Waypoint[];
  height?: string;
  className?: string;
}

function makeEBCIIcon() {
  return L.divIcon({
    className: "",
    html: `<div style="width:32px;height:32px;background:#0b2238;border:3px solid #F2B705;border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 3px 12px rgba(0,0,0,.45);">${PLANE_SVG}</div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
}

function makeNumberedIcon(n: number) {
  return L.divIcon({
    className: "",
    html: `<div style="width:28px;height:28px;background:#F2B705;color:#0b2238;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:11px;box-shadow:0 2px 8px rgba(0,0,0,.35);border:2px solid #fff;">${n}</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
}

export default function RouteMapReadOnly({ waypoints, height = "280px", className }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      zoomControl: true,
      scrollWheelZoom: false,
      dragging: true,
    }).setView([EBCI.lat, EBCI.lng], 8);

    const layerSat = L.tileLayer(
      "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      { attribution: "Tiles © Esri", maxZoom: 19 }
    );
    const layerCarte = L.tileLayer(
      "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
      { attribution: "© OpenStreetMap © CARTO", maxZoom: 19 }
    );
    const layerLabels = L.tileLayer(
      "https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}{r}.png",
      { attribution: "", maxZoom: 19, pane: "overlayPane" }
    );

    layerSat.addTo(map);
    layerLabels.addTo(map);

    L.control.layers(
      { "Satellite": layerSat, "Carte": layerCarte },
      { "Noms": layerLabels },
      { position: "bottomleft", collapsed: false }
    ).addTo(map);

    map.on("baselayerchange", (e: L.LayersControlEvent) => {
      if (e.name === "Satellite") {
        if (!map.hasLayer(layerLabels)) layerLabels.addTo(map);
      } else {
        if (map.hasLayer(layerLabels)) map.removeLayer(layerLabels);
      }
    });

    // EBCI fixed marker
    L.marker([EBCI.lat, EBCI.lng], { icon: makeEBCIIcon(), interactive: false })
      .addTo(map)
      .bindTooltip("Charleroi EBCI · Départ & Retour", { direction: "top" });

    if (waypoints.length > 0) {
      // Waypoint markers
      waypoints.forEach((wp, i) => {
        const m = L.marker([wp.lat, wp.lng], { icon: makeNumberedIcon(i + 1), interactive: false }).addTo(map);
        if (wp.nom) m.bindTooltip(wp.nom, { direction: "top" });
      });

      // Route polyline
      const pts: [number, number][] = [
        [EBCI.lat, EBCI.lng],
        ...waypoints.map(wp => [wp.lat, wp.lng] as [number, number]),
        [EBCI.lat, EBCI.lng],
      ];
      L.polyline(pts, { color: "#F2B705", weight: 2.5, opacity: 0.95, dashArray: "9 5" }).addTo(map);

      // Auto-fit bounds to show all points
      const bounds = L.latLngBounds([
        [EBCI.lat, EBCI.lng],
        ...waypoints.map(wp => [wp.lat, wp.lng] as [number, number]),
      ]);
      map.fitBounds(bounds, { padding: [40, 40] });
    }

    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div ref={containerRef} style={{ height }} className={className ?? "w-full rounded-xl overflow-hidden border border-border"} />
  );
}
