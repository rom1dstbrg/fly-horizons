"use client";

import dynamic from "next/dynamic";
import { useRef, useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  ChevronLeft, ChevronRight, Check, MapPin, Clock,
  Lock, CheckCircle, AlertCircle, AlertTriangle, Loader2, Mail,
  User, Trash2, PlaneTakeoff, Info, Shuffle, List, Route, X,
} from "lucide-react";
import type { LeafletMapHandle, RouteData, RouteMode, Stopover } from "@/components/vol-sur-mesure/LeafletMap";

const LeafletMap = dynamic(() => import("@/components/vol-sur-mesure/LeafletMap"), { ssr: false });

// ── Types ────────────────────────────────────────────────────
type Step = "route" | "date-time" | "details" | "confirm" | "done";

interface VoucherInfo {
  id: string;
  code: string;
  duration_minutes: number;
  product_price: number;
  product_title: string;
}

interface CouponInfo { code: string; type: string; value: number; description: string; }

interface FormData {
  date: string;
  heure: string;
  prenom: string;
  nom: string;
  email: string;
  telephone: string;
  poids_total: string;
  passagers: string;
  commentaire: string;
  codeInput: string;
  voucher: VoucherInfo | null;
  coupon: CouponInfo | null;
  accept_cgp: boolean;
}

// ── Constants ────────────────────────────────────────────────
const STEPS: { key: Step; label: string }[] = [
  { key: "route",     label: "Route" },
  { key: "date-time", label: "Date & heure" },
  { key: "details",   label: "Informations" },
  { key: "confirm",   label: "Confirmer" },
];

const ESCALES_DISPO: Record<string, Stopover> = {
  EBNM: { icao: "EBNM", lat: 50.4908, lng: 4.9978, nom: "Namur Airport (EBNM)", taxe: 15 },
  LFAT: { icao: "LFAT", lat: 50.5174, lng: 1.6206, nom: "Le Touquet (LFAT)", taxe: 36 },
  EHMZ: { icao: "EHMZ", lat: 51.5069, lng: 3.7311, nom: "Middelzeeland (EHMZ)", taxe: 26 },
};

const MONTHS_FR = ["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"];
const DAYS_FR   = ["L","M","M","J","V","S","D"];

const MAX_WEIGHT = 178;
const ERROR_KG   = MAX_WEIGHT + 60;

