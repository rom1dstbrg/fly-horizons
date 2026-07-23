"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useRef, useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  MapPin, Clock, Search, Trash2, ChevronLeft, ChevronRight,
  Check, CheckCircle, Loader2, AlertCircle, AlertTriangle,
  Mail, PlaneTakeoff, PlaneLanding, X, Info,
  Star, Plus, CloudRain, ArrowRight, ShieldCheck, CalendarDays, Route,
} from "lucide-react";
import type {
  AdventureRouteData, AdventureMapHandle, POI,
} from "@/components/vol-sur-mesure/LeafletMapAdventure";
import { detectZones } from "@/lib/vol-sur-mesure/zones";
import type { ZoneResult } from "@/lib/vol-sur-mesure/zones";

const LeafletMapAdventure = dynamic(
  () => import("@/components/vol-sur-mesure/LeafletMapAdventure"),
  { ssr: false }
);

// ── Types ──────────────────────────────────────────────────────────
type Phase = "map" | "booking" | "done";

interface Stopover {
  id: string;
  icao: string;
  nom: string;
  taxe: number;
  lat?: number | null;
  lng?: number | null;
}

interface NominatimResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
}

// ── Constants ──────────────────────────────────────────────────────
const MONTHS_FR = ["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"];
const DAYS_FR   = ["L","M","M","J","V","S","D"];
const MAX_WEIGHT  = 190;
const CRIT_WEIGHT = 220;

