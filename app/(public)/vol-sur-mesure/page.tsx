"use client";

import dynamic from "next/dynamic";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Search, MapPin, X, Loader2, Check, ArrowRight, ChevronLeft,
  PlaneTakeoff, Lock, Route, Zap, MousePointerClick, Users,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { detectZones, type ZoneResult } from "@/lib/vol-sur-mesure/zones";
import type { PreviewWaypoint } from "@/components/vol-sur-mesure/LeafletMapPreview";

const LeafletMapPreview = dynamic(
  () => import("@/components/vol-sur-mesure/LeafletMapPreview"),
  {
    ssr: false,
    loading: () => <div className="w-full h-full bg-[#0b2238]/5 animate-pulse rounded-[10px]" />,
  }
);

// ── Constants ──────────────────────────────────────────────────
const CHARLEROI_LAT = 50.4592;
const CHARLEROI_LNG = 4.4528;
const FLIGHT_FACTOR = 1.2;
const AVG_SPEED_KMH = 180;

// ── Types ──────────────────────────────────────────────────────
type WizardStep = 1 | 2 | 3;

interface WizardPOI { id: string; lat: number; lng: number; nom: string; }
interface Stopover { id: string; icao: string; nom: string; taxe: number; lat?: number | null; lng?: number | null; }
interface NominatimResult { place_id: number; display_name: string; lat: string; lon: string; }
interface OptimizedWaypoint extends PreviewWaypoint { icao?: string; taxe?: number; }

// ── Route optimizer ────────────────────────────────────────────
function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function _perms(arr: number[]): number[][] {
  if (arr.length <= 1) return [arr.slice()];
  const r: number[][] = [];
  for (let i = 0; i < arr.length; i++) {
    const rest = arr.filter((_, j) => j !== i);
    for (const p of _perms(rest)) r.push([arr[i], ...p]);
  }
  return r;
}

function _dist(order: number[], pts: Array<{ lat: number; lng: number }>): number {
  const all = [{ lat: CHARLEROI_LAT, lng: CHARLEROI_LNG }, ...order.map(i => pts[i]), { lat: CHARLEROI_LAT, lng: CHARLEROI_LNG }];
  let d = 0;
  for (let i = 0; i < all.length - 1; i++) d += haversineKm(all[i].lat, all[i].lng, all[i + 1].lat, all[i + 1].lng);
  return d;
}

function optimizeRoute<T extends { lat: number; lng: number }>(waypoints: T[]): T[] {
  const n = waypoints.length;
  if (n <= 1) return waypoints;
  const indices = waypoints.map((_, i) => i);
  let bestOrder = indices, bestDist = Infinity;
  for (const perm of _perms(indices)) {
    const d = _dist(perm, waypoints);
    if (d < bestDist) { bestDist = d; bestOrder = perm; }
  }
  return bestOrder.map(i => waypoints[i]);
}

function estimateRoute(waypoints: Array<{ lat: number; lng: number }>, prixHeure: number) {
  const pts = [{ lat: CHARLEROI_LAT, lng: CHARLEROI_LNG }, ...waypoints, { lat: CHARLEROI_LAT, lng: CHARLEROI_LNG }];
  let raw = 0;
  for (let i = 0; i < pts.length - 1; i++) raw += haversineKm(pts[i].lat, pts[i].lng, pts[i + 1].lat, pts[i + 1].lng);
  const distKm = Math.round(raw * FLIGHT_FACTOR);
  const totalMin = Math.round(distKm / AVG_SPEED_KMH * 60) + 20;
  const prixEstime = Math.round((prixHeure / 60) * totalMin);
  return { distKm, totalMin, prixEstime };
}