// ── Page ─────────────────────────────────────────────────────
export default function VolSurMesurePage() {
  const mapRef = useRef<LeafletMapHandle | null>(null);

  const [step, setStep]                 = useState<Step>("route");
  const [prixHeure, setPrixHeure]       = useState(254);
  const [acompteHeure, setAcompteHeure] = useState(300);
  const [routeData, setRouteData]       = useState<RouteData>({
    waypoints: [], stopovers: [], distKm: 0, dureMin: 0, taxesEscales: 0, orderedPoints: [],
  });
  const [routeMode, setRouteMode]       = useState<RouteMode>("optimized");
  const [activeStopovers, setActiveStopovers] = useState<Stopover[]>([]);

  const [form, setForm] = useState<FormData>({
    date: "", heure: "",
    prenom: "", nom: "", email: "", telephone: "",
    poids_total: "", passagers: "1", commentaire: "",
    codeInput: "", voucher: null, coupon: null,
    accept_cgp: false,
  });

  const today = new Date();
  const [calYear,       setCalYear]       = useState(today.getFullYear());
  const [calMonth,      setCalMonth]      = useState(today.getMonth() + 1);
  const [availableDays, setAvailableDays] = useState<string[]>([]);
  const [calLoading,    setCalLoading]    = useState(false);
  const [slots,         setSlots]         = useState<string[]>([]);
  const [slotsLoading,  setSlotsLoading]  = useState(false);
  const [codeLoading,   setCodeLoading]   = useState(false);
  const [codeError,     setCodeError]     = useState("");
  const [submitting,    setSubmitting]    = useState(false);
  const [submitError,   setSubmitError]   = useState("");

  // ── Price logic ───────────────────────────────────────────
  // Le voucher vaut sa valeur d'achat (product_price), déduite de l'acompte total.
  const dureMin        = routeData.dureMin;
  const prixEstime     = Math.round((prixHeure / 60) * dureMin);
  const acompte        = Math.round((acompteHeure / 60) * (dureMin > 0 ? dureMin : 0));
  const taxes          = routeData.taxesEscales;
  const discount       = form.voucher?.product_price ?? 0;
  const afterVoucher   = Math.max(0, acompte + taxes - discount);
  const couponDiscount = form.coupon && afterVoucher > 0
    ? form.coupon.type === "percentage"
      ? Math.round(afterVoucher * form.coupon.value / 100)
      : Math.min(form.coupon.value, afterVoucher)
    : 0;
  const finalAcompte   = Math.max(0, afterVoucher - couponDiscount);
  const dureeForCal  = Math.max(30, dureMin);

  // ── Settings & user ───────────────────────────────────────
  useEffect(() => {
    const sb = createClient();
    sb.from("crm_settings").select("key, value").in("key", ["prix_heure", "acompte_perso_heure"])
      .then(({ data }) => {
        data?.forEach(({ key, value }) => {
          if (key === "prix_heure") setPrixHeure(parseFloat(value));
          if (key === "acompte_perso_heure") setAcompteHeure(parseFloat(value));
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

  // ── Calendar ──────────────────────────────────────────────
  const loadMonth = useCallback(async (y: number, m: number) => {
    setCalLoading(true);
    try {
      const r = await fetch(`/api/reservation/month?year=${y}&month=${m}&duree=${dureeForCal}`);
      const d = await r.json();
      setAvailableDays(d.available ?? []);
    } finally { setCalLoading(false); }
  }, [dureeForCal]);

  useEffect(() => { loadMonth(calYear, calMonth); }, [calYear, calMonth, loadMonth]);

  useEffect(() => {
    if (!form.date) { setSlots([]); return; }
    setSlotsLoading(true);
    fetch(`/api/reservation/slots?date=${form.date}&duree=${dureeForCal}`)
      .then(r => r.json()).then(d => setSlots(d.slots ?? []))
      .finally(() => setSlotsLoading(false));
  }, [form.date, dureeForCal]);

  function renderCalendar() {
    const firstDay = new Date(calYear, calMonth - 1, 1).getDay();
    const offset = firstDay === 0 ? 6 : firstDay - 1;
    const daysInMonth = new Date(calYear, calMonth, 0).getDate();
    const cells = [];
    for (let i = 0; i < offset; i++) cells.push(<div key={`e${i}`} />);
    for (let d = 1; d <= daysInMonth; d++) {
      const ds = `${calYear}-${String(calMonth).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
      const isAvail = availableDays.includes(ds);
      const isSel   = form.date === ds;
      const isPast  = new Date(ds + "T12:00:00Z") < today;
      cells.push(
        <button key={d} type="button" disabled={!isAvail || isPast}
          onClick={() => setForm(f => ({ ...f, date: ds, heure: "" }))}
          className={[
            "h-10 w-full rounded-lg text-sm font-medium transition-all duration-150 select-none flex items-center justify-center",
            isSel              ? "bg-[#fbae17] text-[#0b2238] font-bold shadow-sm scale-105" :
            isAvail && !isPast ? "hover:bg-[#fbae17]/10 hover:text-[#fbae17] text-foreground/70 cursor-pointer font-semibold" :
                                 "text-muted-foreground/25 cursor-not-allowed text-xs",
          ].join(" ")}
        >{d}</button>
      );
    }
    return cells;
  }

  // ── Escales ───────────────────────────────────────────────
  function toggleStopover(icao: string) {
    const active = activeStopovers.find(s => s.icao === icao);
    setActiveStopovers(prev =>
      active ? prev.filter(s => s.icao !== icao) : [...prev, ESCALES_DISPO[icao]]
    );
  }

  // ── Code validation (voucher + promo unifié) ──────────────
  async function applyCode(override?: string) {
    const raw = (override ?? form.codeInput).replace(/\s/g, "").toUpperCase();
    if (!raw) return;
    const alnum = raw.replace(/-/g, "");
    setCodeLoading(true); setCodeError("");
    setForm(f => ({ ...f, voucher: null, coupon: null }));
    try {
      if (alnum.length === 16) {
        // Envoyer avec tirets: XXXX-XXXX-XXXX-XXXX (requis par l'API)
        const formatted = alnum.match(/.{1,4}/g)!.join("-");
        const r = await fetch(`/api/vouchers/validate?code=${encodeURIComponent(formatted)}`);
        const d = await r.json();
        if (d.valid) {
          setForm(f => ({ ...f, voucher: { id: d.id, code: d.code, duration_minutes: d.duration_minutes, product_price: d.product_price ?? 0, product_title: d.product_title } }));
          return;
        }
        if (d.status === "expired")  { setCodeError("Ce voucher a expiré."); return; }
        if (d.status === "used")     { setCodeError("Ce voucher a déjà été utilisé."); return; }
        if (d.status === "reserved") { setCodeError("Ce voucher est en cours d'utilisation."); return; }
      }
      const r2 = await fetch(`/api/promo/validate?code=${encodeURIComponent(alnum)}`);
      const d2 = await r2.json();
      if (d2.valid) {
        setForm(f => ({ ...f, coupon: { code: d2.code, type: d2.type, value: d2.value, description: d2.description } }));
      } else {
        setCodeError(d2.error || "Code invalide — vérifiez et réessayez.");
      }
    } catch { setCodeError("Erreur de connexion, veuillez réessayer."); }
    finally { setCodeLoading(false); }
  }

  // ── Submit ────────────────────────────────────────────────
  async function handleSubmit() {
    setSubmitting(true); setSubmitError("");
    try {
      const r = await fetch("/api/vol-sur-mesure/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prenom: form.prenom, nom: form.nom, email: form.email, telephone: form.telephone,
          date: form.date, heure: form.heure, passagers: form.passagers,
          poids_total: form.poids_total, commentaire: form.commentaire,
          waypoints: routeData.waypoints, stopovers: activeStopovers,
          distKm: routeData.distKm, dureMin: routeData.dureMin, taxesEscales: routeData.taxesEscales,
          voucher_code: form.voucher?.code || null,
          voucher_id:   form.voucher?.id   || null,
          coupon_code:  form.coupon?.code  || null,
        }),
      });
      const d = await r.json();
      if (!r.ok) { setSubmitError(d.error || "Erreur."); return; }
      setStep("done");
    } catch { setSubmitError("Erreur réseau."); }
    finally { setSubmitting(false); }
  }

  const stepIndex      = STEPS.findIndex(s => s.key === step);
  const allStepsForBar = [...STEPS, { key: "done" as const, label: "Envoyé" }];
  const formattedDate  = form.date
    ? new Date(form.date + "T12:00:00Z").toLocaleDateString("fr-BE", { weekday: "long", day: "numeric", month: "long" })
    : null;

  const weightKg    = parseInt(form.poids_total) || 0;
  const weightWarn  = weightKg > MAX_WEIGHT && weightKg <= ERROR_KG;
  const weightError = weightKg > ERROR_KG;

  // ── Sidebar ───────────────────────────────────────────────
  function Sidebar() {
    return (
      <div className="bg-card rounded-2xl border border-border overflow-hidden" style={{ boxShadow: "var(--sh-sm)" }}>
        <div className="relative h-32 flex flex-col items-center justify-center gap-1 overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,#1a4a7a_0%,#0b2238_70%)]" />
          <p className="relative text-[#fbae17] text-[9px] font-bold tracking-[3px] uppercase mb-1">Vol sur mesure</p>
          {dureMin > 0 ? (
            <>
              <p className="relative text-white text-3xl font-black leading-none">~{dureMin}<span className="text-lg font-bold">min</span></p>
              <p className="relative text-white/50 text-xs mt-1">{routeData.distKm} km · {routeData.waypoints.length} point{routeData.waypoints.length > 1 ? "s" : ""}</p>
            </>
          ) : (
            <p className="relative text-white/40 text-xs text-center px-6 leading-relaxed">Tracez votre route sur la carte</p>
          )}
        </div>

        <div className="p-4 space-y-3">
          {/* Prix */}
          {dureMin > 0 && (
            <div className="pb-3 border-b border-border space-y-1.5">
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">Estimation vol</p>
                {(discount > 0 || couponDiscount > 0) ? (
                  <span className="text-xs text-muted-foreground line-through tabular-nums">{prixEstime} €</span>
                ) : (
                  <span className="text-xs font-medium tabular-nums">{prixEstime} €</span>
                )}
              </div>
              {discount > 0 && (
                <p className="text-xs text-green-600 font-medium">Voucher −{discount} €</p>
              )}
              {couponDiscount > 0 && (
                <p className="text-xs text-green-600 font-medium">Code promo −{couponDiscount} €</p>
              )}
              <div className="flex justify-between items-center pt-1.5 border-t border-border">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Acompte</span>
                <span className={`text-lg font-black tabular-nums ${finalAcompte === 0 ? "text-green-600" : "text-primary"}`}>
                  {finalAcompte === 0 ? "Gratuit" : `${finalAcompte} €`}
                </span>
              </div>
            </div>
          )}

          {/* Infos route */}
          <div className="space-y-2">
            <div className="flex items-start gap-2">
              <MapPin size={12} className="text-muted-foreground mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-medium text-foreground">Charleroi EBCI</p>
                <p className="text-xs text-muted-foreground">Départ & retour</p>
              </div>
            </div>
            {dureMin > 0 && (
              <div className="flex items-center gap-2">
                <Clock size={12} className="text-muted-foreground shrink-0" />
                <p className="text-xs text-muted-foreground">~{dureMin} min · {routeData.distKm} km</p>
              </div>
            )}
            {activeStopovers.length > 0 && (
              <div className="flex items-start gap-2">
                <PlaneTakeoff size={12} className="text-muted-foreground mt-0.5 shrink-0" />
                <p className="text-xs text-muted-foreground">
                  {activeStopovers.map(s => s.icao).join(", ")} · +{routeData.taxesEscales}€ taxes
                </p>
              </div>
            )}
            {formattedDate && (
              <div className="flex items-center gap-2">
                <Check size={12} className="text-primary shrink-0" />
                <p className="text-xs text-foreground font-medium capitalize">
                  {formattedDate}{form.heure ? ` · ${form.heure}` : ""}
                </p>
              </div>
            )}
          </div>

          {/* Ordre de passage */}
          {routeData.orderedPoints.length > 0 && (
            <div className="pt-3 border-t border-border">
              <div className="flex items-center gap-2 mb-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Ordre de passage</p>
                <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium border ${
                  routeMode === "optimized"
                    ? "bg-green-50 text-green-700 border-green-200"
                    : "bg-muted text-muted-foreground border-border"
                }`}>
                  {routeMode === "optimized" ? "optimisé" : "manuel"}
                </span>
              </div>
              <div className="space-y-1">
                {[
                  { label: "Départ", nom: "Charleroi EBCI", isAirport: true as const },
                  ...routeData.orderedPoints,
                  { label: "Retour", nom: "Charleroi EBCI", isAirport: true as const },
                ].map((pt, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${pt.isAirport ? "bg-[#113356]" : "bg-[#F2B705]"}`}>
                      {pt.isAirport ? (
                        <svg viewBox="0 0 24 24" fill="#F2B705" width="9" height="9">
                          <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/>
                        </svg>
                      ) : (
                        <span className="text-[8px] font-bold text-[#113356]">{i}</span>
                      )}
                    </div>
                    <span className="text-[11px] text-foreground truncate">
                      {("nom" in pt && pt.nom) ? pt.nom : `${(pt as { lat: number; lng: number }).lat.toFixed(3)}, ${(pt as { lat: number; lng: number }).lng.toFixed(3)}`}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Code réduction */}
          <div className="pt-3 border-t border-border">
            <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-[2px] mb-2">Bon cadeau / Code promo</p>
            {(form.voucher || form.coupon) ? (
              <div className="flex items-center gap-2 bg-green-50 border border-green-100 px-3 py-2.5 rounded-xl">
                <CheckCircle size={12} className="text-green-600 shrink-0" />
                <p className="text-xs font-semibold text-green-800 flex-1 min-w-0 truncate">
                  {form.voucher
                    ? `${form.voucher.product_title} · −${discount} €`
                    : `${form.coupon!.code} · ${form.coupon!.description}`}
                </p>
                <button type="button"
                  onClick={() => { setForm(f => ({ ...f, codeInput: "", voucher: null, coupon: null })); setCodeError(""); }}
                  className="shrink-0 text-muted-foreground hover:text-destructive transition-colors cursor-pointer">
                  <X size={13} />
                </button>
              </div>
            ) : (
              <>
                <div className="flex gap-1.5">
                  <input type="text" value={form.codeInput}
                    onChange={e => {
                      const val = e.target.value.toUpperCase().replace(/\s/g, "");
                      setForm(f => ({ ...f, codeInput: val }));
                      setCodeError("");
                      if (val.replace(/-/g, "").length === 16) applyCode(val);
                    }}
                    onKeyDown={e => e.key === "Enter" && applyCode()}
                    placeholder="Voucher ou code promo"
                    maxLength={19}
                    className="flex-1 h-9 px-3 rounded-xl border border-border bg-white text-xs font-mono uppercase tracking-wide text-foreground focus:outline-none focus:ring-2 focus:ring-[#fbae17]/25 focus:border-[#fbae17] transition-all placeholder:text-muted-foreground/40 placeholder:tracking-normal placeholder:font-sans placeholder:normal-case" />
                  <button type="button" onClick={() => applyCode()}
                    disabled={!form.codeInput.trim() || codeLoading}
                    className="h-9 px-3 rounded-xl bg-[#113356] text-white text-xs font-bold hover:bg-[#0b2238] disabled:opacity-40 transition-all flex items-center justify-center shadow-sm cursor-pointer whitespace-nowrap">
                    {codeLoading ? <Loader2 size={12} className="animate-spin" /> : "OK"}
                  </button>
                </div>
                {codeError && (
                  <p className="text-[11px] text-red-600 mt-1.5 flex items-center gap-1">
                    <AlertCircle size={10} className="shrink-0" /> {codeError}
                  </p>
                )}
              </>
            )}
          </div>

          <div className="rounded-xl bg-amber-50 border border-amber-200 px-3 py-2.5">
            <p className="text-[11px] text-amber-800 leading-relaxed">
              <span className="font-semibold">Pas de paiement immédiat.</span> Vous recevrez un lien par email après confirmation.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#f5f5f7] dark:bg-background">
      <div className="h-[84px]" />

      {/* Steps bar — sticky, en-dessous du header */}
      <div className="sticky top-[84px] z-30 bg-[#f5f5f7]/95 backdrop-blur-sm border-b border-border/50">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 py-3 flex justify-center">
          <div className="flex items-center">
            {allStepsForBar.map((s, i) => {
              const isPast   = i < stepIndex;
              const isActive = s.key === step;
              return (
                <div key={s.key} className="flex items-center">
                  <div className="flex flex-col items-center gap-1 px-2">
                    <div className={[
                      "w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold transition-all",
                      isPast   ? "bg-primary text-primary-foreground" :
                      isActive ? "bg-primary text-primary-foreground ring-[3px] ring-primary/25" :
                                 "bg-muted text-muted-foreground",
                    ].join(" ")}>
                      {isPast ? <Check size={12} /> : i + 1}
                    </div>
                    <span className={`text-[10px] hidden sm:block whitespace-nowrap font-medium leading-none ${isActive ? "text-foreground" : "text-muted-foreground"}`}>
                      {s.label}
                    </span>
                  </div>
                  {i < allStepsForBar.length - 1 && (
                    <div className={`w-6 sm:w-10 h-px mb-3.5 transition-all ${isPast ? "bg-primary" : "bg-border"}`} />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="pb-16">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 py-6">
          <div className="flex flex-col lg:flex-row gap-6 items-start">

            {/* ══ Steps content ══ */}
            <div className="flex-1 min-w-0 space-y-4">

              {/* ── Step 1 : Route — toujours monté pour préserver la carte Leaflet */}
              <div style={{ display: step === "route" ? "block" : "none" }}>
                <div className="rounded-2xl border border-border bg-white overflow-hidden" style={{ boxShadow: "var(--sh-sm)" }}>

                  {/* Contrôles */}
                  <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-muted/30">
                    <div className="flex items-center gap-1 bg-background border border-border rounded-lg p-0.5">
                      <button type="button" onClick={() => setRouteMode("optimized")}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                          routeMode === "optimized" ? "bg-[#fbae17] text-[#0b2238] shadow-sm" : "text-muted-foreground hover:text-foreground"
                        }`}>
                        <Shuffle size={12} /> Route optimisée
                      </button>
                      <button type="button" onClick={() => setRouteMode("manual")}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                          routeMode === "manual" ? "bg-[#fbae17] text-[#0b2238] shadow-sm" : "text-muted-foreground hover:text-foreground"
                        }`}>
                        <List size={12} /> Ordre des points
                      </button>
                    </div>
                    {routeData.waypoints.length > 0 && (
                      <button type="button" onClick={() => mapRef.current?.clearWaypoints()}
                        className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-destructive transition-colors">
                        <Trash2 size={12} /> Effacer tout
                      </button>
                    )}
                  </div>

                  {/* Carte — hauteur responsive + isolate pour contenir les z-index Leaflet */}
                  <div className="relative isolate h-64 sm:h-96 lg:h-[520px]">
                    {routeData.waypoints.length === 0 && (
                      <div className="absolute bottom-12 inset-x-0 flex justify-center z-[400] pointer-events-none">
                        <div className="bg-[#0b2238]/80 backdrop-blur-sm text-white text-xs px-4 py-2 rounded-full font-medium">
                          Cliquez sur la carte pour placer des points de passage
                        </div>
                      </div>
                    )}
                    <LeafletMap
                      ref={mapRef}
                      stopovers={activeStopovers}
                      routeMode={routeMode}
                      onRouteChange={setRouteData}
                    />
                  </div>

                  {/* Stats */}
                  {routeData.distKm > 0 && (
                    <div className="flex items-stretch border-t border-border bg-muted/20">
                      {[
                        { label: "Distance",      value: `${routeData.distKm} km` },
                        { label: "Durée estimée", value: `~${routeData.dureMin} min` },
                        { label: "Prix estimé",   value: `${prixEstime} €` },
                        { label: "Points",        value: String(routeData.waypoints.length) },
                      ].map(({ label, value }, i) => (
                        <div key={i} className={`flex-1 px-3 py-2.5 text-center ${i > 0 ? "border-l border-border" : ""}`}>
                          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{label}</p>
                          <p className="text-sm font-bold text-foreground mt-0.5">{value}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="divide-y divide-border">

                    {/* Escales */}
                    <div className="px-5 py-4">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-2.5">
                        Escales disponibles <span className="font-normal normal-case">(optionnel)</span>
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {Object.values(ESCALES_DISPO).map(so => {
                          const active = activeStopovers.find(s => s.icao === so.icao);
                          return (
                            <button key={so.icao} type="button" onClick={() => toggleStopover(so.icao)}
                              className={[
                                "flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm font-medium transition-all cursor-pointer",
                                active
                                  ? "border-[#fbae17] bg-[#fbae17]/10 text-[#fbae17]"
                                  : "border-border hover:border-[#fbae17]/40 text-muted-foreground hover:text-foreground",
                              ].join(" ")}>
                              <PlaneTakeoff size={12} />
                              <span>{so.icao}</span>
                              <span className="text-xs opacity-60">+{so.taxe}€</span>
                              {active && <Check size={10} className="text-[#fbae17]" />}
                            </button>
                          );
                        })}
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        Atterrissage intermédiaire avec taxe d&apos;escale incluse dans l&apos;acompte.
                      </p>
                    </div>

                    {/* Info */}
                    <div className="px-5 py-3.5">
                      <div className="flex items-start gap-2.5 text-xs text-muted-foreground">
                        <Info size={13} className="shrink-0 mt-0.5" />
                        <span>
                          Vol en avion léger depuis Charleroi (EBCI). Durée & prix estimés à 100 nœuds.
                          Vous avez un voucher ou un code promo ? Renseignez-le dans la barre à droite.
                        </span>
                      </div>
                    </div>

                    {/* Continuer */}
                    <div className="px-5 py-4">
                      <button type="button" disabled={routeData.waypoints.length === 0} onClick={() => setStep("date-time")}
                        className="w-full h-11 rounded-xl bg-[#113356] text-white font-bold text-sm flex items-center justify-center gap-2 hover:bg-[#0b2238] disabled:opacity-30 shadow-sm transition-all cursor-pointer">
                        <Route size={14} /> Choisir la date & l&apos;heure <ChevronRight size={15} />
                      </button>
                      {routeData.waypoints.length === 0 && (
                        <p className="text-center text-xs text-muted-foreground mt-2">
                          Ajoutez au moins un point sur la carte pour continuer.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* ── Step 2 : Date & heure ── */}
              {step === "date-time" && (
                <div className="rounded-2xl border border-border bg-white shadow-sm overflow-hidden">

                  <div className="p-5 border-b border-border">
                    <div className="inline-flex items-center gap-2 mb-1">
                      <Clock size={12} className="text-muted-foreground" />
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[2px]">Calendrier</p>
                    </div>
                    <h2 className="text-base font-extrabold text-foreground">Date & heure du vol</h2>
                    <p className="text-sm text-muted-foreground mt-0.5">Sélectionnez un jour disponible puis un créneau.</p>
                  </div>

                  <div className="p-5">
                    <div className="flex items-center justify-between mb-4">
                      <button type="button"
                        onClick={() => { if (calMonth === 1) { setCalMonth(12); setCalYear(y => y - 1); } else setCalMonth(m => m - 1); }}
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-all border border-border cursor-pointer">
                        <ChevronLeft size={15} />
                      </button>
                      <span className="text-sm font-bold text-foreground">{MONTHS_FR[calMonth - 1]} {calYear}</span>
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
                    <div className="flex flex-wrap items-center gap-4 mt-4 pt-4 border-t border-border text-[10px] text-muted-foreground">
                      <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-[#fbae17]" />Sélectionné</span>
                      <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full border-2 border-border" />Disponible</span>
                      <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-muted" />Indisponible</span>
                    </div>
                  </div>

                  {form.date && (
                    <div className="border-t border-border p-5">
                      {slotsLoading ? (
                        <div className="flex items-center justify-center py-4">
                          <Loader2 size={18} className="animate-spin text-muted-foreground/30" />
                        </div>
                      ) : slots.length === 0 ? (
                        <div className="flex items-center gap-3 py-1">
                          <Clock size={14} className="text-muted-foreground/40 shrink-0" />
                          <div>
                            <p className="text-sm font-semibold text-foreground capitalize">{formattedDate}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">Aucun créneau disponible — essayez une autre date</p>
                          </div>
                        </div>
                      ) : (
                        <div>
                          <p className="text-sm font-extrabold text-foreground capitalize mb-3">{formattedDate}</p>
                          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                            {slots.map(s => (
                              <button key={s} type="button"
                                onClick={() => setForm(f => ({ ...f, heure: s }))}
                                className={[
                                  "py-2.5 rounded-xl border text-sm font-bold transition-all duration-150 text-center cursor-pointer",
                                  form.heure === s
                                    ? "border-[#fbae17] bg-[#fbae17] text-[#0b2238] shadow-sm"
                                    : "border-border text-foreground hover:border-[#fbae17]/50 hover:bg-[#fbae17]/5 hover:text-[#fbae17]",
                                ].join(" ")}
                              >{s}</button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="p-5 pt-4 flex items-center justify-between gap-4">
                    <button type="button" onClick={() => setStep("route")}
                      className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer group">
                      <ChevronLeft size={15} className="group-hover:-translate-x-0.5 transition-transform" />
                      Retour
                    </button>
                    <button type="button" disabled={!form.date || !form.heure} onClick={() => setStep("details")}
                      className="inline-flex items-center gap-2 px-6 py-3 bg-[#113356] text-white rounded-xl text-sm font-bold transition-all duration-200 disabled:opacity-30 hover:bg-[#0b2238] shadow-sm hover:shadow-md hover:-translate-y-px active:translate-y-0 cursor-pointer">
                      Continuer <ChevronRight size={15} />
                    </button>
                  </div>
                </div>
              )}

              {/* ── Step 3 : Informations ── */}
              {step === "details" && (
                <div className="rounded-2xl border border-border bg-white shadow-sm divide-y divide-border overflow-hidden">

                  <div className="p-5">
                    <div className="inline-flex items-center gap-2 mb-1">
                      <User size={12} className="text-muted-foreground" />
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[2px]">Informations</p>
                    </div>
                    <h2 className="text-base font-extrabold text-foreground">Vos informations</h2>
                    <p className="text-sm text-muted-foreground mt-0.5">Ces informations permettent de préparer votre vol et d&apos;envoyer votre confirmation.</p>
                  </div>

                  <div className="p-5 sm:p-7">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[2px] mb-4">Coordonnées</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <VSMField label="Prénom" required value={form.prenom} onChange={v => setForm(f => ({ ...f, prenom: v }))} placeholder="Jean" />
                      <VSMField label="Nom" required value={form.nom} onChange={v => setForm(f => ({ ...f, nom: v }))} placeholder="Dupont" />
                      <div className="sm:col-span-2">
                        <VSMField label="Email" required type="email" value={form.email} onChange={v => setForm(f => ({ ...f, email: v }))} placeholder="jean@exemple.com" />
                      </div>
                      <div className="sm:col-span-2">
                        <VSMField label="Téléphone" type="tel" value={form.telephone} onChange={v => setForm(f => ({ ...f, telephone: v }))} placeholder="+32 470 00 00 00" />
                      </div>
                    </div>
                  </div>

                  <div className="p-5 sm:p-7">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[2px] mb-4">Détails du vol</p>
                    <div className="space-y-5">

                      <div>
                        <label className="block text-sm font-semibold text-foreground mb-3">
                          Nombre de passagers <span className="text-muted-foreground font-normal">(requis)</span>
                        </label>
                        <div className="flex gap-2.5">
                          {["1", "2", "3"].map(n => (
                            <button key={n} type="button"
                              onClick={() => setForm(f => ({ ...f, passagers: n }))}
                              className={[
                                "flex-1 py-2.5 rounded-xl border text-sm font-semibold transition-all duration-150 text-center cursor-pointer",
                                form.passagers === n
                                  ? "border-[#fbae17] bg-[#fbae17] text-[#0b2238] shadow-sm"
                                  : "border-border text-foreground hover:border-[#fbae17]/50 hover:bg-[#fbae17]/5 hover:text-[#fbae17]",
                              ].join(" ")}
                            >
                              {n} {n === "1" ? "passager" : "passagers"}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-foreground mb-2">
                          Poids total des passagers <span className="text-muted-foreground font-normal">(kg, requis)</span>
                        </label>
                        <div className="flex items-center gap-3">
                          <input type="number" value={form.poids_total} required min={1} max={500} placeholder="ex : 165"
                            onChange={e => setForm(f => ({ ...f, poids_total: e.target.value }))}
                            className="w-36 h-10 px-3 rounded-xl border border-border bg-white text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-[#fbae17]/20 focus:border-[#fbae17] transition-all placeholder:text-muted-foreground/40" />
                          <span className="text-sm text-muted-foreground">kg</span>
                        </div>
                        <p className="mt-2 text-xs text-muted-foreground">Poids cumulé de tous les passagers — requis pour le calcul masse &amp; centrage (max {MAX_WEIGHT} kg).</p>
                        {weightWarn && (
                          <div className="mt-2.5 flex items-start gap-2.5 bg-amber-50 border border-amber-200 px-3.5 py-3 rounded-xl text-sm text-amber-800">
                            <AlertTriangle size={14} className="shrink-0 mt-0.5 text-amber-500" />
                            <p>Le poids total dépasse la limite de {MAX_WEIGHT} kg. Le vol pourrait ne pas être possible dans ces conditions.</p>
                          </div>
                        )}
                        {weightError && (
                          <div className="mt-2.5 flex items-start gap-2.5 bg-red-50 border border-red-200 px-3.5 py-3 rounded-xl text-sm text-red-800">
                            <AlertCircle size={14} className="shrink-0 mt-0.5 text-red-500" />
                            <p>Poids trop élevé — le vol ne peut pas être effectué. Réduisez le nombre de passagers ou le chargement.</p>
                          </div>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-foreground mb-2">
                          Remarques <span className="text-muted-foreground font-normal">(optionnel)</span>
                        </label>
                        <textarea value={form.commentaire} rows={3}
                          onChange={e => setForm(f => ({ ...f, commentaire: e.target.value }))}
                          className="w-full px-3 py-3 rounded-xl border border-border bg-white text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-[#fbae17]/20 focus:border-[#fbae17] transition-all resize-none placeholder:text-muted-foreground/40"
                          placeholder="Lieux à survoler, occasion spéciale, questions…" />
                      </div>
                    </div>
                  </div>

                  <div className="p-5 flex items-center justify-between gap-4">
                    <button type="button" onClick={() => setStep("date-time")}
                      className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer group">
                      <ChevronLeft size={15} className="group-hover:-translate-x-0.5 transition-transform" />
                      Retour
                    </button>
                    <button type="button"
                      disabled={!form.prenom || !form.nom || !form.email || !form.poids_total || weightError}
                      onClick={() => setStep("confirm")}
                      className="inline-flex items-center gap-2 px-6 py-3 bg-[#113356] text-white rounded-xl text-sm font-bold transition-all duration-200 disabled:opacity-30 hover:bg-[#0b2238] shadow-sm hover:shadow-md hover:-translate-y-px active:translate-y-0 cursor-pointer">
                      Continuer <ChevronRight size={15} />
                    </button>
                  </div>
                </div>
              )}

              {/* ── Step 4 : Confirmer ── */}
              {step === "confirm" && (
                <div className="space-y-4">

                  {/* Récap */}
                  <div className="rounded-2xl border border-border bg-white shadow-sm overflow-hidden">
                    <div className="bg-[#0b2238] px-6 py-6 flex items-start justify-between gap-4">
                      <div>
                        <p className="text-[#fbae17] text-[9px] font-black tracking-[3px] uppercase mb-3">Fly Horizons</p>
                        <h2 className="text-white text-base font-extrabold leading-snug">Vol sur mesure</h2>
                        <p className="text-white/50 text-sm mt-1.5 capitalize">
                          {formattedDate}{form.heure && ` · ${form.heure}`}
                        </p>
                      </div>
                      {dureMin > 0 && (
                        <div className="inline-flex items-center gap-1.5 bg-black/40 backdrop-blur-md border border-white/15 rounded-xl px-3 py-1.5 shrink-0">
                          <span className="text-[#F2B705] font-black text-[13px] leading-none">~{dureMin} min</span>
                          <span className="text-white/50 text-[11px] leading-none">durée est.</span>
                        </div>
                      )}
                    </div>

                    <div className="px-6 py-5 grid grid-cols-2 gap-x-6 gap-y-4 border-b border-border">
                      {[
                        { l: "Passager principal", v: `${form.prenom} ${form.nom}` },
                        { l: "Email",              v: form.email },
                        { l: "Passagers / Masse",  v: `${form.passagers} pax · ${form.poids_total} kg` },
                        { l: "Distance",           v: `${routeData.distKm} km · ${routeData.waypoints.length} pts` },
                      ].map(({ l, v }) => (
                        <div key={l}>
                          <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-[2px] mb-0.5">{l}</p>
                          <p className="text-sm font-semibold text-foreground truncate">{v}</p>
                        </div>
                      ))}
                    </div>

                    <div className="px-6 py-5 space-y-2 border-b border-border">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Prix estimé du vol (~{dureMin} min)</span>
                        <span className="font-medium">{prixEstime} €</span>
                      </div>
                      {discount > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-green-600">Voucher ({form.voucher?.duration_minutes} min)</span>
                          <span className="text-green-600 font-semibold">−{discount} €</span>
                        </div>
                      )}
                      {taxes > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Taxes d&apos;atterrissage</span>
                          <span className="font-medium">{taxes} €</span>
                        </div>
                      )}
                      {couponDiscount > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-green-600">Code promo ({form.coupon?.code})</span>
                          <span className="text-green-600 font-semibold">−{couponDiscount} €</span>
                        </div>
                      )}
                      <div className="flex items-end justify-between pt-3 border-t border-border">
                        <div>
                          <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-[2px] mb-0.5">Acompte à régler</p>
                          <p className="text-xs text-muted-foreground">Solde après le vol selon la durée réelle</p>
                        </div>
                        <span className={`text-3xl font-black tabular-nums ${finalAcompte === 0 ? "text-green-600" : "text-[#113356]"}`}>
                          {finalAcompte === 0 ? "Gratuit" : `${finalAcompte} €`}
                        </span>
                      </div>
                    </div>

                    <div className="px-6 py-4">
                      <div className="flex items-start gap-2.5 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
                        <Mail size={13} className="text-blue-600 mt-0.5 shrink-0" />
                        <p className="text-sm text-blue-800 leading-relaxed">
                          {finalAcompte > 0
                            ? `Après confirmation, vous recevrez un email à ${form.email} avec un lien sécurisé pour payer l'acompte de ${finalAcompte} €.`
                            : `Votre vol est entièrement couvert. Un email de confirmation vous sera envoyé à ${form.email}.`
                          }
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Code — mobile uniquement */}
                  <div className="lg:hidden rounded-2xl border border-border bg-white shadow-sm p-5">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[2px] mb-3">Bon cadeau / Code promo</p>
                    {(form.voucher || form.coupon) ? (
                      <div className="flex items-center gap-2 bg-green-50 border border-green-100 px-3 py-2.5 rounded-xl">
                        <CheckCircle size={13} className="text-green-600 shrink-0" />
                        <p className="text-sm font-semibold text-green-800 flex-1 min-w-0 truncate">
                          {form.voucher
                            ? `${form.voucher.product_title} · −${discount} €`
                            : `${form.coupon!.code} · ${form.coupon!.description}`}
                        </p>
                        <button type="button"
                          onClick={() => { setForm(f => ({ ...f, codeInput: "", voucher: null, coupon: null })); setCodeError(""); }}
                          className="shrink-0 text-muted-foreground hover:text-destructive transition-colors cursor-pointer">
                          <X size={14} />
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="flex gap-2">
                          <input type="text" value={form.codeInput}
                            onChange={e => {
                              const val = e.target.value.toUpperCase().replace(/\s/g, "");
                              setForm(f => ({ ...f, codeInput: val }));
                              setCodeError("");
                              if (val.replace(/-/g, "").length === 16) applyCode(val);
                            }}
                            onKeyDown={e => e.key === "Enter" && applyCode()}
                            placeholder="Voucher ou code promo"
                            maxLength={19}
                            className="flex-1 h-11 px-4 rounded-xl border border-border bg-white text-sm font-mono uppercase tracking-wide text-foreground focus:outline-none focus:ring-2 focus:ring-[#fbae17]/25 focus:border-[#fbae17] transition-all placeholder:text-muted-foreground/40 placeholder:tracking-normal placeholder:font-sans placeholder:normal-case" />
                          <button type="button" onClick={() => applyCode()}
                            disabled={!form.codeInput.trim() || codeLoading}
                            className="h-11 px-5 rounded-xl bg-[#113356] text-white text-sm font-bold hover:bg-[#0b2238] disabled:opacity-40 transition-all flex items-center justify-center gap-1.5 shadow-sm cursor-pointer whitespace-nowrap">
                            {codeLoading ? <Loader2 size={14} className="animate-spin" /> : "Appliquer"}
                          </button>
                        </div>
                        {codeError && (
                          <p className="text-xs text-red-600 mt-2 flex items-center gap-1.5">
                            <AlertCircle size={12} className="shrink-0" /> {codeError}
                          </p>
                        )}
                      </>
                    )}
                  </div>

                  {/* CGP */}
                  <div className="rounded-2xl border border-border bg-white shadow-sm p-5">
                    <label className="flex items-start gap-3.5 cursor-pointer">
                      <input type="checkbox" checked={form.accept_cgp}
                        onChange={e => setForm(f => ({ ...f, accept_cgp: e.target.checked }))}
                        className="mt-0.5 w-4 h-4 accent-[#113356] shrink-0 cursor-pointer" />
                      <span className="text-sm text-muted-foreground leading-relaxed">
                        J&apos;accepte les{" "}
                        <a href="https://fly-horizons.com/cgp.html" target="_blank" rel="noopener noreferrer"
                          className="text-[#113356] underline underline-offset-2 font-semibold">
                          Conditions Générales de Participation
                        </a>{" "}
                        et que mes données soient utilisées pour traiter ma réservation.
                      </span>
                    </label>
                  </div>

                  {submitError && (
                    <div className="flex items-center gap-2.5 text-sm text-destructive bg-destructive/5 border border-destructive/20 px-4 py-3.5 rounded-xl">
                      <AlertCircle size={14} className="shrink-0" /> {submitError}
                    </div>
                  )}

                  <div className="flex items-center justify-between gap-4">
                    <button type="button" onClick={() => setStep("details")}
                      className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer group">
                      <ChevronLeft size={15} className="group-hover:-translate-x-0.5 transition-transform" />
                      Retour
                    </button>
                    <button type="button" disabled={!form.accept_cgp || submitting || codeLoading} onClick={handleSubmit}
                      className="inline-flex items-center gap-2 px-6 py-3 bg-[#113356] text-white rounded-xl text-sm font-bold transition-all duration-200 disabled:opacity-30 hover:bg-[#0b2238] shadow-sm hover:shadow-md hover:-translate-y-px active:translate-y-0 cursor-pointer">
                      {submitting ? (
                        <><Loader2 size={14} className="animate-spin" /> Envoi en cours…</>
                      ) : finalAcompte === 0 ? (
                        <><CheckCircle size={13} /> Confirmer mon vol</>
                      ) : (
                        <><Mail size={13} /> Recevoir le lien de paiement</>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* ── Done ── */}
              {step === "done" && (
                <div className="bg-card rounded-2xl border border-border p-8 text-center space-y-5" style={{ boxShadow: "var(--sh-sm)" }}>
                  <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
                    <Mail size={28} className="text-green-600" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-foreground">Demande envoyée !</h2>
                    <p className="text-muted-foreground text-sm mt-2 leading-relaxed">
                      Consultez votre boîte email à <strong className="text-foreground">{form.email}</strong>.
                    </p>
                  </div>

                  <div className="text-left bg-secondary/40 rounded-xl p-4 space-y-3">
                    {finalAcompte > 0 ? (
                      <>
                        <div className="flex items-start gap-2.5">
                          <Mail size={14} className="text-primary mt-0.5 shrink-0" />
                          <p className="text-sm text-muted-foreground">
                            Un email avec les <strong className="text-foreground">détails de votre vol</strong> et un <strong className="text-foreground">lien de paiement sécurisé</strong> vous a été envoyé.
                          </p>
                        </div>
                        <div className="flex items-start gap-2.5">
                          <Lock size={14} className="text-primary mt-0.5 shrink-0" />
                          <p className="text-sm text-muted-foreground">
                            Cliquez sur le bouton dans l&apos;email pour payer l&apos;acompte de <strong className="text-foreground">{finalAcompte} €</strong> via Stripe.
                          </p>
                        </div>
                      </>
                    ) : (
                      <div className="flex items-start gap-2.5">
                        <CheckCircle size={14} className="text-green-600 mt-0.5 shrink-0" />
                        <p className="text-sm text-muted-foreground">
                          Votre vol est <strong className="text-foreground">entièrement couvert</strong> par votre voucher. Un email de confirmation vous a été envoyé.
                        </p>
                      </div>
                    )}
                    <div className="flex items-start gap-2.5">
                      <MapPin size={14} className="text-primary mt-0.5 shrink-0" />
                      <p className="text-sm text-muted-foreground">
                        Nous vous recontacterons sous <strong className="text-foreground">24h</strong> pour confirmer les détails.
                      </p>
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground">
                    Le solde sera réglé après le vol selon la durée réelle.
                  </p>
                  <a href="/"
                    className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#113356] text-white rounded-xl text-sm font-bold hover:bg-[#0b2238] shadow-sm transition-all">
                    Retour à l&apos;accueil
                  </a>
                </div>
              )}
            </div>

            {/* ══ Sidebar ══ */}
            <div className="hidden lg:block lg:w-80 xl:w-96 shrink-0 sticky top-36 self-start">
              <Sidebar />
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}

// ── Helper ────────────────────────────────────────────────────────────
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
