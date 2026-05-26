"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useRef, useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  MapPin, Clock, Search, Trash2, ChevronRight, ChevronLeft,
  Check, CheckCircle, Loader2, AlertCircle, AlertTriangle,
  Mail, Lock, Eye, Zap, PlaneTakeoff, X, Info,
  Navigation, Star, Plus, CalendarDays, CloudRain,
} from "lucide-react";
import type {
  AdventureRouteData, AdventureMapHandle, POI, StyleMode,
} from "@/components/vol-sur-mesure/LeafletMapAdventure";

const LeafletMapAdventure = dynamic(
  () => import("@/components/vol-sur-mesure/LeafletMapAdventure"),
  { ssr: false }
);

// ── Types ─────────────────────────────────────────────────────
type FlowStep = "build" | "reserve" | "done";

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
  type: string;
}

interface FormData {
  date:        string;
  heure:       string;
  passagers:   string;
  poids_total: string;
  prenom:      string;
  nom:         string;
  email:       string;
  telephone:   string;
  commentaire: string;
  accept_cgp:  boolean;
}

// ── Constants ─────────────────────────────────────────────────
const DEPART_NOM = "Charleroi EBCI";
const MONTHS_FR  = ["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"];
const DAYS_FR    = ["L","M","M","J","V","S","D"];
const MAX_WEIGHT = 178;
const ERROR_KG   = MAX_WEIGHT + 60;

const STYLE_OPTIONS: { key: StyleMode; icon: React.ReactNode; label: string; sub: string }[] = [
  { key: "rapide", icon: <Zap size={14} />, label: "Itinéraire direct",    sub: "Trajet le plus court, virages légèrement lissés" },
  { key: "vues",   icon: <Eye size={14} />, label: "Parcours pittoresque", sub: "Virages plus amples pour profiter du paysage" },
];

