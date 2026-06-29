"use client";

import dynamic from "next/dynamic";
import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  MapPin, Search, X, ArrowRight, Check, Loader2, PlaneTakeoff,
  Lock, AlertCircle, AlertTriangle, CloudRain, CheckCircle, Info, Clock,
  ChevronLeft, ChevronRight, ChevronDown, ChevronUp,
  Building2, Landmark, Heart,
} from "lucide-react";
import type {
  AdventureRouteData, AdventureMapHandle,
} from "@/components/vol-sur-mesure/LeafletMapAdventure";

const LeafletMapAdventure = dynamic(
  () => import("@/components/vol-sur-mesure/LeafletMapAdventure"),
  { ssr: false }
);

// ── Presets ──────────────────────────────────────────────────────
const PRESET_VILLES = [
  { id: "namur",  nom: "Namur",  sous: "Citadelle & Meuse",         lat: 50.4636, lng: 4.8666 },
  { id: "dinant", nom: "Dinant", sous: "Rocher Bayard & falaises",  lat: 50.2611, lng: 4.9122 },
  { id: "liege",  nom: "Liège",  sous: "Centre historique & Meuse", lat: 50.6330, lng: 5.5669 },
  { id: "mons",   nom: "Mons",   sous: "Beffroi UNESCO",            lat: 50.4541, lng: 3.9523 },
] as const;

const PRESET_MONUMENTS = [
  { id: "lion-waterloo",  nom: "Lion de Waterloo",  sous: "Champ de bataille 1815",       lat: 50.4099, lng: 4.3815 },
  { id: "abbaye-villers", nom: "Abbaye de Villers",  sous: "Ruines XIIe siècle",           lat: 50.5724, lng: 4.5298 },
  { id: "chateau-modave", nom: "Château de Modave",  sous: "Baroque sur éperon rocheux",   lat: 50.4491, lng: 5.2983 },
  { id: "chateau-freyr",  nom: "Château de Freÿr",   sous: "Renaissance au bord de Meuse", lat: 50.2280, lng: 4.8970 },
] as const;

const MONTHS_FR = ["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"];
const DAYS_FR   = ["Lun","Mar","Mer","Jeu","Ven","Sam","Dim"];

// Restreint Nominatim à l'Europe (rayon ~1 000 km autour de la Belgique)
const NOMINATIM_EU = "countrycodes=be,fr,de,nl,lu,gb,ie,es,pt,it,at,ch,dk,se,no,pl,cz,sk,hu,ro,bg,gr,hr,si,lt,lv,ee,fi,me,rs,ba,al,mk";

// ── Types ─────────────────────────────────────────────────────────
type Phase     = "guide" | "map" | "booking" | "done";
type GuideStep = 1 | 2 | 3;

interface Waypoint { id: string; nom: string; sous?: string; lat: number; lng: number }
interface Stopover { id: string; icao: string; nom: string; taxe: number }
interface NominatimResult { place_id: number; display_name: string; lat: string; lon: string }

