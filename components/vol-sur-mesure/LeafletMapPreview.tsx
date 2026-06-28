"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const CHARLEROI: [number, number] = [50.4592, 4.4528];

export interface PreviewWaypoint {
  id: string;
  lat: number;
  lng: number;
  nom: string;
  type: "poi" | "stop";
}

const makePoiIcon = (index: number) =>
  L.divIcon({
    className: "",
    html: `<div style="width:22px;height:22px;border-radius:50%;background:#F2B705;color:#0b2238;font-weight:900;font-size:10px;display:flex;align-items:center;justify-content:center;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.22);line-height:1">${index}</div>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  });

const charleroiIcon = L.divIcon({
  className: "",
  html: `<div style="width:26px;height:26px;border-radius:50%;background:#0b2238;color:#F2B705;font-size:13px;display:flex;align-items:center;justify-content:center;border:2px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.28)">✈</div>`,
  iconSize: [26, 26],
  iconAnchor: [13, 13],
});

const stopIcon = L.divIcon({
  className: "",
  html: `<div style="width:20px;height:20px;border-radius:4px;background:#0b2238;color:#F2B705;font-size:11px;display:flex;align-items:center;justify-content:center;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.22)">✈</div>`,
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

export default function LeafletMapPreview({ waypoints }: { waypoints: PreviewWaypoint[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const map = L.map(containerRef.current, {
      center: CHARLEROI,
      zoom: 8,
      zoomControl: false,
      scrollWheelZoom: false,
      dragging: false,
      doubleClickZoom: false,
      touchZoom: false,
      keyboard: false,
      attributionControl: false,
    });
    mapRef.current = map;

    L.tileLayer(
      "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
      { subdomains: "abcd", maxZoom: 19 }
    ).addTo(map);

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    map.eachLayer(layer => {
      if (!(layer instanceof L.TileLayer)) map.removeLayer(layer);
    });

    // Full route: Charleroi → all waypoints in order → Charleroi
    const positions: [number, number][] = [
      CHARLEROI,
      ...waypoints.map(w => [w.lat, w.lng] as [number, number]),
      CHARLEROI,
    ];

    L.polyline(positions, {
      color: "#F2B705",
      weight: 2.5,
      dashArray: "8 5",
      opacity: 0.9,
    }).addTo(map);

    L.marker(CHARLEROI, { icon: charleroiIcon }).addTo(map);

    let poiCount = 0;
    waypoints.forEach(w => {
      if (w.type === "poi") {
        poiCount++;
        L.marker([w.lat, w.lng], { icon: makePoiIcon(poiCount) }).addTo(map);
      } else {
        L.marker([w.lat, w.lng], { icon: stopIcon }).addTo(map);
      }
    });

    if (positions.length >= 2) {
      map.fitBounds(L.latLngBounds(positions), { padding: [40, 40], maxZoom: 12 });
    }
  }, [waypoints]);

  return <div ref={containerRef} style={{ height: "100%", width: "100%" }} />;
}
