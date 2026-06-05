"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useRef, useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import {
  MapPin, Clock, Search, Trash2, ChevronRight, ChevronLeft,
  Check, CheckCircle, Loader2, AlertCircle, AlertTriangle,
  Mail, Lock, Eye, EyeOff, Zap, PlaneTakeoff, X, Info,
  Navigation, Star, Plus, CalendarDays, CloudRain,
  ArrowRight, ShieldCheck, Monitor, UserPlus, LogIn,
} from "lucide-react";
import type {
  AdventureRouteData, AdventureMapHandle, POI, StyleMode,
} from "@/components/vol-sur-mesure/LeafletMapAdventure";

const LeafletMapAdventure = dynamic(
  () => import("@/components/vol-sur-mesure/LeafletMapAdventure"),
  { ssr: false }
);

// ── Types ─────────────────────────────────────────────────────
type FlowStep = "build" | "reserve" | "recap" | "done";

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
const MAX_WEIGHT  = 190;
const CRIT_WEIGHT = 220;

const STYLE_OPTIONS: { key: StyleMode; icon: React.ReactNode; label: string; sub: string }[] = [
  { key: "vues",   icon: <Eye size={14} />, label: "Vue panoramique",      sub: "Paysages & points d'intérêt" },
  { key: "rapide", icon: <Zap size={14} />, label: "Itinéraire équilibré", sub: "Distance et temps optimisés" },
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
  const [searchPulse,    setSearchPulse]    = useState(false);
  const searchRef      = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  function focusSearch() {
    // Flash visible + focus immédiat sur la barre de recherche
    setSearchPulse(true);
    setSearchFocused(true);
    searchInputRef.current?.focus();
    setTimeout(() => setSearchPulse(false), 1400);
  }

  // ── Popup d'accueil
  const [popupVisible, setPopupVisible] = useState(false);

  // ── Init sessionStorage : restauration complète + popup
  useEffect(() => {
    type SavedPOI = import("@/components/vol-sur-mesure/LeafletMapAdventure").POI;
    let pois: SavedPOI[] = [];
    let isLoginRestore = false;

    // Cas post-login redirect : vsm_state contient tout
    // IMPORTANT: ne pas supprimer vsm_state ici — React 18 StrictMode double-invoke les
    // effects; on le supprime dans le callback du timeout, après ajout des POIs.
    try {
      const raw = sessionStorage.getItem("vsm_state");
      if (raw) {
        isLoginRestore = true;
        const s = JSON.parse(raw) as {
          form?: Partial<FormData>;
          styleMode?: StyleMode;
          pois?: SavedPOI[];
          selectedStops?: Stopover[];
          voucherCode?: string;
          couponCode?: string;
        };
        if (s.form)          setForm(f => ({ ...f, ...s.form }));
        if (s.styleMode)     setStyleMode(s.styleMode);
        if (s.selectedStops) setSelectedStops(s.selectedStops);
        if (s.voucherCode)   { setVoucherCode(s.voucherCode); setPromoInput(s.voucherCode); }
        else if (s.couponCode) { setCouponCode(s.couponCode); setPromoInput(s.couponCode); }
        setShouldRestoreForm(true);
        restoredFromSessionRef.current = true;
        pois = s.pois ?? [];
      }
    } catch { /* ignore */ }

    // Cas navigation normale : restauration des POIs depuis vsm_pois
    if (!isLoginRestore) {
      try {
        const raw = sessionStorage.getItem("vsm_pois");
        pois = raw ? JSON.parse(raw) as SavedPOI[] : [];
      } catch { /* ignore */ }
    }

    if (pois.length === 0) {
      if (isLoginRestore) sessionStorage.removeItem("vsm_state");
      else if (!sessionStorage.getItem("vsm_popup_seen")) setPopupVisible(true);
      return;
    }

    poisTargetRef.current = pois.length;
    const t = setTimeout(() => {
      pois.forEach(p => mapRef.current?.addPOI(p));
      if (isLoginRestore) sessionStorage.removeItem("vsm_state");
    }, 1200);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Sauvegarde des POIs dans sessionStorage à chaque changement
  useEffect(() => {
    sessionStorage.setItem("vsm_pois", JSON.stringify(route.pois));
  }, [route.pois]);

  // ── Scroll vers le haut à chaque changement d'étape
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [flowStep]);

  // ── Lorsqu'on revient sur "build", la carte (CSS hidden → visible) doit recalculer sa taille
  useEffect(() => {
    if (flowStep === "build") {
      mapRef.current?.invalidateSize();
    }
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
    date: "", heure: "", passagers: "", poids_total: "",
    prenom: "", nom: "", email: "", telephone: "",
    commentaire: "", accept_cgp: false,
  });
  const [submitting,  setSubmitting]  = useState(false);
  const [submitError, setSubmitError] = useState("");

  // ── Auth state
  const [user, setUser] = useState<SupabaseUser | null>(null);
  type EmailStatus = "idle" | "checking" | "new" | "exists";
  const [emailStatus,               setEmailStatus]               = useState<EmailStatus>("idle");
  const [inlinePassword,            setInlinePassword]            = useState("");
  const [inlinePasswordConfirm,     setInlinePasswordConfirm]     = useState("");
  const [showInlinePassword,        setShowInlinePassword]        = useState(false);
  const [showInlinePasswordConfirm, setShowInlinePasswordConfirm] = useState(false);
  const [shouldRestoreForm,         setShouldRestoreForm]         = useState(false);
  const restoredFromSessionRef = useRef(false);
  const poisTargetRef          = useRef(0); // nb de POIs attendus après restore

  // ── Escales
  const [availableStops, setAvailableStops] = useState<Stopover[]>([]);
  const [selectedStops,  setSelectedStops]  = useState<Stopover[]>([]);
  const [stopsOpen,      setStopsOpen]      = useState(false);

  // ── Voucher / coupon (état interne pour le calcul et la sérialisation)
  const [voucherCode,  setVoucherCode]  = useState("");
  const [voucherData,  setVoucherData]  = useState<{ id: string; code: string; product_price: number; duration_minutes: number; product_title: string } | null>(null);
  const [couponCode,   setCouponCode]   = useState("");
  const [couponData,   setCouponData]   = useState<{ code: string; type: "percentage" | "fixed"; value: number } | null>(null);
  // ── Champ unifié bon cadeau / code promo
  const [promoInput,   setPromoInput]   = useState("");
  const [promoLoading, setPromoLoading] = useState(false);
  const [promoError,   setPromoError]   = useState("");

  // ── Price calc
  const prixEstime        = route.totalMin > 0 ? Math.round((prixHeure / 60) * route.totalMin) : 0;
  const acompte           = route.totalMin > 0 ? Math.round((acompteH  / 60) * route.totalMin) : 0;
  const taxesEscalesTotal = selectedStops.reduce((acc, s) => acc + s.taxe, 0);
  const totalAcompte      = acompte + taxesEscalesTotal;
  // Valeur du voucher : prix produit, ou fallback duration_minutes × prixHeure / 60
  const voucherValue = voucherData
    ? (voucherData.product_price > 0
        ? voucherData.product_price
        : Math.round((prixHeure / 60) * (voucherData.duration_minutes ?? 0)))
    : 0;
  const voucherDiscount          = Math.min(voucherValue, totalAcompte);
  const totalAcompteApresVoucher = Math.max(0, totalAcompte - voucherDiscount);
  const couponDiscount = couponData
    ? (couponData.type === "percentage"
        ? Math.round(totalAcompteApresVoucher * couponData.value / 100)
        : Math.min(couponData.value, totalAcompteApresVoucher))
    : 0;
  const totalAcompteFinal = Math.max(0, totalAcompteApresVoucher - couponDiscount);
  const weightKg    = parseInt(form.poids_total) || 0;
  const weightWarn  = weightKg > MAX_WEIGHT && weightKg < CRIT_WEIGHT;
  const weightCrit  = weightKg >= CRIT_WEIGHT;
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
    sb.auth.getUser().then(({ data: { user: authUser } }) => {
      if (!authUser) return;
      setUser(authUser);
      if (restoredFromSessionRef.current) return; // don't overwrite form restored from sessionStorage
      sb.from("profiles").select("full_name, phone").eq("id", authUser.id).single()
        .then(({ data }) => {
          const parts = (data?.full_name || "").split(" ");
          setForm(f => ({
            ...f, email: authUser.email ?? "",
            prenom: parts[0] ?? "", nom: parts.slice(1).join(" ") ?? "",
            telephone: data?.phone ?? "",
          }));
        });
    });
  }, []);

  // ── Navigate to reserve step once user is set after login redirect
  // Reactive: waits for POIs to propagate through onRouteChange before switching step.
  // Falls back to 2000ms in case Leaflet never fires onRouteChange (e.g. map still initializing).
  useEffect(() => {
    if (!user || !shouldRestoreForm) return;
    const hasPendingPOIs = poisTargetRef.current > 0;
    if (hasPendingPOIs && route.pois.length === 0) {
      const t = setTimeout(() => {
        setShouldRestoreForm(false);
        setFlowStep("reserve");
      }, 2000);
      return () => clearTimeout(t);
    }
    setShouldRestoreForm(false);
    setFlowStep("reserve");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, shouldRestoreForm, route.pois.length]);

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

  // Find first month with available slots silently when entering the reservation step
  useEffect(() => {
    if (flowStep !== "reserve") return;
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
  }, [flowStep]);

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
            isSel              ? "bg-primary text-primary-foreground font-bold shadow-sm scale-105" :
            isAvail && !isPast ? "hover:bg-primary/10 text-foreground/70 cursor-pointer font-semibold" :
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

  async function validatePromoCode() {
    if (!promoInput.trim()) return;
    setPromoLoading(true); setPromoError("");
    const code = promoInput.trim();
    try {
      // Essaie bon cadeau d'abord
      const vr = await fetch(`/api/vouchers/validate?code=${encodeURIComponent(code)}`);
      const vd = await vr.json();
      if (vr.ok && vd.valid) {
        setVoucherData({ id: vd.id, code: vd.code, product_price: vd.product_price, duration_minutes: vd.duration_minutes ?? 0, product_title: vd.product_title });
        setVoucherCode(code);
        setPromoInput("");
        return;
      }
      // Sinon essaie code promo
      const cr = await fetch(`/api/coupons/validate?code=${encodeURIComponent(code)}`);
      const cd = await cr.json();
      if (cr.ok && cd.valid) {
        setCouponData({ code: cd.code, type: cd.type, value: cd.value });
        setCouponCode(code);
        setPromoInput("");
        return;
      }
      setPromoError(vd.error ?? cd.error ?? "Code invalide ou déjà utilisé.");
    } catch { setPromoError("Erreur de validation."); }
    finally { setPromoLoading(false); }
  }

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

  // ── Auth helpers
  async function checkEmail() {
    const email = form.email.trim();
    if (!email || !email.includes("@")) return;
    if (user) return;
    setEmailStatus("checking");
    try {
      const r = await fetch("/api/auth/check-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const d = await r.json();
      setEmailStatus(d.exists ? "exists" : "new");
    } catch {
      setEmailStatus("idle");
    }
  }

  function handleLoginRedirect() {
    sessionStorage.setItem("vsm_state", JSON.stringify({
      form,
      styleMode,
      pois: route.pois,
      selectedStops,
      voucherCode,
      couponCode,
    }));
    window.location.href = `/login?redirectTo=${encodeURIComponent("/vol-sur-mesure")}`;
  }

  async function handleSignupAndContinue() {
    if (inlinePassword.length < 8) {
      setSubmitError("Le mot de passe doit contenir au moins 8 caractères.");
      return;
    }
    if (inlinePassword !== inlinePasswordConfirm) {
      setSubmitError("Les mots de passe ne correspondent pas.");
      return;
    }
    setSubmitting(true);
    setSubmitError("");
    try {
      const sb = createClient();
      const { data, error } = await sb.auth.signUp({
        email: form.email.trim(),
        password: inlinePassword,
        options: { data: { full_name: `${form.prenom} ${form.nom}`.trim() } },
      });
      if (error) { setSubmitError(error.message); setSubmitting(false); return; }
      if (data.user) {
        setUser(data.user);
        setSubmitting(false);
        setFlowStep("recap");
        return;
      }
    } catch {
      setSubmitError("Erreur lors de la création du compte.");
      setSubmitting(false);
      return;
    }
  }

  async function handleMainCTA() {
    if (user) { setFlowStep("recap"); return; }
    if (emailStatus === "new") { handleSignupAndContinue(); return; }
    if (emailStatus === "exists") { handleLoginRedirect(); return; }
    // email not yet checked — trigger check and wait for user to complete auth
    await checkEmail();
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
          voucher_code: voucherData?.code ?? null,
          voucher_id:   voucherData?.id   ?? null,
          coupon_code:  couponCode.trim() || null,
        }),
      });
      const d = await r.json();
      if (!r.ok) { setSubmitError(d.error || "Erreur."); return; }
      setFlowStep("done");
    } catch { setSubmitError("Erreur réseau."); }
    finally { setSubmitting(false); }
  }

  // ── STEP 2 sidebar
  function ReserveSummary() {
    return (
      <div className="card-premium overflow-hidden">
        <div className="px-5 pt-5 pb-4 border-b border-border">
          <p className="text-[10px] font-bold text-primary uppercase tracking-[2px] mb-1">Votre aventure</p>
          <p className="text-foreground text-2xl font-black leading-none">
            {route.totalMin > 0 ? `≈ ${route.totalMin} min` : "—"}
          </p>
          {route.distKm > 0 && (
            <p className="text-muted-foreground text-xs mt-1">{route.distKm} km · {prixEstime > 0 ? `≈ ${prixEstime} €` : ""}</p>
          )}
        </div>
        <div className="p-4 space-y-2.5 text-sm">
          {[
            { l: "Date",         v: formattedDate ? <span className="capitalize">{formattedDate}</span> : <span className="text-muted-foreground">Non sélectionnée</span> },
            { l: "Heure",        v: form.heure || <span className="text-muted-foreground">—</span> },
            { l: "Départ",       v: DEPART_NOM },
            { l: "Temps estimé", v: route.totalMin > 0 ? `≈ ${route.totalMin} min` : "—" },
            { l: "Passagers",    v: form.passagers },
          ].map(({ l, v }) => (
            <div key={l} className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground text-xs">{l}</span>
              <span className="font-semibold text-xs text-right">{v}</span>
            </div>
          ))}

          {/* Lieux survolés — noms réels */}
          {route.pois.length > 0 && (
            <div className="pt-1.5 border-t border-border/50 space-y-1.5">
              <p className="text-[9px] font-bold text-muted-foreground/60 uppercase tracking-wider">Lieux survolés</p>
              {route.pois.map((p, i) => (
                <div key={p.id} className="flex items-center gap-2">
                  <span className="w-4 h-4 rounded-full bg-navy text-[#F2B705] text-[8px] font-black flex items-center justify-center shrink-0">{i + 1}</span>
                  <span className="text-xs font-semibold text-foreground truncate">{p.nom}</span>
                </div>
              ))}
            </div>
          )}

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

          {/* Code promotionnel ou bon cadeau — champ unifié */}
          <div className="pt-2.5 border-t border-border space-y-2">
            <p className="text-[9px] font-bold text-muted-foreground/60 uppercase tracking-wider">Bon cadeau · code promo</p>
            {voucherData && (
              <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-2.5 py-1.5">
                <CheckCircle size={10} className="text-green-600 shrink-0" />
                <span className="text-[11px] font-bold text-green-700 flex-1 truncate">{voucherData.code}</span>
                <span className="text-[11px] font-bold text-green-600 shrink-0">−{voucherDiscount}&thinsp;€</span>
                <button type="button" onClick={() => { setVoucherData(null); setVoucherCode(""); }}
                  className="text-muted-foreground hover:text-destructive cursor-pointer shrink-0 ml-1"
                  aria-label="Retirer le voucher">
                  <X size={10} />
                </button>
              </div>
            )}
            {couponData && (
              <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-lg px-2.5 py-1.5">
                <CheckCircle size={10} className="text-blue-600 shrink-0" />
                <span className="text-[11px] font-bold text-blue-700 flex-1 truncate">{couponData.code}</span>
                <span className="text-[11px] font-bold text-blue-600 shrink-0">−{couponDiscount}&thinsp;€</span>
                <button type="button" onClick={() => { setCouponData(null); setCouponCode(""); }}
                  className="text-muted-foreground hover:text-destructive cursor-pointer shrink-0 ml-1"
                  aria-label="Retirer le code promo">
                  <X size={10} />
                </button>
              </div>
            )}
            {(!voucherData || !couponData) && (
              <>
                <div className="flex gap-1.5">
                  <input type="text" value={promoInput}
                    onChange={e => { setPromoInput(e.target.value.toUpperCase()); setPromoError(""); }}
                    onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); validatePromoCode(); } }}
                    placeholder="FLH-XXXX · PROMO2026…"
                    className="flex-1 h-8 px-2.5 rounded-lg border border-border bg-input text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-primary/20 focus:border-primary transition-all placeholder:text-muted-foreground/35 min-w-0" />
                  <button type="button" onClick={validatePromoCode}
                    disabled={!promoInput.trim() || promoLoading}
                    className="px-2.5 h-8 rounded-lg bg-navy text-white text-[11px] font-bold disabled:opacity-40 hover:bg-navy/80 transition-colors cursor-pointer flex items-center">
                    {promoLoading ? <Loader2 size={10} className="animate-spin" /> : "OK"}
                  </button>
                </div>
                {promoError && <p className="mt-1 text-[10px] text-destructive">{promoError}</p>}
              </>
            )}
          </div>

          {totalAcompte > 0 && (
            <div className="pt-2.5 border-t border-border space-y-1.5">
              {/* Acompte brut */}
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Acompte</span>
                <span className={`font-black text-foreground ${(voucherDiscount > 0 || couponDiscount > 0) ? "text-sm line-through opacity-40" : "text-2xl"}`}>
                  {totalAcompte}&thinsp;€
                </span>
              </div>
              {taxesEscalesTotal > 0 && voucherDiscount === 0 && couponDiscount === 0 && (
                <p className="text-[10px] text-muted-foreground text-right">
                  vol {acompte}€ + taxes {taxesEscalesTotal}€
                </p>
              )}
              {/* Bon cadeau */}
              {voucherDiscount > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-green-600 font-semibold flex items-center gap-1">
                    <CheckCircle size={10} />Bon cadeau
                  </span>
                  <span className="text-sm font-bold text-green-600">−{voucherDiscount}&thinsp;€</span>
                </div>
              )}
              {/* Code promo */}
              {couponDiscount > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-blue-600 font-semibold flex items-center gap-1">
                    <CheckCircle size={10} />Code promo
                  </span>
                  <span className="text-sm font-bold text-blue-600">−{couponDiscount}&thinsp;€</span>
                </div>
              )}
              {/* Total net */}
              {(voucherDiscount > 0 || couponDiscount > 0) && (
                <div className="flex items-center justify-between pt-2 border-t border-border">
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">À payer</span>
                  <span className="text-2xl font-black text-foreground">{totalAcompteFinal}&thinsp;€</span>
                </div>
              )}
            </div>
          )}
          {/* Réassurance */}
          <div className="pt-2.5 border-t border-border space-y-1.5">
            {[
              "Itinéraire sauvegardé",
              "Vos points sont conservés",
              "Paiement plus tard possible",
            ].map(t => (
              <div key={t} className="flex items-center gap-2 text-xs text-green-700">
                <CheckCircle size={11} className="text-green-500 shrink-0" />
                {t}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#f5f5f7]">
      <div className="h-[84px]" />

      {/* ══════════════════════ STEP 1 : BUILD ══════════════════════ */}
      {/* Toujours monté (CSS hidden) pour préserver les POIs Leaflet au retour */}
      {/* pb-[72px] lg:pb-0 : espace pour la barre CTA fixe sur mobile */}
      <div className={flowStep === "build" ? "flex flex-col pb-[72px] lg:pb-0" : "hidden"} style={{ height: "calc(100vh - 84px)" }}>

          {/* Sub-header : style de vol mobile uniquement */}
          <div className="lg:hidden bg-[#f5f5f7] border-b border-border px-4 pt-2.5 pb-2">
            <div className="flex gap-2 w-full max-w-[820px] mx-auto">
              {STYLE_OPTIONS.map(o => (
                <button key={o.key} type="button"
                  onClick={() => setStyleMode(o.key)}
                  className={[
                    "flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[11px] font-bold border transition-all cursor-pointer",
                    styleMode === o.key
                      ? "bg-[#0b2238] text-[#F2B705] border-[#0b2238]"
                      : "bg-white text-muted-foreground border-border",
                  ].join(" ")}>
                  <span className={styleMode === o.key ? "text-[#F2B705]" : "text-muted-foreground"}>{o.icon}</span>
                  {o.label}
                </button>
              ))}
            </div>
          </div>

          {/* Main area */}
          <div className="flex-1 min-h-0 bg-[#f5f5f7] p-3 flex gap-3 overflow-hidden">
            {/* Left: carte + instructions */}
            <div className="flex flex-col flex-1 min-w-0 gap-3">

              {/* Card 1 — Carte */}
              <div className="flex-1 min-h-0 relative rounded-2xl shadow-[0_2px_16px_rgba(0,0,0,0.10)] border border-black/6" style={{ isolation: "isolate" }}>

                  {/* Carte + popup — overflow-hidden pour coins arrondis */}
                  <div className="absolute inset-0 overflow-hidden rounded-2xl">
                  {popupVisible && route.pois.length === 0 && (
                    <div className="absolute inset-0 flex items-center justify-center z-[500] bg-black/20 backdrop-blur-sm p-4">
                      <div className="bg-white rounded-2xl p-6 sm:p-8 max-w-sm w-full shadow-2xl border border-border pointer-events-auto text-center">

                        {/* Icône */}
                        <div className="w-14 h-14 rounded-2xl bg-[#0b2238] flex items-center justify-center mx-auto mb-5">
                          <Navigation size={22} className="text-[#F2B705]" />
                        </div>

                        {/* Titre */}
                        <p className="text-[#F2B705] text-[10px] font-bold tracking-[3px] uppercase mb-2">Vol sur mesure</p>
                        <h2 className="text-[#0b2238] text-xl font-extrabold leading-snug mb-3">
                          Dessinez votre propre aventure
                        </h2>
                        <p className="text-foreground/60 text-sm leading-relaxed mb-5">
                          Ajoutez les lieux à survoler sur la carte. On calcule
                          l&apos;itinéraire, la durée et le prix en temps réel.
                        </p>

                        {/* Points */}
                        <div className="flex flex-col gap-2 mb-6 text-left">
                          {[
                            "Jusqu'à 3 passagers à bord",
                            "Prix calculé à la minute réelle",
                            "Annulation gratuite jusqu'à 48h",
                          ].map(p => (
                            <div key={p} className="flex items-center gap-2.5 text-sm text-foreground/65">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#F2B705] shrink-0" />
                              {p}
                            </div>
                          ))}
                        </div>

                        {/* Notice ordinateur recommandé */}
                        <div className="flex items-start gap-2.5 bg-secondary border border-border rounded-lg px-3.5 py-2.5 mb-5 text-left">
                          <Monitor size={14} className="text-[#0b2238] shrink-0 mt-0.5" />
                          <p className="text-[11px] text-[#0b2238]/65 leading-relaxed">
                            Pour une expérience optimale, utiliser un{" "}
                            <span className="font-semibold text-[#0b2238]">ordinateur</span>{" "}
                            est recommandé — le système de traçage est complexe.
                          </p>
                        </div>

                        {/* CTA */}
                        <button
                          type="button"
                          onClick={() => { setPopupVisible(false); sessionStorage.setItem("vsm_popup_seen", "1"); }}
                          className="w-full py-3 rounded-lg bg-primary text-primary-foreground text-sm font-bold hover:brightness-105 transition-all shadow-gold cursor-pointer"
                        >
                          Compris, tracer ma route
                        </button>
                        <p className="mt-3 text-[10px] text-muted-foreground/50 flex items-center gap-1 justify-center">
                          <Lock size={9} className="shrink-0" />Aucun paiement à cette étape
                        </p>

                      </div>
                    </div>
                  )}
                  <LeafletMapAdventure
                    ref={mapRef}
                    styleMode={styleMode}
                    onRouteChange={setRoute}
                  />
                  </div>{/* end overflow-hidden inner */}

                  {/* Barre de recherche — overlay top center */}
                  <div ref={searchRef} className="absolute top-3 left-0 right-0 flex justify-center z-[450] px-4 pointer-events-none">
                    <div className="pointer-events-auto w-full max-w-lg flex items-center gap-2">
                      <div className="relative flex-1 min-w-0">
                        <div className={[
                          "flex items-center gap-2.5 h-10 rounded-lg px-3.5 transition-all border-2",
                          searchPulse
                            ? "bg-white border-primary shadow-[0_0_0_6px_rgba(242,183,5,0.30)] animate-pulse"
                            : searchFocused || searchOpen
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
                            onFocus={() => { setSearchFocused(true); if (searchResults.length > 0) setSearchOpen(true); }}
                            onBlur={() => setTimeout(() => setSearchFocused(false), 150)}
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
                        {/* Dropdown résultats */}
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
                                <span className="text-[10px] text-primary font-bold shrink-0 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
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
                          className="flex items-center gap-1.5 h-10 px-3 rounded-lg border border-white/70 bg-white/95 text-xs font-semibold text-muted-foreground hover:text-destructive hover:border-destructive/30 transition-colors cursor-pointer shrink-0 backdrop-blur-sm shadow-md">
                          <Trash2 size={12} />
                          <span className="hidden sm:block">Tout effacer</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* ── Légende ── */}
                  <div className="absolute bottom-5 left-3 z-[400] pointer-events-none">
                    <div className="bg-[#0b2238]/88 backdrop-blur-sm border border-white/12 rounded-xl px-3 py-2.5 space-y-1.5">
                      <p className="text-[#F2B705] text-[7px] font-black tracking-[2px] uppercase mb-2 leading-none">Légende</p>
                      {[
                        {
                          icon: <span className="w-3 h-3 rounded-sm shrink-0 border border-dashed border-red-400" style={{ background: "rgba(239,68,68,0.45)" }} />,
                          label: "Zone interdite (EBR)",
                        },
                        {
                          icon: <span className="w-3 h-3 rounded-full shrink-0 bg-[#F2B705] flex items-center justify-center text-[6px] font-black text-[#0b2238]">1</span>,
                          label: "Lieu à survoler",
                        },
                        {
                          icon: <span className="w-3 h-3 rounded-[3px] shrink-0 bg-[#0b2238] border border-[#F2B705] flex items-center justify-center text-[7px]">✈</span>,
                          label: "Escale",
                        },
                        {
                          icon: <span className="w-3 h-3 rounded-full shrink-0 bg-[#F2B705] flex items-center justify-center"><PlaneTakeoff size={7} className="text-[#0b2238]" /></span>,
                          label: "Charleroi EBCI",
                        },
                      ].map(({ icon, label }) => (
                        <div key={label} className="flex items-center gap-2">
                          <div className="flex items-center justify-center w-3 h-3 shrink-0">{icon}</div>
                          <span className="text-white/60 text-[9px] font-medium whitespace-nowrap">{label}</span>
                        </div>
                      ))}
                    </div>
                  </div>

              </div>

              {/* Card 3 — Instructions ── */}
              <div className="hidden lg:grid grid-cols-3 divide-x divide-border rounded-lg bg-card shadow-sm border border-border shrink-0">
                {[
                  { n: 1, title: "Tracez votre itinéraire",   desc: "Cliquez sur la carte pour ajouter vos points de passage." },
                  { n: 2, title: "Découvrez le prix estimé",  desc: "Le prix se met à jour en temps réel en fonction de votre parcours." },
                  { n: 3, title: "Soumettez votre demande", desc: "Envoyez votre itinéraire — aucun paiement maintenant." },
                ].map(({ n, title, desc }) => (
                  <div key={n} className="flex items-start gap-3 px-5 py-3.5">
                    <div className="w-6 h-6 rounded-full bg-navy text-white flex items-center justify-center text-[11px] font-black shrink-0 mt-0.5">{n}</div>
                    <div>
                      <p className="text-[11px] font-bold text-foreground">{title}</p>
                      <p className="text-[10px] text-muted-foreground leading-relaxed mt-0.5">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Card 2 — Sidebar droite */}
            <div className="hidden lg:flex flex-col w-[360px] xl:w-[400px] shrink-0 card-premium overflow-hidden">

              {/* Zone scrollable */}
              <div className="flex-1 min-h-0 overflow-y-auto">

                {/* En-tête */}
                <div className="px-6 pt-6 pb-5 border-b border-border">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-9 h-9 rounded-xl bg-[#0b2238] flex items-center justify-center shrink-0">
                      <PlaneTakeoff size={16} className="text-[#F2B705]" />
                    </div>
                    <h2 className="text-xl font-black text-[#0b2238] leading-tight">Votre expérience</h2>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Créez votre itinéraire et découvrez le prix estimé en temps réel.
                  </p>
                </div>

                {/* Stats — 3 colonnes */}
                <div className="grid grid-cols-3 divide-x divide-border border-b border-border">
                  {[
                    { icon: <Clock size={9} />,  label: "TEMPS ESTIMÉ",
                      main: route.totalMin > 0
                        ? (route.totalMin >= 60 ? `${Math.floor(route.totalMin / 60)}h${String(route.totalMin % 60).padStart(2, "0")}` : `${route.totalMin}`)
                        : "—",
                      sub: route.totalMin >= 60 ? "heures" : route.totalMin > 0 ? "minutes" : "",
                    },
                    { icon: <MapPin size={9} />, label: "DISTANCE",
                      main: route.distKm > 0 ? `${route.distKm}` : "—",
                      sub: route.distKm > 0 ? "km" : "",
                    },
                    { icon: <Star size={9} />,   label: "PRIX ESTIMÉ",
                      main: prixEstime > 0 ? `${prixEstime}` : "—",
                      sub: prixEstime > 0 ? "€" : "",
                    },
                  ].map(({ icon, label, main, sub }) => (
                    <div key={label} className="py-4 px-2.5 text-center">
                      <p className="flex items-center justify-center gap-1 text-[7px] font-bold text-muted-foreground/70 uppercase tracking-[1.5px] mb-2">
                        {icon}{label}
                      </p>
                      <p className="text-2xl font-black text-[#0b2238] leading-none">{main}</p>
                      {sub && <p className="text-[10px] text-muted-foreground mt-1">{sub}</p>}
                    </div>
                  ))}
                </div>

                {/* Votre parcours — timeline */}
                <div className="px-5 py-4 border-b border-border">
                  <h3 className="text-[9px] font-black text-foreground/40 uppercase tracking-[2px] mb-3">Votre parcours</h3>
                  <div className="space-y-1.5">

                    {/* Départ */}
                    <div className="flex items-center gap-2.5">
                      <div className="w-3 h-3 rounded-full bg-[#F2B705] shrink-0 ring-4 ring-[#F2B705]/15" />
                      <div className="flex-1 flex items-center justify-between bg-navy rounded-lg px-3.5 py-2.5">
                        <span className="text-xs font-bold text-white">Charleroi (EBCI)</span>
                        <span className="text-[9px] font-bold text-[#F2B705] uppercase tracking-wide">Départ</span>
                      </div>
                    </div>

                    {route.pois.length === 0 ? (
                      <div className="flex items-center gap-2.5 py-1">
                        <div className="w-3 h-3 rounded-full bg-border shrink-0" />
                        <p className="text-[11px] text-muted-foreground italic">Ajoutez des lieux sur la carte…</p>
                      </div>
                    ) : (
                      route.pois.map(poi => (
                        <div key={poi.id} className="flex items-center gap-2.5">
                          <div className="w-3 h-3 rounded-full bg-white border-2 border-muted-foreground/30 shrink-0" />
                          <div className="flex-1 flex items-center justify-between bg-navy rounded-lg px-3.5 py-2.5">
                            <span className="text-xs font-bold text-white truncate flex-1 min-w-0 mr-2">{poi.nom}</span>
                            <button
                              onClick={() => mapRef.current?.removePOI(poi.id)}
                              className="shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/8 hover:bg-red-500/20 text-white/35 hover:text-red-400 transition-all cursor-pointer border border-white/10 hover:border-red-400/30">
                              <X size={12} />
                              <span className="text-[9px] font-bold hidden xl:block">Retirer</span>
                            </button>
                          </div>
                        </div>
                      ))
                    )}

                    {/* Arrivée */}
                    {route.pois.length > 0 && (
                      <div className="flex items-center gap-2.5">
                        <div className="w-3 h-3 rounded-full bg-[#F2B705] shrink-0 ring-4 ring-[#F2B705]/15" />
                        <div className="flex-1 flex items-center justify-between bg-navy rounded-lg px-3.5 py-2.5">
                          <span className="text-xs font-bold text-white">Charleroi (EBCI)</span>
                          <span className="text-[9px] font-bold text-[#F2B705] uppercase tracking-wide">Arrivée</span>
                        </div>
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

                    {/* Sélectionnées */}
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

                    {/* Picker */}
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

                {/* Style de vol */}
                <div className="px-5 py-4 border-b border-border">
                  <h3 className="text-[9px] font-black text-foreground/40 uppercase tracking-[2px] mb-3">Style de vol</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {STYLE_OPTIONS.map(o => (
                      <button key={o.key} type="button" onClick={() => setStyleMode(o.key)}
                        className={[
                          "flex flex-col items-start gap-1.5 px-3 py-3 rounded-lg border-2 text-left transition-all cursor-pointer",
                          styleMode === o.key
                            ? "border-primary bg-primary/5"
                            : "border-border bg-card hover:border-primary/50",
                        ].join(" ")}>
                        <span className={styleMode === o.key ? "text-[#F2B705]" : "text-muted-foreground"}>{o.icon}</span>
                        <p className={`text-[11px] font-bold leading-tight ${styleMode === o.key ? "text-[#0b2238]" : "text-foreground"}`}>{o.label}</p>
                        <p className="text-[9px] text-muted-foreground leading-snug">{o.sub}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Notice légale */}
                <div className="px-5 py-4 flex items-start gap-2.5">
                  <ShieldCheck size={13} className="text-muted-foreground/40 shrink-0 mt-0.5" />
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Vol réalisé dans le cadre du partage des coûts. Assurance passagers incluse.
                  </p>
                </div>

              </div>

              {/* CTA épinglé */}
              <div className="shrink-0 px-5 py-5 bg-card border-t border-border">
                {taxesEscalesTotal > 0 && acompte > 0 && (
                  <div className="flex items-center justify-between mb-3 text-xs text-muted-foreground">
                    <span>Acompte + taxes escales</span>
                    <span className="font-bold text-foreground">{totalAcompte}&thinsp;€</span>
                  </div>
                )}
                <button type="button"
                  disabled={route.pois.length === 0}
                  onClick={() => setFlowStep("reserve")}
                  className="w-full flex items-center justify-center gap-2.5 py-4 rounded-lg bg-primary text-primary-foreground text-[15px] font-black disabled:opacity-30 hover:brightness-105 transition-all cursor-pointer shadow-gold">
                  Continuer ma réservation <ArrowRight size={16} />
                </button>
                <p className="text-center text-[10px] text-muted-foreground/50 mt-3 flex items-center gap-1 justify-center">
                  <Lock size={9} className="shrink-0" />Paiement sécurisé par Stripe
                </p>
                {route.pois.length === 0 && (
                  <p className="text-center text-[10px] text-muted-foreground/40 mt-1">
                    Ajoutez au moins un lieu pour continuer
                  </p>
                )}
              </div>

            </div>
          </div>

          {/* Mobile CTA */}
          <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-card border-t border-border px-4 pt-2.5 pb-4 z-40">
            {route.pois.length > 0 && (
              <div className="flex items-center justify-between mb-2.5">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-xs font-bold text-[#0b2238] shrink-0">
                    {route.pois.length} lieu{route.pois.length > 1 ? "x" : ""}
                  </span>
                  {route.totalMin > 0 && (
                    <span className="text-xs text-muted-foreground truncate">
                      · ≈{route.totalMin} min · {route.distKm} km
                    </span>
                  )}
                </div>
                {prixEstime > 0 && (
                  <span className="text-sm font-black text-[#0b2238] shrink-0">{prixEstime}&thinsp;€</span>
                )}
              </div>
            )}
            <button type="button"
              disabled={route.pois.length === 0}
              onClick={() => setFlowStep("reserve")}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-lg bg-primary text-primary-foreground text-sm font-black disabled:opacity-40 cursor-pointer transition-all shadow-gold">
              {route.pois.length === 0
                ? "Ajoutez un lieu sur la carte"
                : <>Continuer ma réservation <ChevronRight size={15} /></>
              }
            </button>
          </div>
        </div>

      {/* ══════════════════════ STEP 2 : RESERVE ══════════════════════ */}
      {flowStep === "reserve" && (
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 xl:px-10 py-10">

          {/* ── Bande de navigation + récap de route ─────────────────── */}
          <div className="flex items-center gap-3 mb-6">
            <button type="button" onClick={() => setFlowStep("build")}
              className="flex items-center gap-2 text-sm font-bold text-foreground hover:text-foreground cursor-pointer group shrink-0">
              <div className="w-9 h-9 rounded-lg border border-border flex items-center justify-center group-hover:bg-navy group-hover:border-navy transition-all">
                <ChevronLeft size={15} className="text-foreground group-hover:text-white transition-colors" />
              </div>
              <span className="hidden sm:block">Modifier l&apos;itinéraire</span>
            </button>

            {/* Récap route */}
            <div className="flex-1 min-w-0 flex items-center gap-3 card-premium px-4 py-2.5 overflow-hidden">
              <PlaneTakeoff size={13} className="text-foreground shrink-0" />
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground flex-1 min-w-0 overflow-hidden">
                <span className="text-foreground font-bold shrink-0">Charleroi</span>
                {route.pois.map(p => (
                  <span key={p.id} className="flex items-center gap-1.5 shrink-0">
                    <ArrowRight size={9} className="text-muted-foreground/40" />
                    <span className="text-foreground/75 font-medium truncate max-w-[80px] sm:max-w-[120px]">{p.nom}</span>
                  </span>
                ))}
                <ArrowRight size={9} className="text-muted-foreground/40 shrink-0" />
                <span className="text-foreground font-bold shrink-0">Charleroi</span>
              </div>
              <div className="flex items-center gap-3 shrink-0 border-l border-border pl-3">
                {route.totalMin > 0 && <span className="text-foreground font-black text-sm">≈{route.totalMin}&thinsp;min</span>}
                {prixEstime > 0 && <span className="text-muted-foreground text-xs font-semibold">{prixEstime}&thinsp;€</span>}
              </div>
            </div>
          </div>

          <div className="flex flex-col lg:flex-row gap-6 lg:items-start">
            {/* ── FORM ── */}
            <div className="flex-1 min-w-0 space-y-4">

              {/* Mobile — récap du vol (sidebar invisible sur mobile) */}
              <div className="lg:hidden bg-[#0b2238] rounded-2xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-[8px] font-black text-white/35 uppercase tracking-[2.5px] mb-1">Votre vol</p>
                    <p className="text-white font-black text-2xl leading-none">
                      {route.totalMin > 0 ? `≈ ${route.totalMin}` : "—"}
                      {route.totalMin > 0 && <span className="text-base font-bold ml-1">min</span>}
                    </p>
                  </div>
                  {prixEstime > 0 && (
                    <div className="text-right">
                      <p className="text-[8px] font-black text-white/35 uppercase tracking-[2.5px] mb-1">Prix estimé</p>
                      <p className="text-[#F2B705] font-black text-2xl leading-none">{prixEstime}&thinsp;€</p>
                    </div>
                  )}
                </div>
                {route.pois.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-2.5 border-t border-white/10">
                    {route.pois.map(p => (
                      <span key={p.id} className="bg-white/10 text-white/70 text-[10px] font-semibold px-2.5 py-1 rounded-lg">{p.nom}</span>
                    ))}
                  </div>
                )}
              </div>

              {/* 1. Date & heure */}
              <div className="card-premium overflow-hidden">
                <div className="px-6 pt-5 pb-4 border-b border-border flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-navy flex items-center justify-center shrink-0">
                    <span className="text-primary font-black text-[13px]">1</span>
                  </div>
                  <h2 className="text-[15px] font-black text-foreground">Quand souhaitez-vous voler ?</h2>
                </div>
                <div className="p-5">
                  <div className="flex items-center justify-between mb-4">
                    <button type="button"
                      onClick={() => { const ny = calMonth === 1 ? calYear - 1 : calYear; const nm = calMonth === 1 ? 12 : calMonth - 1; setCalYear(ny); setCalMonth(nm); loadMonth(ny, nm); }}
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-all border border-border cursor-pointer">
                      <ChevronLeft size={15} />
                    </button>
                    <span className="text-sm font-bold">{MONTHS_FR[calMonth - 1]} {calYear}</span>
                    <button type="button"
                      onClick={() => { const ny = calMonth === 12 ? calYear + 1 : calYear; const nm = calMonth === 12 ? 1 : calMonth + 1; setCalYear(ny); setCalMonth(nm); loadMonth(ny, nm); }}
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
                  <div ref={slotsRef} className="border-t border-border px-5 py-4">
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
                              onClick={() => handleSelectTime(s)}
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

              {/* 2. Participants */}
              <div ref={passengersRef} className="card-premium overflow-hidden">
                <div className="px-6 pt-5 pb-4 border-b border-border flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-navy flex items-center justify-center shrink-0">
                    <span className="text-primary font-black text-[13px]">2</span>
                  </div>
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
                    {weightWarn && !weightCrit && (
                      <div className="mt-2.5 flex items-start gap-2.5 bg-amber-50 border border-amber-200 px-3.5 py-3 rounded-lg text-sm text-amber-800">
                        <AlertTriangle size={14} className="shrink-0 mt-0.5 text-amber-500" />
                        <p>Le poids dépasse la limite recommandée de {MAX_WEIGHT} kg. Vous pouvez continuer votre demande, la faisabilité sera vérifiée avant de vous envoyer le lien de paiement.</p>
                      </div>
                    )}
                    {weightCrit && (
                      <div className="mt-2.5 flex items-start gap-2.5 bg-red-50 border border-red-200 px-3.5 py-3 rounded-lg text-sm text-red-800">
                        <AlertCircle size={14} className="shrink-0 mt-0.5 text-red-500" />
                        <p>Le poids total est très élevé ({CRIT_WEIGHT} kg+). Vous pouvez continuer, nous vous contacterons pour confirmer la faisabilité avant toute suite.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* 3. Coordonnées */}
              <div className="card-premium overflow-hidden">
                <div className="px-6 pt-5 pb-4 border-b border-border flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-navy flex items-center justify-center shrink-0">
                    <span className="text-primary font-black text-[13px]">3</span>
                  </div>
                  <div>
                    <h2 className="text-[15px] font-black text-foreground leading-tight">Vos coordonnées</h2>
                    <p className="text-[11px] text-muted-foreground mt-0.5">Nous vous contactons ici pour confirmer le vol</p>
                  </div>
                </div>
                <div className="p-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <VSMField label="Prénom" required value={form.prenom} onChange={v => setForm(f => ({ ...f, prenom: v }))} placeholder="Jean" />
                    <VSMField label="Nom"    required value={form.nom}    onChange={v => setForm(f => ({ ...f, nom:    v }))} placeholder="Dupont" />
                    <div className="sm:col-span-2">
                      <VSMField label="Email" required type="email" value={form.email}
                        onChange={v => { setForm(f => ({ ...f, email: v })); setEmailStatus("idle"); }}
                        placeholder="jean@exemple.com"
                        onBlur={checkEmail} />
                    </div>

                    {/* Inline auth block */}
                    {!user && emailStatus !== "idle" && (
                      <div className="sm:col-span-2">
                        {emailStatus === "checking" && (
                          <div className="flex items-center gap-2 text-xs text-muted-foreground py-1">
                            <Loader2 size={12} className="animate-spin" /> Vérification…
                          </div>
                        )}
                        {emailStatus === "exists" && (
                          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3.5">
                            <p className="text-sm font-bold text-amber-900 flex items-center gap-2 mb-1">
                              <LogIn size={14} className="shrink-0" /> Un compte existe déjà avec cet email
                            </p>
                            <p className="text-xs text-amber-700 mb-3">
                              Connectez-vous pour finaliser votre réservation. Votre parcours sera sauvegardé.
                            </p>
                            <button type="button" onClick={handleLoginRedirect}
                              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#0b2238] text-white text-sm font-bold hover:bg-[#0b2238]/80 transition-colors cursor-pointer">
                              <LogIn size={13} /> Se connecter
                            </button>
                          </div>
                        )}
                        {emailStatus === "new" && (
                          <div className="rounded-lg border border-primary/20 bg-primary/5 px-4 py-4 space-y-3">
                            <p className="text-sm font-bold text-foreground flex items-center gap-2">
                              <UserPlus size={14} className="shrink-0 text-primary" /> Créez votre compte Fly Horizons
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Un compte est nécessaire pour accéder à vos bons de vol et gérer vos réservations.
                            </p>
                            <div className="space-y-2.5">
                              <div>
                                <label className="block text-xs font-bold text-foreground uppercase tracking-[1.5px] mb-1.5">
                                  Mot de passe <span className="text-primary">*</span>
                                </label>
                                <div className="relative">
                                  <input
                                    type={showInlinePassword ? "text" : "password"}
                                    value={inlinePassword}
                                    onChange={e => setInlinePassword(e.target.value)}
                                    placeholder="8 caractères minimum"
                                    className="w-full h-11 px-4 pr-10 rounded-lg border border-border bg-input text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all placeholder:text-muted-foreground/35"
                                  />
                                  <button type="button" onClick={() => setShowInlinePassword(v => !v)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer">
                                    {showInlinePassword ? <EyeOff size={14} /> : <Eye size={14} />}
                                  </button>
                                </div>
                              </div>
                              <div>
                                <label className="block text-xs font-bold text-foreground uppercase tracking-[1.5px] mb-1.5">
                                  Confirmer <span className="text-primary">*</span>
                                </label>
                                <div className="relative">
                                  <input
                                    type={showInlinePasswordConfirm ? "text" : "password"}
                                    value={inlinePasswordConfirm}
                                    onChange={e => setInlinePasswordConfirm(e.target.value)}
                                    placeholder="Répétez le mot de passe"
                                    className="w-full h-11 px-4 pr-10 rounded-lg border border-border bg-input text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all placeholder:text-muted-foreground/35"
                                  />
                                  <button type="button" onClick={() => setShowInlinePasswordConfirm(v => !v)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer">
                                    {showInlinePasswordConfirm ? <EyeOff size={14} /> : <Eye size={14} />}
                                  </button>
                                </div>
                              </div>
                            </div>
                            <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                              <ShieldCheck size={9} className="shrink-0 text-green-500" />
                              Vos données restent confidentielles.
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    <div className="sm:col-span-2">
                      <VSMField label="Téléphone" type="tel" value={form.telephone} onChange={v => setForm(f => ({ ...f, telephone: v }))} placeholder="+32 470 00 00 00" />
                    </div>
                  </div>
                </div>
              </div>

              {/* 4. Message pilote */}
              <div className="card-premium overflow-hidden">
                <div className="px-6 pt-5 pb-4 border-b border-border flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-navy flex items-center justify-center shrink-0">
                    <span className="text-primary font-black text-[13px]">4</span>
                  </div>
                  <h2 className="text-[15px] font-black text-foreground leading-tight">
                    Un commentaire ? <span className="text-sm font-normal text-muted-foreground">(optionnel)</span>
                  </h2>
                </div>
                <div className="p-5">
                  <textarea value={form.commentaire} rows={3} maxLength={300}
                    onChange={e => setForm(f => ({ ...f, commentaire: e.target.value }))}
                    className="w-full px-3 py-3 rounded-lg border border-border bg-input text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all resize-none placeholder:text-muted-foreground/40"
                    placeholder={"Ex : « C'est un anniversaire », « On aimerait faire un passage spécial », « C'est une surprise »…"} />
                  <div className="flex items-center justify-between mt-1.5">
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Info size={10} className="shrink-0" />Nous ferons notre maximum selon météo et sécurité.
                    </p>
                    <p className="text-[10px] text-muted-foreground">{form.commentaire.length} / 300</p>
                  </div>
                </div>
              </div>

              {/* 5. Bon cadeau / code promo — mobile uniquement (disponible dans la sidebar sur desktop) */}
              <div className="lg:hidden card-premium overflow-hidden">
                <div className="px-6 pt-5 pb-4 border-b border-border flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-navy flex items-center justify-center shrink-0">
                    <span className="text-primary font-black text-[13px]">5</span>
                  </div>
                  <div>
                    <h2 className="text-[15px] font-black text-foreground leading-tight">Bon cadeau ou code promo</h2>
                    <p className="text-[11px] text-muted-foreground mt-0.5">optionnel</p>
                  </div>
                </div>
                <div className="p-5 space-y-3">
                  {voucherData && (
                    <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-lg px-4 py-3">
                      <CheckCircle size={14} className="text-green-600 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-green-700">{voucherData.code}</p>
                        <p className="text-xs text-green-600">{voucherData.product_title} · −{voucherDiscount}&thinsp;€ déduits</p>
                      </div>
                      <button type="button" onClick={() => { setVoucherData(null); setVoucherCode(""); }}
                        className="text-muted-foreground hover:text-destructive transition-colors cursor-pointer">
                        <X size={14} />
                      </button>
                    </div>
                  )}
                  {couponData && (
                    <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-lg px-4 py-3">
                      <CheckCircle size={14} className="text-blue-600 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-blue-700">{couponData.code}</p>
                        <p className="text-xs text-blue-600">
                          {couponData.type === "percentage"
                            ? `−${couponData.value} % → −${couponDiscount} €`
                            : `−${couponDiscount} €`}
                        </p>
                      </div>
                      <button type="button" onClick={() => { setCouponData(null); setCouponCode(""); }}
                        className="text-muted-foreground hover:text-destructive transition-colors cursor-pointer">
                        <X size={14} />
                      </button>
                    </div>
                  )}
                  {(!voucherData || !couponData) && (
                    <div>
                      <div className="flex gap-2">
                        <input type="text" value={promoInput}
                          onChange={e => { setPromoInput(e.target.value.toUpperCase()); setPromoError(""); }}
                          onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); validatePromoCode(); } }}
                          placeholder="Bon cadeau ou code promo"
                          className="flex-1 h-10 px-3.5 rounded-lg border border-border bg-input text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all placeholder:text-muted-foreground/35" />
                        <button type="button" onClick={validatePromoCode}
                          disabled={!promoInput.trim() || promoLoading}
                          className="px-4 h-10 rounded-lg bg-navy text-white text-sm font-bold disabled:opacity-40 hover:bg-navy/80 transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1.5">
                          {promoLoading ? <Loader2 size={13} className="animate-spin" /> : "Valider"}
                        </button>
                      </div>
                      {promoError && <p className="mt-2 text-xs text-destructive">{promoError}</p>}
                      <p className="mt-1.5 text-[10px] text-muted-foreground">Fonctionne avec les bons cadeau et les codes promo.</p>
                    </div>
                  )}
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
                  disabled={!form.date || !form.heure || !form.prenom || !form.nom || !form.email || !form.poids_total || submitting || emailStatus === "checking"}
                  onClick={handleMainCTA}
                  className="w-full flex items-center justify-center gap-2 py-4 rounded-lg bg-primary text-primary-foreground text-sm font-black disabled:opacity-40 transition-all cursor-pointer shadow-gold">
                  {submitting
                    ? <><Loader2 size={14} className="animate-spin" /> {!user && emailStatus === "new" ? "Création…" : "Chargement…"}</>
                    : !user && emailStatus === "exists"
                    ? <><LogIn size={14} /> Se connecter pour continuer</>
                    : !user && emailStatus === "new"
                    ? <><UserPlus size={14} /> Créer mon compte et continuer</>
                    : <>Voir le récapitulatif <ChevronRight size={15} /></>
                  }
                </button>
              </div>
            </div>

            {/* ── RIGHT SIDEBAR ── */}
            <div className="hidden lg:block lg:w-[300px] xl:w-[320px] shrink-0 sticky top-28 self-start space-y-4">
              <ReserveSummary />

              <button type="button"
                disabled={!form.date || !form.heure || !form.prenom || !form.nom || !form.email || !form.poids_total || submitting || emailStatus === "checking"}
                onClick={handleMainCTA}
                className="w-full flex items-center justify-center gap-2 py-4 rounded-lg bg-primary text-primary-foreground text-sm font-black disabled:opacity-40 hover:brightness-105 transition-all shadow-gold cursor-pointer">
                {submitting
                  ? <><Loader2 size={14} className="animate-spin" /> {!user && emailStatus === "new" ? "Création…" : "Chargement…"}</>
                  : !user && emailStatus === "exists"
                  ? <><LogIn size={14} /> Se connecter pour continuer</>
                  : !user && emailStatus === "new"
                  ? <><UserPlus size={14} /> Créer mon compte et continuer</>
                  : <>Voir le récapitulatif <ChevronRight size={15} /></>
                }
              </button>
              <p className="text-center text-[10px] text-muted-foreground">
                <Lock size={9} className="inline mr-1" />Paiement sécurisé, aucun débit immédiat
              </p>

              {/* Validation checklist */}
              <div className="card-premium p-4">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[2px] mb-3">Checklist</p>
                <div className="space-y-2">
                  {[
                    { ok: !!form.date && !!form.heure, label: "Date & heure sélectionnées" },
                    { ok: !!form.poids_total,          label: "Poids renseigné" },
                    { ok: !!form.prenom && !!form.nom && !!form.email, label: "Coordonnées complètes" },
                  ].map(({ ok, label }) => (
                    <div key={label} className={`flex items-center gap-2.5 text-xs transition-colors ${ok ? "text-green-600 font-medium" : "text-muted-foreground/50"}`}>
                      <div className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 border transition-all ${ok ? "border-green-300 bg-green-50" : "border-border bg-white"}`}>
                        <CheckCircle size={9} className={ok ? "text-green-500" : "text-muted-foreground/25"} />
                      </div>
                      {label}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════ STEP 3 : RECAP ══════════════════════ */}
      {flowStep === "recap" && (
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 xl:px-10 py-10">

          {/* ── Bande de navigation — même structure que step 2 */}
          <div className="flex items-center gap-3 mb-6">
            <button type="button" onClick={() => setFlowStep("reserve")}
              className="flex items-center gap-2 text-sm font-bold text-foreground hover:text-foreground cursor-pointer group shrink-0">
              <div className="w-9 h-9 rounded-lg border border-border flex items-center justify-center group-hover:bg-navy group-hover:border-navy transition-all">
                <ChevronLeft size={15} className="text-foreground group-hover:text-white transition-colors" />
              </div>
              <span className="hidden sm:block">Modifier la réservation</span>
            </button>
            <div className="flex-1 min-w-0 flex items-center gap-3 card-premium px-4 py-2.5 overflow-hidden">
              <PlaneTakeoff size={13} className="text-foreground shrink-0" />
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground flex-1 min-w-0 overflow-hidden">
                <span className="text-foreground font-bold shrink-0">Charleroi</span>
                {route.pois.map(p => (
                  <span key={p.id} className="flex items-center gap-1.5 shrink-0">
                    <ArrowRight size={9} className="text-muted-foreground/40" />
                    <span className="text-foreground/75 font-medium truncate max-w-[80px] sm:max-w-[120px]">{p.nom}</span>
                  </span>
                ))}
                <ArrowRight size={9} className="text-muted-foreground/40 shrink-0" />
                <span className="text-foreground font-bold shrink-0">Charleroi</span>
              </div>
              <div className="flex items-center gap-3 shrink-0 border-l border-border pl-3">
                {route.totalMin > 0 && <span className="text-foreground font-black text-sm">≈{route.totalMin}&thinsp;min</span>}
                {prixEstime > 0 && <span className="text-muted-foreground text-xs font-semibold">{prixEstime}&thinsp;€</span>}
              </div>
            </div>
          </div>

          <div className="flex flex-col lg:flex-row gap-6 lg:items-start">
            {/* ── LEFT COLUMN */}
            <div className="flex-1 min-w-0 space-y-4">

              {/* Récap condensé — itinéraire + infos + coordonnées en une seule card */}
              <div className="card-premium overflow-hidden">
                {/* Header itinéraire */}
                <div className="px-5 pt-4 pb-3 bg-navy/5 border-b border-border flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <PlaneTakeoff size={13} className="text-foreground shrink-0" />
                    <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-sm min-w-0">
                      <span className="font-bold text-foreground">Charleroi</span>
                      {route.pois.map(p => (
                        <span key={p.id} className="flex items-center gap-1.5">
                          <ArrowRight size={9} className="text-muted-foreground/40 shrink-0" />
                          <span className="font-semibold text-foreground">{p.nom}</span>
                        </span>
                      ))}
                      <span className="flex items-center gap-1.5">
                        <ArrowRight size={9} className="text-muted-foreground/40 shrink-0" />
                        <span className="font-bold text-foreground">Charleroi</span>
                      </span>
                    </div>
                  </div>
                  <button type="button" onClick={() => setFlowStep("reserve")}
                    className="text-[11px] font-semibold text-primary hover:text-primary/80 cursor-pointer shrink-0">
                    Modifier
                  </button>
                </div>

                {/* Grille infos condensée */}
                <div className="px-5 py-4 grid grid-cols-2 gap-x-6 gap-y-2.5 text-sm">
                  {[
                    ["Date",      formattedDate ? <span className="capitalize">{formattedDate}</span> : "—"],
                    ["Heure",     form.heure || "—"],
                    ["Passagers", form.passagers || "—"],
                    ["Poids",     form.poids_total ? `${form.poids_total} kg` : "—"],
                    ["Nom",       `${form.prenom} ${form.nom}`.trim()],
                    ["Email",     form.email],
                    ...(form.telephone ? [["Tél.", form.telephone]] : []),
                    ...(selectedStops.length > 0 ? [["Escales", selectedStops.map(s => s.nom).join(", ")]] : []),
                    ...(form.commentaire.trim() ? [["Remarque", form.commentaire.trim()]] : []),
                  ].map(([label, value]) => (
                    <div key={label as string} className="min-w-0">
                      <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-wider mb-0.5">{label}</p>
                      <p className="text-sm font-semibold text-foreground truncate">{value}</p>
                    </div>
                  ))}
                </div>

                {/* Stats vol */}
                {(route.totalMin > 0 || route.distKm > 0) && (
                  <div className="px-5 py-3 border-t border-border flex gap-4 text-xs text-muted-foreground font-medium">
                    {route.totalMin > 0 && <span>≈ {route.totalMin} min</span>}
                    {route.distKm > 0  && <span>{route.distKm} km</span>}
                    {prixEstime > 0    && <span>≈ {prixEstime} € estimé</span>}
                  </div>
                )}
              </div>

              {/* Prix & acompte avec explication */}
              <div className="card-premium overflow-hidden">
                <div className="px-5 pt-4 pb-3 border-b border-border">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[2px]">Prix</p>
                </div>
                <div className="p-5 space-y-2 text-sm">
                  {/* Ligne vol */}
                  <div className="flex justify-between items-baseline">
                    <span className="text-muted-foreground">Vol estimé <span className="text-[10px]">({prixHeure} €/h · ≈ {route.totalMin} min)</span></span>
                    <span className="font-semibold text-foreground shrink-0 ml-2">≈ {prixEstime} €</span>
                  </div>
                  {/* Ligne acompte */}
                  <div className="flex justify-between items-baseline">
                    <span className="text-muted-foreground">Acompte <span className="text-[10px]">({acompteH} €/h)</span></span>
                    <span className="font-semibold text-foreground shrink-0 ml-2">{acompte} €</span>
                  </div>
                  {/* Taxes */}
                  {taxesEscalesTotal > 0 && (
                    <div className="flex justify-between items-baseline">
                      <span className="text-muted-foreground">Taxes d&apos;escale</span>
                      <span className="font-semibold text-foreground shrink-0 ml-2">+ {taxesEscalesTotal} €</span>
                    </div>
                  )}
                  {/* Réductions */}
                  {voucherData && voucherDiscount > 0 && (
                    <div className="flex justify-between items-center text-green-700">
                      <span className="flex items-center gap-1.5 text-xs"><CheckCircle size={11} /> {voucherData.code}</span>
                      <span className="font-semibold shrink-0 ml-2">− {voucherDiscount} €</span>
                    </div>
                  )}
                  {couponData && couponDiscount > 0 && (
                    <div className="flex justify-between items-center text-green-700">
                      <span className="flex items-center gap-1.5 text-xs"><CheckCircle size={11} /> {couponData.code}</span>
                      <span className="font-semibold shrink-0 ml-2">− {couponDiscount} €</span>
                    </div>
                  )}
                  {/* Total */}
                  <div className="flex justify-between items-baseline pt-2.5 border-t border-border">
                    <span className="font-black text-foreground">
                      {totalAcompteFinal === 0 ? "Couvert par voucher" : "Acompte estimé"}
                    </span>
                    <span className="font-black text-foreground text-lg shrink-0 ml-2">
                      {totalAcompteFinal === 0 ? "0 €" : `${totalAcompteFinal} €`}
                    </span>
                  </div>
                </div>

                {/* Explication acompte */}
                <div className="mx-5 mb-5 rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-xs text-amber-800 leading-relaxed space-y-1">
                  <p className="font-bold flex items-center gap-1.5"><Info size={11} className="shrink-0" />Pourquoi un acompte ?</p>
                  <p>L&apos;acompte sécurise votre créneau et couvre la préparation du vol. Il est <strong>déduit du solde</strong> à régler le jour du vol.</p>
                  <p>Il est <strong>intégralement remboursé</strong> si le vol est annulé pour météo, ou si vous annulez plus de 48 h avant la date prévue.</p>
                </div>
              </div>

              {/* CGP */}
              <div className={`rounded-lg border-2 p-5 transition-all ${form.accept_cgp ? "bg-primary/5 border-primary/20" : "bg-card border-border"}`}>
                <label className="flex items-start gap-3.5 cursor-pointer">
                  <div className={`mt-0.5 w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all ${form.accept_cgp ? "bg-navy border-navy" : "border-border bg-card"}`}>
                    {form.accept_cgp && <Check size={11} className="text-primary" />}
                    <input type="checkbox" checked={form.accept_cgp}
                      onChange={e => setForm(f => ({ ...f, accept_cgp: e.target.checked }))}
                      className="sr-only" />
                  </div>
                  <span className="text-sm text-foreground/70 leading-relaxed">
                    J&apos;accepte les{" "}
                    <Link href="/cgp" target="_blank" rel="noopener noreferrer" className="text-foreground underline underline-offset-2 font-semibold hover:text-primary transition-colors">
                      Conditions Générales de Participation
                    </Link>{" "}
                    et que mes données soient utilisées pour traiter ma réservation.
                  </span>
                </label>
              </div>

              {submitError && (
                <div className="flex items-center gap-2.5 p-3.5 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                  <AlertCircle size={14} className="shrink-0" />{submitError}
                </div>
              )}

              {/* Mobile CTA */}
              <div className="lg:hidden">
                <button type="button"
                  disabled={!form.accept_cgp || submitting}
                  onClick={handleSubmit}
                  className="w-full flex items-center justify-center gap-2 py-4 rounded-lg bg-primary text-primary-foreground text-sm font-black disabled:opacity-40 transition-all cursor-pointer shadow-gold">
                  {submitting
                    ? <><Loader2 size={14} className="animate-spin" /> Envoi en cours…</>
                    : <><Mail size={14} /> Confirmer et envoyer ma demande</>
                  }
                </button>
                <p className="text-center text-[10px] text-muted-foreground mt-3">
                  Aucun paiement maintenant — l&apos;acompte sera demandé après validation de la route
                </p>
              </div>

            </div>

            {/* ── RIGHT SIDEBAR */}
            <div className="hidden lg:block lg:w-[300px] xl:w-[320px] shrink-0 sticky top-28 self-start space-y-4">
              <ReserveSummary />

              <button type="button"
                disabled={!form.accept_cgp || submitting}
                onClick={handleSubmit}
                className="w-full flex items-center justify-center gap-2 py-4 rounded-lg bg-primary text-primary-foreground text-sm font-black disabled:opacity-40 hover:brightness-105 transition-all shadow-gold cursor-pointer">
                {submitting
                  ? <><Loader2 size={14} className="animate-spin" /> Envoi en cours…</>
                  : <><Mail size={14} /> Confirmer et envoyer ma demande</>
                }
              </button>
              <p className="text-center text-[10px] text-muted-foreground">
                Aucun paiement maintenant — l&apos;acompte sera demandé après validation de la route
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════ STEP 4 : DONE ══════════════════════ */}
      {flowStep === "done" && (
        <div className="max-w-lg mx-auto px-4 py-12 pb-16">
          <div className="space-y-4">

            {/* Étapes */}
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
                    <strong>L&apos;acompte{acompte > 0 ? ` (≈ ${acompte} €)` : ""} ne sera demandé qu&apos;après votre validation.</strong>
                  </p>
                </div>
              </div>

              <div className="space-y-0">
                {[
                  {
                    num: 1, done: true,
                    title: "Demande envoyée",
                    desc: "Votre itinéraire et vos informations ont bien été enregistrés.",
                  },
                  {
                    num: 2, done: false,
                    title: "Notre pilote analyse votre route",
                    desc: "Dans les 24 h, la faisabilité de votre itinéraire est étudiée. Si certaines zones ne peuvent pas être survolées (espace aérien, restrictions), nous vous en informons et proposons des alternatives.",
                  },
                  {
                    num: 3, done: false,
                    title: "Validation & paiement de l'acompte",
                    desc: `Vous recevez la route définitive par email. Après votre accord, un lien de paiement vous est envoyé pour régler l'acompte${acompte > 0 ? ` (≈ ${acompte} €)` : ""} et confirmer le créneau.`,
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
              <a
                href="/access-ebci"
                className="flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-secondary border border-border text-foreground rounded-lg text-xs font-semibold hover:bg-navy hover:text-white hover:border-navy transition-all"
              >
                <MapPin size={12} />
                Plan d&apos;accès à l&apos;aéroport
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

            {/* CTAs */}
            <div className="flex flex-col gap-3">
              <a href="/account#reservations"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg text-sm font-bold hover:brightness-105 transition-all shadow-gold">
                <CalendarDays size={15} />
                Suivre ma réservation
              </a>
              <button type="button"
                onClick={() => { setFlowStep("build"); setRoute({ pois: [], distKm: 0, transitMin: 0, obsMin: 0, totalMin: 0 }); setForm(f => ({ ...f, date: "", heure: "", commentaire: "" })); mapRef.current?.clearAll(); }}
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

// ── Helper field ───────────────────────────────────────────────
function VSMField({ label, required, type = "text", value, onChange, placeholder, onBlur }: {
  label: string; required?: boolean; type?: string;
  value: string; onChange: (v: string) => void; placeholder?: string; onBlur?: () => void;
}) {
  return (
    <div>
      <label className="block text-xs font-bold text-foreground uppercase tracking-[1.5px] mb-2">
        {label}{required && <span className="text-primary ml-0.5">*</span>}
      </label>
      <input type={type} value={value} required={required} placeholder={placeholder}
        onChange={e => onChange(e.target.value)}
        onBlur={onBlur}
        className="w-full h-12 px-4 rounded-lg border border-border bg-input text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all placeholder:text-muted-foreground/35" />
    </div>
  );
}
