"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { AIRSPACE_ZONES, type AirspaceZone } from "@/lib/airspace-be";

// ── Types publics ──────────────────────────────────────────────────────────
export interface WaypointData { lat: number; lng: number; nom: string }
export interface RouteResult  { waypoints: WaypointData[]; distKm: number; dureMin: number }
export interface MapHandle {
  clearAll: () => void;
  addDestination: (id: string, wps: WaypointData[], emoji: string, color: string) => void;
  removeDestination: (id: string) => void;
}

interface WaypointEntry extends WaypointData {
  marker: L.Marker;
  groupId: string; // destination id ou "custom"
}

// ── Constantes ─────────────────────────────────────────────────────────────
const DEPART    = { lat: 50.4592, lng: 4.4538 };
const SPEED_KMH = 185.2; // 100 kt

// ── Helpers géo ────────────────────────────────────────────────────────────
function haversine(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371;
  const dLat = (b.lat - a.lat) * Math.PI / 180;
  const dLng = (b.lng - a.lng) * Math.PI / 180;
  const x = Math.sin(dLat / 2) ** 2
    + Math.cos(a.lat * Math.PI / 180) * Math.cos(b.lat * Math.PI / 180)
    * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

// Ray-casting point-in-polygon
function pointInPolygon(lat: number, lng: number, polygon: [number, number][]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [lati, lngi] = polygon[i];
    const [latj, lngj] = polygon[j];
    if (((lngi > lng) !== (lngj > lng)) &&
        (lat < (latj - lati) * (lng - lngi) / (lngj - lngi) + lati)) {
      inside = !inside;
    }
  }
  return inside;
}

function getViolatedZone(lat: number, lng: number): AirspaceZone | null {
  return AIRSPACE_ZONES.find(z => pointInPolygon(lat, lng, z.polygon)) ?? null;
}

// ── Icônes ─────────────────────────────────────────────────────────────────
const PLANE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="#F2B705">
  <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/>
</svg>`;

function departIcon() {
  return L.divIcon({
    className: "",
    html: `<div style="width:36px;height:36px;background:#113356;border:3px solid #F2B705;border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 3px 12px rgba(0,0,0,.45);">${PLANE_SVG}</div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
  });
}

