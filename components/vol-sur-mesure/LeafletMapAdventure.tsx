"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// ── Public types ───────────────────────────────────────────────
export interface POI { id: string; lat: number; lng: number; nom: string }

export interface AdventureRouteData {
  pois:       POI[];
  distKm:     number;
  transitMin: number;
  obsMin:     number;
  totalMin:   number;
}

export interface AdventureMapHandle {
  clearAll:  () => void;
  addPOI:    (poi: POI) => void;
  removePOI: (id: string) => void;
  fitBounds: () => void;
}

export type StyleMode = "vues" | "rapide";

// ── Constants ──────────────────────────────────────────────────
const DEPART:      { lat: number; lng: number } = { lat: 50.4592, lng: 4.4538 };
const SPEED_KMH    = 185.2;
const OBS_MIN_EACH = 2;
const OBS_RADIUS_M = 1500;

// ── Geo types ──────────────────────────────────────────────────
type Pt = { lat: number; lng: number };

// ── Haversine ─────────────────────────────────────────────────
function haversine(a: Pt, b: Pt): number {
  const R = 6371;
  const dLat = (b.lat - a.lat) * Math.PI / 180;
  const dLng = (b.lng - a.lng) * Math.PI / 180;
  const x = Math.sin(dLat / 2) ** 2
    + Math.cos(a.lat * Math.PI / 180) * Math.cos(b.lat * Math.PI / 180)
    * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

// ── Route optimisation (nearest-neighbor + 2-opt) ─────────────
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
        const d2 = haversine(best[i], best[j])     + haversine(best[i + 1], best[j + 1]);
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

// ── Gentle wave ────────────────────────────────────────────────
/**
 * Ajoute une légère oscillation sinusoïdale à chaque segment pour
 * casser l'effet "segment droit parfait" sans s'éloigner du trajet réel.
 *
 * Chaque segment est subdivisé en `steps` sous-points.
 * En chaque point, un décalage perpendiculaire suit sin(π·t) :
 * le tracé part du waypoint, dévie légèrement au milieu, et revient
 * exactement au waypoint suivant. Le signe alterne d'un segment à l'autre
 * pour un aspect naturel.
 *
 * amplitude : fraction de la longueur du segment (ex. 0.03 = 3 %)
 *             → pour un segment de 50 km, déviation max ≈ 1.5 km.
 */
function gentleWave(route: Pt[], amplitude: number, steps = 10): Pt[] {
  if (route.length < 2) return route;
  const result: Pt[] = [];

  for (let i = 0; i < route.length - 1; i++) {
    result.push(route[i]);

    const A = route[i], B = route[i + 1];
    const dlat = B.lat - A.lat, dlng = B.lng - A.lng;
    const len  = Math.sqrt(dlat * dlat + dlng * dlng);
    if (len < 1e-9) continue;

    // Vecteur perpendiculaire unitaire
    const perpLat = -dlng / len;
    const perpLng =  dlat / len;
    const amp  = len * amplitude;
    const sign = i % 2 === 0 ? 1 : -1; // alternance gauche / droite

    for (let s = 1; s < steps; s++) {
      const t = s / steps;
      const offset = sign * amp * Math.sin(Math.PI * t); // demi-sinus
      result.push({
        lat: A.lat + t * dlat + offset * perpLat,
        lng: A.lng + t * dlng + offset * perpLng,
      });
    }
  }

  result.push(route[route.length - 1]);
  return result;
}

// ── Icons ──────────────────────────────────────────────────────
const PLANE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="#F2B705">
  <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/>
</svg>`;

function departIcon() {
  return L.divIcon({
    className: "",
    html: `<div style="width:38px;height:38px;background:#113356;border:3px solid #F2B705;border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 14px rgba(0,0,0,.5);">${PLANE_SVG}</div>`,
    iconSize: [38, 38], iconAnchor: [19, 19],
  });
}

function poiIcon(n: number, nom: string) {
  const short = nom.length > 20 ? nom.slice(0, 20) + "…" : nom;
  return L.divIcon({
    className: "",
    html: `
      <div style="display:flex;flex-direction:column;align-items:center;gap:4px;">
        <div style="width:34px;height:34px;background:#F2B705;color:#113356;border-radius:50%;
          display:flex;align-items:center;justify-content:center;font-weight:800;font-size:13px;
          box-shadow:0 3px 12px rgba(0,0,0,.45);border:2.5px solid #fff;cursor:grab;">${n}</div>
        <div style="background:rgba(11,34,56,0.90);color:#fff;font-size:10px;font-weight:700;
          padding:2px 9px;border-radius:20px;white-space:nowrap;box-shadow:0 2px 6px rgba(0,0,0,.4);
          max-width:180px;overflow:hidden;text-overflow:ellipsis;">${short}</div>
      </div>`,
    iconSize: [180, 56], iconAnchor: [90, 17],
  });
}

// ── Component ──────────────────────────────────────────────────
interface Props {
  onRouteChange: (data: AdventureRouteData) => void;
  styleMode:     StyleMode;
}

interface POIEntry extends POI { marker: L.Marker; circle: L.Circle }

const LeafletMapAdventure = forwardRef<AdventureMapHandle, Props>(
  ({ onRouteChange, styleMode }, ref) => {
    const containerRef  = useRef<HTMLDivElement>(null);
    const mapRef        = useRef<L.Map | null>(null);
    const poisRef       = useRef<POIEntry[]>([]);
    const routeLayerRef = useRef<L.Polyline | null>(null);
    const segLabelsRef  = useRef<L.Marker[]>([]);
    const onChangeRef   = useRef(onRouteChange);
    const styleModeRef  = useRef(styleMode);
    onChangeRef.current  = onRouteChange;
    styleModeRef.current = styleMode;

    function rebuildIcons() {
      poisRef.current.forEach((e, i) => e.marker.setIcon(poiIcon(i + 1, e.nom)));
    }

    function redraw() {
      const map = mapRef.current;
      if (!map) return;
      const entries = poisRef.current;

      if (routeLayerRef.current) { map.removeLayer(routeLayerRef.current); routeLayerRef.current = null; }
      segLabelsRef.current.forEach(m => { try { map.removeLayer(m); } catch { /* ok */ } });
      segLabelsRef.current = [];

      if (!entries.length) {
        onChangeRef.current({ pois: [], distKm: 0, transitMin: 0, obsMin: 0, totalMin: 0 });
        return;
      }

      const pts       = entries.map(e => ({ lat: e.lat, lng: e.lng }));
      const baseRoute = optimizeRoute(pts); // [DEPART, …pois…, DEPART]

      // Itinéraire direct → lignes droites ; Pittoresque → légère oscillation (4 %)
      const displayPts = styleModeRef.current === "vues"
        ? gentleWave(baseRoute, 0.04, 10)
        : baseRoute;

      // Polyline principale
      routeLayerRef.current = L.polyline(
        displayPts.map(p => [p.lat, p.lng] as [number, number]),
        { color: "#F2B705", weight: 3, dashArray: "10 6", opacity: 0.95, lineCap: "round", lineJoin: "round" }
      ).addTo(map);

      // Distance calculée sur le tracé réel (incluant les courbes)
      let distKm = 0;
      for (let i = 0; i < displayPts.length - 1; i++) {
        distKm += haversine(displayPts[i], displayPts[i + 1]);
      }

      // Labels de segment sur la route de base (entre vrais POI)
      for (let i = 0; i < baseRoute.length - 1; i++) {
        const segDist = haversine(baseRoute[i], baseRoute[i + 1]);
        const segKm   = Math.round(segDist);
        const segMin  = Math.round((segDist / SPEED_KMH) * 60);
        if (segKm < 1) continue;
        const midLat = (baseRoute[i].lat + baseRoute[i + 1].lat) / 2;
        const midLng = (baseRoute[i].lng + baseRoute[i + 1].lng) / 2;
        segLabelsRef.current.push(
          L.marker([midLat, midLng], {
            icon: L.divIcon({
              className: "",
              html: `<div style="background:rgba(11,34,56,0.82);color:#F2B705;font-size:9px;font-weight:800;
                padding:2px 8px;border-radius:10px;white-space:nowrap;backdrop-filter:blur(4px);
                box-shadow:0 1px 4px rgba(0,0,0,.3);">${segKm} km · ${segMin} min</div>`,
              iconSize: [80, 18], iconAnchor: [40, 9],
            }),
            interactive: false, zIndexOffset: 300,
          }).addTo(map)
        );
      }

      distKm = Math.round(distKm * 10) / 10;
      const transitMin = Math.round((distKm / SPEED_KMH) * 60);
      const obsMin     = entries.length * OBS_MIN_EACH;

      onChangeRef.current({
        pois: entries.map(e => ({ id: e.id, lat: e.lat, lng: e.lng, nom: e.nom })),
        distKm,
        transitMin,
        obsMin,
        totalMin: transitMin + obsMin,
      });
    }

    useEffect(() => {
      styleModeRef.current = styleMode;
      if (mapRef.current) redraw();
    }, [styleMode]); // eslint-disable-line react-hooks/exhaustive-deps

    function _addPOIInternal(map: L.Map, poi: POI) {
      const n      = poisRef.current.length + 1;
      const marker = L.marker([poi.lat, poi.lng], { icon: poiIcon(n, poi.nom), draggable: true })
        .addTo(map)
        .bindTooltip(`${poi.nom} — cliquer pour supprimer`, { direction: "top" });

      const circle = L.circle([poi.lat, poi.lng], {
        radius: OBS_RADIUS_M,
        color: "#F2B705", fillColor: "#F2B705", fillOpacity: 0.08,
        weight: 1.5, dashArray: "5 5", interactive: false,
      }).addTo(map);

      const entry: POIEntry = { ...poi, marker, circle };
      poisRef.current.push(entry);

      marker.on("click", (ev: L.LeafletMouseEvent) => {
        ev.originalEvent?.stopPropagation();
        const i = poisRef.current.indexOf(entry);
        if (i === -1) return;
        map.removeLayer(marker);
        map.removeLayer(circle);
        poisRef.current.splice(i, 1);
        rebuildIcons();
        redraw();
      });
      marker.on("dragstart", () => marker.closeTooltip());
      marker.on("dragend", () => {
        const pos = marker.getLatLng();
        entry.lat = pos.lat; entry.lng = pos.lng;
        circle.setLatLng(pos);
        redraw();
      });
      redraw();
    }

    // Init map (once)
    useEffect(() => {
      if (!containerRef.current || mapRef.current) return;
      const container = containerRef.current;

      const map = L.map(container, {
        zoomControl:     true,
        scrollWheelZoom: false, // Ctrl + scroll uniquement
        doubleClickZoom: true,
      }).setView([50.45, 5.0], 8);

      // ── Tiles hybrides ESRI : satellite + routes + noms ────────
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

      // Marqueur EBCI fixe
      L.marker([DEPART.lat, DEPART.lng], { icon: departIcon(), interactive: false })
        .addTo(map)
        .bindTooltip("Charleroi EBCI — Départ et Retour", { direction: "top" });

      mapRef.current = map;

      // ── Ctrl + molette pour zoomer ─────────────────────────────
      const hintEl = document.createElement("div");
      hintEl.style.cssText =
        "position:absolute;inset:0;display:flex;align-items:center;justify-content:center;" +
        "pointer-events:none;z-index:800;opacity:0;transition:opacity .22s;";
      hintEl.innerHTML =
        `<div style="background:rgba(11,34,56,0.88);backdrop-filter:blur(8px);color:#fff;` +
        `font-size:12px;font-weight:700;padding:10px 20px;border-radius:20px;` +
        `border:1px solid rgba(251,174,23,0.35);">` +
        `<span style="color:#fbae17;">Ctrl</span> + défilement pour zoomer` +
        `</div>`;
      container.appendChild(hintEl);

      let hintTimer: ReturnType<typeof setTimeout> | null = null;
      function showHint() {
        hintEl.style.opacity = "1";
        if (hintTimer) clearTimeout(hintTimer);
        hintTimer = setTimeout(() => { hintEl.style.opacity = "0"; }, 1600);
      }

      container.addEventListener("wheel", (e: WheelEvent) => {
        if (e.ctrlKey) {
          e.preventDefault();
          try {
            const z = map.getZoom();
            map.setZoom(z + (e.deltaY < 0 ? 1 : -1), { animate: true });
          } catch { /* carte pas encore prête */ }
        } else {
          showHint();
        }
      }, { passive: false });

      // ── Mobile : message deux doigts ───────────────────────────
      const touchHintEl = document.createElement("div");
      touchHintEl.style.cssText =
        "position:absolute;bottom:44px;left:50%;transform:translateX(-50%);" +
        "z-index:800;pointer-events:none;opacity:0;transition:opacity .22s;";
      touchHintEl.innerHTML =
        `<div style="background:rgba(11,34,56,0.85);color:#fff;font-size:11px;font-weight:600;` +
        `padding:7px 16px;border-radius:20px;white-space:nowrap;">` +
        `Deux doigts pour déplacer la carte</div>`;
      container.appendChild(touchHintEl);

      let touchTimer: ReturnType<typeof setTimeout> | null = null;
      container.addEventListener("touchstart", (e: TouchEvent) => {
        if (e.touches.length === 1) {
          touchHintEl.style.opacity = "1";
          if (touchTimer) clearTimeout(touchTimer);
          touchTimer = setTimeout(() => { touchHintEl.style.opacity = "0"; }, 2000);
        }
      }, { passive: true });

      // ── Clic carte → ajouter POI ───────────────────────────────
      map.on("click", (e: L.LeafletMouseEvent) => {
        const { lat, lng } = e.latlng;
        _addPOIInternal(map, {
          id:  `click-${Date.now()}`,
          lat, lng,
          nom: `Lieu ${poisRef.current.length + 1}`,
        });
      });

      return () => {
        if (hintTimer)  clearTimeout(hintTimer);
        if (touchTimer) clearTimeout(touchTimer);
        map.remove();
        mapRef.current = null;
      };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    useImperativeHandle(ref, () => ({
      clearAll() {
        const map = mapRef.current;
        if (!map) return;
        poisRef.current.forEach(e => { map.removeLayer(e.marker); map.removeLayer(e.circle); });
        poisRef.current = [];
        redraw();
      },
      addPOI(poi: POI) {
        const map = mapRef.current;
        if (!map || poisRef.current.some(e => e.id === poi.id)) return;
        _addPOIInternal(map, poi);
      },
      removePOI(id: string) {
        const map = mapRef.current;
        if (!map) return;
        const idx = poisRef.current.findIndex(e => e.id === id);
        if (idx === -1) return;
        const entry = poisRef.current[idx];
        map.removeLayer(entry.marker);
        map.removeLayer(entry.circle);
        poisRef.current.splice(idx, 1);
        rebuildIcons();
        redraw();
      },
      fitBounds() {
        const map = mapRef.current;
        if (!map || !poisRef.current.length) return;
        map.fitBounds(
          L.latLngBounds([
            [DEPART.lat, DEPART.lng],
            ...poisRef.current.map(e => [e.lat, e.lng] as [number, number]),
          ]),
          { padding: [50, 50] }
        );
      },
    }));

    return <div ref={containerRef} style={{ width: "100%", height: "100%" }} />;
  }
);

LeafletMapAdventure.displayName = "LeafletMapAdventure";
export default LeafletMapAdventure;
