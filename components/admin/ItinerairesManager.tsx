"use client";

import dynamic from "next/dynamic";
import { useRef, useState, useEffect } from "react";
import {
  Plus, Pencil, Trash2, MapPin, Clock, X, Check, Loader2,
  BookMarked, ChevronLeft, AlignLeft, Search, Copy, BookCopy, BarChart2,
} from "lucide-react";
import type { AdventureRouteData, AdventureMapHandle, POI } from "@/components/vol-sur-mesure/LeafletMapAdventure";
import { buildForeFlightRoute } from "@/lib/foreflight";

interface NominatimResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
}
import type { Itineraire } from "@/lib/actions/itineraires";
import { createItineraire, updateItineraire, deleteItineraire } from "@/lib/actions/itineraires";
import { useRouter } from "next/navigation";

const LeafletMapAdventure = dynamic(
  () => import("@/components/vol-sur-mesure/LeafletMapAdventure"),
  { ssr: false }
);

interface Props {
  itineraires: Itineraire[];
}

type Mode = "list" | "create" | "edit";

const EBCI_COORD = { lat: 50.4592, lng: 4.4538 };

function ItineraireMapThumb({ waypoints }: { waypoints: { lat: number; lng: number }[] }) {
  const pts = [EBCI_COORD, ...waypoints, EBCI_COORD];
  const lats = pts.map(p => p.lat);
  const lngs = pts.map(p => p.lng);
  let minLat = Math.min(...lats), maxLat = Math.max(...lats);
  let minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
  if (maxLat - minLat < 0.08) { const c = (maxLat + minLat) / 2; minLat = c - 0.08; maxLat = c + 0.08; }
  if (maxLng - minLng < 0.08) { const c = (maxLng + minLng) / 2; minLng = c - 0.08; maxLng = c + 0.08; }
  const W = 100, H = 64, P = 0.12;
  const rLat = maxLat - minLat, rLng = maxLng - minLng;
  function proj(lat: number, lng: number): [number, number] {
    return [
      Math.round(P * W + ((lng - minLng) / rLng) * W * (1 - 2 * P)),
      Math.round(H - P * H - ((lat - minLat) / rLat) * H * (1 - 2 * P)),
    ];
  }
  const pp = pts.map(p => proj(p.lat, p.lng));
  return (
    <svg viewBox={`0 0 ${W} ${H}`} xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <rect width={W} height={H} fill="#0b2238" />
      <polyline points={pp.map(([x, y]) => `${x},${y}`).join(" ")}
        fill="none" stroke="#F2B705" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
      {pp.map(([x, y], i) => {
        const isEBCI = i === 0 || i === pp.length - 1;
        return <circle key={i} cx={x} cy={y} r={isEBCI ? 3 : 2}
          fill={isEBCI ? "#F2B705" : "white"} stroke="#0b2238" strokeWidth="0.5" />;
      })}
    </svg>
  );
}

function formatDuree(min: number | null): string | null {
  if (!min) return null;
  if (min >= 60) return `${Math.floor(min / 60)}h${String(min % 60).padStart(2, "0")}`;
  return `${min} min`;
}

