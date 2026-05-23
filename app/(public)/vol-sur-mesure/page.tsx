"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useRef, useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  MapPin, Clock, Search, Trash2, ChevronRight, ChevronLeft,
  Check, CheckCircle, Loader2, AlertCircle, AlertTriangle,
  Mail, Lock, Eye, Zap, PlaneTakeoff, X, Info,
  Navigation, Star,
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

  // ── Price calc
  const prixEstime  = route.totalMin > 0 ? Math.round((prixHeure  / 60) * route.totalMin) : 0;
  const acompte     = route.totalMin > 0 ? Math.round((acompteH   / 60) * route.totalMin) : 0;
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
      const poiNames    = route.pois.map((p, i) => `${i + 1}. ${p.nom}`).join(" | ");
      const styleLabel  = styleMode === "rapide" ? "Itinéraire direct" : "Parcours pittoresque";
      const fullComment = [
        `Lieux : ${poiNames}`,
        `Style : ${styleLabel}`,
        form.commentaire,
      ].filter(Boolean).join("\n");

      const r = await fetch("/api/vol-sur-mesure/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prenom: form.prenom, nom: form.nom, email: form.email, telephone: form.telephone,
          date: form.date, heure: form.heure,
          passagers: form.passagers, poids_total: form.poids_total,
          commentaire: fullComment,
          style_vol:    styleMode,
          waypoints:    route.pois.map(p => ({ lat: p.lat, lng: p.lng, nom: p.nom })),
          stopovers:    [],
          distKm:       route.distKm,
          dureMin:      route.totalMin,
          taxesEscales: 0,
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
          {acompte > 0 && (
            <div className="pt-2.5 border-t border-border flex items-center justify-between">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Acompte</span>
              <span className="text-2xl font-black text-[#113356]">{acompte} €</span>
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
            <div className="hidden lg:flex flex-col w-[340px] xl:w-[380px] shrink-0 overflow-y-auto bg-white border-l border-border">
              <div className="p-4 flex flex-col gap-3 min-h-full">
                <FlightSummaryCard showCTA />
                {/* Trust badges */}
                <div className="grid grid-cols-3 gap-2 text-center">
                  {[
                    { icon: <Lock size={12} />, label: "Liberté totale", sub: "Volez où vous voulez" },
                    { icon: <Navigation size={12} />, label: "Ajusté par nos pilotes", sub: "Sécurité & météo" },
                    { icon: <Info size={12} />, label: "Assistance 7/7", sub: "Questions ? On répond" },
                  ].map(({ icon, label, sub }) => (
                    <div key={label} className="bg-white rounded-xl p-2.5 border border-border">
                      <div className="text-[#fbae17] flex justify-center mb-1">{icon}</div>
                      <p className="text-[9px] font-bold text-foreground leading-tight">{label}</p>
                      <p className="text-[9px] text-muted-foreground leading-tight mt-0.5">{sub}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Mobile CTA */}
          <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-border px-4 py-3 z-40">
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
            Modifier mon vol
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
                  <p className="text-[11px] text-muted-foreground mt-3 flex items-center gap-1.5">
                    <Info size={10} className="shrink-0" />La météo sera confirmée avant le vol.
                  </p>
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
                    <Link href="/cgv" className="text-[#113356] underline underline-offset-2 font-semibold">
                      Conditions Générales de Participation
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
        <div className="max-w-lg mx-auto px-4 py-16 text-center">
          <div className="bg-white rounded-2xl border border-border p-8 space-y-6" style={{ boxShadow: "var(--sh-sm)" }}>
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
              <CheckCircle size={30} className="text-green-500" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-foreground">Votre aventure est réservée ✈</h1>
              <p className="text-muted-foreground text-sm mt-2 leading-relaxed">
                Un email de confirmation a été envoyé à <strong className="text-foreground">{form.email}</strong>.
              </p>
            </div>

            <div className="text-left bg-secondary/40 rounded-xl p-5 space-y-3.5">
              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[2px] mb-1">Prochaines étapes</p>
              {[
                { icon: <Mail size={14} className="text-primary mt-0.5 shrink-0" />, text: "Confirmation envoyée, vérifiez votre boîte email." },
                { icon: <Lock size={14} className="text-primary mt-0.5 shrink-0" />, text: acompte > 0 ? `Lien de paiement de l'acompte (${acompte} €) envoyé par email.` : "Votre vol est entièrement couvert." },
                { icon: <Check size={14} className="text-green-600 mt-0.5 shrink-0" />, text: "Nos pilotes vérifieront météo, faisabilité & disponibilité." },
                { icon: <MapPin size={14} className="text-primary mt-0.5 shrink-0" />, text: "Nous vous recontactons sous 24h pour confirmer tous les détails." },
              ].map(({ icon, text }, i) => (
                <div key={i} className="flex items-start gap-2.5">
                  {icon}
                  <p className="text-sm text-muted-foreground leading-relaxed">{text}</p>
                </div>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <a href="/"
                className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#113356] text-white rounded-xl text-sm font-bold hover:bg-[#0b2238] shadow-sm transition-all">
                Retour à l&apos;accueil
              </a>
              <button type="button"
                onClick={() => { setFlowStep("build"); setRoute({ pois: [], distKm: 0, transitMin: 0, obsMin: 0, totalMin: 0 }); setForm(f => ({ ...f, date: "", heure: "", commentaire: "" })); mapRef.current?.clearAll(); }}
                className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 bg-white border border-border text-foreground rounded-xl text-sm font-bold hover:bg-muted transition-all">
                Modifier mon vol
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