// ── Page ──────────────────────────────────────────────────────
export default function VolSurMesurePage() {
  const mapRef = useRef<AdventureMapHandle | null>(null);

  // ── Global state
  const [flowStep,   setFlowStep]   = useState<FlowStep>("build");
  const [styleMode,  setStyleMode]  = useState<StyleMode>("rapide");
  const [prixHeure,  setPrixHeure]  = useState(254);
  const [acompteH,   setAcompteH]   = useState(300);
  const [route,      setRoute]      = useState<AdventureRouteData>({
    pois: [], distKm: 0, transitMin: 0, obsMin: 0, totalMin: 0,
  });

  // ── Search state
  const [searchQ,        setSearchQ]        = useState("");
  const [searchResults,  setSearchResults]  = useState<NominatimResult[]>([]);
  const [searchLoading,  setSearchLoading]  = useState(false);
  const [searchOpen,     setSearchOpen]     = useState(false);
  const [searchFocused,  setSearchFocused]  = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // ── Popup d'accueil (stocké en localStorage)
  // null = pas encore vérifié (évite le flash au premier render)
  const [popupDismissed, setPopupDismissed] = useState<boolean | null>(null);
  useEffect(() => {
    setPopupDismissed(localStorage.getItem("vsm-welcome") === "1");
  }, []);
  function dismissPopup() {
    localStorage.setItem("vsm-welcome", "1");
    setPopupDismissed(true);
  }

  // ── Scroll vers le haut à chaque changement d'étape
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [flowStep]);

  // ── Calendar / slots
  const today = new Date();
  const [calYear,       setCalYear]       = useState(today.getFullYear());
  const [calMonth,      setCalMonth]      = useState(today.getMonth() + 1);
  const [availableDays, setAvailableDays] = useState<string[]>([]);
  const [calLoading,    setCalLoading]    = useState(false);
  const [slots,         setSlots]         = useState<string[]>([]);
  const [slotsLoading,  setSlotsLoading]  = useState(false);

  // ── Refs pour auto-scroll dans l'étape 2
  const slotsRef      = useRef<HTMLDivElement>(null);
  const passengersRef = useRef<HTMLDivElement>(null);
  const scrollAfterSlotsRef = useRef(false);

  // Scroll vers les créneaux une fois chargés
  useEffect(() => {
    if (!slotsLoading && scrollAfterSlotsRef.current && (slots.length > 0 || form.date)) {
      scrollAfterSlotsRef.current = false;
      setTimeout(() => {
        if (!slotsRef.current) return;
        const top = slotsRef.current.getBoundingClientRect().top + window.scrollY - 100;
        window.scrollTo({ top, behavior: "smooth" });
      }, 80);
    }
  }, [slotsLoading]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleSelectDate(ds: string) {
    setForm(f => ({ ...f, date: ds, heure: "" }));
    scrollAfterSlotsRef.current = true;
  }

  function handleSelectTime(s: string) {
    setForm(f => ({ ...f, heure: s }));
    setTimeout(() => {
      if (!passengersRef.current) return;
      const top = passengersRef.current.getBoundingClientRect().top + window.scrollY - 100;
      window.scrollTo({ top, behavior: "smooth" });
    }, 120);
  }

  // ── Form
  const [form, setForm] = useState<FormData>({
    date: "", heure: "", passagers: "2", poids_total: "",
    prenom: "", nom: "", email: "", telephone: "",
    commentaire: "", accept_cgp: false,
  });
  const [submitting,  setSubmitting]  = useState(false);
  const [submitError, setSubmitError] = useState("");

  // ── Escales
  const [availableStops, setAvailableStops] = useState<Stopover[]>([]);
  const [selectedStops,  setSelectedStops]  = useState<Stopover[]>([]);
  const [stopsOpen,      setStopsOpen]      = useState(false);

  // ── Price calc
  const prixEstime        = route.totalMin > 0 ? Math.round((prixHeure / 60) * route.totalMin) : 0;
  const acompte           = route.totalMin > 0 ? Math.round((acompteH  / 60) * route.totalMin) : 0;
  const taxesEscalesTotal = selectedStops.reduce((acc, s) => acc + s.taxe, 0);
  const totalAcompte      = acompte + taxesEscalesTotal;
  const weightKg    = parseInt(form.poids_total) || 0;
  const weightWarn  = weightKg > MAX_WEIGHT && weightKg <= ERROR_KG;
  const weightError = weightKg > ERROR_KG;
  const formattedDate = form.date
    ? new Date(form.date + "T12:00:00Z").toLocaleDateString("fr-BE", { weekday: "long", day: "numeric", month: "long" })
    : null;

  // ── Load settings + user
  useEffect(() => {
    const sb = createClient();
    sb.from("crm_settings").select("key, value")
      .in("key", ["prix_heure", "acompte_perso_heure"])
      .then(({ data }) => {
        data?.forEach(({ key, value }) => {
          if (key === "prix_heure")         setPrixHeure(parseFloat(value));
          if (key === "acompte_perso_heure") setAcompteH(parseFloat(value));
        });
      });
    sb.from("stopovers").select("id, icao, nom, taxe, lat, lng").eq("actif", true).order("nom")
      .then(({ data, error }) => {
        if (error) {
          // Colonnes lat/lng peut-être absentes → fallback sans coordonnées
          sb.from("stopovers").select("id, icao, nom, taxe").eq("actif", true).order("nom")
            .then(({ data: d2 }) => setAvailableStops((d2 ?? []) as Stopover[]));
        } else {
          setAvailableStops((data ?? []) as Stopover[]);
        }
      });
    sb.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      sb.from("profiles").select("full_name, phone").eq("id", user.id).single()
        .then(({ data }) => {
          const parts = (data?.full_name || "").split(" ");
          setForm(f => ({
            ...f, email: user.email ?? "",
            prenom: parts[0] ?? "", nom: parts.slice(1).join(" ") ?? "",
            telephone: data?.phone ?? "",
          }));
        });
    });
  }, []);

  // ── Calendar
  const dureeForCal = Math.max(30, route.totalMin);
  const loadMonth = useCallback(async (y: number, m: number) => {
    setCalLoading(true);
    try {
      const r = await fetch(`/api/reservation/month?year=${y}&month=${m}&duree=${dureeForCal}`);
      const d = await r.json();
      setAvailableDays(d.available ?? []);
    } finally { setCalLoading(false); }
  }, [dureeForCal]);

  useEffect(() => { if (flowStep === "reserve") loadMonth(calYear, calMonth); }, [calYear, calMonth, flowStep, loadMonth]);

  useEffect(() => {
    if (!form.date) { setSlots([]); return; }
    setSlotsLoading(true);
    fetch(`/api/reservation/slots?date=${form.date}&duree=${dureeForCal}`)
      .then(r => r.json()).then(d => setSlots(d.slots ?? []))
      .finally(() => setSlotsLoading(false));
  }, [form.date, dureeForCal]);

  function renderCalendar() {
    const firstDay = new Date(calYear, calMonth - 1, 1).getDay();
    const offset   = firstDay === 0 ? 6 : firstDay - 1;
    const days     = new Date(calYear, calMonth, 0).getDate();
    const cells    = [];
    for (let i = 0; i < offset; i++) cells.push(<div key={`e${i}`} />);
    for (let d = 1; d <= days; d++) {
      const ds = `${calYear}-${String(calMonth).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
      const isAvail = availableDays.includes(ds);
      const isSel   = form.date === ds;
      const isPast  = new Date(ds + "T12:00:00Z") < today;
      cells.push(
        <button key={d} type="button" disabled={!isAvail || isPast}
          onClick={() => handleSelectDate(ds)}
          className={[
            "h-9 w-full rounded-lg text-sm font-medium transition-all select-none flex items-center justify-center",
            isSel              ? "bg-[#fbae17] text-[#0b2238] font-bold shadow-sm scale-105" :
            isAvail && !isPast ? "hover:bg-[#fbae17]/10 text-foreground/70 cursor-pointer font-semibold" :
                                 "text-muted-foreground/25 cursor-not-allowed text-xs",
          ].join(" ")}>{d}
        </button>
      );
    }
    return cells;
  }

  // ── Nominatim search
  useEffect(() => {
    if (searchQ.trim().length < 2) { setSearchResults([]); setSearchOpen(false); return; }
    const t = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQ)}&limit=6&accept-language=fr&viewbox=2.5,51.5,6.4,49.4&bounded=0`;
        const r   = await fetch(url, { headers: { "Accept-Language": "fr" } });
        const d   = await r.json() as NominatimResult[];
        // Dédoublonnage : même premier segment de display_name = même lieu
        const seen = new Set<string>();
        const unique = d.filter(item => {
          const key = item.display_name.split(",")[0].trim().toLowerCase();
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
        setSearchResults(unique);
        setSearchOpen(unique.length > 0);
      } catch { /* ignore */ }
      finally { setSearchLoading(false); }
    }, 400);
    return () => clearTimeout(t);
  }, [searchQ]);

  // Close dropdown on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setSearchOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  function addStop(s: Stopover) {
    setSelectedStops(prev => prev.some(x => x.id === s.id) ? prev : [...prev, s]);
    // Add to Leaflet route if coordinates are available
    if (s.lat != null && s.lng != null) {
      mapRef.current?.addPOI({ id: `stop-${s.id}`, lat: s.lat, lng: s.lng, nom: s.nom });
    }
    setStopsOpen(false);
  }
  function removeStop(id: string) {
    setSelectedStops(prev => prev.filter(x => x.id !== id));
    mapRef.current?.removePOI(`stop-${id}`);
  }

  // Reverse-sync: if the user removes a stopover POI directly from the map, unselect it
  useEffect(() => {
    const routePOIIds = new Set(route.pois.map(p => p.id));
    setSelectedStops(prev =>
      prev.filter(s => s.lat == null || s.lng == null || routePOIIds.has(`stop-${s.id}`))
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [route.pois]);

  function addSearchResult(r: NominatimResult) {
    const poi: POI = {
      id:  `nom-${r.place_id}`,
      lat: parseFloat(r.lat),
      lng: parseFloat(r.lon),
      nom: r.display_name.split(",")[0].trim(),
    };
    mapRef.current?.addPOI(poi);
    setSearchQ("");
    setSearchOpen(false);
  }

  // ── Submit
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
          dureMin:      route.totalMin,
          taxesEscales: taxesEscalesTotal,
          voucher_code: null, voucher_id: null, coupon_code: null,
        }),
      });
      const d = await r.json();
      if (!r.ok) { setSubmitError(d.error || "Erreur."); return; }
      setFlowStep("done");
    } catch { setSubmitError("Erreur réseau."); }
    finally { setSubmitting(false); }
  }

  // ── Sidebar resume (shared)
  function FlightSummaryCard({ showCTA }: { showCTA?: boolean }) {
    return (
      <div className="bg-[#0b2238] rounded-2xl overflow-hidden text-white">
        {/* Header */}
        <div className="px-5 pt-5 pb-4 border-b border-white/10">
          <p className="text-[#fbae17] text-[9px] font-black tracking-[3px] uppercase mb-3">Votre vol personnalisé</p>
          <div className="flex items-end gap-3">
            <p className="text-4xl font-black leading-none">
              {route.totalMin > 0 ? `≈${route.totalMin}` : "—"}
              <span className="text-xl font-bold ml-1">min</span>
            </p>
            {route.pois.length > 0 && (
              <p className="text-white/40 text-xs mb-1">Votre aventure estimée</p>
            )}
          </div>
          {route.totalMin > 0 && (
            <div className="grid grid-cols-3 gap-2 mt-4">
              {[
                { l: "Distance",      v: `${route.distKm} km` },
                { l: "Observation",   v: `≈${route.obsMin} min` },
                { l: "Prix estimé",   v: prixEstime > 0 ? `${prixEstime} €` : "—" },
              ].map(({ l, v }) => (
                <div key={l} className="bg-white/5 rounded-xl px-2.5 py-2 text-center">
                  <p className="text-[9px] text-white/40 font-semibold uppercase tracking-wider mb-0.5">{l}</p>
                  <p className="text-sm font-bold text-white">{v}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Parcours */}
        <div className="px-5 py-4 border-b border-white/10">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[9px] font-black text-white/40 uppercase tracking-[2px]">Votre parcours</p>
            {route.pois.length > 0 && (
              <span className="text-[9px] bg-[#fbae17]/15 text-[#fbae17] font-bold px-2 py-0.5 rounded-full">
                Optimisé automatiquement
              </span>
            )}
          </div>
          <div className="space-y-1.5">
            {/* Départ */}
            <div className="flex items-center gap-2.5">
              <div className="w-6 h-6 rounded-full bg-[#fbae17] flex items-center justify-center shrink-0">
                <PlaneTakeoff size={11} className="text-[#0b2238]" />
              </div>
              <div>
                <p className="text-xs font-semibold text-white">{DEPART_NOM}</p>
                <p className="text-[10px] text-white/35">Départ</p>
              </div>
            </div>

            {route.pois.length === 0 ? (
              <p className="text-xs text-white/25 italic pl-8 py-2">Ajoutez des lieux sur la carte…</p>
            ) : (
              route.pois.map((poi, i) => (
                <div key={poi.id} className="flex items-start gap-2.5">
                  <div className="w-6 h-6 rounded-full bg-white/10 border border-white/20 flex items-center justify-center shrink-0 text-[10px] font-bold text-[#fbae17]">
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-white truncate">{poi.nom}</p>
                    <p className="text-[10px] text-white/35">≈ 2 min d&apos;observation</p>
                  </div>
                  <button
                    onClick={() => mapRef.current?.removePOI(poi.id)}
                    className="shrink-0 mt-0.5 text-white/20 hover:text-red-400 transition-colors cursor-pointer"
                  >
                    <X size={11} />
                  </button>
                </div>
              ))
            )}

            {/* Retour */}
            {route.pois.length > 0 && (
              <div className="flex items-center gap-2.5">
                <div className="w-6 h-6 rounded-full bg-[#fbae17] flex items-center justify-center shrink-0">
                  <PlaneTakeoff size={11} className="text-[#0b2238] rotate-180" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-white">{DEPART_NOM}</p>
                  <p className="text-[10px] text-white/35">Retour</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Escales — toujours visible */}
        <div className="px-5 py-4 border-b border-white/10">
          <div className="flex items-center justify-between mb-2.5">
            <p className="text-[9px] font-black text-white/40 uppercase tracking-[2px]">Escales</p>
            {availableStops.some(s => !selectedStops.find(ss => ss.id === s.id)) && (
              <button type="button" onClick={() => setStopsOpen(v => !v)}
                className="flex items-center gap-1 text-[10px] font-bold text-[#fbae17] hover:text-white transition-colors cursor-pointer">
                <Plus size={9} />Ajouter
              </button>
            )}
          </div>

          {/* Selected */}
          {selectedStops.length > 0 && (
            <div className="space-y-1.5 mb-2">
              {selectedStops.map(s => (
                <div key={s.id} className="flex items-center gap-2 bg-white/5 rounded-lg px-2.5 py-1.5">
                  <span className="font-mono text-[10px] font-bold text-[#fbae17] shrink-0">{s.icao}</span>
                  <span className="flex-1 text-[11px] text-white/70 truncate">{s.nom}</span>
                  {s.taxe > 0 && <span className="text-[10px] text-[#fbae17] font-bold shrink-0">+{s.taxe}€</span>}
                  <button type="button" onClick={() => removeStop(s.id)}
                    className="text-white/30 hover:text-red-400 transition-colors cursor-pointer shrink-0">
                    <X size={10} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {availableStops.length === 0 ? (
            <p className="text-[11px] text-white/20 italic">Aucune escale disponible</p>
          ) : selectedStops.length === 0 && !stopsOpen ? (
            <p className="text-[11px] text-white/25 italic">Aucune escale</p>
          ) : null}

          {/* Picker */}
          {stopsOpen && availableStops.length > 0 && (
            <div className="rounded-xl overflow-hidden border border-white/10">
              {availableStops
                .filter(s => !selectedStops.find(ss => ss.id === s.id))
                .map((s, i, arr) => (
                  <button key={s.id} type="button" onClick={() => addStop(s)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-white/10 text-left transition-colors cursor-pointer ${i < arr.length - 1 ? "border-b border-white/8" : ""}`}>
                    <span className="font-mono text-[10px] font-bold text-[#fbae17] shrink-0 w-11">{s.icao}</span>
                    <span className="flex-1 text-[11px] text-white/80 truncate">{s.nom}</span>
                    {s.taxe > 0 && <span className="text-[10px] text-white/50 shrink-0">+{s.taxe}€</span>}
                  </button>
                ))}
            </div>
          )}
        </div>

        {/* Style */}
        <div className="px-5 py-4">
          <p className="text-[9px] font-black text-white/40 uppercase tracking-[2px] mb-3">Objectif de votre vol</p>
          <div className="flex flex-col gap-2">
            {STYLE_OPTIONS.map(o => (
              <button key={o.key} type="button" onClick={() => setStyleMode(o.key)}
                className={[
                  "flex items-center gap-3 px-3.5 py-2.5 rounded-xl border transition-all text-left cursor-pointer",
                  styleMode === o.key
                    ? "bg-[#fbae17] border-[#fbae17] text-[#0b2238]"
                    : "bg-white/5 border-white/10 text-white hover:bg-white/10",
                ].join(" ")}>
                <span className={styleMode === o.key ? "text-[#0b2238]" : "text-[#fbae17]"}>{o.icon}</span>
                <div>
                  <p className="text-xs font-bold leading-tight">{o.label}</p>
                  <p className={`text-[10px] leading-tight mt-0.5 ${styleMode === o.key ? "text-[#0b2238]/60" : "text-white/40"}`}>{o.sub}</p>
                </div>
                {styleMode === o.key && <Check size={13} className="ml-auto shrink-0 text-[#0b2238]" />}
              </button>
            ))}
          </div>
        </div>

        {/* CTA */}
        {showCTA && (
          <div className="px-5 pb-5">
            {taxesEscalesTotal > 0 && acompte > 0 && (
              <div className="flex items-center justify-between mb-3 px-3 py-2 bg-white/5 rounded-xl text-[11px]">
                <span className="text-white/50">Acompte + taxes escales</span>
                <span className="font-bold text-[#fbae17]">{totalAcompte}&thinsp;€</span>
              </div>
            )}
            <button type="button"
              disabled={route.pois.length === 0}
              onClick={() => { setFlowStep("reserve"); loadMonth(calYear, calMonth); }}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-[#fbae17] text-[#0b2238] text-sm font-extrabold disabled:opacity-30 hover:brightness-105 transition-all shadow-lg cursor-pointer">
              Continuer ma réservation <ChevronRight size={15} />
            </button>
            <p className="text-center text-[10px] text-white/25 mt-2.5">
              <Lock size={9} className="inline mr-1" />Paiement sécurisé, aucun débit immédiat
            </p>
            {route.pois.length === 0 && (
              <p className="text-center text-[10px] text-white/30 mt-1">
                Ajoutez au moins un lieu pour continuer
              </p>
            )}
          </div>
        )}
      </div>
    );
  }

  // ── STEP 2 sidebar
  function ReserveSummary() {
    return (
      <div className="rounded-2xl bg-card border border-border overflow-hidden" style={{ boxShadow: "var(--sh-sm)" }}>
        <div className="bg-[#0b2238] px-5 py-4">
          <p className="text-[#fbae17] text-[9px] font-black tracking-[3px] uppercase mb-1">Votre aventure</p>
          <p className="text-white text-lg font-black">
            {route.totalMin > 0 ? `≈ ${route.totalMin} min` : "—"}
          </p>
        </div>
        <div className="p-4 space-y-2.5 text-sm">
          {[
            { l: "Date",         v: formattedDate ? <span className="capitalize">{formattedDate}</span> : <span className="text-muted-foreground">Non sélectionnée</span> },
            { l: "Heure",        v: form.heure || <span className="text-muted-foreground">—</span> },
            { l: "Départ",       v: DEPART_NOM },
            { l: "Lieux",        v: route.pois.length > 0 ? `${route.pois.length} lieu${route.pois.length > 1 ? "x" : ""}` : <span className="text-muted-foreground">—</span> },
            { l: "Temps estimé", v: route.totalMin > 0 ? `≈ ${route.totalMin} min` : "—" },
            { l: "Passagers",    v: form.passagers },
          ].map(({ l, v }) => (
            <div key={l} className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground text-xs">{l}</span>
              <span className="font-semibold text-xs text-right">{v}</span>
            </div>
          ))}
          {selectedStops.length > 0 && (
            <div className="pt-2.5 border-t border-border space-y-1.5">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Escales</p>
              {selectedStops.map(s => (
                <div key={s.id} className="flex items-center justify-between gap-2">
                  <span className="text-xs text-muted-foreground font-mono">{s.icao}</span>
                  <span className="text-xs font-semibold text-foreground truncate flex-1 text-right">{s.taxe > 0 ? `+${s.taxe} €` : "—"}</span>
                </div>
              ))}
            </div>
          )}
          {totalAcompte > 0 && (
            <div className="pt-2.5 border-t border-border">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Acompte</span>
                <span className="text-2xl font-black text-[#113356]">{totalAcompte}&thinsp;€</span>
              </div>
              {taxesEscalesTotal > 0 && (
                <p className="text-[10px] text-muted-foreground text-right mt-0.5">
                  vol {acompte}€ + taxes {taxesEscalesTotal}€
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-white dark:bg-background">
      <div className="h-[84px]" />

      {/* ══════════════════════ STEP 1 : BUILD ══════════════════════ */}
      {flowStep === "build" && (
        <div className="flex flex-col" style={{ height: "calc(100vh - 84px)" }}>

          {/* Sub-header : mobile = 2 lignes, desktop = 1 ligne */}
          <div ref={searchRef} className="bg-white border-b border-border px-4 sm:px-6 py-2.5 space-y-2 sm:space-y-0">

            {/* Ligne 1 : titre + barre desktop + Tout effacer */}
            <div className="flex items-center gap-3">

              {/* Titre */}
              <h1 className="text-sm sm:text-base font-black text-[#0b2238] shrink-0 whitespace-nowrap">
                Dessinez votre aventure
              </h1>

              {/* Barre de recherche — visible desktop seulement */}
              <div className="relative flex-1 min-w-0 hidden sm:block">
                <div className={[
                  "flex items-center gap-2.5 h-10 rounded-xl px-3.5 transition-all border-2",
                  searchFocused || searchOpen
                    ? "bg-white border-[#fbae17] shadow-[0_0_0_3px_rgba(251,174,23,0.12)]"
                    : "bg-[#f8f8fa] border-[#fbae17]/35 hover:border-[#fbae17]/65",
                ].join(" ")}>
                  {searchLoading
                    ? <Loader2 size={14} className="text-[#fbae17] animate-spin shrink-0" />
                    : <Search   size={14} className="text-[#fbae17] shrink-0" />
                  }
                  <input
                    type="text"
                    value={searchQ}
                    onChange={e => setSearchQ(e.target.value)}
                    onFocus={() => { setSearchFocused(true); if (searchResults.length > 0) setSearchOpen(true); }}
                    onBlur={() => setTimeout(() => setSearchFocused(false), 150)}
                    placeholder="Rechercher un lieu, une ville, un monument…"
                    className="flex-1 bg-transparent text-sm font-medium text-foreground placeholder:text-muted-foreground/50 outline-none min-w-0"
                    autoComplete="off"
                  />
                  {searchQ && (
                    <button onClick={() => { setSearchQ(""); setSearchOpen(false); }}
                      className="text-muted-foreground hover:text-foreground cursor-pointer shrink-0">
                      <X size={13} />
                    </button>
                  )}
                </div>

                {/* Dropdown desktop */}
                {searchOpen && searchResults.length > 0 && (
                  <div className="absolute top-full left-0 right-0 bg-white border border-border rounded-xl shadow-2xl z-[600] overflow-hidden mt-1.5">
                    <div className="px-4 py-2 border-b border-border bg-muted/30">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                        {searchResults.length} résultat{searchResults.length > 1 ? "s" : ""}
                      </p>
                    </div>
                    {searchResults.map(r => (
                      <button key={r.place_id} type="button"
                        onClick={() => addSearchResult(r)}
                        className="w-full flex items-start gap-3 px-4 py-3 hover:bg-[#fbae17]/5 text-left transition-colors border-b border-border last:border-0 cursor-pointer group">
                        <div className="w-7 h-7 rounded-lg bg-[#0b2238] flex items-center justify-center shrink-0 mt-0.5 group-hover:bg-[#fbae17] transition-colors">
                          <MapPin size={12} className="text-[#fbae17] group-hover:text-[#0b2238]" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-bold text-foreground truncate">{r.display_name.split(",")[0]}</p>
                          <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                            {r.display_name.split(",").slice(1, 3).join(", ").trim()}
                          </p>
                        </div>
                        <span className="text-[10px] text-[#fbae17] font-bold shrink-0 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                          Ajouter
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Tout effacer */}
              {route.pois.length > 0 && (
                <button type="button"
                  onClick={() => mapRef.current?.clearAll()}
                  className="flex items-center gap-1.5 h-9 px-3 rounded-lg border border-border text-xs font-semibold text-muted-foreground hover:text-destructive hover:border-destructive/30 transition-colors cursor-pointer shrink-0">
                  <Trash2 size={12} /> Tout effacer
                </button>
              )}
            </div>

            {/* Ligne 2 mobile : barre de recherche pleine largeur */}
            <div className="sm:hidden flex items-center gap-2">
              <div className="relative flex-1 min-w-0">
                <div className={[
                  "flex items-center gap-2.5 h-10 rounded-xl px-3.5 transition-all border-2",
                  searchFocused || searchOpen
                    ? "bg-white border-[#fbae17] shadow-[0_0_0_3px_rgba(251,174,23,0.12)]"
                    : "bg-[#f8f8fa] border-[#fbae17]/35 hover:border-[#fbae17]/65",
                ].join(" ")}>
                  {searchLoading
                    ? <Loader2 size={14} className="text-[#fbae17] animate-spin shrink-0" />
                    : <Search   size={14} className="text-[#fbae17] shrink-0" />
                  }
                  <input
                    type="text"
                    value={searchQ}
                    onChange={e => setSearchQ(e.target.value)}
                    onFocus={() => { setSearchFocused(true); if (searchResults.length > 0) setSearchOpen(true); }}
                    onBlur={() => setTimeout(() => setSearchFocused(false), 150)}
                    placeholder="Rechercher un lieu…"
                    className="flex-1 bg-transparent text-sm font-medium text-foreground placeholder:text-muted-foreground/50 outline-none min-w-0"
                    autoComplete="off"
                  />
                  {searchQ && (
                    <button onClick={() => { setSearchQ(""); setSearchOpen(false); }}
                      className="text-muted-foreground hover:text-foreground cursor-pointer shrink-0">
                      <X size={13} />
                    </button>
                  )}
                </div>

                {/* Dropdown mobile */}
                {searchOpen && searchResults.length > 0 && (
                  <div className="absolute top-full left-0 right-0 bg-white border border-border rounded-xl shadow-2xl z-[600] overflow-hidden mt-1.5">
                    <div className="px-4 py-2 border-b border-border bg-muted/30">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                        {searchResults.length} résultat{searchResults.length > 1 ? "s" : ""}
                      </p>
                    </div>
                    {searchResults.map(r => (
                      <button key={r.place_id} type="button"
                        onClick={() => addSearchResult(r)}
                        className="w-full flex items-start gap-3 px-4 py-3 hover:bg-[#fbae17]/5 text-left transition-colors border-b border-border last:border-0 cursor-pointer group">
                        <div className="w-7 h-7 rounded-lg bg-[#0b2238] flex items-center justify-center shrink-0 mt-0.5 group-hover:bg-[#fbae17] transition-colors">
                          <MapPin size={12} className="text-[#fbae17] group-hover:text-[#0b2238]" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-bold text-foreground truncate">{r.display_name.split(",")[0]}</p>
                          <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                            {r.display_name.split(",").slice(1, 3).join(", ").trim()}
                          </p>
                        </div>
                        <span className="text-[10px] text-[#fbae17] font-bold shrink-0 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                          Ajouter
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Main area */}
          <div className="flex flex-1 min-h-0">
            {/* Left: map + stats */}
            <div className="flex flex-col flex-1 min-w-0">

              {/* Map — espace sur tous les bords + coins tous arrondis */}
              <div className="flex-1 min-h-0 p-2 lg:p-2.5">
                <div className="relative h-full isolate rounded-2xl overflow-hidden shadow-sm border border-border/30">
                  {route.pois.length === 0 && !searchFocused && popupDismissed === false && (
                    <div className="absolute inset-0 flex items-center justify-center z-[500]">
                      <div className="bg-white/80 backdrop-blur-md rounded-2xl px-8 py-6 text-center max-w-xs border border-border shadow-xl pointer-events-auto">
                        <div className="w-12 h-12 rounded-full bg-[#0b2238] flex items-center justify-center mx-auto mb-3">
                          <Search size={20} className="text-[#fbae17]" />
                        </div>
                        <p className="text-[#0b2238] font-black text-base mb-1">Où souhaitez-vous aller ?</p>
                        <p className="text-foreground/60 text-xs leading-relaxed">
                          Utilisez la <span className="text-[#fbae17] font-bold">barre de recherche</span> pour trouver un lieu à survoler,
                          ou touchez directement la carte.
                        </p>
                        <div className="mt-3 flex items-center gap-1.5 justify-center text-muted-foreground text-[10px]">
                          <Navigation size={10} className="text-[#fbae17]" />
                          Départ et retour depuis Charleroi EBCI
                        </div>
                        <button
                          type="button"
                          onClick={dismissPopup}
                          className="mt-4 w-full py-2 rounded-xl bg-[#0b2238] text-white text-xs font-bold hover:bg-[#113356] transition-colors cursor-pointer">
                          Compris
                        </button>
                      </div>
                    </div>
                  )}
                  <LeafletMapAdventure
                    ref={mapRef}
                    styleMode={styleMode}
                    onRouteChange={setRoute}
                  />
                </div>
              </div>

              {/* Stats bar */}
              <div className="bg-white border-t border-border px-4 py-2.5 flex items-center gap-1 overflow-x-auto">
                {[
                  { icon: <Clock    size={13} className="text-[#fbae17]" />, label: "Temps de vol",        value: route.totalMin  > 0 ? `≈ ${route.totalMin} min`  : "—" },
                  { icon: <MapPin   size={13} className="text-[#fbae17]" />, label: "Distance totale",     value: route.distKm    > 0 ? `${route.distKm} km`        : "—" },
                  { icon: <Eye      size={13} className="text-[#fbae17]" />, label: "Temps aux sites",     value: route.obsMin    > 0 ? `≈ ${route.obsMin} min`    : "—" },
                  { icon: <Star     size={13} className="text-[#fbae17]" />, label: "Expérience",          value: "Excellente visibilité" },
                  { icon: <PlaneTakeoff size={13} className="text-[#fbae17]" />, label: "Passagers", value: "Jusqu'à 3" },
                ].map(({ icon, label, value }, i) => (
                  <div key={i} className={`flex items-center gap-2 px-3 py-1 shrink-0 ${i > 0 ? "border-l border-border" : ""}`}>
                    {icon}
                    <div>
                      <p className="text-[9px] text-muted-foreground uppercase tracking-wider font-semibold leading-none">{label}</p>
                      <p className="text-xs font-bold text-foreground mt-0.5">{value}</p>
                    </div>
                  </div>
                ))}
                <p className="ml-auto text-[10px] text-muted-foreground/50 shrink-0 hidden lg:block">
                  Estimations indicatives selon les conditions réelles.
                </p>
              </div>
            </div>

            {/* Right sidebar */}
            <div className="hidden lg:flex flex-col w-[340px] xl:w-[380px] shrink-0 bg-[#f5f5f7] border-l border-border overflow-hidden">

              {/* Zone scrollable */}
              <div className="flex-1 min-h-0 overflow-y-auto p-4">
                <FlightSummaryCard showCTA={false} />
              </div>

              {/* CTA — épinglé en bas */}
              <div className="shrink-0 px-4 py-4 bg-white border-t border-border">
                {taxesEscalesTotal > 0 && acompte > 0 && (
                  <div className="flex items-center justify-between mb-3 text-xs text-muted-foreground">
                    <span>Acompte + taxes escales</span>
                    <span className="font-bold text-[#0b2238]">{totalAcompte}&thinsp;€</span>
                  </div>
                )}
                <button type="button"
                  disabled={route.pois.length === 0}
                  onClick={() => { setFlowStep("reserve"); loadMonth(calYear, calMonth); }}
                  className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-[#fbae17] text-[#0b2238] text-sm font-extrabold disabled:opacity-30 hover:brightness-105 transition-all shadow-md cursor-pointer">
                  Continuer ma réservation <ChevronRight size={15} />
                </button>
                <p className="text-center text-[10px] text-muted-foreground/60 mt-2">
                  <Lock size={9} className="inline mr-1" />Paiement sécurisé · aucun débit immédiat
                </p>
                {route.pois.length === 0 && (
                  <p className="text-center text-[10px] text-muted-foreground/50 mt-1">
                    Ajoutez au moins un lieu pour continuer
                  </p>
                )}
              </div>

            </div>
          </div>

          {/* Mobile CTA */}
          <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-border px-4 py-3 z-40">
            {route.pois.length > 0 && prixEstime > 0 && (
              <div className="flex items-center justify-between mb-2 px-1">
                <span className="text-xs text-muted-foreground">
                  ≈ {route.totalMin} min · {route.distKm} km
                </span>
                <span className="text-sm font-black text-[#113356]">
                  Estimé : {prixEstime} €
                </span>
              </div>
            )}
            <button type="button"
              disabled={route.pois.length === 0}
              onClick={() => { setFlowStep("reserve"); loadMonth(calYear, calMonth); }}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-[#0b2238] text-white text-sm font-extrabold disabled:opacity-40 cursor-pointer">
              {route.pois.length === 0
                ? "Ajoutez au moins un lieu"
                : <>Continuer ma réservation <ChevronRight size={15} /></>
              }
            </button>
          </div>
        </div>
      )}

      {/* ══════════════════════ STEP 2 : RESERVE ══════════════════════ */}
      {flowStep === "reserve" && (
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-6">
          {/* Back */}
          <button type="button" onClick={() => setFlowStep("build")}
            className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer group mb-6">
            <ChevronLeft size={15} className="group-hover:-translate-x-0.5 transition-transform" />
            Modifier l&apos;itinéraire
          </button>

          <div className="flex flex-col lg:flex-row gap-6 items-start">
            {/* ── FORM ── */}
            <div className="flex-1 min-w-0 space-y-4">

              {/* 1. Date & heure */}
              <div className="bg-white rounded-2xl border border-border overflow-hidden" style={{ boxShadow: "var(--sh-sm)" }}>
                <div className="bg-gradient-to-r from-[#0b2238] to-[#113356] px-5 py-3.5 flex items-center gap-3">
                  <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-xs font-bold text-[#fbae17]">1</div>
                  <div className="flex items-center gap-2">
                    <Clock size={13} className="text-[#fbae17]" />
                    <h2 className="text-sm font-extrabold text-white">Quand souhaitez-vous voler ?</h2>
                  </div>
                </div>
                <div className="p-5">
                  <div className="flex items-center justify-between mb-4">
                    <button type="button"
                      onClick={() => { if (calMonth === 1) { setCalMonth(12); setCalYear(y => y - 1); } else setCalMonth(m => m - 1); }}
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-all border border-border cursor-pointer">
                      <ChevronLeft size={15} />
                    </button>
                    <span className="text-sm font-bold">{MONTHS_FR[calMonth - 1]} {calYear}</span>
                    <button type="button"
                      onClick={() => { if (calMonth === 12) { setCalMonth(1); setCalYear(y => y + 1); } else setCalMonth(m => m + 1); }}
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
                    <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-[#fbae17]" />Sélectionné</span>
                    <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full border-2 border-border" />Disponible</span>
                    <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-muted" />Indisponible</span>
                  </div>
                  <div className="mt-3 bg-blue-50 border border-blue-100 rounded-xl px-3.5 py-2.5">
                    <p className="text-[10px] font-bold text-blue-900 mb-1">Météo — comment ça fonctionne ?</p>
                    <ul className="space-y-1">
                      {[
                        "Annulation gratuite jusqu'à 48 h avant.",
                        "Si la météo ne permet pas de voler, le vol est reporté sans frais.",
                        "C'est le pilote qui décide, jusqu'à 2 h avant — selon les conditions réelles à l'aéroport, pas chez vous.",
                      ].map(t => (
                        <li key={t} className="flex items-start gap-1.5 text-[10px] text-blue-800/70 leading-relaxed">
                          <span className="text-blue-400 shrink-0">·</span>{t}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {form.date && (
                  <div ref={slotsRef} className="border-t border-border px-5 py-4">
                    {slotsLoading ? (
                      <div className="flex items-center justify-center py-4"><Loader2 size={18} className="animate-spin text-muted-foreground/30" /></div>
                    ) : slots.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Aucun créneau disponible. Essayez une autre date.</p>
                    ) : (
                      <div>
                        <p className="text-sm font-extrabold text-foreground capitalize mb-3">{formattedDate}</p>
                        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                          {slots.map(s => (
                            <button key={s} type="button"
                              onClick={() => handleSelectTime(s)}
                              className={[
                                "py-2.5 rounded-xl border text-sm font-bold transition-all text-center cursor-pointer",
                                form.heure === s
                                  ? "border-[#fbae17] bg-[#fbae17] text-[#0b2238] shadow-sm"
                                  : "border-border text-foreground hover:border-[#fbae17]/50 hover:bg-[#fbae17]/5",
                              ].join(" ")}>{s}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* 2. Participants */}
              <div ref={passengersRef} className="bg-white rounded-2xl border border-border overflow-hidden" style={{ boxShadow: "var(--sh-sm)" }}>
                <div className="bg-gradient-to-r from-[#0b2238] to-[#113356] px-5 py-3.5 flex items-center gap-3">
                  <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-xs font-bold text-[#fbae17]">2</div>
                  <div className="flex items-center gap-2">
                    <PlaneTakeoff size={13} className="text-[#fbae17]" />
                    <h2 className="text-sm font-extrabold text-white">Participants</h2>
                  </div>
                </div>
                <div className="p-5 space-y-5">
                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-3">Nombre de passagers</label>
                    <div className="flex gap-2.5">
                      {["1","2","3"].map(n => (
                        <button key={n} type="button"
                          onClick={() => setForm(f => ({ ...f, passagers: n }))}
                          className={[
                            "flex-1 py-3 rounded-xl border text-sm font-bold transition-all text-center cursor-pointer",
                            form.passagers === n
                              ? "border-[#fbae17] bg-[#fbae17] text-[#0b2238] shadow-sm"
                              : "border-border text-foreground hover:border-[#fbae17]/50 hover:bg-[#fbae17]/5",
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
                        className="w-32 h-10 px-3 rounded-xl border border-border bg-white text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-[#fbae17]/20 focus:border-[#fbae17] transition-all placeholder:text-muted-foreground/40" />
                      <span className="text-sm text-muted-foreground">kg</span>
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">Utilisé uniquement pour préparer l&apos;équilibrage de l&apos;avion.</p>
                    {weightWarn && (
                      <div className="mt-2.5 flex items-start gap-2.5 bg-amber-50 border border-amber-200 px-3.5 py-3 rounded-xl text-sm text-amber-800">
                        <AlertTriangle size={14} className="shrink-0 mt-0.5 text-amber-500" />
                        <p>Le poids dépasse la limite recommandée de {MAX_WEIGHT} kg.</p>
                      </div>
                    )}
                    {weightError && (
                      <div className="mt-2.5 flex items-start gap-2.5 bg-red-50 border border-red-200 px-3.5 py-3 rounded-xl text-sm text-red-800">
                        <AlertCircle size={14} className="shrink-0 mt-0.5 text-red-500" />
                        <p>Poids trop élevé : le vol ne peut pas être effectué dans ces conditions.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Escales (mobile + desktop) */}
              {availableStops.length > 0 && (
                <div className="bg-white rounded-2xl border border-border overflow-hidden" style={{ boxShadow: "var(--sh-sm)" }}>
                  <div className="bg-gradient-to-r from-[#0b2238] to-[#113356] px-5 py-3.5 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="text-[#fbae17]">✈</span>
                      <h2 className="text-sm font-extrabold text-white">
                        Escale(s)&nbsp;<span className="font-normal opacity-60">(optionnel)</span>
                      </h2>
                    </div>
                    {selectedStops.length > 0 && (
                      <span className="text-[10px] bg-[#fbae17]/20 text-[#fbae17] font-bold px-2 py-0.5 rounded-full">
                        {selectedStops.length} sélectionnée{selectedStops.length > 1 ? "s" : ""}
                      </span>
                    )}
                  </div>
                  <div className="p-5">
                    <p className="text-xs text-muted-foreground mb-3">
                      Ajoutez un atterrissage intermédiaire dans un aérodrome. Les taxes d&apos;atterrissage s&apos;appliquent en sus.
                    </p>
                    {/* Selected stops */}
                    {selectedStops.length > 0 && (
                      <div className="space-y-2 mb-3">
                        {selectedStops.map(s => (
                          <div key={s.id} className="flex items-center gap-2.5 py-2 px-3 bg-secondary rounded-xl border border-border">
                            <span className="font-mono text-xs font-bold text-[#113356] shrink-0">{s.icao}</span>
                            <span className="flex-1 text-xs text-foreground truncate">{s.nom}</span>
                            {s.taxe > 0 && <span className="text-xs font-bold text-[#113356] shrink-0">+{s.taxe}&thinsp;€</span>}
                            <button type="button" onClick={() => removeStop(s.id)}
                              className="text-muted-foreground hover:text-destructive transition-colors cursor-pointer shrink-0">
                              <X size={12} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    {/* Available stop chips */}
                    {availableStops.some(s => !selectedStops.find(ss => ss.id === s.id)) && (
                      <div className="flex flex-wrap gap-2">
                        {availableStops
                          .filter(s => !selectedStops.find(ss => ss.id === s.id))
                          .map(s => (
                            <button key={s.id} type="button" onClick={() => addStop(s)}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-white text-xs font-medium hover:border-[#fbae17] hover:text-[#0b2238] transition-all cursor-pointer">
                              <Plus size={10} className="text-[#fbae17]" />
                              <span className="font-mono font-bold">{s.icao}</span>
                              <span className="text-muted-foreground truncate max-w-[110px]">{s.nom.split(" ")[0]}</span>
                              {s.taxe > 0 && <span className="text-muted-foreground">+{s.taxe}€</span>}
                            </button>
                          ))}
                      </div>
                    )}
                    {selectedStops.length === availableStops.length && (
                      <p className="text-xs text-muted-foreground italic">Toutes les escales disponibles ont été ajoutées.</p>
                    )}
                  </div>
                </div>
              )}

              {/* 3. Coordonnées */}
              <div className="bg-white rounded-2xl border border-border overflow-hidden" style={{ boxShadow: "var(--sh-sm)" }}>
                <div className="bg-gradient-to-r from-[#0b2238] to-[#113356] px-5 py-3.5 flex items-center gap-3">
                  <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-xs font-bold text-[#fbae17]">3</div>
                  <div className="flex items-center gap-2">
                    <Mail size={13} className="text-[#fbae17]" />
                    <h2 className="text-sm font-extrabold text-white">Vos coordonnées</h2>
                  </div>
                </div>
                <div className="p-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <VSMField label="Prénom" required value={form.prenom} onChange={v => setForm(f => ({ ...f, prenom: v }))} placeholder="Jean" />
                    <VSMField label="Nom"    required value={form.nom}    onChange={v => setForm(f => ({ ...f, nom:    v }))} placeholder="Dupont" />
                    <div className="sm:col-span-2">
                      <VSMField label="Email" required type="email" value={form.email} onChange={v => setForm(f => ({ ...f, email: v }))} placeholder="jean@exemple.com" />
                    </div>
                    <div className="sm:col-span-2">
                      <VSMField label="Téléphone" type="tel" value={form.telephone} onChange={v => setForm(f => ({ ...f, telephone: v }))} placeholder="+32 470 00 00 00" />
                    </div>
                  </div>
                </div>
              </div>

              {/* 4. Remarques */}
              <div className="bg-white rounded-2xl border border-border overflow-hidden" style={{ boxShadow: "var(--sh-sm)" }}>
                <div className="bg-gradient-to-r from-[#0b2238] to-[#113356] px-5 py-3.5 flex items-center gap-3">
                  <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-xs font-bold text-[#fbae17]">4</div>
                  <div className="flex items-center gap-2">
                    <Mail size={13} className="text-[#fbae17]" />
                    <h2 className="text-sm font-extrabold text-white">Un mot pour nos pilotes ? <span className="font-normal opacity-60">(optionnel)</span></h2>
                  </div>
                </div>
                <div className="p-5">
                  <textarea value={form.commentaire} rows={4} maxLength={300}
                    onChange={e => setForm(f => ({ ...f, commentaire: e.target.value }))}
                    className="w-full px-3 py-3 rounded-xl border border-border bg-white text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-[#fbae17]/20 focus:border-[#fbae17] transition-all resize-none placeholder:text-muted-foreground/40"
                    placeholder={"Ex : « C'est un anniversaire », « On aimerait faire un passage spécial », « C'est une surprise »…"} />
                  <div className="flex items-center justify-between mt-1.5">
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Info size={10} className="shrink-0" />Nous ferons notre maximum selon météo et sécurité.
                    </p>
                    <p className="text-[10px] text-muted-foreground">{form.commentaire.length} / 300</p>
                  </div>
                </div>
              </div>

              {/* CGP */}
              <div className="bg-white rounded-2xl border border-border p-5">
                <label className="flex items-start gap-3.5 cursor-pointer">
                  <input type="checkbox" checked={form.accept_cgp}
                    onChange={e => setForm(f => ({ ...f, accept_cgp: e.target.checked }))}
                    className="mt-0.5 w-4 h-4 accent-[#113356] shrink-0 cursor-pointer" />
                  <span className="text-sm text-muted-foreground leading-relaxed">
                    J&apos;accepte les{" "}
                    <Link href="/cgp" className="text-[#113356] underline underline-offset-2 font-semibold">
                      Conditions Générales de Participation
                    </Link>{" "}
                    et les{" "}
                    <Link href="/cgv" className="text-[#113356] underline underline-offset-2 font-semibold">
                      Conditions Générales de Vente
                    </Link>{" "}
                    et que mes données soient utilisées pour traiter ma réservation.
                  </span>
                </label>
              </div>

              {submitError && (
                <div className="flex items-center gap-2.5 text-sm text-destructive bg-destructive/5 border border-destructive/20 px-4 py-3.5 rounded-xl">
                  <AlertCircle size={14} className="shrink-0" /> {submitError}
                </div>
              )}

              {/* Mobile CTA */}
              <div className="lg:hidden">
                <button type="button"
                  disabled={!form.date || !form.heure || !form.prenom || !form.nom || !form.email || !form.poids_total || weightError || !form.accept_cgp || submitting}
                  onClick={handleSubmit}
                  className="w-full flex items-center justify-center gap-2 py-4 rounded-xl bg-[#fbae17] text-[#0b2238] text-sm font-extrabold disabled:opacity-40 transition-all cursor-pointer">
                  {submitting
                    ? <><Loader2 size={14} className="animate-spin" /> Envoi…</>
                    : <><Mail size={14} /> Recevoir mon lien de paiement</>
                  }
                </button>
              </div>
            </div>

            {/* ── RIGHT SIDEBAR ── */}
            <div className="hidden lg:block lg:w-[300px] xl:w-[320px] shrink-0 sticky top-28 self-start space-y-4">
              <ReserveSummary />

              <button type="button"
                disabled={!form.date || !form.heure || !form.prenom || !form.nom || !form.email || !form.poids_total || weightError || !form.accept_cgp || submitting}
                onClick={handleSubmit}
                className="w-full flex items-center justify-center gap-2 py-4 rounded-xl bg-[#fbae17] text-[#0b2238] text-sm font-extrabold disabled:opacity-40 hover:brightness-105 transition-all shadow-lg cursor-pointer">
                {submitting
                  ? <><Loader2 size={14} className="animate-spin" /> Envoi en cours…</>
                  : <><Mail size={14} /> Recevoir mon lien de paiement</>
                }
              </button>
              <p className="text-center text-[10px] text-muted-foreground">
                <Lock size={9} className="inline mr-1" />Paiement sécurisé, aucun débit immédiat
              </p>

              {/* Validation hints */}
              <div className="bg-white rounded-xl border border-border p-4 space-y-1.5 text-xs text-muted-foreground">
                {[
                  { ok: !!form.date && !!form.heure, label: "Date & heure sélectionnées" },
                  { ok: !!form.poids_total && !weightError, label: "Poids renseigné" },
                  { ok: !!form.prenom && !!form.nom && !!form.email, label: "Coordonnées complètes" },
                  { ok: form.accept_cgp, label: "CGP acceptées" },
                ].map(({ ok, label }) => (
                  <div key={label} className={`flex items-center gap-2 ${ok ? "text-green-700" : ""}`}>
                    <CheckCircle size={11} className={ok ? "text-green-500" : "text-muted-foreground/30"} />
                    {label}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════ STEP 3 : DONE ══════════════════════ */}
      {flowStep === "done" && (
        <div className="max-w-lg mx-auto px-4 py-12 pb-16">
          <div className="space-y-4">

            {/* Étapes */}
            <div className="bg-white rounded-2xl border border-border p-5" style={{ boxShadow: "var(--sh-sm)" }}>

              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                  <CheckCircle className="text-green-600" size={16} />
                </div>
                <div>
                  <p className="text-sm font-bold text-foreground">Votre aventure est réservée !</p>
                  <p className="text-[10px] text-muted-foreground">Email envoyé à {form.email}</p>
                </div>
              </div>

              {acompte > 0 && (
                <div className="mb-4 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                  <div className="flex items-start gap-2.5">
                    <Lock size={13} className="text-amber-600 mt-0.5 shrink-0" />
                    <p className="text-xs text-amber-800 leading-relaxed">
                      Un <strong>lien de paiement de l&apos;acompte ({acompte}&thinsp;€)</strong> vous a été envoyé par email. Le créneau sera confirmé dès réception.
                    </p>
                  </div>
                </div>
              )}

              <div className="space-y-0">
                {[
                  {
                    num: 1, done: true,
                    title: "Demande envoyée",
                    desc: "Votre itinéraire et vos informations ont bien été enregistrés.",
                  },
                  {
                    num: 2, done: false,
                    title: "Romain analyse votre route",
                    desc: "Dans les 24 h, Romain étudie la faisabilité de votre itinéraire. Si certaines zones ne peuvent pas être survolées (espace aérien, restrictions), il vous en informe et propose des alternatives.",
                  },
                  {
                    num: 3, done: false,
                    title: "Validation de l'itinéraire",
                    desc: "Vous recevez la route définitive par email. Vous pouvez demander des ajustements avant de donner votre accord.",
                  },
                  {
                    num: 4, done: false,
                    title: "À vous le ciel",
                    desc: "Présentez-vous 15 min avant à Charleroi (EBCI). Briefing sécurité, casques audio fournis.",
                  },
                ].map(({ num, done, title, desc }, i, arr) => (
                  <div key={num} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${done ? "bg-green-500" : "bg-[#F2B705]"}`}>
                        {done
                          ? <CheckCircle size={13} className="text-white" />
                          : <span className="font-black text-[#0b2238] text-xs leading-none">{num}</span>}
                      </div>
                      {i < arr.length - 1 && (
                        <div className="w-px bg-border mt-1" style={{ height: 28 }} />
                      )}
                    </div>
                    <div className="pb-4">
                      <p className={`text-sm font-bold ${done ? "text-green-700" : "text-foreground"}`}>{title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Infos pratiques */}
            <div className="bg-white rounded-2xl border border-border p-5 space-y-3" style={{ boxShadow: "var(--sh-sm)" }}>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[2px]">Informations pratiques</p>
              <div className="flex items-start gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-[#f5f8ff] border border-[#dce8ff] flex items-center justify-center shrink-0">
                  <MapPin size={13} className="text-[#113356]" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-foreground">Aéroport de Charleroi (EBCI)</p>
                  <p className="text-xs text-muted-foreground">Rue des Frères Wright 8, Gosselies · Arrivez 15 min avant</p>
                </div>
              </div>
              <a
                href="/access-ebci"
                className="flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-[#f5f8ff] border border-[#dce8ff] text-[#113356] rounded-xl text-xs font-semibold hover:bg-[#113356] hover:text-white hover:border-[#113356] transition-all"
              >
                <MapPin size={12} />
                Plan d&apos;accès à l&apos;aéroport
              </a>
              <div className="flex items-start gap-2.5 pt-2 border-t border-border">
                <div className="w-7 h-7 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0">
                  <CloudRain size={13} className="text-blue-500" />
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  <strong className="text-foreground">Météo :</strong> si les conditions ne permettent pas de voler, le vol est reporté sans frais. Romain décide jusqu&apos;à 2 h avant.
                </p>
              </div>
            </div>

            {/* CTAs */}
            <div className="flex flex-col gap-3">
              <a href="/account#reservations"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#113356] text-white rounded-xl text-sm font-semibold hover:bg-[#0b2238] transition-colors">
                <CalendarDays size={15} />
                Suivre ma réservation
              </a>
              <button type="button"
                onClick={() => { setFlowStep("build"); setRoute({ pois: [], distKm: 0, transitMin: 0, obsMin: 0, totalMin: 0 }); setForm(f => ({ ...f, date: "", heure: "", commentaire: "" })); mapRef.current?.clearAll(); }}
                className="inline-flex items-center justify-center px-6 py-2.5 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:bg-secondary transition-colors cursor-pointer">
                Créer un nouveau vol
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}

// ── Helper field ───────────────────────────────────────────────
function VSMField({ label, required, type = "text", value, onChange, placeholder }: {
  label: string; required?: boolean; type?: string;
  value: string; onChange: (v: string) => void; placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-semibold text-foreground mb-2">
        {label}{required && <span className="text-muted-foreground font-normal"> *</span>}
      </label>
      <input type={type} value={value} required={required} placeholder={placeholder}
        onChange={e => onChange(e.target.value)}
        className="w-full h-10 px-3 rounded-xl border border-border bg-white text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-[#fbae17]/20 focus:border-[#fbae17] transition-all placeholder:text-muted-foreground/40" />
    </div>
  );
}
