"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// ── Public types ───────────────────────────────────────────────
export interface Waypoint { lat: number; lng: number }
export interface Stopover { icao: string; lat: number; lng: number; nom: string; taxe: number }
export interface RoutePoint {
  lat: number;
  lng: number;
  label: string;
  isAirport: boolean;
  icao?: string;
  nom?: string;
}
export interface RouteData {
  waypoints: Waypoint[];
  stopovers: Stopover[];
  distKm: number;
  dureMin: number;
  taxesEscales: number;
  orderedPoints: RoutePoint[];
}
export type RouteMode = "optimized" | "manual";
export interface LeafletMapHandle { clearWaypoints: () => void }

// ── Internal types ─────────────────────────────────────────────
interface WaypointEntry { lat: number; lng: number; marker: L.Marker }
type GeoPoint = { lat: number; lng: number };

// ── Constants ──────────────────────────────────────────────────
const DEPART: GeoPoint = { lat: 50.4592, lng: 4.4538 };
const SPEED_KMH = 185.2; // 100 kt

// ── Geo helpers ────────────────────────────────────────────────
function haversine(a: GeoPoint, b: GeoPoint): number {
  const R = 6371;
  const dLat = (b.lat - a.lat) * Math.PI / 180;
  const dLng = (b.lng - a.lng) * Math.PI / 180;
  const x = Math.sin(dLat / 2) ** 2
    + Math.cos(a.lat * Math.PI / 180) * Math.cos(b.lat * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

// ── Routing algorithms ─────────────────────────────────────────

function nearestNeighbor(pts: GeoPoint[]): number[] {
  if (!pts.length) return [];
  const unvisited = pts.map((_, i) => i);
  const order: number[] = [];
  let cur: GeoPoint = DEPART;
  while (unvisited.length) {
    let bestPos = 0, bestD = Infinity;
    unvisited.forEach((idx, pos) => {
      const d = haversine(cur, pts[idx]);
      if (d < bestD) { bestD = d; bestPos = pos; }
    });
    const chosen = unvisited.splice(bestPos, 1)[0];
    order.push(chosen);
    cur = pts[chosen];
  }
  return order;
}

// 2-opt: eliminates crossings by reversing sub-segments
function twoOpt(route: GeoPoint[]): GeoPoint[] {
  let best = [...route];
  let improved = true;
  while (improved) {
    improved = false;
    outer: for (let i = 0; i < best.length - 2; i++) {
      for (let j = i + 2; j < best.length - 1; j++) {
        const d1 = haversine(best[i], best[i + 1]) + haversine(best[j], best[j + 1]);
        const d2 = haversine(best[i], best[j]) + haversine(best[i + 1], best[j + 1]);
        if (d2 < d1 - 1e-10) {
          best = [
            ...best.slice(0, i + 1),
            ...best.slice(i + 1, j + 1).reverse(),
            ...best.slice(j + 1),
          ];
          improved = true;
          break outer;
        }
      }
    }
  }
  return best;
}

// Or-opt: relocates single points to better positions
function orOpt(route: GeoPoint[]): GeoPoint[] {
  let best = [...route];
  let improved = true;
  while (improved) {
    improved = false;
    for (let i = 1; i < best.length - 1; i++) {
      const pt = best[i];
      const without = [...best.slice(0, i), ...best.slice(i + 1)];
      const removeSave =
        haversine(best[i - 1], pt) + haversine(pt, best[i + 1])
        - haversine(best[i - 1], best[i + 1]);
      let bestGain = 1e-10;
      let bestJ = -1;
      for (let j = 1; j < without.length; j++) {
        const insertCost =
          haversine(without[j - 1], pt) + haversine(pt, without[j])
          - haversine(without[j - 1], without[j]);
        const gain = removeSave - insertCost;
        if (gain > bestGain) { bestGain = gain; bestJ = j; }
      }
      if (bestJ !== -1) {
        best = [...without.slice(0, bestJ), pt, ...without.slice(bestJ)];
        improved = true;
        break;
      }
    }
  }
  return best;
}

function optimizeRoute(allPts: GeoPoint[]): GeoPoint[] {
  const order = nearestNeighbor(allPts);
  const base = [DEPART, ...order.map(i => allPts[i]), DEPART];
  return twoOpt(orOpt(base));
}

// ── Icon factories ─────────────────────────────────────────────

const PLANE_SVG =
  `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="#F2B705">` +
  `<path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/>` +
  `</svg>`;

function departIcon() {
  return L.divIcon({
    className: "",
    html: `<div style="width:36px;height:36px;background:#113356;border:3px solid #F2B705;border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 3px 12px rgba(0,0,0,.45);">${PLANE_SVG}</div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
  });
}

function wpIcon(n: number) {
  return L.divIcon({
    className: "",
    html: `<div style="width:30px;height:30px;background:#F2B705;color:#113356;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:11px;box-shadow:0 2px 8px rgba(0,0,0,.35);cursor:grab;border:2px solid #fff;">${n}</div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  });
}

function soIcon(icao: string) {
  return L.divIcon({
    className: "",
    html: `<div style="background:#113356;border:2px solid #F2B705;color:#F2B705;padding:3px 8px;border-radius:6px;font-size:9px;font-weight:700;white-space:nowrap;box-shadow:0 2px 8px rgba(0,0,0,.3);">${icao}</div>`,
    iconSize: [56, 22],
    iconAnchor: [28, 11],
  });
}

// ── Component ──────────────────────────────────────────────────
interface Props {
  stopovers: Stopover[];
  routeMode: RouteMode;
  onRouteChange: (data: RouteData) => void;
}

const LeafletMapComp = forwardRef<LeafletMapHandle, Props>(({ stopovers, routeMode, onRouteChange }, ref) => {
  const containerRef  = useRef<HTMLDivElement>(null);
  const mapRef        = useRef<L.Map | null>(null);
  const waypointsRef  = useRef<WaypointEntry[]>([]);
  const soMarkersRef  = useRef<Record<string, L.Marker>>({});
  const routeLayerRef = useRef<L.Polyline | null>(null);
  const stopoversRef  = useRef<Stopover[]>(stopovers);
  const routeModeRef  = useRef<RouteMode>(routeMode);
  const onChangeRef   = useRef(onRouteChange);
  onChangeRef.current = onRouteChange;

  function redraw() {
    const map = mapRef.current;
    if (!map) return;
    const entries = waypointsRef.current;
    const sos     = stopoversRef.current;
    const allPts: GeoPoint[] = [
      ...entries.map(e => ({ lat: e.lat, lng: e.lng })),
      ...sos.map(s => ({ lat: s.lat, lng: s.lng })),
    ];

    if (routeLayerRef.current) { map.removeLayer(routeLayerRef.current); routeLayerRef.current = null; }

    if (!allPts.length) {
      onChangeRef.current({ waypoints: [], stopovers: [], distKm: 0, dureMin: 0, taxesEscales: 0, orderedPoints: [] });
      return;
    }

    const route: GeoPoint[] = routeModeRef.current === "optimized"
      ? optimizeRoute(allPts)
      : [DEPART, ...allPts, DEPART];

    routeLayerRef.current = L.polyline(
      route.map(p => [p.lat, p.lng] as [number, number]),
      { color: "#F2B705", weight: 3, dashArray: "9 5", opacity: 0.95 }
    ).addTo(map);

    let distKm = 0;
    for (let i = 0; i < route.length - 1; i++) distKm += haversine(route[i], route[i + 1]);
    distKm = Math.round(distKm * 10) / 10;
    const dureMin = Math.round((distKm / SPEED_KMH) * 60);

    // Map interior route points back to labels
    const interior = route.slice(1, -1);
    const orderedPoints: RoutePoint[] = interior.map(pt => {
      const ei = entries.findIndex(e => Math.abs(e.lat - pt.lat) < 1e-9 && Math.abs(e.lng - pt.lng) < 1e-9);
      if (ei !== -1) {
        return { lat: pt.lat, lng: pt.lng, label: `Point ${ei + 1}`, isAirport: false };
      }
      const so = sos.find(s => Math.abs(s.lat - pt.lat) < 1e-9 && Math.abs(s.lng - pt.lng) < 1e-9);
      if (so) {
        return { lat: pt.lat, lng: pt.lng, label: "Escale", isAirport: true, icao: so.icao, nom: so.nom };
      }
      return { lat: pt.lat, lng: pt.lng, label: "Point", isAirport: false };
    });

    onChangeRef.current({
      waypoints: entries.map(e => ({ lat: e.lat, lng: e.lng })),
      stopovers: sos,
      distKm,
      dureMin,
      taxesEscales: sos.reduce((s, so) => s + so.taxe, 0),
      orderedPoints,
    });
  }

  function rebuildIcons() {
    waypointsRef.current.forEach((e, i) => e.marker.setIcon(wpIcon(i + 1)));
  }

  // Sync routeMode prop
  useEffect(() => {
    routeModeRef.current = routeMode;
    if (mapRef.current) redraw();
  }, [routeMode]); // eslint-disable-line react-hooks/exhaustive-deps

  // Sync stopovers prop → markers
  useEffect(() => {
    stopoversRef.current = stopovers;
    const map = mapRef.current;
    if (!map) return;
    Object.values(soMarkersRef.current).forEach(m => map.removeLayer(m));
    soMarkersRef.current = {};
    stopovers.forEach(so => {
      soMarkersRef.current[so.icao] = L.marker([so.lat, so.lng], { icon: soIcon(so.icao) })
        .addTo(map)
        .bindTooltip(`${so.nom} — +${so.taxe} € taxe d'escale`, { direction: "top" });
    });
    redraw();
  }, [stopovers]); // eslint-disable-line react-hooks/exhaustive-deps

  // Init map (once)
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, { zoomControl: true, scrollWheelZoom: true })
      .setView([50.45, 5.0], 8);

    // Tile layers
    const layerCarte = L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> © <a href="https://carto.com/">CARTO</a>',
      maxZoom: 19,
    });
    const layerSat = L.tileLayer(
      "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      {
        attribution: "Tiles © Esri — Source: Esri, USDA, USGS, AEX, GeoEye, IGN, IGP",
        maxZoom: 19,
      }
    );
    const layerLabels = L.tileLayer(
      "https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}{r}.png",
      { attribution: "", maxZoom: 19, pane: "overlayPane" }
    );

    // Default: satellite + labels
    layerSat.addTo(map);
    layerLabels.addTo(map);

    const layerControl = L.control.layers(
      { "Carte": layerCarte, "Satellite": layerSat },
      { "Noms de rues": layerLabels },
      { position: "bottomleft", collapsed: false }
    ).addTo(map);
    // Auto-show labels when satellite is selected; hide on carte
    map.on("baselayerchange", (e: L.LayersControlEvent) => {
      if (e.name === "Satellite") {
        if (!map.hasLayer(layerLabels)) layerLabels.addTo(map);
      } else {
        if (map.hasLayer(layerLabels)) map.removeLayer(layerLabels);
      }
    });
    void layerControl; // suppress unused warning

    // Fixed departure/return marker
    L.marker([DEPART.lat, DEPART.lng], { icon: departIcon(), interactive: false })
      .addTo(map)
      .bindTooltip("Charleroi EBCI — Départ & Retour", { permanent: false, direction: "top" });

    mapRef.current = map;

    // Apply any stopovers already set
    stopoversRef.current.forEach(so => {
      soMarkersRef.current[so.icao] = L.marker([so.lat, so.lng], { icon: soIcon(so.icao) })
        .addTo(map)
        .bindTooltip(`${so.nom} — +${so.taxe} € taxe d'escale`, { direction: "top" });
    });

    // Click → add waypoint
    map.on("click", (e: L.LeafletMouseEvent) => {
      const { lat, lng } = e.latlng;
      const n = waypointsRef.current.length + 1;

      const marker = L.marker([lat, lng], { icon: wpIcon(n), draggable: true })
        .addTo(map)
        .bindTooltip(`Point ${n} — glisser pour déplacer · cliquer pour supprimer`, { direction: "top" });

      const entry: WaypointEntry = { lat, lng, marker };
      waypointsRef.current.push(entry);

      // Click on marker → delete
      marker.on("click", (ev: L.LeafletMouseEvent) => {
        ev.originalEvent?.stopPropagation();
        const i = waypointsRef.current.indexOf(entry);
        if (i === -1) return;
        map.removeLayer(marker);
        waypointsRef.current.splice(i, 1);
        rebuildIcons();
        redraw();
      });

      marker.on("dragstart", () => marker.closeTooltip());

      // Drag end → update coords and recalculate
      marker.on("dragend", () => {
        const pos = marker.getLatLng();
        entry.lat = pos.lat;
        entry.lng = pos.lng;
        redraw();
      });

      redraw();
    });

    return () => { map.remove(); mapRef.current = null; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useImperativeHandle(ref, () => ({
    clearWaypoints() {
      const map = mapRef.current;
      if (!map) return;
      waypointsRef.current.forEach(e => map.removeLayer(e.marker));
      waypointsRef.current = [];
      redraw();
    },
  }));

  return <div ref={containerRef} style={{ width: "100%", height: "100%" }} />;
});

LeafletMapComp.displayName = "LeafletMap";
export default LeafletMapComp;