export function ItinerairesManager({ itineraires }: Props) {
  const router = useRouter();
  const mapRef = useRef<AdventureMapHandle | null>(null);

  const [mode, setMode] = useState<Mode>("list");
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteId,      setDeleteId]      = useState<string | null>(null);
  const [activeTab,     setActiveTab]     = useState<number | null>(null);
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null);
  const [copiedItinId,  setCopiedItinId]  = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Form state
  const [nom, setNom] = useState("");
  const [dureeEstimee, setDureeEstimee] = useState("");
  const [notes, setNotes] = useState("");
  const [route, setRoute] = useState<AdventureRouteData>({
    pois: [], distKm: 0, transitMin: 0, obsMin: 0, totalMin: 0,
  });

  // Nominatim search
  const [searchQ,       setSearchQ]       = useState("");
  const [searchResults, setSearchResults] = useState<NominatimResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchOpen,    setSearchOpen]    = useState(false);
  const searchRef      = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (searchQ.trim().length < 2) { setSearchResults([]); setSearchOpen(false); return; }
    const t = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQ)}&limit=6&accept-language=fr&viewbox=2.5,51.5,6.4,49.4&bounded=0`;
        const r   = await fetch(url, { headers: { "Accept-Language": "fr" } });
        const d   = await r.json() as NominatimResult[];
        const seen = new Set<string>();
        const unique = d.filter(item => {
          const key = item.display_name.split(",")[0].trim().toLowerCase();
          if (seen.has(key)) return false;
          seen.add(key); return true;
        });
        setSearchResults(unique);
        setSearchOpen(unique.length > 0);
      } catch { /* ignore */ }
      finally { setSearchLoading(false); }
    }, 400);
    return () => clearTimeout(t);
  }, [searchQ]);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setSearchOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  function addSearchResult(r: NominatimResult) {
    const poi: POI = {
      id: `nom-${r.place_id}`,
      lat: parseFloat(r.lat),
      lng: parseFloat(r.lon),
      nom: r.display_name.split(",")[0].trim(),
    };
    mapRef.current?.addPOI(poi);
    setSearchQ(""); setSearchOpen(false);
  }

  // POIs to inject once the map ref is ready
  const pendingPOIsRef = useRef<POI[]>([]);
  const injectedRef = useRef(false);

  function enterCreate() {
    pendingPOIsRef.current = [];
    injectedRef.current = false;
    setMode("create");
    setEditId(null);
    setNom("");
    setDureeEstimee("");
    setNotes("");
    setRoute({ pois: [], distKm: 0, transitMin: 0, obsMin: 0, totalMin: 0 });
    setError("");
  }

  function enterEdit(itin: Itineraire) {
    pendingPOIsRef.current = itin.waypoints.map((wp, i) => ({
      id: `itin-${i}-${wp.lat.toFixed(4)}-${wp.lng.toFixed(4)}`,
      lat: wp.lat,
      lng: wp.lng,
      nom: wp.nom,
    }));
    injectedRef.current = false;
    setMode("edit");
    setEditId(itin.id);
    setNom(itin.nom);
    setDureeEstimee(itin.duree_estimee != null ? String(itin.duree_estimee) : "");
    setNotes(itin.notes ?? "");
    setRoute({ pois: [], distKm: 0, transitMin: 0, obsMin: 0, totalMin: 0 });
    setError("");
  }

  function exitToList() {
    setMode("list");
    setEditId(null);
    setError("");
  }

  // Poll until mapRef is ready, then inject pending POIs
  useEffect(() => {
    if (mode !== "create" && mode !== "edit") return;
    if (pendingPOIsRef.current.length === 0) return;

    const interval = setInterval(() => {
      if (mapRef.current && !injectedRef.current) {
        injectedRef.current = true;
        clearInterval(interval);
        const pois = [...pendingPOIsRef.current];
        pois.forEach(poi => mapRef.current?.addPOI(poi));
      }
    }, 100);

    return () => clearInterval(interval);
  }, [mode]);

  async function handleSave() {
    setError("");
    if (!nom.trim()) { setError("Le nom est obligatoire."); return; }
    if (route.pois.length === 0) { setError("Ajoutez au moins un point sur la carte."); return; }

    setSaving(true);
    const data = {
      nom: nom.trim(),
      waypoints: route.pois.map(p => ({ lat: p.lat, lng: p.lng, nom: p.nom })),
      duree_estimee: dureeEstimee ? parseInt(dureeEstimee) : null,
      notes: notes.trim() || null,
    };

    const result = mode === "edit" && editId
      ? await updateItineraire(editId, data)
      : await createItineraire(data);

    setSaving(false);
    if (result?.error) { setError(result.error); return; }
    router.refresh();
    exitToList();
  }

  async function handleDuplicate(itin: Itineraire) {
    setDuplicatingId(itin.id);
    await createItineraire({
      nom: `${itin.nom} (copie)`,
      waypoints: itin.waypoints,
      duree_estimee: itin.duree_estimee,
      notes: itin.notes,
    });
    setDuplicatingId(null);
    router.refresh();
  }

  function handleCopyForeFlight(itin: Itineraire) {
    const text = buildForeFlightRoute(itin.waypoints);
    navigator.clipboard.writeText(text);
    setCopiedItinId(itin.id);
    setTimeout(() => setCopiedItinId(null), 2000);
  }

  async function handleDelete(id: string) {
    setDeleting(true);
    await deleteItineraire(id);
    setDeleting(false);
    setDeleteId(null);
    router.refresh();
  }

  // ── LIST
  if (mode === "list") {
    const DUREES = [30, 60, 90, 120] as const;
    const DUREE_LABELS: Record<number, string> = { 30: "30'", 60: "1h", 90: "1h30", 120: "2h" };
    const DUREE_COLORS: Record<number, { tab: string; badge: string; bar: string }> = {
      30:  { tab: "bg-sky-50 text-sky-700 border-sky-200",     badge: "bg-sky-100 text-sky-700",     bar: "bg-sky-400"     },
      60:  { tab: "bg-primary/10 text-primary border-primary/30", badge: "bg-primary/10 text-primary", bar: "bg-primary"   },
      90:  { tab: "bg-violet-50 text-violet-700 border-violet-200", badge: "bg-violet-100 text-violet-700", bar: "bg-violet-400" },
      120: { tab: "bg-emerald-50 text-emerald-700 border-emerald-200", badge: "bg-emerald-100 text-emerald-700", bar: "bg-emerald-400" },
    };

    const usedDurees = DUREES.filter(d => itineraires.some(it => it.duree_estimee === d));
    const displayed = activeTab === null
      ? itineraires
      : itineraires.filter(it => it.duree_estimee === activeTab);

    return (
      <div>
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-lg font-black text-foreground">Itinéraires enregistrés</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {itineraires.length} itinéraire{itineraires.length !== 1 ? "s" : ""}
            </p>
          </div>
          <button
            onClick={enterCreate}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-bold hover:brightness-105 transition-all cursor-pointer shadow-gold"
          >
            <Plus size={14} /> Nouvel itinéraire
          </button>
        </div>

        {itineraires.length === 0 ? (
          <div className="text-center py-20 border-2 border-dashed border-border rounded-2xl">
            <BookMarked size={32} className="mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-sm font-semibold text-muted-foreground">Aucun itinéraire enregistré</p>
            <p className="text-xs text-muted-foreground/60 mt-1 mb-4">
              Créez votre premier itinéraire pour le réutiliser en un clic.
            </p>
            <button onClick={enterCreate} className="text-xs font-bold text-primary hover:underline cursor-pointer">
              Créer un itinéraire →
            </button>
          </div>
        ) : (
          <>
            {/* Duration tabs */}
            {usedDurees.length > 0 && (
              <div className="flex items-center gap-2 mb-4 flex-wrap">
                <button
                  onClick={() => setActiveTab(null)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                    activeTab === null
                      ? "bg-[#0b2238] text-white border-[#0b2238]"
                      : "border-border text-muted-foreground hover:bg-secondary"
                  }`}
                >
                  Tous
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-black ${activeTab === null ? "bg-white/20 text-white" : "bg-muted text-muted-foreground"}`}>
                    {itineraires.length}
                  </span>
                </button>
                {usedDurees.map(d => {
                  const count = itineraires.filter(it => it.duree_estimee === d).length;
                  const col = DUREE_COLORS[d];
                  return (
                    <button
                      key={d}
                      onClick={() => setActiveTab(d)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                        activeTab === d ? col.tab + " shadow-sm" : "border-border text-muted-foreground hover:bg-secondary"
                      }`}
                    >
                      {DUREE_LABELS[d]}
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-black ${activeTab === d ? "bg-black/10" : "bg-muted text-muted-foreground"}`}>
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Compact list */}
            <div className="border border-border rounded-xl overflow-hidden bg-card">
              {displayed.map((itin, i) => {
                const col = itin.duree_estimee ? DUREE_COLORS[itin.duree_estimee] : null;
                const routePreview = ["EBCI", ...itin.waypoints.map(wp => wp.nom), "EBCI"].join(" › ");

                return (
                  <div key={itin.id}>
                    <div className={`flex items-stretch gap-0 group ${i < displayed.length - 1 && deleteId !== itin.id ? "border-b border-border" : ""}`}>
                      {/* Duration color bar */}
                      <div className={`w-1 shrink-0 ${col ? col.bar : "bg-muted-foreground/20"}`} />

                      {/* Map thumbnail */}
                      <div className="w-[90px] shrink-0 self-stretch bg-[#0b2238] overflow-hidden">
                        <ItineraireMapThumb waypoints={itin.waypoints} />
                      </div>

                      <div className="flex-1 min-w-0 px-3 py-2.5">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            {/* Name + badges */}
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-sm font-bold text-foreground leading-tight">{itin.nom}</span>
                              {itin.duree_estimee && col && (
                                <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-md ${col.badge}`}>
                                  {DUREE_LABELS[itin.duree_estimee]}
                                </span>
                              )}
                              <span className="text-[10px] text-muted-foreground/50">
                                {itin.waypoints.length} pt{itin.waypoints.length !== 1 ? "s" : ""}
                              </span>
                              {itin.utilisations > 0 && (
                                <span className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground/50">
                                  <BarChart2 size={8} />
                                  {itin.utilisations}×
                                </span>
                              )}
                            </div>
                            {/* Route inline */}
                            <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{routePreview}</p>
                            {itin.notes && (
                              <p className="text-[10px] text-muted-foreground/50 mt-0.5 truncate italic flex items-center gap-1">
                                <AlignLeft size={9} className="shrink-0" />{itin.notes}
                              </p>
                            )}
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => handleCopyForeFlight(itin)}
                              title="Copier ForeFlight"
                              className="p-1.5 rounded-lg hover:bg-secondary transition-colors cursor-pointer text-muted-foreground hover:text-foreground"
                            >
                              {copiedItinId === itin.id
                                ? <Check size={12} className="text-emerald-500" />
                                : <Copy size={12} />}
                            </button>
                            <button
                              onClick={() => handleDuplicate(itin)}
                              title="Dupliquer"
                              disabled={duplicatingId === itin.id}
                              className="p-1.5 rounded-lg hover:bg-secondary transition-colors cursor-pointer text-muted-foreground hover:text-foreground disabled:opacity-40"
                            >
                              {duplicatingId === itin.id
                                ? <Loader2 size={12} className="animate-spin" />
                                : <BookCopy size={12} />}
                            </button>
                            <button
                              onClick={() => enterEdit(itin)}
                              title="Modifier"
                              className="p-1.5 rounded-lg hover:bg-secondary transition-colors cursor-pointer text-muted-foreground hover:text-foreground"
                            >
                              <Pencil size={13} />
                            </button>
                            <button
                              onClick={() => setDeleteId(deleteId === itin.id ? null : itin.id)}
                              title="Supprimer"
                              className="p-1.5 rounded-lg hover:bg-destructive/10 transition-colors cursor-pointer text-muted-foreground hover:text-destructive"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Delete confirm — inline below the row */}
                    {deleteId === itin.id && (
                      <div className={`flex items-center gap-3 px-5 py-2.5 bg-destructive/5 border-b border-border ${i === displayed.length - 1 ? "" : ""}`}>
                        <p className="text-xs text-destructive flex-1">Supprimer «&nbsp;{itin.nom}&nbsp;» ?</p>
                        <button
                          disabled={deleting}
                          onClick={() => handleDelete(itin.id)}
                          className="flex items-center gap-1 text-[11px] font-bold text-white bg-destructive hover:bg-destructive/90 px-3 py-1.5 rounded-lg cursor-pointer disabled:opacity-50 transition-colors"
                        >
                          {deleting ? <Loader2 size={10} className="animate-spin" /> : <Trash2 size={10} />}
                          Supprimer
                        </button>
                        <button
                          onClick={() => setDeleteId(null)}
                          className="text-[11px] font-bold text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-lg hover:bg-secondary cursor-pointer transition-colors"
                        >
                          Annuler
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}

              {displayed.length === 0 && (
                <div className="py-10 text-center text-sm text-muted-foreground">
                  Aucun itinéraire pour cette durée.
                </div>
              )}
            </div>
          </>
        )}
      </div>
    );
  }

  // ── CREATE / EDIT
  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <button
          onClick={exitToList}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
        >
          <ChevronLeft size={15} /> Retour
        </button>
        <h2 className="text-lg font-black text-foreground">
          {mode === "create" ? "Nouvel itinéraire" : "Modifier l'itinéraire"}
        </h2>
      </div>

      <div className="flex border border-border rounded-xl overflow-hidden" style={{ height: "calc(100vh - 220px)" }}>

        {/* Map */}
        <div className="flex-1 relative overflow-hidden">
          <div className="absolute inset-0">
            <LeafletMapAdventure
              ref={mapRef}
              styleMode="rapide"
              onRouteChange={setRoute}
            />
          </div>

          {/* Search bar */}
          <div ref={searchRef} className="absolute top-3 left-0 right-0 flex justify-center z-[450] px-4 pointer-events-none">
            <div className="pointer-events-auto w-full max-w-lg flex items-center gap-2">
              <div className="relative flex-1">
                <div className={[
                  "flex items-center gap-2.5 h-10 rounded-lg px-3.5 transition-all border-2",
                  searchOpen
                    ? "bg-white border-primary shadow-[0_0_0_4px_rgba(242,183,5,0.15)]"
                    : "bg-white/95 border-[#cdd5e0] shadow-md hover:border-primary/70 backdrop-blur-sm",
                ].join(" ")}>
                  {searchLoading
                    ? <Loader2 size={14} className="text-primary animate-spin shrink-0" />
                    : <Search   size={14} className="text-[#6b7280] shrink-0" />
                  }
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchQ}
                    onChange={e => setSearchQ(e.target.value)}
                    onFocus={() => { if (searchResults.length > 0) setSearchOpen(true); }}
                    placeholder="Ajouter un point de survol : ville, château, lac…"
                    className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/55 outline-none min-w-0"
                    autoComplete="off"
                  />
                  {searchQ && (
                    <button onClick={() => { setSearchQ(""); setSearchOpen(false); }}
                      className="text-muted-foreground hover:text-foreground cursor-pointer shrink-0">
                      <X size={13} />
                    </button>
                  )}
                </div>

                {searchOpen && searchResults.length > 0 && (
                  <div className="absolute top-full left-0 right-0 bg-white border border-border rounded-lg shadow-2xl z-[600] overflow-hidden mt-1.5">
                    <div className="px-4 py-2 border-b border-border bg-muted/30">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                        {searchResults.length} résultat{searchResults.length > 1 ? "s" : ""}
                      </p>
                    </div>
                    {searchResults.map(r => (
                      <button key={r.place_id} type="button"
                        onClick={() => addSearchResult(r)}
                        className="w-full flex items-start gap-3 px-4 py-3 hover:bg-primary/5 text-left transition-colors border-b border-border last:border-0 cursor-pointer group">
                        <div className="w-7 h-7 rounded-lg bg-navy flex items-center justify-center shrink-0 mt-0.5 group-hover:bg-primary transition-colors">
                          <MapPin size={12} className="text-primary group-hover:text-primary-foreground" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-bold text-foreground truncate">{r.display_name.split(",")[0]}</p>
                          <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                            {r.display_name.split(",").slice(1, 3).join(", ").trim()}
                          </p>
                        </div>
                        <span className="text-[10px] text-primary font-bold shrink-0 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          Ajouter
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {route.pois.length > 0 && (
                <button
                  onClick={() => { mapRef.current?.clearAll(); injectedRef.current = true; }}
                  className="flex items-center gap-1.5 h-10 px-3 rounded-lg border border-white/70 bg-white/95 text-xs font-semibold text-muted-foreground hover:text-destructive hover:border-destructive/30 transition-colors cursor-pointer shrink-0 backdrop-blur-sm shadow-md">
                  <Trash2 size={12} /> Effacer
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="w-[300px] shrink-0 flex flex-col border-l border-border bg-card">

          {/* Stats */}
          <div className="grid grid-cols-2 divide-x divide-border border-b border-border">
            <div className="py-3 px-3 text-center">
              <p className="text-[7px] font-bold text-muted-foreground/70 uppercase tracking-[1.5px] mb-1">DURÉE CALC.</p>
              <p className="text-lg font-black text-[#0b2238] leading-none">
                {route.totalMin > 0
                  ? (route.totalMin >= 60
                    ? `${Math.floor(route.totalMin / 60)}h${String(route.totalMin % 60).padStart(2, "0")}`
                    : `${route.totalMin}`)
                  : "—"}
              </p>
              {route.totalMin > 0 && (
                <p className="text-[9px] text-muted-foreground mt-0.5">
                  {route.totalMin >= 60 ? "heures" : "min"}
                </p>
              )}
            </div>
            <div className="py-3 px-3 text-center">
              <p className="text-[7px] font-bold text-muted-foreground/70 uppercase tracking-[1.5px] mb-1">DISTANCE</p>
              <p className="text-lg font-black text-[#0b2238] leading-none">{route.distKm > 0 ? route.distKm : "—"}</p>
              {route.distKm > 0 && <p className="text-[9px] text-muted-foreground mt-0.5">km</p>}
            </div>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto">
            {/* Parcours */}
            <div className="px-4 py-4 border-b border-border">
              <p className="text-[9px] font-black text-foreground/40 uppercase tracking-[2px] mb-2.5">Parcours</p>
              <div className="space-y-1.5">
                <div className="flex items-center gap-2.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#F2B705] shrink-0" />
                  <span className="text-xs font-bold text-[#0b2238]">EBCI</span>
                </div>
                {route.pois.length === 0 ? (
                  <p className="text-[11px] text-muted-foreground italic pl-4">
                    Cliquez sur la carte pour ajouter des lieux…
                  </p>
                ) : (
                  route.pois.map(poi => (
                    <div key={poi.id} className="flex items-center gap-2.5">
                      <div className="w-2.5 h-2.5 rounded-full border-2 border-muted-foreground/30 shrink-0" />
                      <span className="text-xs text-foreground/80 truncate flex-1">{poi.nom}</span>
                      <button
                        onClick={() => mapRef.current?.removePOI(poi.id)}
                        className="text-muted-foreground/40 hover:text-destructive cursor-pointer shrink-0 transition-colors"
                      >
                        <X size={11} />
                      </button>
                    </div>
                  ))
                )}
                {route.pois.length > 0 && (
                  <div className="flex items-center gap-2.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-[#F2B705] shrink-0" />
                    <span className="text-xs font-bold text-[#0b2238]">EBCI (retour)</span>
                  </div>
                )}
              </div>
            </div>

            {/* Form fields */}
            <div className="px-4 py-4 space-y-4">
              <div>
                <label className="block text-[10px] font-medium text-muted-foreground mb-1">
                  Nom de l&apos;itinéraire *
                </label>
                <input
                  value={nom}
                  onChange={e => setNom(e.target.value)}
                  placeholder="Ex : EBCI → Dinant → Namur"
                  className="w-full h-8 px-2.5 rounded-lg border border-input bg-background text-xs focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label className="block text-[10px] font-medium text-muted-foreground mb-1">
                  Durée du vol
                </label>
                <select
                  value={dureeEstimee}
                  onChange={e => setDureeEstimee(e.target.value)}
                  className="w-full h-8 px-2.5 rounded-lg border border-input bg-background text-xs focus:outline-none focus:ring-2 focus:ring-ring cursor-pointer"
                >
                  <option value="">— Non spécifiée —</option>
                  <option value="30">30 min</option>
                  <option value="60">1h (60 min)</option>
                  <option value="90">1h30 (90 min)</option>
                  <option value="120">2h (120 min)</option>
                </select>
                <p className="text-[10px] text-muted-foreground/60 mt-1">
                  Filtre les itinéraires affichés selon la durée réservée par le client
                </p>
              </div>
              <div>
                <label className="block text-[10px] font-medium text-muted-foreground mb-1">
                  Notes internes
                </label>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  rows={3}
                  placeholder="Ex : Problèmes ATC fréquents, prévoir +10 min par rapport à la durée calculée…"
                  className="w-full px-2.5 py-2 rounded-lg border border-input bg-background text-xs focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                />
              </div>

              {error && (
                <p className="text-xs text-destructive bg-destructive/10 px-3 py-2 rounded-lg border border-destructive/20">
                  {error}
                </p>
              )}
            </div>
          </div>

          {/* CTA */}
          <div className="shrink-0 px-4 py-4 border-t border-border">
            <button
              onClick={handleSave}
              disabled={saving || !nom.trim() || route.pois.length === 0}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-lg bg-primary text-primary-foreground text-sm font-black disabled:opacity-30 hover:brightness-105 transition-all cursor-pointer shadow-gold"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
              {mode === "create" ? "Enregistrer l'itinéraire" : "Mettre à jour"}
            </button>
            <button
              onClick={exitToList}
              className="w-full mt-2 py-2 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              Annuler
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
