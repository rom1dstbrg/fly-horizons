"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

export interface Waypoint { lat: number; lng: number }
export interface Stopover { icao: string; lat: number; lng: number; nom: string; taxe: number }
export interface RouteData {
  waypoints: Waypoint[];
  stopovers: Stopover[];
  distKm: number;
  dureMin: number;
  taxesEscales: number;
}
export interface LeafletMapHandle { clearWaypoints: () => void }

interface Props {
  stopovers: Stopover[];
  onRouteChange: (data: RouteData) => void;
}

const DEPART = { lat: 50.4592, lng: 4.4538 };
const SPEED_KMH = 185.2; // 100 knots

function haversine(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371;
  const dLat = (b.lat - a.lat) * Math.PI / 180;
  const dLng = (b.lng - a.lng) * Math.PI / 180;
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * Math.PI / 180) * Math.cos(b.lat * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

function nearestNeighbor(pts: { lat: number; lng: number }[]): number[] {
  if (!pts.length) return [];
  const unvisited = pts.map((_, i) => i);
  const order: number[] = [];
  let cur: { lat: number; lng: number } = DEPART;
  while (unvisited.length) {
    let best = 0, bestD = Infinity;
    unvisited.forEach((idx, pos) => { const d = haversine(cur, pts[idx]); if (d < bestD) { bestD = d; best = pos; } });
    const chosen = unvisited.splice(best, 1)[0];
    order.push(chosen);
    cur = pts[chosen];
  }
  return order;
}

const wpIcon = (n: number) => L.divIcon({
  className: "",
  html: `<div style="width:28px;height:28px;background:#F2B705;color:#113356;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:11px;box-shadow:0 2px 8px rgba(0,0,0,.35);cursor:pointer;border:2px solid #fff;">${n}</div>`,
  iconSize: [28, 28], iconAnchor: [14, 14],
});

const soIcon = (icao: string) => L.divIcon({
  className: "",
  html: `<div style="background:#113356;border:2px solid #F2B705;color:#F2B705;padding:2px 8px;border-radius:6px;font-size:9px;font-weight:700;white-space:nowrap;box-shadow:0 2px 8px rgba(0,0,0,.3);">${icao}</div>`,
  iconSize: [56, 20], iconAnchor: [28, 10],
});

const LeafletMapComp = forwardRef<LeafletMapHandle, Props>(({ stopovers, onRouteChange }, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const waypointsRef = useRef<Waypoint[]>([]);
  const wpMarkersRef = useRef<L.Marker[]>([]);
  const soMarkersRef = useRef<{ [icao: string]: L.Marker }>({});
  const routeLayerRef = useRef<L.Polyline | null>(null);
  const stopoversRef = useRef<Stopover[]>(stopovers);
  const onChangeRef = useRef(onRouteChange);
  onChangeRef.current = onRouteChange;

  function redraw() {
    const map = mapRef.current;
    if (!map) return;
    const wps = waypointsRef.current;
    const sos = stopoversRef.current;
    const allPts: { lat: number; lng: number }[] = [...wps, ...sos];
    if (routeLayerRef.current) { map.removeLayer(routeLayerRef.current); routeLayerRef.current = null; }
    if (!allPts.length) {
      onChangeRef.current({ waypoints: [], stopovers: [], distKm: 0, dureMin: 0, taxesEscales: 0 });
      return;
    }
    const order = nearestNeighbor(allPts);
    const ordered = order.map(i => allPts[i]);
    const route = [DEPART, ...ordered, DEPART];
    routeLayerRef.current = L.polyline(
      route.map(p => [p.lat, p.lng] as [number, number]),
      { color: "#F2B705", weight: 2.5, dashArray: "8 4", opacity: 0.85 }
    ).addTo(map);
    let distKm = 0;
    for (let i = 0; i < route.length - 1; i++) distKm += haversine(route[i], route[i + 1]);
    distKm = Math.round(distKm * 10) / 10;
    const dureMin = Math.round((distKm / SPEED_KMH) * 60);
    onChangeRef.current({ waypoints: wps, stopovers: sos, distKm, dureMin, taxesEscales: sos.reduce((s, so) => s + so.taxe, 0) });
  }

  // Sync stopovers prop → map markers
  useEffect(() => {
    stopoversRef.current = stopovers;
    const map = mapRef.current;
    if (!map) return;
    Object.values(soMarkersRef.current).forEach(m => map.removeLayer(m));
    soMarkersRef.current = {};
    stopovers.forEach(so => {
      const m = L.marker([so.lat, so.lng], { icon: soIcon(so.icao) }).addTo(map)
        .bindTooltip(`${so.nom} · +${so.taxe}€ taxe`);
      soMarkersRef.current[so.icao] = m;
    });
    redraw();
  }, [stopovers]); // eslint-disable-line react-hooks/exhaustive-deps

  // Init map (once)
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, { zoomControl: true, scrollWheelZoom: true })
      .setView([50.5, 4.7], 9);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap contributors",
    }).addTo(map);
    L.marker([DEPART.lat, DEPART.lng], {
      icon: L.divIcon({
        className: "",
        html: `<div style="width:34px;height:34px;background:#113356;border:3px solid #F2B705;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:16px;box-shadow:0 2px 8px rgba(0,0,0,.4);">✈</div>`,
        iconSize: [34, 34], iconAnchor: [17, 17],
      }),
    }).addTo(map).bindTooltip("Départ/Retour — Charleroi EBCI");
    mapRef.current = map;
    // Apply stopovers that may have been set before map init
    stopoversRef.current.forEach(so => {
      const m = L.marker([so.lat, so.lng], { icon: soIcon(so.icao) }).addTo(map)
        .bindTooltip(`${so.nom} · +${so.taxe}€ taxe`);
      soMarkersRef.current[so.icao] = m;
    });
    map.on("click", (e: L.LeafletMouseEvent) => {
      const { lat, lng } = e.latlng;
      waypointsRef.current.push({ lat, lng });
      const n = waypointsRef.current.length;
      const marker = L.marker([lat, lng], { icon: wpIcon(n) }).addTo(map)
        .bindTooltip(`Point ${n} — clic pour supprimer`);
      wpMarkersRef.current.push(marker);
      marker.on("click", (ev: L.LeafletMouseEvent) => {
        ev.originalEvent?.stopPropagation();
        const i = wpMarkersRef.current.indexOf(marker);
        if (i === -1) return;
        map.removeLayer(marker);
        wpMarkersRef.current.splice(i, 1);
        waypointsRef.current.splice(i, 1);
        wpMarkersRef.current.forEach((m, j) => m.setIcon(wpIcon(j + 1)));
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
      wpMarkersRef.current.forEach(m => map.removeLayer(m));
      wpMarkersRef.current = [];
      waypointsRef.current = [];
      redraw();
    },
  }));

  return <div ref={containerRef} style={{ width: "100%", height: "100%" }} />;
});

LeafletMapComp.displayName = "LeafletMap";
export default LeafletMapComp;