// ── Page ───────────────────────────────────────────────────────────
export default function ConfigurerPage() {
  const router     = useRouter();
  const mapRef     = useRef<AdventureMapHandle | null>(null);

  function goBackToGuide() {
    try { sessionStorage.setItem("vsm_from_map", "true"); } catch {}
    router.push("/vol-sur-mesure");
  }
  const touchStartY = useRef(0);

  // Lecture des paramètres URL ?wp=nom,lat,lng (capturée au render, stable sous StrictMode)
  const searchParams = useSearchParams();
  const _urlWaypointsRef = useRef<POI[] | null>(null);
  if (_urlWaypointsRef.current === null) {
    _urlWaypointsRef.current = searchParams.getAll("wp").flatMap((wp, i) => {
      const parts = wp.split(",");
      if (parts.length < 3) return [];
      const lng = parseFloat(parts[parts.length - 1]);
      const lat = parseFloat(parts[parts.length - 2]);
      const nom = parts.slice(0, parts.length - 2).join(",").trim();
      if (!nom || isNaN(lat) || isNaN(lng)) return [];
      return [{ id: `url-${i}`, lat, lng, nom }] as POI[];
    });
  }

  // Capture sessionStorage / URL params au render (avant les effects — évite bug StrictMode)
  const _initPoisRef = useRef<{ pois: POI[]; done: boolean }>({ pois: [], done: false });
  if (!_initPoisRef.current.done && typeof window !== "undefined") {
    _initPoisRef.current.done = true;
    const urlPois = _urlWaypointsRef.current ?? [];
    if (urlPois.length > 0) {
      _initPoisRef.current.pois = urlPois;
      try { sessionStorage.setItem("vsm_pois", JSON.stringify(urlPois)); } catch {}
    } else {
      try {
        const raw = sessionStorage.getItem("vsm_pois");
        _initPoisRef.current.pois = raw ? JSON.parse(raw) : [];
      } catch {}
    }
  }

  // ── State global
  const [phase,      setPhase]      = useState<Phase>("map");
  const styleMode = "rapide" as const;
  const [prixHeure,  setPrixHeure]  = useState(254);
  const [acompteH,   setAcompteH]   = useState(300);
  const [route,      setRoute]      = useState<AdventureRouteData>({ pois: [], distKm: 0, transitMin: 0, obsMin: 0, totalMin: 0 });
  const [statsKey,   setStatsKey]   = useState(0);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // ── Calendar closed
  const [calendarClosed, setCalendarClosed] = useState(false);
  const [closedMessage,  setClosedMessage]  = useState("");

  // ── Recherche dans le panneau
  const [panQ,       setPanQ]       = useState("");
  const [panResults, setPanResults] = useState<NominatimResult[]>([]);
  const [panZones,   setPanZones]   = useState<ZoneResult[]>([]);
  const [panLoading, setPanLoading] = useState(false);
  const [panOpen,    setPanOpen]    = useState(false);

  // ── Escales
  const [availableStops, setAvailableStops] = useState<Stopover[]>([]);
  const [selectedStops,  setSelectedStops]  = useState<Stopover[]>([]);
  const [stopsOpen,      setStopsOpen]      = useState(false);

  // ── Prix
  const ESCALE_TURNAROUND_MIN  = 20;
  const escalesSansCoords      = selectedStops.filter(s => s.lat == null || s.lng == null);
  const effectiveTotalMin      = route.totalMin > 0
    ? route.totalMin + escalesSansCoords.length * ESCALE_TURNAROUND_MIN
    : 0;
  const prixEstime        = effectiveTotalMin > 0 ? Math.round((prixHeure / 60) * effectiveTotalMin) : 0;
  const acompte           = effectiveTotalMin > 0 ? Math.round((acompteH  / 60) * effectiveTotalMin) : 0;
  const taxesEscalesTotal = selectedStops.reduce((acc, s) => acc + s.taxe, 0);
  const totalAcompte      = acompte + taxesEscalesTotal;

  // ── Calendrier
  const today = new Date();
  const [calYear,       setCalYear]       = useState(today.getFullYear());
  const [calMonth,      setCalMonth]      = useState(today.getMonth() + 1);
  const [availableDays, setAvailableDays] = useState<string[]>([]);
  const [calLoading,    setCalLoading]    = useState(false);
  const [slots,         setSlots]         = useState<string[]>([]);
  const [slotsLoading,  setSlotsLoading]  = useState(false);

  // ── Formulaire
  const [form, setForm] = useState({
    date: "", heure: "", passagers: "", poids_total: "",
    prenom: "", nom: "", email: "", telephone: "",
    commentaire: "", accept_cgp: false, newsletter_opt_in: false,
  });
  const [submitting,  setSubmitting]  = useState(false);
  const [submitError, setSubmitError] = useState("");

  const weightKg   = parseInt(form.poids_total) || 0;
  const weightWarn = weightKg > MAX_WEIGHT && weightKg < CRIT_WEIGHT;
  const weightCrit = weightKg >= CRIT_WEIGHT;
  const formattedDate = form.date
    ? new Date(form.date + "T12:00:00Z").toLocaleDateString("fr-BE", { weekday: "long", day: "numeric", month: "long" })
    : null;

  // ── Effects

  useEffect(() => {
    fetch("/api/site-settings")
      .then(r => r.json())
      .then(d => {
        if (d.calendar_closed === "true") {
          setCalendarClosed(true);
          setClosedMessage(d.calendar_closed_message ?? "");
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const sb = createClient();
    sb.from("crm_settings").select("key, value")
      .in("key", ["prix_heure", "acompte_perso_heure"])
      .then(({ data }) => {
        data?.forEach(({ key, value }) => {
          if (key === "prix_heure")          setPrixHeure(parseFloat(value));
          if (key === "acompte_perso_heure") setAcompteH(parseFloat(value));
        });
      });
    sb.from("stopovers").select("id, icao, nom, taxe, lat, lng").eq("actif", true).order("nom")
      .then(({ data, error }) => {
        if (error) {
          sb.from("stopovers").select("id, icao, nom, taxe").eq("actif", true).order("nom")
            .then(({ data: d2 }) => setAvailableStops((d2 ?? []) as Stopover[]));
        } else {
          setAvailableStops((data ?? []) as Stopover[]);
        }
      });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Initialise la carte avec les POIs (URL params ou sessionStorage)
  useEffect(() => {
    const t1 = setTimeout(() => mapRef.current?.invalidateSize(), 80);
    const wps = _initPoisRef.current.pois;
    const t2 = setTimeout(() => {
      wps.forEach(wp => mapRef.current?.addPOI(wp));
    }, 350);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sauvegarde POIs dans sessionStorage
  useEffect(() => {
    try { sessionStorage.setItem("vsm_pois", JSON.stringify(route.pois)); } catch {}
  }, [route.pois]);

  // Anime les stats quand la route change
  useEffect(() => {
    if (route.totalMin > 0) setStatsKey(k => k + 1);
  }, [route.totalMin, route.distKm]);

  // Scroll top + reset drawer au changement de phase
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    setDrawerOpen(false);
  }, [phase]);

  // Recalcule la taille de la carte quand on revient sur la map
  useEffect(() => {
    if (phase === "map") mapRef.current?.invalidateSize();
  }, [phase]);

  // Calendrier — cherche le premier mois disponible à l'entrée de la phase booking
  const dureeForCal = Math.max(30, effectiveTotalMin);
  const loadMonth = useCallback(async (y: number, m: number) => {
    setCalLoading(true);
    try {
      const r = await fetch(`/api/reservation/month?year=${y}&month=${m}&duree=${dureeForCal}`);
      const d = await r.json();
      setAvailableDays(d.available ?? []);
    } finally { setCalLoading(false); }
  }, [dureeForCal]);

  useEffect(() => {
    if (phase !== "booking") return;
    let cancelled = false;
    async function findFirstMonth() {
      setCalLoading(true);
      const sy = today.getFullYear(), sm = today.getMonth() + 1;
      for (let offset = 0; offset < 6; offset++) {
        let m = sm + offset, y = sy;
        while (m > 12) { m -= 12; y++; }
        try {
          const r = await fetch(`/api/reservation/month?year=${y}&month=${m}&duree=${dureeForCal}`);
          if (cancelled) return;
          const available = (await r.json()).available ?? [];
          if (available.length > 0 || offset === 5) {
            setCalYear(y); setCalMonth(m); setAvailableDays(available);
            setCalLoading(false); return;
          }
        } catch { if (!cancelled) setCalLoading(false); return; }
      }
      if (!cancelled) setCalLoading(false);
    }
    findFirstMonth();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  useEffect(() => {
    if (!form.date) { setSlots([]); return; }
    setSlotsLoading(true);
    fetch(`/api/reservation/slots?date=${form.date}&duree=${dureeForCal}`)
      .then(r => r.json()).then(d => setSlots(d.slots ?? []))
      .finally(() => setSlotsLoading(false));
  }, [form.date, dureeForCal]);

  // Recherche Nominatim + zones
  useEffect(() => {
    if (panQ.trim().length < 2) { setPanResults([]); setPanZones([]); setPanOpen(false); return; }
    const zones = detectZones(panQ);
    setPanZones(zones);
    const t = setTimeout(async () => {
      setPanLoading(true);
      try {
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(panQ)}&limit=6&accept-language=fr&viewbox=2.5,51.5,6.4,49.4&bounded=0`;
        const d = await (await fetch(url, { headers: { "Accept-Language": "fr" } })).json() as NominatimResult[];
        const seen = new Set<string>();
        const unique = d.filter(item => {
          const key = item.display_name.split(",")[0].trim().toLowerCase();
          return seen.has(key) ? false : (seen.add(key), true);
        });
        setPanResults(unique);
        setPanOpen(zones.length > 0 || unique.length > 0);
      } catch {} finally { setPanLoading(false); }
    }, 400);
    return () => clearTimeout(t);
  }, [panQ]);

  // Désélectionne les escales supprimées depuis la carte
  useEffect(() => {
    const ids = new Set(route.pois.map(p => p.id));
    setSelectedStops(prev => prev.filter(s => s.lat == null || s.lng == null || ids.has(`stop-${s.id}`)));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [route.pois]);

  // ── Handlers

  function addStop(s: Stopover) {
    setSelectedStops(prev => prev.some(x => x.id === s.id) ? prev : [...prev, s]);
    if (s.lat != null && s.lng != null)
      mapRef.current?.addPOI({ id: `stop-${s.id}`, lat: s.lat, lng: s.lng, nom: s.nom });
    setStopsOpen(false);
  }
  function removeStop(id: string) {
    setSelectedStops(prev => prev.filter(x => x.id !== id));
    mapRef.current?.removePOI(`stop-${id}`);
  }
  function addFromSearch(r: NominatimResult) {
    mapRef.current?.addPOI({
      id: `nom-${r.place_id}`,
      lat: parseFloat(r.lat),
      lng: parseFloat(r.lon),
      nom: r.display_name.split(",")[0].trim(),
    });
    setPanQ(""); setPanOpen(false);
  }
  function addZoneResult(z: ZoneResult) {
    mapRef.current?.addPOI({ id: `zone-${z.id}`, lat: z.lat, lng: z.lng, nom: z.nom });
    setPanQ(""); setPanOpen(false); setPanZones([]);
  }

  function renderCalendar() {
    const firstDay = new Date(calYear, calMonth - 1, 1).getDay();
    const offset   = firstDay === 0 ? 6 : firstDay - 1;
    const days     = new Date(calYear, calMonth, 0).getDate();
    const cells    = [];
    for (let i = 0; i < offset; i++) cells.push(<div key={`e${i}`} />);
    for (let d = 1; d <= days; d++) {
      const ds      = `${calYear}-${String(calMonth).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
      const isAvail = availableDays.includes(ds);
      const isSel   = form.date === ds;
      const isPast  = new Date(ds + "T12:00:00Z") < today;
      cells.push(
        <button key={d} type="button" disabled={!isAvail || isPast}
          onClick={() => setForm(f => ({ ...f, date: ds, heure: "" }))}
          className={[
            "h-9 w-full rounded-lg text-sm font-medium transition-all select-none flex items-center justify-center",
            isSel              ? "bg-primary text-primary-foreground font-bold shadow-sm scale-105"
            : isAvail && !isPast ? "hover:bg-primary/10 text-foreground/70 cursor-pointer font-semibold"
            :                      "text-muted-foreground/25 cursor-not-allowed text-xs",
          ].join(" ")}>{d}
        </button>
      );
    }
    return cells;
  }

  async function handleSubmit() {
    setSubmitting(true); setSubmitError("");
    try {
      const r = await fetch("/api/vol-sur-mesure/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prenom: form.prenom, nom: form.nom, email: form.email, telephone: form.telephone,
          date: form.date, heure: form.heure,
          passagers: form.passagers, poids_total: form.poids_total,
          commentaire: form.commentaire.trim() || null,
          style_vol:    styleMode,
          waypoints:    route.pois.map(p => ({ lat: p.lat, lng: p.lng, nom: p.nom })),
          stopovers:    selectedStops.map(s => ({ icao: s.icao, nom: s.nom, taxe: s.taxe, lat: s.lat ?? null, lng: s.lng ?? null })),
          distKm:       route.distKm,
          dureMin:      effectiveTotalMin,
          taxesEscales: taxesEscalesTotal,
          voucher_code: null,
          voucher_id:   null,
          coupon_code:  null,
          newsletter_opt_in: form.newsletter_opt_in,
        }),
      });
      const d = await r.json();
      if (!r.ok) { setSubmitError(d.error || "Erreur."); return; }
      setPhase("done");
    } catch { setSubmitError("Erreur réseau."); }
    finally { setSubmitting(false); }
  }

  // ── panelContent — contenu partagé sidebar desktop + drawer mobile
  function panelContent() {
    return (
      <>
        {/* Stats */}
        <div className="grid grid-cols-3 divide-x divide-border border-b border-border">
          {[
            { icon: <Clock size={9} />,  label: "TEMPS",
              main: effectiveTotalMin > 0
                ? (effectiveTotalMin >= 60 ? `${Math.floor(effectiveTotalMin/60)}h${String(effectiveTotalMin%60).padStart(2,"0")}` : `${effectiveTotalMin}`)
                : "—",
              sub: effectiveTotalMin >= 60 ? "heures" : effectiveTotalMin > 0 ? "min" : "",
            },
            { icon: <MapPin size={9} />, label: "DISTANCE",
              main: route.distKm > 0 ? `${route.distKm}` : "—",
              sub: route.distKm > 0 ? "km" : "",
            },
            { icon: <Star size={9} />,   label: "PRIX EST.",
              main: prixEstime > 0 ? `${prixEstime}` : "—",
              sub: prixEstime > 0 ? "€" : "",
            },
          ].map(({ icon, label, main, sub }) => (
            <div key={label} className="py-3 px-2 text-center">
              <p className="flex items-center justify-center gap-1 text-[7px] font-bold text-muted-foreground/60 uppercase tracking-[1.5px] mb-1.5">
                {icon}{label}
              </p>
              <p key={`${label}-${statsKey}`}
                className={`text-xl font-black text-foreground leading-none ${statsKey > 0 ? "animate-in zoom-in-90 fade-in duration-300" : ""}`}>
                {main}
              </p>
              {sub && <p className="text-[9px] text-muted-foreground mt-0.5">{sub}</p>}
            </div>
          ))}
        </div>

        {/* Timeline parcours */}
        <div className="px-5 py-4 border-b border-border">
          <h3 className="text-[9px] font-black text-foreground/40 uppercase tracking-[2px] mb-3">Votre parcours</h3>
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5">
              <div className="w-3 h-3 rounded-full bg-primary shrink-0 ring-4 ring-primary/15" />
              <div className="flex-1 flex items-center justify-between bg-secondary border border-border rounded-lg px-3.5 py-2.5">
                <span className="text-xs font-bold text-foreground">Charleroi (EBCI)</span>
                <span className="text-[9px] font-bold text-primary uppercase tracking-wide">Départ</span>
              </div>
            </div>
            {route.pois.length === 0 ? (
              <div className="flex items-center gap-2.5 py-1">
                <div className="w-3 h-3 rounded-full bg-border shrink-0" />
                <p className="text-[11px] text-muted-foreground italic">Cliquez sur la carte pour ajouter un lieu…</p>
              </div>
            ) : (
              route.pois.map(poi => (
                <div key={poi.id} className="flex items-center gap-2.5">
                  <div className="w-3 h-3 rounded-full bg-border shrink-0" />
                  <div className="flex-1 flex items-center justify-between bg-secondary border border-border rounded-lg px-3.5 py-2.5">
                    <span className="text-xs font-bold text-foreground truncate flex-1 min-w-0 mr-2">{poi.nom}</span>
                    <button onClick={() => mapRef.current?.removePOI(poi.id)}
                      className="shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-lg bg-muted hover:bg-red-50 text-muted-foreground hover:text-red-500 transition-all cursor-pointer border border-border hover:border-red-200">
                      <X size={12} />
                    </button>
                  </div>
                </div>
              ))
            )}
            {route.pois.length > 0 && (
              <div className="flex items-center gap-2.5">
                <div className="w-3 h-3 rounded-full bg-primary shrink-0 ring-4 ring-primary/15" />
                <div className="flex-1 flex items-center justify-between bg-secondary border border-border rounded-lg px-3.5 py-2.5">
                  <span className="text-xs font-bold text-foreground">Charleroi (EBCI)</span>
                  <span className="text-[9px] font-bold text-primary uppercase tracking-wide">Arrivée</span>
                </div>
              </div>
            )}
          </div>
          {route.pois.length > 0 && (
            <button type="button" onClick={() => mapRef.current?.clearAll()}
              className="mt-2 flex items-center gap-1.5 text-[11px] text-muted-foreground/60 hover:text-destructive transition-colors cursor-pointer">
              <Trash2 size={10} />Tout effacer
            </button>
          )}
        </div>

        {/* Recherche */}
        <div className="px-5 py-4 border-b border-border">
          <h3 className="text-[9px] font-black text-foreground/40 uppercase tracking-[2px] mb-3">Ajouter un lieu</h3>
          <div className="relative">
            <div className="flex items-center gap-2.5 h-10 px-3.5 border border-border rounded-lg bg-white focus-within:border-foreground/30 focus-within:shadow-sm transition-all">
              {panLoading
                ? <Loader2 size={13} className="text-muted-foreground/40 animate-spin shrink-0" />
                : <Search  size={13} className="text-muted-foreground/40 shrink-0" />
              }
              <input value={panQ} onChange={e => setPanQ(e.target.value)}
                placeholder="Ville, château, monument…"
                className="flex-1 text-sm bg-transparent text-foreground focus:outline-none placeholder:text-muted-foreground/45 min-w-0" />
              {panQ && (
                <button type="button" onClick={() => { setPanQ(""); setPanOpen(false); }}
                  className="cursor-pointer text-muted-foreground hover:text-foreground shrink-0">
                  <X size={12} />
                </button>
              )}
            </div>
            {panOpen && (panZones.length > 0 || panResults.length > 0) && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-border rounded-lg shadow-xl z-[600] overflow-hidden max-h-60 overflow-y-auto">
                {panZones.length > 0 && (
                  <>
                    <div className="px-3.5 py-1.5 border-b border-border bg-[#0b2238]/4">
                      <p className="text-[9px] font-black text-[#0b2238]/60 uppercase tracking-[2px]">Régions</p>
                    </div>
                    {panZones.map(z => (
                      <button key={z.id} type="button" onClick={() => addZoneResult(z)}
                        className="w-full flex items-center gap-2.5 px-3.5 py-2.5 hover:bg-primary/5 text-left transition-colors border-b border-border cursor-pointer">
                        <Route size={11} className="text-primary shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-bold text-foreground truncate">{z.nom}</p>
                          <p className="text-[11px] text-muted-foreground truncate">{z.description}</p>
                        </div>
                      </button>
                    ))}
                  </>
                )}
                {panResults.length > 0 && (
                  <>
                    {panZones.length > 0 && (
                      <div className="px-3.5 py-1.5 border-b border-border bg-muted/30">
                        <p className="text-[9px] font-black text-muted-foreground/60 uppercase tracking-[2px]">Lieux</p>
                      </div>
                    )}
                    {panResults.map(r => (
                      <button key={r.place_id} type="button" onClick={() => addFromSearch(r)}
                        className="w-full flex items-start gap-2.5 px-3.5 py-2.5 hover:bg-primary/5 text-left transition-colors border-b border-border last:border-0 cursor-pointer">
                        <MapPin size={11} className="text-muted-foreground shrink-0 mt-0.5" />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-bold text-foreground truncate">{r.display_name.split(",")[0]}</p>
                          <p className="text-[11px] text-muted-foreground truncate">{r.display_name.split(",").slice(1,3).join(", ")}</p>
                        </div>
                      </button>
                    ))}
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Escales */}
        {availableStops.length > 0 && (
          <div className="px-5 py-4 border-b border-border">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[9px] font-black text-foreground/40 uppercase tracking-[2px]">Escales</h3>
              {availableStops.some(s => !selectedStops.find(ss => ss.id === s.id)) && (
                <button type="button" onClick={() => setStopsOpen(v => !v)}
                  className="flex items-center gap-1.5 text-xs font-bold text-primary bg-primary/15 hover:bg-primary/25 border border-primary/25 px-3 py-1.5 rounded-lg transition-colors cursor-pointer">
                  <Plus size={12} />Ajouter
                </button>
              )}
            </div>
            {selectedStops.length > 0 && (
              <div className="space-y-1.5 mb-2">
                {selectedStops.map(s => (
                  <div key={s.id} className="flex items-center gap-2 bg-secondary rounded-lg px-2.5 py-1.5 border border-border">
                    <span className="font-mono text-[10px] font-bold text-[#0b2238] shrink-0">{s.icao}</span>
                    <span className="flex-1 text-[11px] text-foreground/70 truncate">{s.nom}</span>
                    {s.taxe > 0 && <span className="text-[10px] font-bold text-[#0b2238] shrink-0">+{s.taxe}€</span>}
                    <button type="button" onClick={() => removeStop(s.id)}
                      className="text-muted-foreground/40 hover:text-destructive transition-colors cursor-pointer shrink-0">
                      <X size={10} />
                    </button>
                  </div>
                ))}
              </div>
            )}
            {selectedStops.length === 0 && !stopsOpen && (
              <p className="text-[11px] text-muted-foreground italic">Aucune escale</p>
            )}
            {stopsOpen && (
              <div className="rounded-lg overflow-hidden border border-border mt-2">
                {availableStops
                  .filter(s => !selectedStops.find(ss => ss.id === s.id))
                  .map((s, i, arr) => (
                    <button key={s.id} type="button" onClick={() => addStop(s)}
                      className={`w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-primary/5 text-left transition-colors cursor-pointer ${i < arr.length - 1 ? "border-b border-border" : ""}`}>
                      <span className="font-mono text-[10px] font-bold text-[#0b2238] shrink-0 w-11">{s.icao}</span>
                      <span className="flex-1 text-[11px] text-foreground/80 truncate">{s.nom}</span>
                      {s.taxe > 0 && <span className="text-[10px] text-muted-foreground shrink-0">+{s.taxe}€</span>}
                    </button>
                  ))}
              </div>
            )}
          </div>
        )}

        {/* Prix estimé */}
        {totalAcompte > 0 && (
          <div className="px-5 py-4 border-b border-border">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Acompte estimé</span>
              <span className="text-2xl font-black text-foreground">{totalAcompte}&thinsp;€</span>
            </div>
            {taxesEscalesTotal > 0 && (
              <p className="text-[10px] text-muted-foreground text-right mt-0.5">
                vol {acompte}€ + taxes {taxesEscalesTotal}€
              </p>
            )}
          </div>
        )}

        {/* Notice légale */}
        <div className="px-5 py-4 flex items-start gap-2.5">
          <ShieldCheck size={13} className="text-muted-foreground/40 shrink-0 mt-0.5" />
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            Vol réalisé dans le cadre du partage des coûts. Assurance passagers incluse.
          </p>
        </div>
      </>
    );
  }

  // ── mapCta — bouton CTA épinglé
  function mapCta() {
    return (
      <>
        <button type="button"
          disabled={route.pois.length === 0}
          onClick={() => setPhase("booking")}
          className="w-full flex items-center justify-center gap-2.5 py-4 rounded-lg bg-primary text-primary-foreground text-[15px] font-black disabled:opacity-30 hover:brightness-105 transition-all cursor-pointer shadow-gold">
          Réserver ce vol <ArrowRight size={16} />
        </button>
        {route.pois.length === 0 && (
          <p className="text-center text-[10px] text-muted-foreground/40 mt-2">
            Ajoutez au moins un lieu pour continuer
          </p>
        )}
      </>
    );
  }

  // ── Calendar closed
  if (calendarClosed) {
    return (
      <div className="min-h-screen bg-[#f5f5f7] flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white border border-border rounded-2xl p-8 text-center space-y-4 shadow-sm">
          <p className="text-2xl font-black text-foreground">Réservations suspendues</p>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {closedMessage || "Les réservations sont temporairement suspendues. Contactez-nous pour toute demande."}
          </p>
          <Link href="/contact" className="inline-block mt-2 px-6 py-2.5 rounded-xl bg-[#0b2238] text-white text-sm font-bold hover:opacity-90 transition-opacity">
            Nous contacter
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f5f7]">
      <div className="h-[98px]" />

      {/* ══════════════════════ PHASE MAP ══════════════════════ */}
      {/* Toujours monté (CSS hidden) pour préserver les POIs Leaflet */}
      <div className={phase === "map" ? "relative flex flex-col" : "hidden"} style={{ height: "calc(100vh - 98px)" }}>
        <div className="flex-1 min-h-0 px-3 pb-[120px] lg:pb-3 pt-1.5 flex gap-3 overflow-hidden">

          {/* Gauche : carte */}
          <div className="flex-1 min-h-0 flex flex-col min-w-0">
            <div className="flex-1 min-h-0 relative rounded-[10px] shadow-[0_2px_16px_rgba(0,0,0,0.10)] border border-border overflow-hidden" style={{ isolation: "isolate" }}>

              <LeafletMapAdventure ref={mapRef} styleMode={styleMode} onRouteChange={setRoute} />

              {/* Barre de recherche overlay */}
              <div className="absolute top-3 left-0 right-0 flex justify-center z-[450] px-3 pointer-events-none">
                <div className="pointer-events-auto w-full max-w-lg flex items-center gap-2">
                  {/* Bouton retour intégré (mobile seulement) */}
                  <button type="button" onClick={() => goBackToGuide()}
                    className="lg:hidden flex items-center justify-center w-11 h-11 rounded-xl bg-white/95 border border-border shadow-md text-muted-foreground hover:text-foreground cursor-pointer transition-colors backdrop-blur-sm shrink-0">
                    <ChevronLeft size={16} />
                  </button>
                  <div className="relative flex-1 min-w-0">
                    <div className="flex items-center gap-2.5 h-11 rounded-xl px-3.5 bg-white border border-border shadow-md hover:border-foreground/20 backdrop-blur-sm transition-all focus-within:border-foreground/30 focus-within:shadow-lg">
                      {panLoading
                        ? <Loader2 size={15} className="text-primary animate-spin shrink-0" />
                        : <Search   size={15} className="text-primary shrink-0" />
                      }
                      <input value={panQ} onChange={e => setPanQ(e.target.value)}
                        placeholder="Ville, château, lac, monument…"
                        className="flex-1 bg-transparent text-sm font-medium text-foreground placeholder:text-muted-foreground/60 outline-none min-w-0"
                        autoComplete="off"
                      />
                      {panQ && (
                        <button type="button" onClick={() => { setPanQ(""); setPanOpen(false); }}
                          className="cursor-pointer text-muted-foreground hover:text-foreground shrink-0">
                          <X size={13} />
                        </button>
                      )}
                    </div>

                    {/* Hint quand aucun POI — desktop uniquement */}
                    {route.pois.length === 0 && !panQ && (
                      <div className="hidden lg:flex pointer-events-none absolute -bottom-8 left-0 right-0 justify-center">
                        <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#0b2238]/80 text-white/90 text-[10px] font-semibold backdrop-blur-sm whitespace-nowrap shadow-sm">
                          <MapPin size={9} className="text-primary shrink-0" />
                          Cherchez ici un lieu à survoler
                        </span>
                      </div>
                    )}

                    {/* Dropdown */}
                    {panOpen && (panZones.length > 0 || panResults.length > 0) && (
                      <div className="absolute top-full left-0 right-0 bg-white border border-border rounded-lg shadow-2xl z-[600] overflow-hidden mt-1.5 max-h-72 overflow-y-auto">
                        {panZones.length > 0 && (
                          <>
                            <div className="px-4 py-1.5 border-b border-border bg-[#0b2238]/4">
                              <p className="text-[9px] font-black text-[#0b2238]/60 uppercase tracking-[2px]">Régions</p>
                            </div>
                            {panZones.map(z => (
                              <button key={z.id} type="button" onClick={() => addZoneResult(z)}
                                className="w-full flex items-start gap-3 px-4 py-2.5 hover:bg-primary/5 text-left transition-colors border-b border-border cursor-pointer">
                                <Route size={12} className="text-primary shrink-0 mt-0.5" />
                                <div className="min-w-0 flex-1">
                                  <p className="text-sm font-bold text-foreground truncate">{z.nom}</p>
                                  <p className="text-[11px] text-muted-foreground truncate mt-0.5">{z.description}</p>
                                </div>
                              </button>
                            ))}
                          </>
                        )}
                        {panResults.length > 0 && (
                          <>
                            {panZones.length > 0 && (
                              <div className="px-4 py-1.5 border-b border-border bg-muted/30">
                                <p className="text-[9px] font-black text-muted-foreground/60 uppercase tracking-[2px]">Lieux</p>
                              </div>
                            )}
                            {panResults.map(r => (
                              <button key={r.place_id} type="button" onClick={() => addFromSearch(r)}
                                className="w-full flex items-start gap-3 px-4 py-3 hover:bg-primary/5 text-left transition-colors border-b border-border last:border-0 cursor-pointer">
                                <MapPin size={12} className="text-muted-foreground shrink-0 mt-0.5" />
                                <div className="min-w-0 flex-1">
                                  <p className="text-sm font-bold text-foreground truncate">{r.display_name.split(",")[0]}</p>
                                  <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                                    {r.display_name.split(",").slice(1,3).join(", ")}
                                  </p>
                                </div>
                              </button>
                            ))}
                          </>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Tout effacer */}
                  {route.pois.length > 0 && (
                    <button type="button" onClick={() => mapRef.current?.clearAll()}
                      className="flex items-center gap-1.5 h-10 px-3 rounded-lg border border-white/70 bg-white/95 text-xs font-semibold text-muted-foreground hover:text-destructive hover:border-destructive/30 transition-colors cursor-pointer shrink-0 backdrop-blur-sm shadow-md">
                      <Trash2 size={12} />
                      <span className="hidden sm:block">Tout effacer</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Bouton retour — desktop uniquement (mobile : dans la barre de recherche) */}
              <button type="button" onClick={() => goBackToGuide()}
                className="hidden lg:flex absolute top-3 left-3 z-[460] items-center gap-1.5 h-10 px-3 rounded-lg bg-white/95 border border-white/70 shadow-md text-sm font-semibold text-muted-foreground hover:text-foreground cursor-pointer transition-colors backdrop-blur-sm">
                <ChevronLeft size={15} />
                Retour
              </button>

              {/* Légende — desktop uniquement */}
              <div className="hidden lg:block absolute bottom-5 left-3 z-[400] pointer-events-none">
                <div className="bg-[#0b2238]/88 backdrop-blur-sm border border-white/12 rounded-xl px-3 py-2.5 space-y-1.5">
                  <p className="text-[#F2B705] text-[7px] font-black tracking-[2px] uppercase mb-2 leading-none">Légende</p>
                  {[
                    { icon: <span className="w-3 h-3 rounded-sm shrink-0 border border-dashed border-red-400" style={{ background: "rgba(239,68,68,0.45)" }} />, label: "Zone interdite (EBR)" },
                    { icon: <span className="w-3 h-3 rounded-full shrink-0 bg-[#F2B705] flex items-center justify-center text-[6px] font-black text-[#0b2238]">1</span>, label: "Lieu à survoler" },
                    { icon: <span className="w-3 h-3 rounded-[3px] shrink-0 bg-[#0b2238] border border-[#F2B705] flex items-center justify-center text-[7px]">✈</span>, label: "Escale" },
                    { icon: <span className="w-3 h-3 rounded-full shrink-0 bg-[#F2B705] flex items-center justify-center"><PlaneTakeoff size={7} className="text-[#0b2238]" /></span>, label: "Charleroi EBCI" },
                  ].map(({ icon, label }) => (
                    <div key={label} className="flex items-center gap-2">
                      <div className="flex items-center justify-center w-3 h-3 shrink-0">{icon}</div>
                      <span className="text-white/60 text-[9px] font-medium whitespace-nowrap">{label}</span>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </div>

          {/* Droite : sidebar desktop */}
          <div className="hidden lg:flex flex-col w-[360px] xl:w-[400px] shrink-0 card-premium overflow-hidden">
            <div className="px-6 pt-6 pb-5 border-b border-border">
              <button type="button" onClick={() => goBackToGuide()}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-3 cursor-pointer transition-colors">
                <ChevronLeft size={12} /> Vol sur mesure
              </button>
              <p className="text-[10px] font-black text-primary uppercase tracking-[3px] mb-1">Configurateur</p>
              <h2 className="text-xl font-black text-foreground leading-tight">Votre itinéraire</h2>
              <p className="text-xs text-muted-foreground leading-relaxed mt-1">
                Créez votre route et découvrez le prix en temps réel.
              </p>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto">
              {panelContent()}
            </div>
            <div className="shrink-0 px-5 py-5 bg-card border-t border-border">
              {mapCta()}
            </div>
          </div>

        </div>

        {/* ── Mobile bottom drawer ── */}
        <div
          className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border rounded-t-2xl shadow-[0_-4px_24px_rgba(0,0,0,0.10)] transition-[height] duration-300 ease-in-out overflow-hidden"
          style={{ height: drawerOpen ? "65vh" : "120px" }}
          onTouchStart={e => { touchStartY.current = e.touches[0].clientY; }}
          onTouchEnd={e => {
            const dy = touchStartY.current - e.changedTouches[0].clientY;
            if (dy > 40) setDrawerOpen(true);
            if (dy < -40) setDrawerOpen(false);
          }}
        >
          {/* Handle */}
          <button type="button" className="w-full flex items-center justify-center pt-2.5 pb-1 cursor-pointer"
            onClick={() => setDrawerOpen(v => !v)}>
            <div className="w-10 h-1 rounded-full bg-muted-foreground/25" />
          </button>

          {/* Collapsed */}
          {!drawerOpen && (
            <div className="px-4 pt-1">
              {route.pois.length > 0 ? (
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xs font-bold text-[#0b2238] shrink-0">
                      {route.pois.length} lieu{route.pois.length > 1 ? "x" : ""}
                    </span>
                    {effectiveTotalMin > 0 && (
                      <span className="text-xs text-muted-foreground truncate">· ≈{effectiveTotalMin} min · {route.distKm} km</span>
                    )}
                  </div>
                  {prixEstime > 0 && (
                    <span className="text-sm font-black text-[#0b2238] shrink-0">{prixEstime}&thinsp;€</span>
                  )}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground mb-3 text-center">
                  Appuyez sur la carte pour ajouter un lieu{" "}
                  <span className="font-semibold text-foreground">· ↑ Options</span>
                </p>
              )}
              <button type="button"
                disabled={route.pois.length === 0}
                onClick={() => setPhase("booking")}
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-lg bg-primary text-primary-foreground text-sm font-black disabled:opacity-40 cursor-pointer transition-all shadow-gold">
                {route.pois.length === 0 ? "Ajoutez un lieu sur la carte" : <>Réserver ce vol <ArrowRight size={15} /></>}
              </button>
            </div>
          )}

          {/* Expanded */}
          {drawerOpen && (
            <div className="flex flex-col overflow-hidden" style={{ height: "calc(65vh - 44px)" }}>
              <div className="flex-1 overflow-y-auto">
                {panelContent()}
              </div>
              <div className="px-4 pb-6 pt-3 border-t border-border shrink-0">
                <button type="button"
                  disabled={route.pois.length === 0}
                  onClick={() => { setDrawerOpen(false); setPhase("booking"); }}
                  className="w-full flex items-center justify-center gap-2 py-3.5 rounded-lg bg-primary text-primary-foreground text-sm font-black disabled:opacity-40 cursor-pointer transition-all shadow-gold">
                  {route.pois.length === 0 ? "Ajoutez un lieu sur la carte" : <>Réserver ce vol <ArrowRight size={15} /></>}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ══════════════════════ PHASE BOOKING ══════════════════════ */}
      {phase === "booking" && (
        <div className="max-w-[1100px] mx-auto px-4 sm:px-6 pt-1 sm:pt-8 pb-10">

          {/* Navigation */}
          <div className="flex items-center gap-3 mb-4 sm:mb-6">
            <button type="button" onClick={() => setPhase("map")}
              className="flex items-center gap-2 text-sm font-bold text-foreground cursor-pointer group shrink-0">
              <div className="w-9 h-9 rounded-lg border border-border flex items-center justify-center group-hover:bg-navy group-hover:border-navy transition-all">
                <ChevronLeft size={15} className="text-foreground group-hover:text-white transition-colors" />
              </div>
              <span className="hidden sm:block">Modifier l&apos;itinéraire</span>
            </button>
            <div className="flex-1 min-w-0 flex items-center gap-3 card-premium px-4 py-2.5 overflow-hidden">
              <PlaneTakeoff size={13} className="text-foreground shrink-0" />
              {/* Mobile : résumé compact */}
              <div className="sm:hidden flex items-center gap-2 text-xs flex-1 min-w-0">
                <span className="font-bold text-foreground shrink-0">
                  {route.pois.length} lieu{route.pois.length > 1 ? "x" : ""}
                </span>
                {effectiveTotalMin > 0 && (
                  <span className="text-muted-foreground truncate">
                    · {effectiveTotalMin >= 60
                      ? `${Math.floor(effectiveTotalMin/60)}h${String(effectiveTotalMin%60).padStart(2,"0")}`
                      : `${effectiveTotalMin} min`}
                  </span>
                )}
                {prixEstime > 0 && (
                  <span className="font-black text-foreground ml-auto shrink-0">{prixEstime}&thinsp;€</span>
                )}
              </div>
              {/* Desktop : itinéraire complet */}
              <div className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground flex-1 min-w-0 overflow-hidden">
                <span className="text-foreground font-bold shrink-0">Charleroi</span>
                {route.pois.map(p => (
                  <span key={p.id} className="flex items-center gap-1.5 shrink-0">
                    <ArrowRight size={9} className="text-muted-foreground/40" />
                    <span className="text-foreground/75 font-medium truncate max-w-[120px]">{p.nom}</span>
                  </span>
                ))}
                <ArrowRight size={9} className="text-muted-foreground/40 shrink-0" />
                <span className="text-foreground font-bold shrink-0">Charleroi</span>
              </div>
              {effectiveTotalMin > 0 && (
                <div className="hidden sm:flex items-center gap-3 shrink-0 border-l border-border pl-3">
                  <span className="text-foreground font-black text-sm">≈{effectiveTotalMin}&thinsp;min</span>
                  {prixEstime > 0 && <span className="text-muted-foreground text-xs font-semibold">{prixEstime}&thinsp;€</span>}
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col lg:flex-row gap-6 lg:items-start">
            {/* Formulaire */}
            <div className="flex-1 min-w-0 space-y-4">

              {/* Mobile — récap vol */}
              <div className="lg:hidden card-premium p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-[8px] font-black text-muted-foreground uppercase tracking-[2.5px] mb-1">Votre vol</p>
                    <p className="text-foreground font-black text-2xl leading-none">
                      {effectiveTotalMin > 0 ? `≈ ${effectiveTotalMin}` : "—"}
                      {effectiveTotalMin > 0 && <span className="text-base font-bold ml-1">min</span>}
                    </p>
                  </div>
                  {prixEstime > 0 && (
                    <div className="text-right">
                      <p className="text-[8px] font-black text-muted-foreground uppercase tracking-[2.5px] mb-1">Prix estimé</p>
                      <p className="text-primary font-black text-2xl leading-none">{prixEstime}&thinsp;€</p>
                    </div>
                  )}
                </div>
                {route.pois.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-2.5 border-t border-border">
                    {route.pois.map(p => (
                      <span key={p.id} className="bg-secondary border border-border text-foreground/70 text-[10px] font-semibold px-2.5 py-1 rounded-lg">{p.nom}</span>
                    ))}
                  </div>
                )}
              </div>

              {/* Calendrier */}
              <div className="card-premium overflow-hidden">
                <div className="px-6 pt-5 pb-4 border-b border-border">
                  <h2 className="text-[15px] font-black text-foreground">Quand souhaitez-vous voler ?</h2>
                </div>
                <div className="p-5">
                  <div className="flex items-center justify-between mb-4">
                    <button type="button"
                      onClick={() => { const ny = calMonth === 1 ? calYear-1 : calYear; const nm = calMonth === 1 ? 12 : calMonth-1; setCalYear(ny); setCalMonth(nm); loadMonth(ny, nm); }}
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-all border border-border cursor-pointer">
                      <ChevronLeft size={15} />
                    </button>
                    <span className="text-sm font-bold">{MONTHS_FR[calMonth - 1]} {calYear}</span>
                    <button type="button"
                      onClick={() => { const ny = calMonth === 12 ? calYear+1 : calYear; const nm = calMonth === 12 ? 1 : calMonth+1; setCalYear(ny); setCalMonth(nm); loadMonth(ny, nm); }}
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-all border border-border cursor-pointer">
                      <ChevronRight size={15} />
                    </button>
                  </div>
                  <div className="grid grid-cols-7 mb-1">
                    {DAYS_FR.map((d, i) => (
                      <div key={i} className="h-8 flex items-center justify-center text-[9px] font-bold text-muted-foreground uppercase tracking-wider">{d}</div>
                    ))}
                  </div>
                  {calLoading
                    ? <div className="flex items-center justify-center h-44"><Loader2 size={20} className="animate-spin text-muted-foreground/30" /></div>
                    : <div className="grid grid-cols-7 gap-0.5">{renderCalendar()}</div>
                  }
                  <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t border-border text-[10px] text-muted-foreground">
                    <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-primary" />Sélectionné</span>
                    <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full border-2 border-border" />Disponible</span>
                    <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-muted" />Indisponible</span>
                  </div>
                </div>
                {form.date && (
                  <div className="border-t border-border px-5 py-4">
                    {slotsLoading ? (
                      <div className="flex items-center justify-center py-4"><Loader2 size={18} className="animate-spin text-muted-foreground/30" /></div>
                    ) : slots.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Aucun créneau disponible. Essayez une autre date.</p>
                    ) : (
                      <div>
                        <p className="text-sm font-black text-foreground capitalize mb-3">{formattedDate}</p>
                        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                          {slots.map(s => (
                            <button key={s} type="button"
                              onClick={() => setForm(f => ({ ...f, heure: s }))}
                              className={[
                                "py-2.5 rounded-lg border text-sm font-bold transition-all text-center cursor-pointer",
                                form.heure === s
                                  ? "border-primary bg-primary text-primary-foreground shadow-sm"
                                  : "border-border text-foreground hover:border-primary/50 hover:bg-primary/5",
                              ].join(" ")}>{s}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Participants */}
              <div className="card-premium overflow-hidden">
                <div className="px-6 pt-5 pb-4 border-b border-border">
                  <h2 className="text-[15px] font-black text-foreground">Participants</h2>
                </div>
                <div className="p-5 space-y-5">
                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-3">Nombre de passagers</label>
                    <div className="flex gap-2.5">
                      {["1","2","3"].map(n => (
                        <button key={n} type="button"
                          onClick={() => setForm(f => ({ ...f, passagers: n }))}
                          className={[
                            "flex-1 py-3 rounded-lg border text-sm font-bold transition-all text-center cursor-pointer",
                            form.passagers === n
                              ? "border-primary bg-primary text-primary-foreground shadow-sm"
                              : "border-border text-foreground hover:border-primary/50 hover:bg-primary/5",
                          ].join(" ")}>
                          {n} {n === "1" ? "passager" : "passagers"}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-2">
                      Poids total estimé <span className="font-normal text-muted-foreground">(kg)</span>
                    </label>
                    <div className="flex items-center gap-3">
                      <input type="number" value={form.poids_total} min={1} max={500} placeholder="ex : 156"
                        onChange={e => setForm(f => ({ ...f, poids_total: e.target.value }))}
                        className="w-32 h-10 px-3 rounded-lg border border-border bg-input text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all placeholder:text-muted-foreground/40" />
                      <span className="text-sm text-muted-foreground">kg</span>
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">Utilisé uniquement pour préparer l&apos;équilibrage de l&apos;avion.</p>
                    {weightWarn && (
                      <div className="mt-2.5 flex items-start gap-2.5 bg-amber-50 border border-amber-200 px-3.5 py-3 rounded-lg text-sm text-amber-800">
                        <AlertTriangle size={14} className="shrink-0 mt-0.5 text-amber-500" />
                        <p>Le poids dépasse la limite recommandée de {MAX_WEIGHT} kg. Vous pouvez continuer votre demande, la faisabilité sera vérifiée avant de vous envoyer le lien de paiement.</p>
                      </div>
                    )}
                    {weightCrit && (
                      <div className="mt-2.5 flex items-start gap-2.5 bg-red-50 border border-red-200 px-3.5 py-3 rounded-lg text-sm text-red-800">
                        <AlertCircle size={14} className="shrink-0 mt-0.5 text-red-500" />
                        <p>Le poids total est très élevé ({CRIT_WEIGHT} kg+). Nous vous contacterons pour confirmer la faisabilité avant toute suite.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Coordonnées */}
              <div className="card-premium overflow-hidden">
                <div className="px-6 pt-5 pb-4 border-b border-border">
                  <h2 className="text-[15px] font-black text-foreground">Vos coordonnées</h2>
                </div>
                <div className="p-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <SimpleField label="Prénom" required value={form.prenom} onChange={v => setForm(f => ({ ...f, prenom: v }))} placeholder="Jean" />
                    <SimpleField label="Nom"    required value={form.nom}    onChange={v => setForm(f => ({ ...f, nom:    v }))} placeholder="Dupont" />
                    <div className="sm:col-span-2">
                      <SimpleField label="Email" required type="email" value={form.email} onChange={v => setForm(f => ({ ...f, email: v }))} placeholder="jean@exemple.com" />
                    </div>
                    <div className="sm:col-span-2">
                      <SimpleField label="Téléphone" type="tel" value={form.telephone} onChange={v => setForm(f => ({ ...f, telephone: v }))} placeholder="+32 4 12 34 56 78" />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-sm font-semibold text-foreground mb-1.5">Commentaire <span className="font-normal text-muted-foreground">(optionnel)</span></label>
                      <textarea value={form.commentaire} onChange={e => setForm(f => ({ ...f, commentaire: e.target.value }))}
                        placeholder="Demandes spéciales, occasion particulière…" rows={3}
                        className="w-full px-3.5 py-2.5 rounded-lg border border-border bg-input text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all placeholder:text-muted-foreground/40 resize-none" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Info prix */}
              {totalAcompte > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-xs text-amber-800 leading-relaxed space-y-1">
                  <p className="font-bold flex items-center gap-1.5"><Info size={11} className="shrink-0" />Vous ne payez rien maintenant</p>
                  <p>L&apos;acompte <strong>(≈ {totalAcompte} €)</strong> sera demandé après validation de votre itinéraire par Romain (sous 24 h). Intégralement remboursé si le vol est annulé pour météo ou plus de 48 h avant la date.</p>
                </div>
              )}

              {/* CGP + Newsletter */}
              <div className="space-y-3">
                <div className={`rounded-lg border-2 p-5 transition-all ${form.accept_cgp ? "bg-primary/5 border-primary/20" : "bg-card border-border"}`}>
                  <label className="flex items-start gap-3.5 cursor-pointer">
                    <div className={`mt-0.5 w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all ${form.accept_cgp ? "bg-primary border-primary" : "border-border bg-card"}`}>
                      {form.accept_cgp && <Check size={11} className="text-primary" />}
                      <input type="checkbox" checked={form.accept_cgp}
                        onChange={e => setForm(f => ({ ...f, accept_cgp: e.target.checked }))}
                        className="sr-only" />
                    </div>
                    <span className="text-sm text-foreground/70 leading-relaxed">
                      J&apos;accepte les{" "}
                      <Link href="/cgp" target="_blank" rel="noopener noreferrer"
                        className="text-foreground underline underline-offset-2 font-semibold hover:text-primary transition-colors">
                        Conditions Générales de Participation
                      </Link>{" "}
                      et que mes données soient utilisées pour traiter ma réservation.
                    </span>
                  </label>
                </div>
                <div className="rounded-lg border border-border p-4 bg-card">
                  <label className="flex items-start gap-3.5 cursor-pointer">
                    <div className={`mt-0.5 w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all ${form.newsletter_opt_in ? "bg-primary border-primary" : "border-border bg-card"}`}>
                      {form.newsletter_opt_in && <Check size={11} className="text-primary" />}
                      <input type="checkbox" checked={form.newsletter_opt_in}
                        onChange={e => setForm(f => ({ ...f, newsletter_opt_in: e.target.checked }))}
                        className="sr-only" />
                    </div>
                    <span className="text-sm text-foreground/70 leading-relaxed">
                      Je souhaite recevoir les actualités et offres de Fly Horizons par email.{" "}
                      <span className="text-foreground/40">(optionnel)</span>
                    </span>
                  </label>
                </div>
              </div>

              {submitError && (
                <div className="flex items-center gap-2.5 text-sm text-destructive bg-destructive/5 border border-destructive/20 px-4 py-3.5 rounded-lg">
                  <AlertCircle size={14} className="shrink-0" /> {submitError}
                </div>
              )}

              {/* Mobile CTA */}
              <div className="lg:hidden">
                <button type="button"
                  disabled={!form.date || !form.heure || !form.prenom || !form.nom || !form.email || !form.poids_total || !form.accept_cgp || submitting}
                  onClick={handleSubmit}
                  className="w-full flex items-center justify-center gap-2 py-4 rounded-lg bg-primary text-primary-foreground text-sm font-black disabled:opacity-40 transition-all cursor-pointer shadow-gold">
                  {submitting
                    ? <><Loader2 size={14} className="animate-spin" /> Envoi en cours…</>
                    : <><Mail size={14} /> Envoyer ma demande</>
                  }
                </button>
                <p className="text-center text-[10px] text-muted-foreground mt-3">
                  Aucun paiement maintenant. La provision sera demandée après validation.
                </p>
              </div>

            </div>

            {/* Sidebar droite desktop */}
            <div className="hidden lg:block lg:w-[280px] xl:w-[300px] shrink-0 sticky top-28 self-start space-y-4">
              <div className="card-premium p-5 space-y-3">
                <p className="text-[10px] font-bold text-primary uppercase tracking-[2px]">Votre vol</p>
                <div className="space-y-2 text-sm">
                  {route.pois.length > 0 && (
                    <div className="flex items-start gap-2">
                      <PlaneLanding size={12} className="text-muted-foreground shrink-0 mt-0.5" />
                      <div className="flex flex-wrap gap-1">
                        {route.pois.map(p => (
                          <span key={p.id} className="bg-secondary border border-border text-foreground/70 text-[10px] font-semibold px-2 py-0.5 rounded-md">{p.nom}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  {effectiveTotalMin > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Durée estimée</span>
                      <span className="font-bold">≈ {effectiveTotalMin} min</span>
                    </div>
                  )}
                  {route.distKm > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Distance</span>
                      <span className="font-bold">{route.distKm} km</span>
                    </div>
                  )}
                  {totalAcompte > 0 && (
                    <div className="flex justify-between pt-2 border-t border-border">
                      <span className="font-black text-foreground">Acompte estimé</span>
                      <span className="font-black text-lg">{totalAcompte}&thinsp;€</span>
                    </div>
                  )}
                </div>
                <div className="pt-2 border-t border-border space-y-1.5">
                  {[
                    { ok: !!form.date && !!form.heure, label: "Date & heure sélectionnées" },
                    { ok: !!form.poids_total,          label: "Poids renseigné" },
                    { ok: !!form.prenom && !!form.nom && !!form.email, label: "Coordonnées complètes" },
                    { ok: form.accept_cgp,             label: "CGP acceptées" },
                  ].map(({ ok, label }) => (
                    <div key={label} className={`flex items-center gap-2 text-xs transition-colors ${ok ? "text-green-600 font-medium" : "text-muted-foreground/50"}`}>
                      <div className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 border transition-all ${ok ? "border-green-300 bg-green-50" : "border-border bg-white"}`}>
                        <CheckCircle size={9} className={ok ? "text-green-500" : "text-muted-foreground/25"} />
                      </div>
                      {label}
                    </div>
                  ))}
                </div>
              </div>

              <button type="button"
                disabled={!form.date || !form.heure || !form.prenom || !form.nom || !form.email || !form.poids_total || !form.accept_cgp || submitting}
                onClick={handleSubmit}
                className="w-full flex items-center justify-center gap-2 py-4 rounded-lg bg-primary text-primary-foreground text-sm font-black disabled:opacity-40 hover:brightness-105 transition-all shadow-gold cursor-pointer">
                {submitting
                  ? <><Loader2 size={14} className="animate-spin" /> Envoi en cours…</>
                  : <><Mail size={14} /> Envoyer ma demande</>
                }
              </button>
              <p className="text-center text-[10px] text-muted-foreground">
                Aucun paiement maintenant. La provision sera demandée après validation.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════ PHASE DONE ══════════════════════ */}
      {phase === "done" && (
        <div className="max-w-lg mx-auto px-4 py-12 pb-16">
          <div className="space-y-4">

            <div className="card-premium p-5">
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                  <CheckCircle className="text-green-600" size={16} />
                </div>
                <div>
                  <p className="text-sm font-bold text-foreground">Votre aventure est réservée !</p>
                  <p className="text-[10px] text-muted-foreground">Email envoyé à {form.email}</p>
                </div>
              </div>

              <div className="mb-4 bg-[#f5f8ff] border border-[#0b2238]/10 rounded-lg px-4 py-3">
                <div className="flex items-start gap-2.5">
                  <Info size={13} className="text-[#0b2238] mt-0.5 shrink-0" />
                  <p className="text-xs text-[#0b2238]/80 leading-relaxed">
                    Notre pilote analyse votre demande et vous envoie la route définitive sous 24&nbsp;h.{" "}
                    <strong>La provision{acompte > 0 ? ` (≈ ${acompte} €)` : ""} ne sera demandée qu&apos;après votre validation.</strong>
                  </p>
                </div>
              </div>

              <div className="space-y-0">
                {[
                  { num: 1, done: true,  title: "Demande envoyée", desc: "Votre itinéraire et vos informations ont bien été enregistrés." },
                  { num: 2, done: false, title: "Notre pilote analyse votre route", desc: "Dans les 24 h, la faisabilité de votre itinéraire est étudiée. Si certaines zones ne peuvent pas être survolées, nous proposons des alternatives." },
                  { num: 3, done: false, title: "Validation & règlement de la provision", desc: `Vous recevez la route définitive par email. Après votre accord, un lien de paiement vous est envoyé pour la provision${acompte > 0 ? ` (≈ ${acompte} €)` : ""} et confirmer le créneau.` },
                  { num: 4, done: false, title: "À vous le ciel", desc: "Présentez-vous 15 min avant à Charleroi (EBCI). Briefing sécurité, casques audio fournis." },
                ].map(({ num, done, title, desc }, i, arr) => (
                  <div key={num} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${done ? "bg-green-500" : "bg-[#F2B705]"}`}>
                        {done
                          ? <CheckCircle size={13} className="text-white" />
                          : <span className="font-black text-[#0b2238] text-xs leading-none">{num}</span>
                        }
                      </div>
                      {i < arr.length - 1 && <div className="w-px bg-border mt-1" style={{ height: 28 }} />}
                    </div>
                    <div className="pb-4">
                      <p className={`text-sm font-bold ${done ? "text-green-700" : "text-foreground"}`}>{title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="card-premium p-5 space-y-3">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[2px]">Informations pratiques</p>
              <div className="flex items-start gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-secondary border border-border flex items-center justify-center shrink-0">
                  <MapPin size={13} className="text-foreground" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-foreground">Aéroport de Charleroi (EBCI)</p>
                  <p className="text-xs text-muted-foreground">Rue des Frères Wright 8, Gosselies · Arrivez 15 min avant</p>
                </div>
              </div>
              <a href="/access-ebci"
                className="flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-secondary border border-border text-foreground rounded-lg text-xs font-semibold hover:bg-navy hover:text-white hover:border-navy transition-all">
                <MapPin size={12} />Plan d&apos;accès à l&apos;aéroport
              </a>
              <div className="flex items-start gap-2.5 pt-2 border-t border-border">
                <div className="w-7 h-7 rounded-lg bg-secondary border border-border flex items-center justify-center shrink-0">
                  <CloudRain size={13} className="text-muted-foreground" />
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  <strong className="text-foreground">Météo :</strong> si les conditions ne permettent pas de voler, le vol est reporté sans frais. La décision est prise jusqu&apos;à 2 h avant.
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <a href="/account#reservations"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg text-sm font-bold hover:brightness-105 transition-all shadow-gold">
                <CalendarDays size={15} />Suivre ma réservation
              </a>
              <button type="button"
                onClick={() => {
                  setPhase("map");
                  setRoute({ pois: [], distKm: 0, transitMin: 0, obsMin: 0, totalMin: 0 });
                  setForm(f => ({ ...f, date: "", heure: "", commentaire: "" }));
                  mapRef.current?.clearAll();
                }}
                className="inline-flex items-center justify-center px-6 py-2.5 rounded-lg border border-border text-sm font-medium text-muted-foreground hover:bg-secondary transition-colors cursor-pointer">
                Créer un nouveau vol
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}

// ── SimpleField ────────────────────────────────────────────────────
function SimpleField({ label, required, type = "text", value, onChange, placeholder }: {
  label: string; required?: boolean; type?: string;
  value: string; onChange: (v: string) => void; placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-semibold text-foreground mb-1.5">
        {label}{required && <span className="text-destructive ml-0.5">*</span>}
      </label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className="w-full h-10 px-3.5 rounded-lg border border-border bg-input text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all placeholder:text-muted-foreground/40" />
    </div>
  );
}