function destIcon(emoji: string, color: string) {
  return L.divIcon({
    className: "",
    html: `<div style="background:${color};width:36px;height:36px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:17px;box-shadow:0 3px 10px rgba(0,0,0,.4);border:2.5px solid #fff;">${emoji}</div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
  });
}

function customIcon(n: number) {
  return L.divIcon({
    className: "",
    html: `<div style="width:28px;height:28px;background:#F2B705;color:#113356;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:11px;box-shadow:0 2px 8px rgba(0,0,0,.35);cursor:grab;border:2px solid #fff;">${n}</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
}

// ── Composant ──────────────────────────────────────────────────────────────
interface Props {
  onRouteChange: (data: RouteResult) => void;
  onZoneViolation: (zone: AirspaceZone) => void;
}

const LeafletMapRestricted = forwardRef<MapHandle, Props>(({ onRouteChange, onZoneViolation }, ref) => {
  const containerRef      = useRef<HTMLDivElement>(null);
  const mapRef            = useRef<L.Map | null>(null);
  const waypointsRef      = useRef<WaypointEntry[]>([]);
  const routeLayerRef     = useRef<L.Polyline | null>(null);
  const segLabelsRef      = useRef<L.Marker[]>([]);
  const onChangeRef       = useRef(onRouteChange);
  const onViolRef         = useRef(onZoneViolation);
  onChangeRef.current     = onRouteChange;
  onViolRef.current       = onZoneViolation;

  function rebuildCustomIcons() {
    let n = 1;
    waypointsRef.current.forEach(e => {
      if (e.groupId === "custom") e.marker.setIcon(customIcon(n++));
    });
  }

  function redraw() {
    const map = mapRef.current;
    if (!map) return;
    const entries = waypointsRef.current;

    // Clear route + segment labels
    if (routeLayerRef.current) { map.removeLayer(routeLayerRef.current); routeLayerRef.current = null; }
    segLabelsRef.current.forEach(m => { try { map.removeLayer(m); } catch { /* ignore */ } });
    segLabelsRef.current = [];

    if (!entries.length) {
      onChangeRef.current({ waypoints: [], distKm: 0, dureMin: 0 });
      return;
    }
    const pts = entries.map(e => ({ lat: e.lat, lng: e.lng }));
    const route = [DEPART, ...pts, DEPART];
    routeLayerRef.current = L.polyline(
      route.map(p => [p.lat, p.lng] as [number, number]),
      { color: "#F2B705", weight: 3, dashArray: "9 5", opacity: 0.95 }
    ).addTo(map);

    let distKm = 0;
    for (let i = 0; i < route.length - 1; i++) {
      const segDist = haversine(route[i], route[i + 1]);
      distKm += segDist;

      // Label au milieu de chaque segment
      const midLat = (route[i].lat + route[i + 1].lat) / 2;
      const midLng = (route[i].lng + route[i + 1].lng) / 2;
      const segKm  = Math.round(segDist);
      const segMin = Math.round((segDist / SPEED_KMH) * 60);
      const label  = L.marker([midLat, midLng], {
        icon: L.divIcon({
          className: "",
          html: `<div style="background:rgba(11,34,56,0.82);color:#F2B705;font-size:9px;font-weight:800;padding:2px 7px;border-radius:10px;white-space:nowrap;backdrop-filter:blur(4px);box-shadow:0 1px 4px rgba(0,0,0,.3);">${segKm} km · ${segMin} min</div>`,
          iconSize: [80, 18],
          iconAnchor: [40, 9],
        }),
        interactive: false,
        zIndexOffset: 500,
      }).addTo(map);
      segLabelsRef.current.push(label);
    }

    distKm = Math.round(distKm * 10) / 10;
    const dureMin = Math.round((distKm / SPEED_KMH) * 60);
    onChangeRef.current({
      waypoints: entries.map(e => ({ lat: e.lat, lng: e.lng, nom: e.nom })),
      distKm,
      dureMin,
    });
  }

  useImperativeHandle(ref, () => ({
    clearAll() {
      const map = mapRef.current;
      if (!map) return;
      waypointsRef.current.forEach(e => map.removeLayer(e.marker));
      waypointsRef.current = [];
      redraw();
    },
    addDestination(id: string, wps: WaypointData[], emoji: string, color: string) {
      const map = mapRef.current;
      if (!map) return;
      wps.forEach(wp => {
        const marker = L.marker([wp.lat, wp.lng], {
          icon: destIcon(emoji, color),
          draggable: false,
          interactive: false,
        }).addTo(map).bindTooltip(wp.nom, { direction: "top" });
        waypointsRef.current.push({ ...wp, marker, groupId: id });
      });
      redraw();
    },
    removeDestination(id: string) {
      const map = mapRef.current;
      if (!map) return;
      waypointsRef.current.filter(e => e.groupId === id).forEach(e => map.removeLayer(e.marker));
      waypointsRef.current = waypointsRef.current.filter(e => e.groupId !== id);
      rebuildCustomIcons();
      redraw();
    },
  }));

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, { zoomControl: true, scrollWheelZoom: true })
      .setView([50.45, 5.0], 8);

    // Fonds de carte
    const layerCarte = L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> © <a href="https://carto.com/">CARTO</a>',
      maxZoom: 19,
    });
    const layerSat = L.tileLayer(
      "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      { attribution: "Tiles © Esri", maxZoom: 19 }
    );
    const layerLabels = L.tileLayer(
      "https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}{r}.png",
      { attribution: "", maxZoom: 19, pane: "overlayPane" }
    );
    layerSat.addTo(map);
    layerLabels.addTo(map);
    map.on("baselayerchange", (e: L.LayersControlEvent) => {
      if (e.name === "Satellite") { if (!map.hasLayer(layerLabels)) layerLabels.addTo(map); }
      else { if (map.hasLayer(layerLabels)) map.removeLayer(layerLabels); }
    });
    L.control.layers({ "Carte": layerCarte, "Satellite": layerSat }, {}, { position: "bottomleft", collapsed: false }).addTo(map);

    // ── Zones aériennes restreintes ────────────────────────────
    AIRSPACE_ZONES.forEach(zone => {
      // Fond semi-transparent
      L.polygon(zone.polygon as L.LatLngExpression[], {
        color: zone.strokeColor,
        fillColor: zone.fillColor,
        fillOpacity: 0.18,
        weight: 2,
        dashArray: "6 4",
        interactive: false,
      }).addTo(map);

      // Label centré
      const poly = L.polygon(zone.polygon as L.LatLngExpression[]);
      const center = poly.getBounds().getCenter();
      L.marker([center.lat, center.lng], {
        icon: L.divIcon({
          className: "",
          html: `<div style="background:${zone.fillColor};color:#fff;font-size:9px;font-weight:800;padding:3px 8px;border-radius:5px;white-space:nowrap;letter-spacing:0.5px;box-shadow:0 1px 6px rgba(0,0,0,.35);">${zone.shortName}</div>`,
          iconSize: [80, 20],
          iconAnchor: [40, 10],
        }),
        interactive: false,
      }).addTo(map);
    });

    // Marqueur de départ fixe
    L.marker([DEPART.lat, DEPART.lng], { icon: departIcon(), interactive: false })
      .addTo(map)
      .bindTooltip("Charleroi EBCI — Départ & Retour", { direction: "top" });

    mapRef.current = map;

    // ── Clic carte : ajout de point personnalisé ───────────────
    map.on("click", (e: L.LeafletMouseEvent) => {
      const { lat, lng } = e.latlng;

      // Validation zone aérienne
      const violated = getViolatedZone(lat, lng);
      if (violated) {
        onViolRef.current(violated);
        // Flash de la zone
        const flash = L.polygon(violated.polygon as L.LatLngExpression[], {
          color: violated.strokeColor,
          fillColor: violated.fillColor,
          fillOpacity: 0.55,
          weight: 3,
          interactive: false,
        }).addTo(map);
        setTimeout(() => { try { map.removeLayer(flash); } catch { /* ignore */ } }, 700);
        return;
      }

      const n = waypointsRef.current.filter(e2 => e2.groupId === "custom").length + 1;
      const marker = L.marker([lat, lng], { icon: customIcon(n), draggable: true })
        .addTo(map)
        .bindTooltip(`Point ${n} — cliquer pour supprimer`, { direction: "top" });

      const entry: WaypointEntry = { lat, lng, nom: `Point personnalisé ${n}`, marker, groupId: "custom" };
      waypointsRef.current.push(entry);

      marker.on("click", (ev: L.LeafletMouseEvent) => {
        ev.originalEvent?.stopPropagation();
        const i = waypointsRef.current.indexOf(entry);
        if (i === -1) return;
        map.removeLayer(marker);
        waypointsRef.current.splice(i, 1);
        rebuildCustomIcons();
        redraw();
      });

      marker.on("dragstart", () => marker.closeTooltip());
      marker.on("dragend", () => {
        const pos = marker.getLatLng();
        const viol = getViolatedZone(pos.lat, pos.lng);
        if (viol) {
          marker.setLatLng([entry.lat, entry.lng]);
          onViolRef.current(viol);
          return;
        }
        entry.lat = pos.lat;
        entry.lng = pos.lng;
        redraw();
      });

      redraw();
    });

    return () => { map.remove(); mapRef.current = null; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return <div ref={containerRef} style={{ width: "100%", height: "100%" }} />;
});

LeafletMapRestricted.displayName = "LeafletMapRestricted";
export default LeafletMapRestricted;