// ── Page ──────────────────────────────────────────────────────────
export default function VolSurMesurePage() {
  const mapRef         = useRef<AdventureMapHandle | null>(null);
  const initWpRef      = useRef<Waypoint[]>([]); // waypoints to feed map on enter

  // Settings
  const [prixHeure,      setPrixHeure]      = useState(254);
  const [acompteH,       setAcompteH]       = useState(300);
  const [calendarClosed, setCalendarClosed] = useState(false);
  const [closedMessage,  setClosedMessage]  = useState("");

  // Phase + guide
  const [phase,      setPhase]      = useState<Phase>("guide");
  const [guideStep,  setGuideStep]  = useState<GuideStep>(1);
  const [waypoints,  setWaypoints]  = useState<Waypoint[]>([]);

  // Guide search (shared across steps, reset on step change)
  const [adQ,       setAdQ]       = useState("");
  const [adResults, setAdResults] = useState<NominatimResult[]>([]);
  const [adLoading, setAdLoading] = useState(false);
  const [adOpen,    setAdOpen]    = useState(false);

  // Map / route
  const [route, setRoute] = useState<AdventureRouteData>({
    pois: [], distKm: 0, transitMin: 0, obsMin: 0, totalMin: 0,
  });
  const [drawerOpen, setDrawerOpen] = useState(true);

  // Panel search
  const [panQ,       setPanQ]       = useState("");
  const [panResults, setPanResults] = useState<NominatimResult[]>([]);
  const [panLoading, setPanLoading] = useState(false);
  const [panOpen,    setPanOpen]    = useState(false);

  // Escales
  const [availableStops, setAvailableStops] = useState<Stopover[]>([]);
  const [selectedStops,  setSelectedStops]  = useState<Stopover[]>([]);
  const [stopsOpen,      setStopsOpen]      = useState(false);

  // Calendar
  const today = new Date();
  const [calYear,       setCalYear]       = useState(today.getFullYear());
  const [calMonth,      setCalMonth]      = useState(today.getMonth() + 1);
  const [availableDays, setAvailableDays] = useState<string[]>([]);
  const [calLoading,    setCalLoading]    = useState(false);
  const [selectedDate,  setSelectedDate]  = useState("");
  const [selectedTime,  setSelectedTime]  = useState("");
  const [slots,         setSlots]         = useState<string[]>([]);
  const [slotsLoading,  setSlotsLoading]  = useState(false);

  // Form
  const [form, setForm] = useState({
    passagers: "2", poids_total: "", poids_unknown: false,
    prenom: "", nom: "", email: "", telephone: "",
    commentaire: "", accept_cgp: false, newsletter_opt_in: false,
  });
  const [submitting,  setSubmitting]  = useState(false);
  const [submitError, setSubmitError] = useState("");

  // ── Settings ──────────────────────────────────────────────────
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
    sb.from("stopovers").select("id, icao, nom, taxe").eq("actif", true).order("nom")
      .then(({ data }) => setAvailableStops((data ?? []) as Stopover[]));
    fetch("/api/site-settings")
      .then(r => r.json())
      .then(d => { if (d.calendar_closed === "true") { setCalendarClosed(true); setClosedMessage(d.calendar_closed_message ?? ""); } })
      .catch(() => {});
  }, []);

  // ── Map init: invalidateSize + load initial waypoints ─────────
  useEffect(() => {
    if (phase !== "map") return;
    // invalidateSize after hidden → visible transition
    const t1 = setTimeout(() => mapRef.current?.invalidateSize(), 80);
    const wps = initWpRef.current;
    if (!wps.length) return () => clearTimeout(t1);
    // Give Leaflet time to recover from hidden state
    const t2 = setTimeout(() => {
      if (!mapRef.current) return;
      mapRef.current.clearAll();
      wps.forEach(wp => mapRef.current?.addPOI({ id: wp.id, lat: wp.lat, lng: wp.lng, nom: wp.nom }));
    }, 350);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [phase]);

  // ── Reset search on guide step change ────────────────────────
  useEffect(() => { setAdQ(""); setAdResults([]); setAdOpen(false); }, [guideStep]);

  // ── Guide search ─────────────────────────────────────────────
  useEffect(() => {
    if (adQ.trim().length < 2) { setAdResults([]); setAdOpen(false); return; }
    const t = setTimeout(async () => {
      setAdLoading(true);
      try {
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(adQ)}&limit=5&accept-language=fr&${NOMINATIM_EU}`;
        const d   = await (await fetch(url, { headers: { "Accept-Language": "fr" } })).json() as NominatimResult[];
        const seen = new Set<string>();
        const uniq = d.filter(i => { const k = i.display_name.split(",")[0].trim().toLowerCase(); return seen.has(k) ? false : (seen.add(k), true); });
        setAdResults(uniq); setAdOpen(uniq.length > 0);
      } catch { /* ignore */ } finally { setAdLoading(false); }
    }, 400);
    return () => clearTimeout(t);
  }, [adQ]);

  // ── Panel search ─────────────────────────────────────────────
  useEffect(() => {
    if (panQ.trim().length < 2) { setPanResults([]); setPanOpen(false); return; }
    const t = setTimeout(async () => {
      setPanLoading(true);
      try {
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(panQ)}&limit=5&accept-language=fr&${NOMINATIM_EU}`;
        const d   = await (await fetch(url, { headers: { "Accept-Language": "fr" } })).json() as NominatimResult[];
        const seen = new Set<string>();
        const uniq = d.filter(i => { const k = i.display_name.split(",")[0].trim().toLowerCase(); return seen.has(k) ? false : (seen.add(k), true); });
        setPanResults(uniq); setPanOpen(uniq.length > 0);
      } catch { /* ignore */ } finally { setPanLoading(false); }
    }, 400);
    return () => clearTimeout(t);
  }, [panQ]);

  // ── Calendar ─────────────────────────────────────────────────
  const dureForCal = Math.max(30, route.totalMin);

  const loadMonth = useCallback(async (y: number, m: number) => {
    setCalLoading(true);
    try {
      const r = await fetch(`/api/reservation/month?year=${y}&month=${m}&duree=${dureForCal}`);
      setAvailableDays((await r.json()).available ?? []);
    } finally { setCalLoading(false); }
  }, [dureForCal]);

  useEffect(() => {
    if (phase !== "booking") return;
    let cancelled = false;
    async function findFirst() {
      setCalLoading(true);
      const sy = today.getFullYear(), sm = today.getMonth() + 1;
      for (let offset = 0; offset < 6; offset++) {
        let m = sm + offset, y = sy;
        while (m > 12) { m -= 12; y++; }
        try {
          const r = await fetch(`/api/reservation/month?year=${y}&month=${m}&duree=${dureForCal}`);
          if (cancelled) return;
          const available = (await r.json()).available ?? [];
          if (available.length > 0 || offset === 5) { setCalYear(y); setCalMonth(m); setAvailableDays(available); setCalLoading(false); return; }
        } catch { if (!cancelled) setCalLoading(false); return; }
      }
      if (!cancelled) setCalLoading(false);
    }
    findFirst();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  useEffect(() => {
    if (!selectedDate) { setSlots([]); return; }
    setSlotsLoading(true);
    fetch(`/api/reservation/slots?date=${selectedDate}&duree=${dureForCal}`)
      .then(r => r.json()).then(d => setSlots(d.slots ?? []))
      .finally(() => setSlotsLoading(false));
  }, [selectedDate, dureForCal]);

  // ── Helpers ──────────────────────────────────────────────────
  function toggleWaypoint(wp: Waypoint) {
    setWaypoints(prev => prev.some(w => w.id === wp.id) ? prev.filter(w => w.id !== wp.id) : [...prev, wp]);
  }

  function selectFromGuideSearch(r: NominatimResult) {
    const nom = r.display_name.split(",")[0].trim();
    toggleWaypoint({ id: `nom-${r.place_id}`, nom, sous: r.display_name.split(",").slice(1,3).join(",").trim(), lat: parseFloat(r.lat), lng: parseFloat(r.lon) });
    setAdQ(""); setAdResults([]); setAdOpen(false);
  }

  function goToMap() {
    initWpRef.current = [...waypoints];
    setPhase("map");
  }

  function backToGuide() {
    if (route.pois.length > 0) setWaypoints(route.pois.map(p => ({ id: p.id, nom: p.nom, lat: p.lat, lng: p.lng })));
    initWpRef.current = [];
    setPhase("guide");
  }

  function advanceGuide() {
    if (guideStep < 3) setGuideStep(s => (s + 1) as GuideStep);
    else goToMap();
  }

  function removeFromMap(id: string) { mapRef.current?.removePOI(id); }

  function addFromPanelSearch(r: NominatimResult) {
    mapRef.current?.addPOI({ id: `s-${r.place_id}`, nom: r.display_name.split(",")[0].trim(), lat: parseFloat(r.lat), lng: parseFloat(r.lon) });
    setPanQ(""); setPanResults([]); setPanOpen(false);
  }

  function toggleStop(stop: Stopover) {
    setSelectedStops(prev => prev.some(s => s.id === stop.id) ? prev.filter(s => s.id !== stop.id) : [...prev, stop]);
  }

  // ── Price ────────────────────────────────────────────────────
  const totalMin     = route.totalMin;
  const prixEstime   = totalMin > 0 ? Math.round((prixHeure / 60) * totalMin) : 0;
  const acompte      = totalMin > 0 ? Math.round((acompteH  / 60) * totalMin) : 0;
  const taxesEscales = selectedStops.reduce((acc, s) => acc + s.taxe, 0);
  const totalAcompte = acompte + taxesEscales;
  const weightKg   = parseInt(form.poids_total) || 0;
  const weightWarn = weightKg > 190 && weightKg < 250;
  const weightCrit = weightKg >= 250;

  // ── Calendar grid ────────────────────────────────────────────
  function renderCalendar() {
    const firstDay = new Date(calYear, calMonth - 1, 1).getDay();
    const offset   = firstDay === 0 ? 6 : firstDay - 1;
    const days     = new Date(calYear, calMonth, 0).getDate();
    const cells    = [];
    for (let i = 0; i < offset; i++) cells.push(<div key={`e${i}`} />);
    for (let d = 1; d <= days; d++) {
      const ds      = `${calYear}-${String(calMonth).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
      const isAvail = availableDays.includes(ds);
      const isSel   = selectedDate === ds;
      const isPast  = new Date(ds + "T12:00:00Z") < today;
      cells.push(
        <button key={d} type="button" disabled={!isAvail || isPast}
          onClick={() => { setSelectedDate(ds); setSelectedTime(""); }}
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

  const formattedDate = selectedDate
    ? new Date(selectedDate + "T12:00:00Z").toLocaleDateString("fr-BE", { weekday: "long", day: "numeric", month: "long" })
    : null;

  // ── Submit ───────────────────────────────────────────────────
  async function handleSubmit() {
    setSubmitting(true); setSubmitError("");
    try {
      const r = await fetch("/api/vol-sur-mesure/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prenom:      form.prenom.trim(),
          nom:         form.nom.trim(),
          email:       form.email.trim(),
          telephone:   form.telephone.trim() || null,
          date:        selectedDate,
          heure:       selectedTime,
          passagers:   form.passagers,
          poids_total: form.poids_unknown ? null : (form.poids_total || null),
          commentaire: form.commentaire.trim() || null,
          style_vol:   null,
          waypoints:   route.pois.map(p => ({ lat: p.lat, lng: p.lng, nom: p.nom })),
          stopovers:   selectedStops.map(({ id, icao, nom, taxe }) => ({ id, icao, nom, taxe })),
          distKm:      route.distKm,
          dureMin:     Math.max(30, totalMin),
          taxesEscales,
          voucher_code: null, voucher_id: null, coupon_code: null,
          newsletter_opt_in: form.newsletter_opt_in,
        }),
      });
      const d = await r.json();
      if (!r.ok) { setSubmitError(d.error || "Erreur."); return; }
      setPhase("done");
    } catch { setSubmitError("Erreur réseau, réessayez."); }
    finally  { setSubmitting(false); }
  }

  // ── Panel content (closure) ───────────────────────────────────
  function panelContent() {
    return (
      <div className="p-4 pb-8 space-y-5">

        {/* Summary */}
        {totalMin > 0 ? (
          <div className="bg-[#f5f5f7] rounded-xl px-4 py-3.5 flex items-center gap-4">
            <div className="flex-1">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[1.5px] mb-0.5">Itinéraire estimé</p>
              <div className="flex items-baseline gap-1.5">
                <span className="text-xl font-black text-foreground">≈ {prixEstime} €</span>
                <span className="text-[11px] text-muted-foreground">total</span>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm font-bold text-foreground">{totalMin} min</p>
              <p className="text-[11px] text-muted-foreground">{route.distKm.toFixed(0)} km</p>
            </div>
          </div>
        ) : (
          <div className="bg-[#f5f5f7] rounded-xl px-4 py-3 text-center">
            <p className="text-[11px] text-muted-foreground">Ajoutez des lieux pour voir l'estimation</p>
          </div>
        )}

        {/* Waypoints */}
        <div>
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[1.5px] mb-2">
            Étapes{route.pois.length > 0 ? ` (${route.pois.length})` : ""}
          </p>
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 px-3 py-2 bg-[#0b2238]/6 rounded-lg">
              <PlaneTakeoff size={11} className="text-[#0b2238] shrink-0" />
              <span className="text-xs font-semibold text-[#0b2238]">Départ — Charleroi EBCI</span>
            </div>
            {route.pois.map((poi, i) => (
              <div key={poi.id} className="flex items-center gap-2.5 px-3 py-2 bg-card border border-border rounded-lg group">
                <span className="w-4 h-4 rounded-full bg-primary/15 text-[9px] font-black text-primary flex items-center justify-center shrink-0">{i + 1}</span>
                <span className="text-xs font-medium text-foreground flex-1 truncate">{poi.nom}</span>
                <button type="button" onClick={() => removeFromMap(poi.id)}
                  className="opacity-0 group-hover:opacity-100 w-5 h-5 rounded flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all cursor-pointer shrink-0">
                  <X size={11} />
                </button>
              </div>
            ))}
            {route.pois.length === 0 && (
              <p className="text-xs text-muted-foreground/60 px-3 py-2 italic">Cliquez sur la carte ou cherchez ci-dessous</p>
            )}
            <div className="flex items-center gap-2 px-3 py-2 bg-[#0b2238]/6 rounded-lg">
              <PlaneTakeoff size={11} className="text-[#0b2238] shrink-0 rotate-180" />
              <span className="text-xs font-semibold text-[#0b2238]">Retour — Charleroi EBCI</span>
            </div>
          </div>
        </div>

        {/* Add place */}
        <div>
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[1.5px] mb-2">Ajouter un lieu</p>
          <div className="relative">
            <div className="flex items-center gap-2 h-10 px-3 border border-border rounded-xl bg-card focus-within:border-primary transition-colors">
              <Search size={13} className="text-muted-foreground shrink-0" />
              <input value={panQ} onChange={e => setPanQ(e.target.value)} placeholder="Ville, monument, adresse…"
                className="flex-1 text-xs bg-transparent text-foreground focus:outline-none placeholder:text-muted-foreground/40" />
              {panLoading ? <Loader2 size={12} className="animate-spin text-muted-foreground shrink-0" />
                : panQ && <button type="button" onClick={() => { setPanQ(""); setPanResults([]); setPanOpen(false); }} className="cursor-pointer text-muted-foreground hover:text-foreground shrink-0"><X size={12} /></button>}
            </div>
            {panOpen && panResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-xl shadow-premium z-50 overflow-hidden max-h-44 overflow-y-auto">
                {panResults.map(r => (
                  <button key={r.place_id} type="button" onClick={() => addFromPanelSearch(r)}
                    className="w-full text-left px-3 py-2 text-xs hover:bg-secondary transition-colors cursor-pointer border-b border-border last:border-0">
                    <p className="font-semibold text-foreground truncate">{r.display_name.split(",")[0]}</p>
                    <p className="text-muted-foreground text-[10px] truncate">{r.display_name.split(",").slice(1,3).join(",")}</p>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Escales */}
        {availableStops.length > 0 && (
          <div>
            <button type="button" onClick={() => setStopsOpen(!stopsOpen)}
              className="flex items-center justify-between w-full text-[10px] font-bold text-muted-foreground uppercase tracking-[1.5px] mb-2 cursor-pointer hover:text-foreground transition-colors">
              <span>Escales{selectedStops.length > 0 ? ` · ${selectedStops.length}` : ""}</span>
              {stopsOpen ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
            </button>
            {stopsOpen && (
              <div className="space-y-2">
                <p className="text-[11px] text-muted-foreground leading-relaxed">Atterrissage sur un aérodrome intermédiaire — taxes de piste incluses.</p>
                {availableStops.map(stop => {
                  const sel = selectedStops.some(s => s.id === stop.id);
                  return (
                    <button key={stop.id} type="button" onClick={() => toggleStop(stop)}
                      className={["w-full flex items-center justify-between px-3 py-2.5 rounded-lg border text-xs transition-all cursor-pointer", sel ? "border-primary bg-primary/5" : "border-border bg-card hover:border-primary/30"].join(" ")}>
                      <div className="flex items-center gap-2.5">
                        <div className={`w-4 h-4 rounded flex items-center justify-center shrink-0 ${sel ? "bg-primary" : "border border-border"}`}>
                          {sel && <Check size={9} className="text-[#0b2238]" />}
                        </div>
                        <div className="text-left">
                          <p className="font-semibold text-foreground">{stop.nom}</p>
                          <p className="text-muted-foreground text-[10px]">{stop.icao}</p>
                        </div>
                      </div>
                      <span className="text-primary font-bold shrink-0">+{stop.taxe} €</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Price breakdown */}
        {totalMin > 0 && (
          <div className="bg-[#f5f5f7] rounded-xl px-4 py-3.5 space-y-2">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[1.5px]">Provision demandée</p>
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Vol ~{totalMin} min <span className="text-foreground/30">(≈ {prixEstime} € total)</span></span>
                <span className="font-semibold shrink-0 ml-1">{acompte} €</span>
              </div>
              {selectedStops.map(s => (
                <div key={s.id} className="flex justify-between text-xs"><span className="text-muted-foreground">Escale {s.nom}</span><span className="font-semibold">+{s.taxe} €</span></div>
              ))}
              <div className="border-t border-border pt-1.5 flex justify-between text-sm font-black"><span>Total provision</span><span className="text-primary">{totalAcompte} €</span></div>
            </div>
            <p className="text-[10px] text-muted-foreground leading-relaxed">Déduite du prix final · remboursée si annulation météo · demandée après accord de Romain.</p>
          </div>
        )}

      </div>
    );
  }

  function mapCta() {
    return (
      <div className="px-4 pb-4 pt-3">
        <button type="button" disabled={route.pois.length === 0} onClick={() => setPhase("booking")}
          className="w-full h-12 rounded-xl bg-[#F2B705] text-[#0b2238] text-sm font-black flex items-center justify-center gap-2 disabled:opacity-30 hover:bg-[#e6a800] transition-colors cursor-pointer shadow-[0_4px_14px_rgba(242,183,5,0.28)]">
          Réserver ce vol <ArrowRight size={15} />
        </button>
        {route.pois.length === 0 && <p className="text-center text-[11px] text-muted-foreground/50 mt-2">Ajoutez au moins un lieu</p>}
      </div>
    );
  }

  // ── Calendar closed ───────────────────────────────────────────
  if (calendarClosed) {
    return (
      <div className="min-h-screen bg-[#f5f5f7] flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white border border-border rounded-2xl p-8 text-center space-y-4 shadow-sm">
          <p className="text-2xl font-black text-foreground">Réservations suspendues</p>
          <p className="text-sm text-muted-foreground leading-relaxed">{closedMessage || "Les réservations sont temporairement suspendues."}</p>
          <Link href="/contact" className="inline-block mt-2 px-6 py-2.5 rounded-xl bg-[#0b2238] text-white text-sm font-bold hover:opacity-90 transition-opacity">Nous contacter</Link>
        </div>
      </div>
    );
  }

  // ── RENDER ───────────────────────────────────────────────────
  return (
    <div className={phase === "map" ? "h-screen overflow-hidden flex flex-col" : "min-h-screen bg-[#f5f5f7]"}>

      {/* Navbar spacer — always present */}
      <div className={phase === "map" ? "h-[80px] sm:h-[98px] shrink-0" : "h-[80px] sm:h-[98px]"} />

      {/* ════════ MAP — always mounted, hidden when not active ════════ */}
      <div className={[
        phase === "map"
          ? "flex-1 min-h-0 flex flex-col lg:flex-row overflow-hidden"
          : "hidden",
      ].join(" ")}>

        {/* Map area */}
        <div className="relative flex-1 min-h-0 overflow-hidden">
          <div className="absolute inset-0 overflow-hidden">
            <LeafletMapAdventure ref={mapRef} styleMode="rapide" onRouteChange={setRoute} />
          </div>
          {/* Back button */}
          <button type="button" onClick={backToGuide}
            className="absolute top-3 right-3 z-[1100] flex items-center gap-1.5 px-3 py-2 bg-white/95 backdrop-blur-sm text-xs font-bold text-foreground rounded-xl border border-border shadow-sm hover:bg-secondary transition-colors cursor-pointer">
            <ChevronLeft size={12} /> Modifier les lieux
          </button>
        </div>

        {/* Desktop sidebar */}
        <div className="hidden lg:flex flex-col w-[400px] border-l border-border bg-white overflow-y-auto">
          <div className="sticky top-0 bg-white border-b border-border px-4 py-4 z-10">
            <p className="text-[10px] font-black text-primary uppercase tracking-[3px] mb-1">Votre itinéraire</p>
            <p className="text-sm font-black text-foreground">Cliquez sur la carte pour ajouter des lieux</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">Départ et retour depuis Charleroi EBCI</p>
          </div>
          {panelContent()}
          {mapCta()}
        </div>

        {/* Mobile drawer — z-[1001] to stay above Leaflet attribution (z-1000) */}
        <div className={["lg:hidden fixed bottom-0 left-0 right-0 z-[1001] bg-white rounded-t-2xl border-t border-border overflow-hidden transition-all duration-300 ease-out", drawerOpen ? "h-[75vh]" : "h-[76px]"].join(" ")}>
          <button type="button" onClick={() => setDrawerOpen(!drawerOpen)} className="w-full flex flex-col items-center pt-2 pb-1 cursor-pointer">
            <div className="w-8 h-1 rounded-full bg-border mb-2" />
            <div className="flex items-center justify-between w-full px-4 pb-1">
              <span className="text-sm font-black text-foreground">
                {route.pois.length > 0 ? `${route.pois.length} lieu${route.pois.length > 1 ? "x" : ""} · ≈ ${prixEstime} €` : "Votre itinéraire"}
              </span>
              {drawerOpen ? <ChevronDown size={14} className="text-muted-foreground" /> : <ChevronUp size={14} className="text-muted-foreground" />}
            </div>
          </button>
          <div className="flex flex-col h-[calc(100%-52px)]">
            <div className="overflow-y-auto flex-1">{panelContent()}</div>
            <div className="shrink-0 border-t border-border bg-white">{mapCta()}</div>
          </div>
        </div>
      </div>

      {/* ════════ GUIDE ════════ */}
      {phase === "guide" && (
        <div className="lg:flex lg:flex-col lg:items-center lg:justify-center" style={{ minHeight: "calc(100vh - 98px)" }}>
        <div className="w-full max-w-[620px] mx-auto px-4 sm:px-6 py-3 sm:py-8 pb-24">

          <p className="text-[11px] font-bold text-muted-foreground/50 uppercase tracking-[2px] flex items-center gap-1.5 mb-4 sm:mb-6">
            <PlaneTakeoff size={11} /> EBCI · Vol sur mesure
          </p>

          {/* Progress */}
          <div className="flex items-center mb-5 sm:mb-8">
            {([1,2,3] as GuideStep[]).flatMap((n, i) => {
              const done    = guideStep > n;
              const current = guideStep === n;
              const step = (
                <div key={n} className="shrink-0 flex items-center gap-1.5">
                  <div className={[
                    "w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black transition-all",
                    done    ? "bg-green-100 text-green-600"
                    : current ? "bg-primary text-[#0b2238]"
                    :           "bg-border text-muted-foreground/40",
                  ].join(" ")}>
                    {done ? <Check size={10} /> : n}
                  </div>
                  <span className={[
                    "text-[11px] font-semibold hidden sm:block",
                    done    ? "text-muted-foreground/40"
                    : current ? "text-foreground"
                    :           "text-muted-foreground/40",
                  ].join(" ")}>
                    {n === 1 ? "Villes" : n === 2 ? "Monuments" : "Lieu perso"}
                  </span>
                </div>
              );
              if (i === 0) return [step];
              const line = <div key={`l${i}`} className={`flex-1 h-0.5 mx-3 transition-colors ${guideStep > i ? "bg-primary/30" : "bg-border"}`} />;
              return [line, step];
            })}
          </div>

          {/* Step 1: Villes */}
          {guideStep === 1 && (
            <div className="space-y-4 sm:space-y-6">
              <div className="flex items-start gap-3 sm:gap-4">
                <div className="w-8 h-8 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl bg-[#0b2238]/8 flex items-center justify-center shrink-0 mt-0.5">
                  <Building2 size={17} className="text-[#0b2238] sm:hidden" />
                  <Building2 size={21} className="text-[#0b2238] hidden sm:block" />
                </div>
                <div>
                  <h2 className="text-[17px] sm:text-xl font-black text-foreground leading-snug">Quelles villes voulez-vous survoler ?</h2>
                  <p className="text-sm text-muted-foreground mt-1 hidden sm:block">Vu depuis le ciel, chaque ville révèle une tout autre dimension.</p>
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">Autre ville ou région</label>
                <GeoField q={adQ} setQ={setAdQ} loading={adLoading} open={adOpen} results={adResults}
                  placeholder="Ex : Bruxelles, Huy, Aix-la-Chapelle…" onSelect={selectFromGuideSearch} />
              </div>
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[1.5px] mb-2 sm:mb-3">Suggestions</p>
                <div className="grid grid-cols-2 gap-2">
                  {PRESET_VILLES.map(v => {
                    const sel = waypoints.some(w => w.id === v.id);
                    return (
                      <button key={v.id} type="button"
                        onClick={() => toggleWaypoint({ id: v.id, nom: v.nom, sous: v.sous, lat: v.lat, lng: v.lng })}
                        className={["flex items-start gap-2 sm:gap-3 p-2.5 sm:p-3.5 rounded-xl border text-left cursor-pointer transition-all", sel ? "bg-primary/10 border-primary/40" : "bg-card border-border hover:border-primary/40 hover:bg-primary/5"].join(" ")}>
                        <div className={`mt-0.5 w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${sel ? "bg-primary border-primary" : "border-muted-foreground/30"}`}>
                          {sel && <Check size={8} className="text-[#0b2238]" />}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-foreground leading-tight">{v.nom}</p>
                          <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed hidden sm:block">{v.sous}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Monuments */}
          {guideStep === 2 && (
            <div className="space-y-4 sm:space-y-6">
              <div className="flex items-start gap-3 sm:gap-4">
                <div className="w-8 h-8 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl bg-[#0b2238]/8 flex items-center justify-center shrink-0 mt-0.5">
                  <Landmark size={17} className="text-[#0b2238] sm:hidden" />
                  <Landmark size={21} className="text-[#0b2238] hidden sm:block" />
                </div>
                <div>
                  <h2 className="text-[17px] sm:text-xl font-black text-foreground leading-snug">Des monuments à voir depuis le ciel ?</h2>
                  <p className="text-sm text-muted-foreground mt-1 hidden sm:block">Châteaux, abbayes, champs de bataille — l'histoire s'ouvre d'en haut.</p>
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">Autre monument ou site</label>
                <GeoField q={adQ} setQ={setAdQ} loading={adLoading} open={adOpen} results={adResults}
                  placeholder="Ex : Château de Bouillon, Abbaye d'Orval…" onSelect={selectFromGuideSearch} />
              </div>
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[1.5px] mb-2 sm:mb-3">Suggestions</p>
                <div className="grid grid-cols-2 gap-2">
                  {PRESET_MONUMENTS.map(m => {
                    const sel = waypoints.some(w => w.id === m.id);
                    return (
                      <button key={m.id} type="button"
                        onClick={() => toggleWaypoint({ id: m.id, nom: m.nom, sous: m.sous, lat: m.lat, lng: m.lng })}
                        className={["flex items-start gap-2 sm:gap-3 p-2.5 sm:p-3.5 rounded-xl border text-left cursor-pointer transition-all", sel ? "bg-primary/10 border-primary/40" : "bg-card border-border hover:border-primary/40 hover:bg-primary/5"].join(" ")}>
                        <div className={`mt-0.5 w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${sel ? "bg-primary border-primary" : "border-muted-foreground/30"}`}>
                          {sel && <Check size={8} className="text-[#0b2238]" />}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-foreground leading-tight">{m.nom}</p>
                          <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed hidden sm:block">{m.sous}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Lieu personnel */}
          {guideStep === 3 && (
            <div className="space-y-4 sm:space-y-6">
              <div className="flex items-start gap-3 sm:gap-4">
                <div className="w-8 h-8 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl bg-rose-50 flex items-center justify-center shrink-0 mt-0.5">
                  <Heart size={17} className="text-rose-400 sm:hidden" />
                  <Heart size={21} className="text-rose-400 hidden sm:block" />
                </div>
                <div>
                  <h2 className="text-[17px] sm:text-xl font-black text-foreground leading-snug">Un endroit qui vous tient à cœur ?</h2>
                  <p className="text-sm text-muted-foreground mt-1 hidden sm:block">Votre maison, un lieu d'enfance, une adresse particulière — survolé comme jamais.</p>
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">Adresse ou lieu</label>
                <GeoField q={adQ} setQ={setAdQ} loading={adLoading} open={adOpen} results={adResults}
                  placeholder="Ex : Rue de la Loi 1, Bruxelles…" onSelect={selectFromGuideSearch} />
              </div>
              <div className="hidden sm:block bg-[#f5f5f7] rounded-xl px-4 py-3.5 text-[12px] text-muted-foreground leading-relaxed">
                Pas de lieu spécifique ? Aucun problème — passez à la carte pour tracer librement votre route.
              </div>
            </div>
          )}

          {/* Selected so far */}
          {waypoints.length > 0 && (
            <div className="mt-6 pt-5 border-t border-border space-y-2.5">
              <p className="text-[10px] font-bold text-foreground/40 uppercase tracking-[1.5px]">{waypoints.length} lieu{waypoints.length > 1 ? "x" : ""} dans votre itinéraire</p>
              <div className="flex flex-wrap gap-2">
                {waypoints.map(wp => (
                  <span key={wp.id} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#0b2238]/6 border border-[#0b2238]/15 rounded-full text-xs font-semibold text-[#0b2238]">
                    {wp.nom}
                    <button type="button" onClick={() => toggleWaypoint(wp)} className="cursor-pointer opacity-50 hover:opacity-100 transition-opacity"><X size={10} /></button>
                  </span>
                ))}
              </div>
            </div>
          )}

        </div>
        </div>
      )}

      {/* Guide sticky nav — always visible */}
      {phase === "guide" && (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-t border-border shadow-[0_-4px_16px_rgba(0,0,0,0.06)]">
          <div className="max-w-[620px] mx-auto px-4 py-3 flex items-center justify-between gap-3">

            {guideStep > 1 ? (
              <button type="button" onClick={() => setGuideStep(s => (s - 1) as GuideStep)}
                className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground cursor-pointer transition-colors">
                <ChevronLeft size={14} /> Retour
              </button>
            ) : (
              <div />
            )}

            {waypoints.length > 0 ? (
              <button type="button" onClick={advanceGuide}
                className="flex items-center gap-1.5 h-10 px-5 rounded-xl bg-[#0b2238] text-white text-sm font-bold hover:opacity-90 transition-opacity cursor-pointer">
                {guideStep === 3 ? "Voir la carte" : "Continuer"} <ArrowRight size={13} />
              </button>
            ) : (
              <button type="button" onClick={advanceGuide}
                className="flex items-center gap-1.5 h-10 px-5 rounded-xl bg-secondary text-muted-foreground text-sm font-semibold hover:bg-border transition-colors cursor-pointer">
                Passer <ArrowRight size={13} />
              </button>
            )}

          </div>
        </div>
      )}

      {/* ════════ BOOKING ════════ */}
      {phase === "booking" && (
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-6">

          {/* Page header */}
          <div className="mb-4">
            <button type="button" onClick={() => setPhase("map")}
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer mb-2 group">
              <ChevronLeft size={15} className="group-hover:-translate-x-0.5 transition-transform" /> Retour à la carte
            </button>
            <p className="text-[10px] font-black text-primary uppercase tracking-[3px] mb-1">Votre demande de vol</p>
            <h1 className="text-xl font-black text-foreground">Finalisez votre réservation</h1>
            <p className="text-sm text-foreground/50 mt-1">Romain vous confirme sous 24 h. Aucun paiement à cette étape.</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6 items-start">

          {/* ── Main ── */}
          <div className="min-w-0 space-y-5">

          {/* Calendar */}
          <div className="card-premium overflow-hidden">
            <div className="px-5 pt-5 pb-4 border-b border-border">
              <p className="text-[10px] font-black text-primary uppercase tracking-[3px]">Date &amp; heure</p>
            </div>
            <div className="p-5">
              <div className="flex items-center justify-between mb-4">
                <button type="button"
                  onClick={() => { const ny=calMonth===1?calYear-1:calYear,nm=calMonth===1?12:calMonth-1; setCalYear(ny); setCalMonth(nm); loadMonth(ny,nm); }}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-foreground/40 hover:text-foreground hover:bg-secondary transition-all border border-border cursor-pointer">
                  <ChevronLeft size={15} />
                </button>
                <span className="text-sm font-bold text-foreground">{MONTHS_FR[calMonth-1]} {calYear}</span>
                <button type="button"
                  onClick={() => { const ny=calMonth===12?calYear+1:calYear,nm=calMonth===12?1:calMonth+1; setCalYear(ny); setCalMonth(nm); loadMonth(ny,nm); }}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-foreground/40 hover:text-foreground hover:bg-secondary transition-all border border-border cursor-pointer">
                  <ChevronRight size={15} />
                </button>
              </div>
              <div className="grid grid-cols-7 mb-1">
                {DAYS_FR.map((d,i) => <div key={i} className="h-8 flex items-center justify-center text-[9px] font-bold text-foreground/40 uppercase tracking-wider">{d}</div>)}
              </div>
              {calLoading
                ? <div className="flex items-center justify-center h-44"><Loader2 size={20} className="animate-spin text-foreground/20" /></div>
                : <div className="grid grid-cols-7 gap-0.5">{renderCalendar()}</div>
              }
              <div className="flex flex-wrap items-center gap-4 mt-4 pt-4 border-t border-border text-[10px] text-foreground/40">
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-primary" />Sélectionné</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full border-2 border-border" />Disponible</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-border" />Indisponible</span>
              </div>
            </div>
            {!selectedDate ? (
              <div className="border-t border-border px-5 py-4 flex items-center gap-3">
                <Clock size={14} className="text-foreground/30 shrink-0" />
                <p className="text-sm text-foreground/50">Sélectionnez une date pour voir les créneaux disponibles</p>
              </div>
            ) : (
              <div className="border-t border-border px-5 py-4">
                {slotsLoading
                  ? <div className="flex justify-center py-4"><Loader2 size={18} className="animate-spin text-foreground/20" /></div>
                  : slots.length === 0
                    ? (
                        <div className="flex items-center gap-3 py-1">
                          <Clock size={14} className="text-foreground/30 shrink-0" />
                          <div>
                            <p className="text-sm font-semibold text-foreground capitalize">{formattedDate}</p>
                            <p className="text-xs text-foreground/50 mt-0.5">Aucun créneau disponible. Essayez une autre date.</p>
                          </div>
                        </div>
                      )
                    : (
                        <div>
                          <div className="flex items-baseline gap-2 mb-3">
                            <p className="text-sm font-black text-foreground capitalize">{formattedDate}</p>
                          </div>
                          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                            {slots.map(s => (
                              <button key={s} type="button" onClick={() => setSelectedTime(s)}
                                className={["py-2.5 rounded-lg border text-sm font-bold transition-all text-center cursor-pointer", selectedTime === s ? "border-primary bg-primary text-primary-foreground shadow-sm" : "border-border text-foreground hover:border-primary/50 hover:bg-primary/5 hover:text-primary"].join(" ")}>{s}
                              </button>
                            ))}
                          </div>
                        </div>
                      )
                }
              </div>
            )}
          </div>

          {/* Participants + Coordonnées + Commentaire */}
          <div className="card-premium divide-y divide-border overflow-hidden">

            {/* Détails du vol */}
            <div className="p-5 sm:p-7">
              <p className="text-[10px] font-black text-primary uppercase tracking-[3px] mb-4">Détails du vol</p>
              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-3">
                    Nombre de passagers <span className="text-foreground/40 font-normal">(requis)</span>
                  </label>
                  <div className="flex gap-2.5">
                    {["1","2","3"].map(n => (
                      <button key={n} type="button" onClick={() => setForm(f => ({ ...f, passagers: n }))}
                        className={["flex-1 py-2.5 rounded-lg border text-sm font-semibold transition-all text-center cursor-pointer", form.passagers === n ? "border-primary bg-primary text-primary-foreground shadow-sm" : "border-border text-foreground hover:border-primary/50 hover:bg-primary/5 hover:text-primary"].join(" ")}>
                        {n} {n==="1"?"passager":"passagers"}
                      </button>
                    ))}
                  </div>
                  <p className="mt-2 text-xs text-foreground/40">Prix identique quel que soit le nombre.</p>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-2">
                    Poids total des passagers <span className="text-foreground/40 font-normal">(kg, facultatif)</span>
                  </label>
                  {!form.poids_unknown && (
                    <div className="flex items-center gap-3">
                      <input type="number" value={form.poids_total} min={1} max={500} placeholder="ex : 156"
                        onChange={e => setForm(f => ({ ...f, poids_total: e.target.value }))}
                        className="w-36 h-10 px-3 rounded-lg border border-border bg-input text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all placeholder:text-foreground/30" />
                      <span className="text-sm text-foreground/50">kg</span>
                    </div>
                  )}
                  {form.poids_unknown && (
                    <div className="flex items-center gap-2 bg-green-50 border border-green-100 px-3.5 py-2.5 rounded-lg">
                      <CheckCircle size={14} className="text-green-600 shrink-0" />
                      <span className="text-sm font-medium text-green-800">Certifié inférieur à 250 kg</span>
                    </div>
                  )}
                  <label className="flex items-start gap-2.5 mt-2.5 cursor-pointer group">
                    <input type="checkbox" checked={form.poids_unknown}
                      onChange={e => setForm(f => ({ ...f, poids_unknown: e.target.checked, poids_total: e.target.checked ? "" : f.poids_total }))}
                      className="sr-only" />
                    <div className={[
                      "mt-0.5 w-4 h-4 rounded border-2 shrink-0 flex items-center justify-center transition-all duration-150",
                      form.poids_unknown ? "bg-primary border-primary" : "border-border bg-input group-hover:border-primary/60",
                    ].join(" ")}>
                      {form.poids_unknown && (
                        <svg width="9" height="7" viewBox="0 0 9 7" fill="none">
                          <path d="M1 3.5L3.5 6L8 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )}
                    </div>
                    <span className="text-xs text-foreground/50 group-hover:text-foreground/70 transition-colors leading-relaxed">
                      Je ne connais pas le poids exact, je certifie ne pas dépasser 250 kg
                    </span>
                  </label>
                  {!form.poids_unknown && weightWarn && (
                    <div className="mt-2.5 flex items-start gap-2.5 bg-blue-50 border border-blue-100 px-3.5 py-3 rounded-lg text-sm text-blue-800">
                      <AlertTriangle size={14} className="shrink-0 mt-0.5 text-blue-400" />
                      <p>Poids un peu élevé — pas de problème, votre pilote vérifiera les conditions le jour J et vous tiendra informé si besoin.</p>
                    </div>
                  )}
                  {!form.poids_unknown && weightCrit && (
                    <div className="mt-2.5 flex items-start gap-2.5 bg-blue-50 border border-blue-100 px-3.5 py-3 rounded-lg text-sm text-blue-800">
                      <AlertCircle size={14} className="shrink-0 mt-0.5 text-blue-400" />
                      <p>Pour ce poids, votre pilote vous contactera avant le vol pour confirmer ensemble.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Coordonnées */}
            <div className="p-5 sm:p-7">
              <p className="text-[10px] font-black text-primary uppercase tracking-[3px] mb-4">Coordonnées</p>
              <p className="text-xs text-foreground/40 -mt-2 mb-4">Romain vous contacte ici pour confirmer le vol</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <SimpleField label="Prénom" required value={form.prenom} onChange={v => setForm(f => ({ ...f, prenom: v }))} placeholder="Jean" />
                <SimpleField label="Nom" required value={form.nom} onChange={v => setForm(f => ({ ...f, nom: v }))} placeholder="Dupont" />
                <div className="sm:col-span-2">
                  <SimpleField label="Email" required type="email" value={form.email} onChange={v => setForm(f => ({ ...f, email: v }))} placeholder="jean@exemple.com" />
                </div>
                <div className="sm:col-span-2">
                  <SimpleField label="Téléphone" type="tel" value={form.telephone} onChange={v => setForm(f => ({ ...f, telephone: v }))} placeholder="+32 470 00 00 00" />
                </div>
              </div>
            </div>

            {/* Commentaire */}
            <div className="p-5 sm:p-7">
              <label className="block text-sm font-semibold text-foreground mb-2">
                Remarque <span className="text-foreground/40 font-normal">(facultatif)</span>
              </label>
              <textarea value={form.commentaire} rows={3} maxLength={400}
                onChange={e => setForm(f => ({ ...f, commentaire: e.target.value }))}
                className="w-full px-3 py-2.5 rounded-lg border border-border bg-input text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all resize-none placeholder:text-foreground/30"
                placeholder="Occasion spéciale, demande particulière, lieu précis à survoler…" />
              <p className="text-xs text-foreground/40 mt-1 text-right">{form.commentaire.length}/400</p>
            </div>
          </div>

          {/* CGP + Newsletter */}
          <div className="card-premium p-5 space-y-3">
            <label className="flex items-start gap-3.5 cursor-pointer">
              <input type="checkbox" checked={form.accept_cgp}
                onChange={e => setForm(f => ({ ...f, accept_cgp: e.target.checked }))}
                className="mt-0.5 w-4 h-4 accent-primary shrink-0 cursor-pointer" />
              <span className="text-sm text-foreground/60 leading-relaxed">
                J&apos;ai lu et j&apos;accepte les{" "}
                <Link href="/cgp" target="_blank" rel="noopener noreferrer"
                  className="text-primary underline underline-offset-2 font-semibold hover:brightness-90 transition-all">
                  Conditions Générales de Participation
                </Link>{" "}
                et j&apos;autorise l&apos;utilisation de mes données personnelles pour le traitement de cette réservation.
              </span>
            </label>
            <label className="flex items-start gap-3.5 cursor-pointer">
              <input type="checkbox" checked={form.newsletter_opt_in}
                onChange={e => setForm(f => ({ ...f, newsletter_opt_in: e.target.checked }))}
                className="mt-0.5 w-4 h-4 accent-primary shrink-0 cursor-pointer" />
              <span className="text-sm text-foreground/60 leading-relaxed">
                Je souhaite recevoir les actualités et offres de Fly Horizons par email.{" "}
                <span className="text-foreground/40">(optionnel)</span>
              </span>
            </label>
          </div>

          {submitError && (
            <div className="flex items-center gap-2.5 text-sm text-destructive bg-destructive/5 border border-destructive/20 px-4 py-3.5 rounded-xl">
              <AlertCircle size={14} className="shrink-0" /> {submitError}
            </div>
          )}

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <p className="text-[11px] text-muted-foreground/60 flex items-center gap-1.5">
              <Lock size={10} /> Aucun paiement maintenant
            </p>
            <button type="button"
              disabled={!selectedDate || !selectedTime || !form.prenom || !form.nom || !form.email || !form.accept_cgp || submitting}
              onClick={handleSubmit}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-primary text-primary-foreground rounded-lg text-sm font-black transition-all disabled:opacity-30 hover:brightness-105 shadow-gold hover:-translate-y-px active:translate-y-0 cursor-pointer disabled:cursor-not-allowed">
              {submitting ? <><Loader2 size={14} className="animate-spin" /> Envoi en cours…</> : <>Envoyer ma demande <ArrowRight size={15} /></>}
            </button>
          </div>
          </div>

          {/* ── Sidebar ── */}
          <div className="hidden lg:block sticky top-[108px] self-start space-y-4">
            <div className="card-premium overflow-hidden">

              {/* Header */}
              <div className="px-5 pt-5 pb-4 border-b border-border">
                <p className="text-[10px] font-bold text-primary uppercase tracking-[2px] mb-1">Votre vol sur mesure</p>
                <p className="text-foreground text-2xl font-black leading-none tabular-nums">
                  {prixEstime > 0 ? `≈ ${prixEstime} €` : "—"}
                </p>
                {totalMin > 0 && (
                  <p className="text-muted-foreground text-xs mt-1">{totalMin} min · {route.distKm.toFixed(0)} km</p>
                )}
              </div>

              {/* Itinéraire */}
              {route.pois.length > 0 && (
                <div className="px-5 py-3.5 border-b border-border">
                  <p className="text-[9px] font-black text-foreground/40 uppercase tracking-[2px] mb-2">Itinéraire</p>
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 text-xs">
                      <span className="w-4 h-4 rounded-full bg-primary/15 text-primary text-[8px] font-black flex items-center justify-center shrink-0">↑</span>
                      <span className="font-semibold text-foreground">Charleroi EBCI</span>
                    </div>
                    {route.pois.map((p, i) => (
                      <div key={p.id} className="flex items-center gap-1.5 text-xs">
                        <span className="w-4 h-4 rounded-full bg-primary/15 text-primary text-[8px] font-black flex items-center justify-center shrink-0">{i + 1}</span>
                        <span className="font-semibold text-foreground truncate">{p.nom}</span>
                      </div>
                    ))}
                    <div className="flex items-center gap-1.5 text-xs">
                      <span className="w-4 h-4 rounded-full bg-primary/15 text-primary text-[8px] font-black flex items-center justify-center shrink-0">↓</span>
                      <span className="font-semibold text-foreground">Charleroi EBCI</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Info rows */}
              <div className="p-4 space-y-2.5 text-sm border-b border-border">
                {[
                  { l: "Départ",    v: "Charleroi · EBCI" },
                  { l: "Date",      v: formattedDate ? <span className="capitalize">{formattedDate}</span> : <span className="text-muted-foreground">Non sélectionnée</span> },
                  { l: "Heure",     v: selectedTime || <span className="text-muted-foreground">—</span> },
                  { l: "Passagers", v: form.passagers ? `${form.passagers} passager${form.passagers !== "1" ? "s" : ""}` : <span className="text-muted-foreground">—</span> },
                ].map(({ l, v }) => (
                  <div key={l} className="flex items-center justify-between gap-2">
                    <span className="text-muted-foreground text-xs">{l}</span>
                    <span className="font-semibold text-xs text-right">{v}</span>
                  </div>
                ))}
              </div>

              {/* Tarification */}
              <div className="px-4 py-4 space-y-3">
                {prixEstime > 0 ? (
                  <>
                    <p className="text-[10px] font-black text-foreground/40 uppercase tracking-[2px]">Provision demandée</p>
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-baseline text-xs">
                        <span className="text-muted-foreground">Vol ~{totalMin} min <span className="text-foreground/30">(sur ≈ {prixEstime} €)</span></span>
                        <span className="font-semibold tabular-nums shrink-0 ml-2">{acompte} €</span>
                      </div>
                      {taxesEscales > 0 && (
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">Taxes escales</span>
                          <span className="font-semibold tabular-nums">+ {taxesEscales} €</span>
                        </div>
                      )}
                      <div className="border-t border-border pt-2 flex justify-between items-baseline">
                        <span className="text-xs font-bold text-foreground">Total provision</span>
                        <span className="text-xl font-black tabular-nums text-foreground">{totalAcompte} €</span>
                      </div>
                    </div>
                    <div className="bg-[#f5f8ff] border border-[#0b2238]/10 rounded-lg px-3 py-2.5 space-y-1">
                      <p className="text-[11px] text-[#0b2238]/70 leading-relaxed">
                        <strong>Déduite du prix final</strong> au règlement après le vol.
                      </p>
                      <p className="text-[11px] text-[#0b2238]/70 leading-relaxed">
                        Annulation météo ou report ? <strong>Remboursée intégralement.</strong>
                      </p>
                      <p className="text-[11px] text-muted-foreground">Demandée après confirmation de Romain.</p>
                    </div>
                  </>
                ) : (
                  <p className="text-[11px] text-muted-foreground">La provision sera calculée selon votre itinéraire.</p>
                )}
              </div>
            </div>
          </div>

          </div>{/* end grid */}
        </div>
      )}

      {/* ════════ DONE ════════ */}
      {phase === "done" && (
        <div className="max-w-[680px] mx-auto px-4 sm:px-6 py-8 pb-20 space-y-4">
          <div className="bg-card border border-border rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                <CheckCircle size={20} className="text-green-600" />
              </div>
              <div>
                <p className="text-base font-black text-foreground">Demande envoyée !</p>
                <p className="text-[11px] text-muted-foreground">Confirmation envoyée à {form.email}</p>
              </div>
            </div>
            <div className="mb-5 bg-[#f5f8ff] border border-[#0b2238]/10 rounded-xl px-4 py-3">
              <div className="flex items-start gap-2.5">
                <Info size={13} className="text-[#0b2238] mt-0.5 shrink-0" />
                <p className="text-xs text-[#0b2238]/80 leading-relaxed">
                  Romain valide votre itinéraire et vous contacte sous 24 h.{" "}
                  <strong>L'acompte{totalAcompte > 0 ? ` (≈ ${totalAcompte} €)` : ""} ne sera demandé qu'après votre accord.</strong>
                </p>
              </div>
            </div>
            <div className="space-y-0">
              {[
                { num: 1, done: true,  title: "Demande envoyée",             desc: "Votre demande de vol a bien été reçue." },
                { num: 2, done: false, title: "Romain valide votre créneau", desc: "Dans les 24 h, il confirme la disponibilité et affine l'itinéraire." },
                { num: 3, done: false, title: "Vous réglez l'acompte",       desc: `Après votre accord, un lien de paiement vous est envoyé${totalAcompte > 0 ? ` pour ≈ ${totalAcompte} €` : ""}.` },
                { num: 4, done: false, title: "À vous le ciel",              desc: "Présentez-vous 15 min avant à Charleroi (EBCI). Casques audio fournis." },
              ].map(({ num, done, title, desc }, i, arr) => (
                <div key={num} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${done ? "bg-green-500" : "bg-[#F2B705]"}`}>
                      {done ? <CheckCircle size={13} className="text-white" /> : <span className="font-black text-[#0b2238] text-xs leading-none">{num}</span>}
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
          <div className="bg-card border border-border rounded-xl p-5 space-y-3">
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
            <div className="flex items-start gap-2.5 pt-2 border-t border-border">
              <div className="w-7 h-7 rounded-lg bg-secondary border border-border flex items-center justify-center shrink-0">
                <CloudRain size={13} className="text-muted-foreground" />
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                <strong className="text-foreground">Météo :</strong> si les conditions ne permettent pas de voler, le vol est reporté sans frais. Décision prise jusqu'à 2 h avant.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── GeoField ──────────────────────────────────────────────────────
function GeoField({ q, setQ, loading, open, results, onSelect, placeholder = "Rechercher un lieu…" }: {
  q: string; setQ: (v: string) => void; loading: boolean; open: boolean;
  results: NominatimResult[]; onSelect: (r: NominatimResult) => void; placeholder?: string;
}) {
  return (
    <div className="relative">
      <div className="flex items-center gap-2 h-11 px-4 border border-border rounded-lg bg-input focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary transition-all">
        <input value={q} onChange={e => setQ(e.target.value)} placeholder={placeholder}
          className="flex-1 text-sm bg-transparent text-foreground focus:outline-none placeholder:text-muted-foreground/40 font-medium" />
        {loading
          ? <Loader2 size={14} className="animate-spin text-muted-foreground shrink-0" />
          : q && <button type="button" onClick={() => setQ("")} className="cursor-pointer text-muted-foreground hover:text-foreground shrink-0"><X size={14} /></button>
        }
      </div>
      {open && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-xl shadow-premium z-50 overflow-hidden">
          {results.map(r => (
            <button key={r.place_id} type="button" onClick={() => onSelect(r)}
              className="w-full text-left px-4 py-3 text-sm hover:bg-secondary transition-colors cursor-pointer border-b border-border last:border-0">
              <p className="font-semibold text-foreground truncate">{r.display_name.split(",")[0]}</p>
              <p className="text-muted-foreground text-xs truncate mt-0.5">{r.display_name.split(",").slice(1,3).join(",")}</p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── SimpleField ───────────────────────────────────────────────────
function SimpleField({ label, required, type = "text", value, onChange, placeholder }: {
  label: string; required?: boolean; type?: string;
  value: string; onChange: (v: string) => void; placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-semibold text-foreground mb-2">
        {label}{required && <span className="text-foreground/40 font-normal"> *</span>}
      </label>
      <input type={type} value={value} required={required} placeholder={placeholder}
        onChange={e => onChange(e.target.value)}
        className="w-full h-10 px-3 rounded-lg border border-border bg-input text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all placeholder:text-foreground/30" />
    </div>
  );
}