// ── Itinerary card (reused in main + sidebar) ──────────────────
function ItineraryCard({ waypoints }: { waypoints: OptimizedWaypoint[] }) {
  let poiCount = 0;
  return (
    <div className="bg-white rounded-xl border border-border overflow-hidden">
      <div className="px-5 pt-4 pb-3 border-b border-border flex items-center justify-between">
        <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-[2px]">Itinéraire optimisé</p>
        <span className="text-[10px] text-muted-foreground/40">{waypoints.length + 2} étapes</span>
      </div>
      <div className="divide-y divide-border">
        <div className="flex items-center gap-3 px-5 py-3">
          <div className="w-5 h-5 rounded-full bg-[#0b2238] flex items-center justify-center shrink-0">
            <PlaneTakeoff size={9} className="text-[#F2B705]" />
          </div>
          <span className="text-sm font-semibold text-foreground flex-1">Charleroi EBCI</span>
          <span className="text-[9px] font-bold text-primary uppercase tracking-wide">Départ</span>
        </div>
        {waypoints.map(w => {
          if (w.type === "poi") {
            poiCount++;
            const n = poiCount;
            return (
              <div key={w.id} className="flex items-center gap-3 px-5 py-3">
                <div className="w-5 h-5 rounded-full bg-[#F2B705] flex items-center justify-center shrink-0 text-[#0b2238] font-black text-[9px]">
                  {n}
                </div>
                <span className="text-sm text-foreground/75 flex-1">{w.nom}</span>
              </div>
            );
          }
          return (
            <div key={w.id} className="flex items-center gap-3 px-5 py-3">
              <div className="w-5 h-5 rounded-[3px] bg-[#0b2238] flex items-center justify-center shrink-0">
                <span className="text-[#F2B705] text-[8px] font-black">✈</span>
              </div>
              <span className="font-mono text-[10px] font-bold text-[#0b2238] shrink-0 bg-secondary px-1.5 py-0.5 rounded">{w.icao}</span>
              <span className="text-sm text-foreground/70 flex-1 truncate">{w.nom}</span>
              {w.taxe != null && w.taxe > 0 && (
                <span className="text-[10px] text-muted-foreground shrink-0">+{w.taxe}&thinsp;€</span>
              )}
            </div>
          );
        })}
        <div className="flex items-center gap-3 px-5 py-3">
          <div className="w-5 h-5 rounded-full bg-[#0b2238] flex items-center justify-center shrink-0" style={{ transform: "scaleX(-1)" }}>
            <PlaneTakeoff size={9} className="text-[#F2B705]" />
          </div>
          <span className="text-sm font-semibold text-foreground flex-1">Charleroi EBCI</span>
          <span className="text-[9px] font-bold text-primary uppercase tracking-wide">Retour</span>
        </div>
      </div>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────
export default function VolSurMesureWizardPage() {
  const router = useRouter();
  const [step, setStep] = useState<WizardStep>(1);

  // Step 1
  const [pois, setPois] = useState<WizardPOI[]>([]);
  const [searchQ, setSearchQ] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [nominatimResults, setNominatimResults] = useState<NominatimResult[]>([]);
  const [zoneResults, setZoneResults] = useState<ZoneResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // Step 2
  const [stopovers, setStopovers] = useState<Stopover[]>([]);
  const [selectedStops, setSelectedStops] = useState<Stopover[]>([]);
  const [prixHeure, setPrixHeure] = useState(254);

  useEffect(() => {
    const sb = createClient();
    sb.from("stopovers").select("id, icao, nom, taxe, lat, lng").eq("actif", true).order("nom")
      .then(({ data }) => setStopovers((data ?? []) as Stopover[]));
    sb.from("crm_settings").select("key, value").eq("key", "prix_heure").single()
      .then(({ data }) => { if (data?.value) setPrixHeure(parseFloat(data.value)); });
  }, []);

  useEffect(() => {
    const q = searchQ.trim();
    if (q.length < 2) { setNominatimResults([]); setZoneResults([]); setSearchOpen(false); return; }
    const zones = detectZones(q);
    setZoneResults(zones);
    const t = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=5&accept-language=fr&viewbox=2.5,51.5,6.4,49.4&bounded=0`;
        const data = await (await fetch(url, { headers: { "Accept-Language": "fr" } })).json() as NominatimResult[];
        const seen = new Set<string>();
        const unique = data.filter(item => {
          const key = item.display_name.split(",")[0].trim().toLowerCase();
          if (seen.has(key)) return false; seen.add(key); return true;
        });
        setNominatimResults(unique);
        setSearchOpen(unique.length > 0 || zones.length > 0);
      } catch { /* ignore */ } finally { setSearchLoading(false); }
    }, 350);
    return () => clearTimeout(t);
  }, [searchQ]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
        setSearchFocused(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  function addPOI(lat: number, lng: number, nom: string) {
    setPois(prev => [...prev, { id: `poi-${Date.now()}`, lat, lng, nom }]);
    setSearchQ(""); setSearchOpen(false); setSearchFocused(false);
  }

  function toggleStop(s: Stopover) {
    setSelectedStops(prev => prev.some(x => x.id === s.id) ? prev.filter(x => x.id !== s.id) : [...prev, s]);
  }

  const allWaypoints: OptimizedWaypoint[] = [
    ...pois.map(p => ({ ...p, type: "poi" as const })),
    ...selectedStops.filter(s => s.lat != null && s.lng != null).map(s => ({
      id: s.id, lat: s.lat!, lng: s.lng!, nom: s.nom,
      type: "stop" as const, icao: s.icao, taxe: s.taxe,
    })),
  ];
  const optimizedWaypoints = optimizeRoute(allWaypoints);
  const poisForStep2Map: PreviewWaypoint[] = pois.map(p => ({ ...p, type: "poi" as const }));
  const estimate = step === 3 ? estimateRoute(optimizedWaypoints, prixHeure) : null;
  const hasDropdown = searchOpen && (zoneResults.length > 0 || nominatimResults.length > 0);

  function goToConfigurator() {
    const orderedPois = optimizedWaypoints.filter(w => w.type === "poi").map(({ id, lat, lng, nom }) => ({ id, lat, lng, nom }));
    sessionStorage.setItem("vsm_pois", JSON.stringify(orderedPois));
    sessionStorage.setItem("vsm_wizard_stops", JSON.stringify(selectedStops));
    sessionStorage.setItem("vsm_popup_seen", "1");
    router.push("/vol-sur-mesure/configurer");
  }

  const headings: Record<WizardStep, { h1: React.ReactNode; sub: string }> = {
    1: {
      h1: <>Où souhaitez-vous <span className="text-primary">voler ?</span></>,
      sub: "Ajoutez les lieux à survoler — villes, monuments, lacs. L'ordre sera optimisé automatiquement.",
    },
    2: {
      h1: <>Souhaitez-vous <span className="text-primary">faire escale ?</span></>,
      sub: "Atterrissez dans un aéroport intermédiaire, inclus dans le calcul de distance et de prix.",
    },
    3: {
      h1: <>Votre itinéraire <span className="text-primary">est prêt.</span></>,
      sub: "Estimation à vol d'oiseau. Affinez le tracé exact sur la carte interactive.",
    },
  };

  const { h1, sub } = headings[step];

  const searchBarClass = [
    "flex items-center gap-2.5 h-10 rounded-lg px-3.5 transition-all border-2",
    (searchFocused || hasDropdown)
      ? "bg-white border-primary shadow-[0_0_0_4px_rgba(242,183,5,0.15)]"
      : "bg-white/95 border-[#cdd5e0] shadow-md hover:border-primary/70 backdrop-blur-sm",
  ].join(" ");

  const statItems = estimate ? [
    { label: "Distance", value: `≈ ${estimate.distKm}`, unit: "km" },
    {
      label: "Durée",
      value: estimate.totalMin >= 60
        ? `${Math.floor(estimate.totalMin / 60)}h${String(estimate.totalMin % 60).padStart(2, "0")}`
        : `≈ ${estimate.totalMin}`,
      unit: estimate.totalMin >= 60 ? "estimée" : "min",
    },
    { label: "Prix estimé", value: `≈ ${estimate.prixEstime}`, unit: "€" },
  ] : [];

  return (
    <div className="min-h-screen bg-[#f5f5f7] pt-[98px]">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 xl:px-10 py-6 pb-16">

        {/* ═══ COMPACT HEADER ═══ */}
        <div className="mb-6">
          <div className="flex items-center gap-4 mb-4">
            {step > 1 ? (
              <button
                type="button"
                onClick={() => setStep((step - 1) as WizardStep)}
                className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer shrink-0"
              >
                <ChevronLeft size={14} /> Retour
              </button>
            ) : (
              <span className="text-[11px] font-bold text-muted-foreground/50 uppercase tracking-[2px] shrink-0 flex items-center gap-1.5">
                <PlaneTakeoff size={11} /> EBCI · Vol sur mesure
              </span>
            )}
            <div className="flex items-center gap-2 flex-1">
              <div className="flex-1 h-1 bg-border rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#F2B705] rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${(step / 3) * 100}%` }}
                />
              </div>
              <span className="text-[11px] text-muted-foreground/50 shrink-0">{step}&thinsp;/&thinsp;3</span>
            </div>
          </div>
          <h1 className="text-2xl font-black text-foreground tracking-tight leading-snug">{h1}</h1>
          <p className="text-sm text-muted-foreground/70 mt-1">{sub}</p>
        </div>

        {/* ═══ 2-COLUMN LAYOUT ═══ */}
        <div className="flex flex-col lg:flex-row gap-6 lg:items-start">

          {/* ── Main column ────────────────────────────────────── */}
          <div className="flex-1 min-w-0">

            {/* ══ STEP 1 : DESTINATIONS ══ */}
            {step === 1 && (
              <div className="space-y-3">

                {/* Search bar */}
                <div ref={searchRef} className="relative">
                  <div className={searchBarClass}>
                    {searchLoading
                      ? <Loader2 size={15} className="text-primary animate-spin shrink-0" />
                      : <Search size={15} className="text-muted-foreground/50 shrink-0" />
                    }
                    <input
                      type="text"
                      value={searchQ}
                      onChange={e => setSearchQ(e.target.value)}
                      onFocus={() => {
                        setSearchFocused(true);
                        if (nominatimResults.length > 0 || zoneResults.length > 0) setSearchOpen(true);
                      }}
                      onBlur={() => setSearchFocused(false)}
                      placeholder="Namur, Dinant, château de Bouillon, un lac…"
                      className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/40 outline-none"
                      autoComplete="off"
                    />
                    {searchQ && (
                      <button type="button" onClick={() => { setSearchQ(""); setSearchOpen(false); setSearchFocused(false); }}
                        className="text-muted-foreground/40 hover:text-foreground transition-colors cursor-pointer shrink-0">
                        <X size={13} />
                      </button>
                    )}
                  </div>

                  {/* Dropdown */}
                  {hasDropdown && (
                    <div className="absolute top-full left-0 right-0 bg-white border border-border rounded-lg shadow-2xl z-50 overflow-hidden mt-1.5">
                      {zoneResults.length > 0 && (
                        <div className="px-4 py-2 border-b border-border bg-muted/30">
                          <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-[1.5px]">Zones</p>
                        </div>
                      )}
                      {zoneResults.map(z => (
                        <button key={z.id} type="button" onClick={() => addPOI(z.lat, z.lng, z.nom)}
                          className="w-full flex items-start gap-3 px-4 py-3 hover:bg-primary/5 text-left transition-colors border-b border-border last:border-0 cursor-pointer group">
                          <div className="w-6 h-6 rounded-md bg-[#F2B705]/10 flex items-center justify-center shrink-0 mt-0.5">
                            <Route size={11} className="text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-semibold text-foreground">{z.nom}</p>
                              <span className="text-[9px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded uppercase tracking-wide">Zone</span>
                            </div>
                            <p className="text-[11px] text-muted-foreground mt-0.5">{z.description}</p>
                          </div>
                        </button>
                      ))}
                      {nominatimResults.length > 0 && zoneResults.length > 0 && (
                        <div className="px-4 py-2 border-b border-border bg-muted/30">
                          <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-[1.5px]">Lieux</p>
                        </div>
                      )}
                      {nominatimResults.map(r => (
                        <button key={r.place_id} type="button"
                          onClick={() => addPOI(parseFloat(r.lat), parseFloat(r.lon), r.display_name.split(",")[0].trim())}
                          className="w-full flex items-start gap-3 px-4 py-3 hover:bg-primary/5 text-left transition-colors border-b border-border last:border-0 cursor-pointer group">
                          <div className="w-6 h-6 rounded-md bg-secondary flex items-center justify-center shrink-0 mt-0.5 group-hover:bg-primary/10 transition-colors">
                            <MapPin size={11} className="text-muted-foreground group-hover:text-primary transition-colors" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-foreground">{r.display_name.split(",")[0]}</p>
                            <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
                              {r.display_name.split(",").slice(1, 3).join(", ").trim()}
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* POI list / empty state */}
                {pois.length > 0 ? (
                  <div className="bg-white rounded-xl border border-border overflow-hidden">
                    <div className="px-5 pt-4 pb-3 border-b border-border flex items-center justify-between">
                      <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-[2px]">Lieux à survoler</p>
                      <span className="text-[10px] text-muted-foreground/40">{pois.length} lieu{pois.length > 1 ? "x" : ""}</span>
                    </div>

                    <div className="flex items-center gap-3 px-5 py-3.5 border-b border-border">
                      <div className="w-6 h-6 rounded-full bg-[#0b2238] flex items-center justify-center shrink-0">
                        <PlaneTakeoff size={10} className="text-[#F2B705]" />
                      </div>
                      <span className="text-sm font-semibold text-foreground flex-1">Charleroi EBCI</span>
                      <span className="text-[9px] font-bold text-[#F2B705] uppercase tracking-wide">Départ</span>
                    </div>

                    {pois.map((poi, i) => (
                      <div key={poi.id} className="flex items-center gap-3 px-5 py-3.5 border-b border-border group hover:bg-secondary/30 transition-colors">
                        <div className="w-6 h-6 rounded-full bg-[#F2B705] flex items-center justify-center shrink-0 text-[#0b2238] font-black text-[10px]">
                          {i + 1}
                        </div>
                        <span className="text-sm text-foreground flex-1">{poi.nom}</span>
                        <button type="button" onClick={() => setPois(prev => prev.filter(p => p.id !== poi.id))}
                          className="text-muted-foreground/30 hover:text-destructive transition-colors cursor-pointer shrink-0 opacity-0 group-hover:opacity-100">
                          <X size={13} />
                        </button>
                      </div>
                    ))}

                    <div className="flex items-center gap-3 px-5 py-3.5">
                      <div className="w-6 h-6 rounded-full bg-[#0b2238] flex items-center justify-center shrink-0" style={{ transform: "scaleX(-1)" }}>
                        <PlaneTakeoff size={10} className="text-[#F2B705]" />
                      </div>
                      <span className="text-sm font-semibold text-foreground flex-1">Charleroi EBCI</span>
                      <span className="text-[9px] font-bold text-[#F2B705] uppercase tracking-wide">Retour</span>
                    </div>
                  </div>
                ) : (
                  <div className="bg-white rounded-xl border-2 border-dashed border-border px-6 py-12 text-center">
                    <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center mx-auto mb-3">
                      <MapPin size={18} className="text-muted-foreground/30" />
                    </div>
                    <p className="text-sm font-medium text-muted-foreground/60 mb-1">Aucun lieu ajouté</p>
                    <p className="text-xs text-muted-foreground/40">Cherchez une ville, un monument, un lac…</p>
                  </div>
                )}

                <div className="pt-1">
                  <button
                    type="button"
                    disabled={pois.length === 0}
                    onClick={() => setStep(2)}
                    className="w-full h-11 rounded-lg bg-[#F2B705] text-[#0b2238] text-sm font-black flex items-center justify-center gap-2 disabled:opacity-30 hover:bg-[#e6a800] transition-colors cursor-pointer shadow-[0_4px_14px_rgba(242,183,5,0.28)]"
                  >
                    Continuer <ArrowRight size={15} />
                  </button>
                  {pois.length === 0 && (
                    <p className="text-center text-xs text-muted-foreground/40 mt-2">
                      Ajoutez au moins un lieu pour continuer
                    </p>
                  )}
                </div>

                {/* Mobile "Comment ça marche" */}
                <div className="lg:hidden bg-[#0b2238] rounded-xl p-5 text-white mt-1">
                  <p className="text-[10px] font-bold text-[#F2B705] uppercase tracking-[3px] mb-4">Comment ça marche</p>
                  <div className="space-y-3">
                    {[
                      { icon: <MousePointerClick size={12} />, label: "Choisissez vos destinations" },
                      { icon: <Zap size={12} />, label: "L'ordre est optimisé automatiquement" },
                      { icon: <PlaneTakeoff size={12} />, label: "Affinez sur la carte interactive" },
                    ].map(({ icon, label }) => (
                      <div key={label} className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-lg bg-[#F2B705]/15 border border-[#F2B705]/20 flex items-center justify-center text-[#F2B705] shrink-0">
                          {icon}
                        </div>
                        <p className="text-white/80 text-sm">{label}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ══ STEP 2 : ESCALE ══ */}
            {step === 2 && (
              <div className="space-y-3">

                {/* Mobile map preview */}
                {pois.length > 0 && (
                  <div className="lg:hidden rounded-xl overflow-hidden border border-border shadow-sm h-[200px]">
                    <LeafletMapPreview waypoints={poisForStep2Map} />
                  </div>
                )}

                {stopovers.length > 0 ? (
                  <div className="bg-white rounded-xl border border-border overflow-hidden">
                    <div className="px-5 pt-4 pb-3 border-b border-border">
                      <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-[2px]">Aéroports disponibles</p>
                    </div>
                    {stopovers.map((s, i) => {
                      const selected = selectedStops.some(x => x.id === s.id);
                      return (
                        <button key={s.id} type="button" onClick={() => toggleStop(s)}
                          className={[
                            "w-full flex items-center gap-3.5 px-5 py-3.5 text-left transition-all cursor-pointer",
                            i < stopovers.length - 1 ? "border-b border-border" : "",
                            selected ? "bg-primary/5" : "hover:bg-secondary/40",
                          ].join(" ")}>
                          <div className={[
                            "w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-all",
                            selected ? "bg-primary border-primary" : "border-border bg-white",
                          ].join(" ")}>
                            {selected && <Check size={9} className="text-[#0b2238]" />}
                          </div>
                          <span className="font-mono text-[11px] font-bold text-[#0b2238] shrink-0 bg-secondary rounded px-1.5 py-0.5">
                            {s.icao}
                          </span>
                          <span className="flex-1 text-sm text-foreground">{s.nom}</span>
                          {s.taxe > 0 && (
                            <span className="text-xs text-muted-foreground shrink-0">+{s.taxe}&thinsp;€</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="bg-white rounded-xl border border-border px-4 py-14 flex items-center justify-center">
                    <Loader2 size={18} className="animate-spin text-muted-foreground/30" />
                  </div>
                )}

                <div className="space-y-2 pt-1">
                  <button type="button" onClick={() => setStep(3)}
                    className="w-full h-11 rounded-lg bg-[#F2B705] text-[#0b2238] text-sm font-black flex items-center justify-center gap-2 hover:bg-[#e6a800] transition-colors cursor-pointer shadow-[0_4px_14px_rgba(242,183,5,0.28)]">
                    Voir le résumé <ArrowRight size={15} />
                  </button>
                  <button type="button" onClick={() => { setSelectedStops([]); setStep(3); }}
                    className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer py-2 flex items-center justify-center gap-1">
                    Continuer sans escale <ArrowRight size={13} />
                  </button>
                </div>
              </div>
            )}

            {/* ══ STEP 3 : RÉSUMÉ ══ */}
            {step === 3 && estimate && (
              <div className="space-y-4">
                {/* Large map */}
                <div className="rounded-xl overflow-hidden border border-border shadow-md h-[300px] lg:h-[480px]">
                  <LeafletMapPreview waypoints={optimizedWaypoints} />
                </div>

                {/* Mobile-only: stats + itinerary + CTA */}
                <div className="lg:hidden space-y-3">
                  <div className="grid grid-cols-3 gap-2">
                    {statItems.map(({ label, value, unit }) => (
                      <div key={label} className="bg-white rounded-xl border border-border p-3.5 text-center">
                        <p className="text-[8px] font-bold text-muted-foreground/50 uppercase tracking-[2px] mb-1.5">{label}</p>
                        <p className="text-xl font-black text-foreground leading-none">{value}</p>
                        <p className="text-[10px] text-muted-foreground mt-1">{unit}</p>
                      </div>
                    ))}
                  </div>
                  <ItineraryCard waypoints={optimizedWaypoints} />
                  <button type="button" onClick={goToConfigurator}
                    className="w-full h-11 rounded-lg bg-[#F2B705] text-[#0b2238] text-sm font-black flex items-center justify-center gap-2 hover:bg-[#e6a800] transition-colors cursor-pointer shadow-[0_4px_14px_rgba(242,183,5,0.28)]">
                    Affiner et réserver <ArrowRight size={15} />
                  </button>
                  <p className="text-center text-xs text-muted-foreground/50 flex items-center justify-center gap-1.5">
                    <Lock size={10} /> Aucun paiement à cette étape
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* ── Sidebar (desktop only) ──────────────────────────── */}
          <div className="hidden lg:block w-[300px] xl:w-[320px] shrink-0 sticky top-28 self-start space-y-4">

            {/* STEP 1 sidebar */}
            {step === 1 && (
              <>
                <div className="bg-[#0b2238] rounded-xl p-5 text-white">
                  <p className="text-[10px] font-bold text-[#F2B705] uppercase tracking-[3px] mb-5">Comment ça marche</p>
                  <div className="space-y-0">
                    {[
                      {
                        icon: <MousePointerClick size={12} />,
                        title: "Choisissez vos destinations",
                        desc: "Ville, monument, lac, forêt — n'importe quel lieu à survoler.",
                      },
                      {
                        icon: <Zap size={12} />,
                        title: "L'ordre est optimisé",
                        desc: "Le trajet le plus court pour minimiser la distance et le coût.",
                      },
                      {
                        icon: <PlaneTakeoff size={12} />,
                        title: "Affinez sur la carte",
                        desc: "Déplacez les points et finalisez votre itinéraire.",
                      },
                    ].map(({ icon, title, desc }, i, arr) => (
                      <div key={title} className="flex gap-3">
                        <div className="flex flex-col items-center shrink-0">
                          <div className="w-7 h-7 rounded-lg bg-[#F2B705]/15 border border-[#F2B705]/20 flex items-center justify-center text-[#F2B705]">
                            {icon}
                          </div>
                          {i < arr.length - 1 && <div className="w-px flex-1 bg-white/[0.08] mt-1.5 min-h-[24px]" />}
                        </div>
                        <div className="pb-4">
                          <p className="text-white text-sm font-semibold leading-snug mb-0.5">{title}</p>
                          <p className="text-white/40 text-[11px] leading-relaxed">{desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white rounded-xl border border-border p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[#0b2238] flex items-center justify-center shrink-0">
                      <PlaneTakeoff size={13} className="text-[#F2B705]" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-foreground">Charleroi · EBCI</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                        Tous nos vols partent de Gosselies, Belgique. Disponible 7j/7 sur réservation.
                      </p>
                    </div>
                  </div>
                  <div className="mt-3.5 pt-3.5 border-t border-border flex flex-col gap-2">
                    {[
                      { icon: <Users size={10} />, label: "Jusqu'à 3 passagers" },
                      { icon: <Lock size={10} />, label: "Aucun paiement à cette étape" },
                    ].map(({ icon, label }) => (
                      <span key={label} className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground/60">
                        {icon} {label}
                      </span>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* STEP 2 sidebar */}
            {step === 2 && (
              <>
                <div className="rounded-xl overflow-hidden border border-border shadow-sm h-[280px]">
                  <LeafletMapPreview waypoints={poisForStep2Map} />
                </div>
                {pois.length > 0 && (
                  <div className="bg-white rounded-xl border border-border overflow-hidden">
                    <div className="px-5 pt-4 pb-3 border-b border-border">
                      <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-[2px]">Points de survol</p>
                    </div>
                    <div className="divide-y divide-border">
                      <div className="flex items-center gap-3 px-5 py-3">
                        <div className="w-5 h-5 rounded-full bg-[#0b2238] flex items-center justify-center shrink-0">
                          <PlaneTakeoff size={9} className="text-[#F2B705]" />
                        </div>
                        <span className="text-sm font-semibold text-foreground">Charleroi EBCI</span>
                      </div>
                      {pois.map((poi, i) => (
                        <div key={poi.id} className="flex items-center gap-3 px-5 py-3">
                          <div className="w-5 h-5 rounded-full bg-[#F2B705] flex items-center justify-center shrink-0 text-[#0b2238] font-black text-[9px]">
                            {i + 1}
                          </div>
                          <span className="text-sm text-foreground/75">{poi.nom}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* STEP 3 sidebar */}
            {step === 3 && estimate && (
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-2">
                  {statItems.map(({ label, value, unit }) => (
                    <div key={label} className="bg-white rounded-xl border border-border p-3 text-center">
                      <p className="text-[8px] font-bold text-muted-foreground/50 uppercase tracking-[1.5px] mb-1.5">{label}</p>
                      <p className="text-lg font-black text-foreground leading-none">{value}</p>
                      <p className="text-[9px] text-muted-foreground mt-1">{unit}</p>
                    </div>
                  ))}
                </div>
                <ItineraryCard waypoints={optimizedWaypoints} />
                <button type="button" onClick={goToConfigurator}
                  className="w-full h-11 rounded-lg bg-[#F2B705] text-[#0b2238] text-sm font-black flex items-center justify-center gap-2 hover:bg-[#e6a800] transition-colors cursor-pointer shadow-[0_4px_14px_rgba(242,183,5,0.28)]">
                  Affiner et réserver <ArrowRight size={15} />
                </button>
                <p className="text-center text-xs text-muted-foreground/50 flex items-center justify-center gap-1.5">
                  <Lock size={10} /> Aucun paiement à cette étape
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
