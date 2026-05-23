"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface Waypoint {
  lat: number;
  lng: number;
  nom: string;
}

interface Props {
  waypoints: Waypoint[];
}

// ── Constants ─────────────────────────────────────────────────
const DEPART = { lat: 50.4592, lng: 4.4538 };
const SPEED_KMH = 185.2;
type Pt = { lat: number; lng: number };

// ── Geo helpers ───────────────────────────────────────────────
function haversine(a: Pt, b: Pt): number {
  const R = 6371;
  const dLat = (b.lat - a.lat) * Math.PI / 180;
  const dLng = (b.lng - a.lng) * Math.PI / 180;
  const x = Math.sin(dLat / 2) ** 2
    + Math.cos(a.lat * Math.PI / 180) * Math.cos(b.lat * Math.PI / 180)
    * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

function nearestNeighbor(pts: Pt[]): number[] {
  const unvisited = pts.map((_, i) => i);
  const order: number[] = [];
  let cur: Pt = DEPART;
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

function twoOpt(route: Pt[]): Pt[] {
  let best = [...route];
  let improved = true;
  while (improved) {
    improved = false;
    for (let i = 0; i < best.length - 2; i++) {
      for (let j = i + 2; j < best.length - 1; j++) {
        const d1 = haversine(best[i], best[i + 1]) + haversine(best[j], best[j + 1]);
        const d2 = haversine(best[i], best[j]) + haversine(best[i + 1], best[j + 1]);
        if (d2 < d1 - 1e-10) {
          best = [
            ...best.slice(0, i + 1),
            ...best.slice(i + 1, j + 1).reverse(),
            ...best.slice(j + 1),
          ];
          improved = true; break;
        }
      }
      if (improved) break;
    }
  }
  return best;
}

function optimizeRoute(pts: Pt[]): Pt[] {
  if (!pts.length) return [DEPART, DEPART];
  const order = nearestNeighbor(pts);
  return twoOpt([DEPART, ...order.map(i => pts[i]), DEPART]);
}

function gentleWave(route: Pt[], amplitude: number, steps = 10): Pt[] {
  if (route.length < 2) return route;
  const result: Pt[] = [];
  for (let i = 0; i < route.length - 1; i++) {
    result.push(route[i]);
    const A = route[i], B = route[i + 1];
    const dlat = B.lat - A.lat, dlng = B.lng - A.lng;
    const len = Math.sqrt(dlat * dlat + dlng * dlng);
    if (len < 1e-9) continue;
    const perpLat = -dlng / len;
    const perpLng = dlat / len;
    const amp = len * amplitude;
    const sign = i % 2 === 0 ? 1 : -1;
    for (let s = 1; s < steps; s++) {
      const t = s / steps;
      const offset = sign * amp * Math.sin(Math.PI * t);
      result.push({
        lat: A.lat + t * dlat + offset * perpLat,
        lng: A.lng + t * dlng + offset * perpLng,
      });
    }
  }
  result.push(route[route.length - 1]);
  return result;
}

// ── Icons ─────────────────────────────────────────────────────
const PLANE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="#F2B705">
  <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/>
</svg>`;

// ── Component ─────────────────────────────────────────────────
export default function RouteMapLeaflet({ waypoints }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const container = containerRef.current;

    const map = L.map(container, {
      zoomControl: true,
      scrollWheelZoom: true,
    }).setView([50.45, 5.0], 8);

    // Satellite + overlay tiles (identical to LeafletMapAdventure)
    L.tileLayer(
      "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      { attribution: "Imagery © Esri", maxZoom: 19 }
    ).addTo(map);
    L.tileLayer(
      "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}",
      { attribution: "", maxZoom: 19, pane: "overlayPane", opacity: 0.75 }
    ).addTo(map);
    L.tileLayer(
      "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}",
      { attribution: "", maxZoom: 19, pane: "overlayPane", opacity: 0.9 }
    ).addTo(map);

    // EBCI fixed marker
    const departIcon = L.divIcon({
      className: "",
      html: `<div style="width:38px;height:38px;background:#113356;border:3px solid #F2B705;border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 14px rgba(0,0,0,.5);">${PLANE_SVG}</div>`,
      iconSize: [38, 38], iconAnchor: [19, 19],
    });
    L.marker([DEPART.lat, DEPART.lng], { icon: departIcon, interactive: false })
      .addTo(map)
      .bindTooltip("Charleroi EBCI — Départ & Retour", { direction: "top" });

    // Optimized route
    const pts = waypoints.map(w => ({ lat: w.lat, lng: w.lng }));
    const baseRoute = optimizeRoute(pts);

    // Rebuild waypoints in optimized order (for correct numbering)
    const optimizedWps = baseRoute.slice(1, -1).map(pt =>
      waypoints.find(w =>
        Math.abs(w.lat - pt.lat) < 0.00005 && Math.abs(w.lng - pt.lng) < 0.00005
      ) ?? { lat: pt.lat, lng: pt.lng, nom: "?" }
    );

    // Numbered POI markers (read-only, no interaction)
    optimizedWps.forEach((wp, i) => {
      const short = wp.nom.length > 22 ? wp.nom.slice(0, 22) + "…" : wp.nom;
      const icon = L.divIcon({
        className: "",
        html: `
          <div style="display:flex;flex-direction:column;align-items:center;gap:4px;">
            <div style="width:34px;height:34px;background:#F2B705;color:#113356;border-radius:50%;
              display:flex;align-items:center;justify-content:center;font-weight:800;font-size:13px;
              box-shadow:0 3px 12px rgba(0,0,0,.45);border:2.5px solid #fff;">${i + 1}</div>
            <div style="background:rgba(11,34,56,0.90);color:#fff;font-size:10px;font-weight:700;
              padding:2px 9px;border-radius:20px;white-space:nowrap;box-shadow:0 2px 6px rgba(0,0,0,.4);
              max-width:180px;overflow:hidden;text-overflow:ellipsis;">${short}</div>
          </div>`,
        iconSize: [180, 56], iconAnchor: [90, 17],
      });
      L.marker([wp.lat, wp.lng], { icon, interactive: false }).addTo(map);
    });

    // Route polyline with gentle wave (same style as VSM page)
    const displayPts = gentleWave(baseRoute, 0.04, 10);
    L.polyline(
      displayPts.map(p => [p.lat, p.lng] as [number, number]),
      { color: "#F2B705", weight: 3, dashArray: "10 6", opacity: 0.95, lineCap: "round", lineJoin: "round" }
    ).addTo(map);

    // Segment distance labels
    for (let i = 0; i < baseRoute.length - 1; i++) {
      const segDist = haversine(baseRoute[i], baseRoute[i + 1]);
      const segKm = Math.round(segDist);
      const segMin = Math.round((segDist / SPEED_KMH) * 60);
      if (segKm < 1) continue;
      const midLat = (baseRoute[i].lat + baseRoute[i + 1].lat) / 2;
      const midLng = (baseRoute[i].lng + baseRoute[i + 1].lng) / 2;
      L.marker([midLat, midLng], {
        icon: L.divIcon({
          className: "",
          html: `<div style="background:rgba(11,34,56,0.82);color:#F2B705;font-size:9px;font-weight:800;
            padding:2px 8px;border-radius:10px;white-space:nowrap;backdrop-filter:blur(4px);
            box-shadow:0 1px 4px rgba(0,0,0,.3);">${segKm} km · ${segMin} min</div>`,
          iconSize: [80, 18], iconAnchor: [40, 9],
        }),
        interactive: false, zIndexOffset: 300,
      }).addTo(map);
    }

    // Fit all markers in view
    const allPts: L.LatLngExpression[] = [
      [DEPART.lat, DEPART.lng],
      ...waypoints.map(w => [w.lat, w.lng] as [number, number]),
    ];
    map.fitBounds(L.latLngBounds(allPts), { padding: [48, 48] });

    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return <div ref={containerRef} className="w-full h-full" />;
}
