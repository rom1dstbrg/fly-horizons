"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const EBCI = { lat: 50.4592, lng: 4.4538 };

const PLANE_SVG =
  `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="#F2B705">` +
  `<path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/>` +
  `</svg>`;

export interface WaypointDraft { lat: string; lng: string; nom: string; }
export type AdminStopover = { icao: string; lat?: number; lng?: number; nom?: string; taxe?: number };

interface Props {
  waypoints: WaypointDraft[];
  onChange: (wps: WaypointDraft[]) => void;
  clientWaypoints?: Array<{ lat: number; lng: number; nom?: string }>;
  stopovers?: AdminStopover[];
  height?: string;
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
    html: `<div style="width:28px;height:28px;background:#F2B705;color:#0b2238;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:11px;box-shadow:0 2px 8px rgba(0,0,0,.35);cursor:grab;border:2px solid #fff;">${n}</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
}

function makeClientIcon() {
  return L.divIcon({
    className: "",
    html: `<div style="background:#9ca3af;border-radius:50%;width:10px;height:10px;border:2px solid #fff;box-shadow:0 1px 3px rgba(0,0,0,.3)"></div>`,
    iconSize: [10, 10],
    iconAnchor: [5, 5],
  });
}

function makeStopoverIcon(icao: string) {
  return L.divIcon({
    className: "",
    html: `<div style="background:#0b2238;border:2px solid #F2B705;color:#F2B705;padding:3px 8px;border-radius:6px;font-size:9px;font-weight:700;white-space:nowrap;box-shadow:0 2px 8px rgba(0,0,0,.3);">${icao}</div>`,
    iconSize: [56, 22],
    iconAnchor: [28, 11],
  });
}

export function AdminRouteEditor({ waypoints, onChange, clientWaypoints = [], stopovers = [], height = "300px" }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const routeLineRef = useRef<L.Polyline | null>(null);
  const clientLineRef = useRef<L.Polyline | null>(null);
  const clientMarkersRef = useRef<L.Marker[]>([]);
  const soMarkersRef = useRef<L.Marker[]>([]);

  const waypointsRef = useRef(waypoints);
  const onChangeRef = useRef(onChange);
  waypointsRef.current = waypoints;
  onChangeRef.current = onChange;

  // Init map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, { zoomControl: true }).setView([EBCI.lat, EBCI.lng], 8);

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

    L.marker([EBCI.lat, EBCI.lng], { icon: makeEBCIIcon(), interactive: false })
      .addTo(map)
      .bindTooltip("Charleroi EBCI · Départ & Retour", { direction: "top" });

    map.on("click", async (e: L.LeafletMouseEvent) => {
      const lat = e.latlng.lat.toFixed(5);
      const lng = e.latlng.lng.toFixed(5);
      onChangeRef.current([...waypointsRef.current, { lat, lng, nom: "" }]);
      try {
        const resp = await fetch(
          `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=fr`
        );
        const data = await resp.json() as { name?: string; address?: Record<string, string> };
        const nom = data.address?.city ?? data.address?.town ?? data.address?.municipality ?? data.address?.village ?? data.name ?? "";
        if (!nom) return;
        const cur = waypointsRef.current;
        for (let i = cur.length - 1; i >= 0; i--) {
          if (cur[i].lat === lat && cur[i].lng === lng && cur[i].nom === "") {
            const updated = [...cur];
            updated[i] = { ...updated[i], nom };
            onChangeRef.current(updated);
            return;
          }
        }
      } catch { /* nom stays empty */ }
    });

    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Sync final waypoints (editable)
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];
    routeLineRef.current?.remove();
    routeLineRef.current = null;

    const valid = waypoints
      .map((wp, i) => ({ lat: parseFloat(wp.lat), lng: parseFloat(wp.lng), nom: wp.nom, idx: i }))
      .filter(wp => !isNaN(wp.lat) && !isNaN(wp.lng));

    valid.forEach(({ lat, lng, nom, idx }) => {
      const marker = L.marker([lat, lng], { icon: makeNumberedIcon(idx + 1), draggable: true }).addTo(map);
      if (nom) marker.bindTooltip(nom, { permanent: false, direction: "top", offset: [0, -14] });

      marker.on("click", (e) => {
        L.DomEvent.stopPropagation(e);
        onChangeRef.current(waypointsRef.current.filter((_, j) => j !== idx));
      });

      marker.on("dragend", () => {
        const pos = marker.getLatLng();
        const updated = [...waypointsRef.current];
        updated[idx] = { ...updated[idx], lat: pos.lat.toFixed(5), lng: pos.lng.toFixed(5) };
        onChangeRef.current(updated);
      });

      markersRef.current.push(marker);
    });

    if (valid.length > 0) {
      const pts: [number, number][] = [
        [EBCI.lat, EBCI.lng],
        ...valid.map(wp => [wp.lat, wp.lng] as [number, number]),
        [EBCI.lat, EBCI.lng],
      ];
      routeLineRef.current = L.polyline(pts, {
        color: "#F2B705", weight: 2.5, opacity: 0.95, dashArray: "9 5",
      }).addTo(map);
    }
  }, [waypoints]);

  // Sync client route (gray, read-only reference)
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    clientMarkersRef.current.forEach(m => m.remove());
    clientMarkersRef.current = [];
    clientLineRef.current?.remove();
    clientLineRef.current = null;

    if (clientWaypoints.length === 0) return;

    clientWaypoints.forEach(wp => {
      const m = L.marker([wp.lat, wp.lng], { icon: makeClientIcon(), interactive: false }).addTo(map);
      if (wp.nom) m.bindTooltip(wp.nom, { direction: "top" });
      clientMarkersRef.current.push(m);
    });

    const pts: [number, number][] = [
      [EBCI.lat, EBCI.lng],
      ...clientWaypoints.map(wp => [wp.lat, wp.lng] as [number, number]),
      [EBCI.lat, EBCI.lng],
    ];
    clientLineRef.current = L.polyline(pts, { color: "#9ca3af", weight: 1.5, opacity: 0.5 }).addTo(map);
  }, [clientWaypoints]);

  // Sync stopovers (read-only, navy/gold ICAO labels)
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    soMarkersRef.current.forEach(m => m.remove());
    soMarkersRef.current = [];

    stopovers.forEach(so => {
      if (!so.lat || !so.lng) return;
      const m = L.marker([so.lat, so.lng], { icon: makeStopoverIcon(so.icao), interactive: false }).addTo(map);
      m.bindTooltip(`Escale ${so.nom ?? so.icao}${so.taxe ? ` · +${so.taxe} €` : ""}`, { direction: "top" });
      soMarkersRef.current.push(m);
    });
  }, [stopovers]);

  return (
    <div className="space-y-1">
      <div ref={containerRef} style={{ height }} className="w-full rounded-lg overflow-hidden border border-border z-0" />
      <p className="text-[10px] text-muted-foreground text-center">
        Cliquer sur la carte pour ajouter · Cliquer sur un point pour le supprimer · Glisser pour déplacer
      </p>
    </div>
  );
}
