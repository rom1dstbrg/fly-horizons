"use client";

import dynamic from "next/dynamic";
import { useRef, useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  ChevronLeft, ChevronRight, Check, MapPin, Clock,
  Tag, Lock, CheckCircle, AlertCircle, Loader2, Mail,
  User, Phone, Trash2, PlaneTakeoff, Info, Shuffle, List, Route,
} from "lucide-react";
import type { LeafletMapHandle, RouteData, RouteMode, Stopover } from "@/components/vol-sur-mesure/LeafletMap";

const LeafletMap = dynamic(() => import("@/components/vol-sur-mesure/LeafletMap"), { ssr: false });

// ── Types ────────────────────────────────────────────────────
type Step = "route" | "date-time" | "details" | "confirm" | "done";

interface VoucherInfo {
  id: string;
  code: string;
  duration_minutes: number;
  product_title: string;
}

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
  voucherInput: string;
  voucher: VoucherInfo | null;
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

// Hauteurs fixes pour aligner les éléments flottants
const HEADER_H  = 86;  // top-3.5(14) + h-[60px] + gap(12) = top des steps bar
const STEPS_H   = 66;  // hauteur de la steps bar (py-3.5 + contenu)
const CONTENT_PT = HEADER_H + STEPS_H + 20; // padding-top du contenu = 172

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
    voucherInput: "", voucher: null, accept_cgp: false,
  });

  const today = new Date();
  const [calYear,       setCalYear]       = useState(today.getFullYear());
  const [calMonth,      setCalMonth]      = useState(today.getMonth() + 1);
  const [availableDays, setAvailableDays] = useState<string[]>([]);
  const [calLoading,    setCalLoading]    = useState(false);
  const [slots,         setSlots]         = useState<string[]>([]);
  const [slotsLoading,  setSlotsLoading]  = useState(false);
  const [voucherLoading, setVoucherLoading] = useState(false);
  const [voucherError,   setVoucherError]   = useState("");
  const [submitting,    setSubmitting]    = useState(false);
  const [submitError,   setSubmitError]   = useState("");

  // ── Price logic ───────────────────────────────────────────
  const dureMin     = routeData.dureMin;
  const voucherMin  = form.voucher?.duration_minutes ?? 0;
  const billableMin = Math.max(0, dureMin - voucherMin);
  const prixEstime  = Math.round((prixHeure / 60) * dureMin);
  const prixBillable = Math.round((prixHeure / 60) * billableMin);
  const acompte     = Math.round((acompteHeure / 60) * (dureMin > 0 ? billableMin : 0));
  const taxes       = routeData.taxesEscales;
  const totalAcompte = acompte + taxes;
  const discount    = prixEstime - prixBillable;
  const dureeForCal = Math.max(30, dureMin);

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
            "h-10 w-full rounded-lg text-sm font-medium transition-all select-none",
            isSel   ? "bg-primary text-primary-foreground shadow-sm" :
            isAvail && !isPast ? "hover:bg-primary/10 text-foreground cursor-pointer" :
            "text-muted-foreground/30 cursor-not-allowed",
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

  // ── Voucher ───────────────────────────────────────────────
  async function validateVoucher() {
    if (!form.voucherInput.trim()) return;
    setVoucherLoading(true); setVoucherError("");
    try {
      const r = await fetch(`/api/vouchers/validate?code=${encodeURIComponent(form.voucherInput.trim())}`);
      const d = await r.json();
      if (!d.valid) {
        setVoucherError(
          d.status === "expired" ? "Ce voucher a expiré." :
          d.status === "used" ? "Ce voucher a déjà été utilisé." :
          d.status === "reserved" ? "Ce voucher est en cours d'utilisation." : "Code invalide."
        );
        setForm(f => ({ ...f, voucher: null }));
      } else {
        setForm(f => ({ ...f, voucher: { id: d.id, code: d.code, duration_minutes: d.duration_minutes, product_title: d.product_title } }));
      }
    } catch { setVoucherError("Erreur de vérification."); }
    finally { setVoucherLoading(false); }
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
          voucher_id: form.voucher?.id || null,
        }),
      });
      const d = await r.json();
      if (!r.ok) { setSubmitError(d.error || "Erreur."); return; }
      setStep("done");
    } catch { setSubmitError("Erreur réseau."); }
    finally { setSubmitting(false); }
  }

  const stepIndex = STEPS.findIndex(s => s.key === step);
  const allStepsForBar = [...STEPS, { key: "done" as const, label: "Envoyé" }];
  const formattedDate = form.date
    ? new Date(form.date + "T12:00:00Z").toLocaleDateString("fr-BE", { weekday: "long", day: "numeric", month: "long" })
    : null;

  // ── Sidebar ───────────────────────────────────────────────
  function Sidebar() {
    return (
      <div className="bg-card rounded-2xl border border-border overflow-hidden" style={{ boxShadow: "var(--sh-sm)" }}>
        <div className="relative h-32 bg-navy-dk flex flex-col items-center justify-center gap-1 overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,#1a4a7a_0%,#0b2238_70%)]" />
          <p className="relative text-gold text-[9px] font-bold tracking-[3px] uppercase mb-1">Vol sur mesure</p>
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
          {dureMin > 0 && (
            <div className="pb-3 border-b border-border">
              <p className="text-xs text-muted-foreground mb-1">Estimation vol</p>
              <div className="flex items-baseline gap-2">
                <p className={`text-xl font-bold ${prixBillable === 0 && form.voucher ? "text-green-600" : "text-primary"}`}>
                  {prixBillable === 0 && form.voucher ? "Gratuit" : `${prixBillable} €`}
                </p>
                {discount > 0 && <p className="text-sm text-muted-foreground line-through">{prixEstime} €</p>}
              </div>
              {discount > 0 && <p className="text-xs text-green-600 font-medium">−{discount} € voucher</p>}
              {totalAcompte > 0 && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  Acompte : <span className="font-semibold text-foreground">{totalAcompte} €</span>
                </p>
              )}
            </div>
          )}

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

          {/* Route list — toujours visible dans la sidebar */}
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

      {/* ── Floating steps bar ─────────────────────────────── */}
      <div
        className="fixed inset-x-0 z-[49] flex justify-center px-4 pointer-events-none"
        style={{ top: HEADER_H }}
      >
        <div
          className="pointer-events-auto bg-card border border-border rounded-2xl px-5 py-3.5 flex items-center"
          style={{ boxShadow: "var(--sh-md)" }}
        >
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

      {/* ── Main content ───────────────────────────────────── */}
      <div style={{ paddingTop: CONTENT_PT }} className="pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col lg:flex-row gap-6 items-start">

            {/* ══ Steps content ══ */}
            <div className="flex-1 min-w-0 space-y-4">

              {/* ── Step 1 : Route ── toujours monté pour préserver la carte Leaflet */}
              <div style={{ display: step === "route" ? "block" : "none" }}>
                <div className="bg-card rounded-2xl border border-border overflow-hidden" style={{ boxShadow: "var(--sh-sm)" }}>

                  {/* ── Barre de contrôle ── */}
                  <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-muted/30">
                    <div className="flex items-center gap-1 bg-background border border-border rounded-lg p-0.5">
                      <button
                        type="button"
                        onClick={() => setRouteMode("optimized")}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                          routeMode === "optimized"
                            ? "bg-primary text-primary-foreground shadow-sm"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        <Shuffle size={12} /> Route optimisée
                      </button>
                      <button
                        type="button"
                        onClick={() => setRouteMode("manual")}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                          routeMode === "manual"
                            ? "bg-primary text-primary-foreground shadow-sm"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        <List size={12} /> Ordre des points
                      </button>
                    </div>
                    {routeData.waypoints.length > 0 && (
                      <button
                        type="button"
                        onClick={() => mapRef.current?.clearWaypoints()}
                        className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-destructive transition-colors"
                      >
                        <Trash2 size={12} /> Effacer tout
                      </button>
                    )}
                  </div>

                  {/* ── Map (hero) ── */}
                  <div className="relative" style={{ height: 520 }}>


                    {/* Hint quand vide */}
                    {routeData.waypoints.length === 0 && (
                      <div className="absolute bottom-12 inset-x-0 flex justify-center z-[400] pointer-events-none">
                        <div className="bg-navy/80 backdrop-blur-sm text-white text-xs px-4 py-2 rounded-full font-medium">
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

                  {/* ── Barre de stats ── */}
                  {routeData.distKm > 0 && (
                    <div className="flex items-stretch border-t border-border bg-muted/20">
                      {[
                        { label: "Distance",     value: `${routeData.distKm} km` },
                        { label: "Durée estimée", value: `~${routeData.dureMin} min` },
                        { label: "Prix estimé",  value: `${prixEstime} €` },
                        { label: "Points",       value: String(routeData.waypoints.length) },
                      ].map(({ label, value }, i) => (
                        <div key={i} className={`flex-1 px-3 py-2.5 text-center ${i > 0 ? "border-l border-border" : ""}`}>
                          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{label}</p>
                          <p className="text-sm font-bold text-foreground mt-0.5">{value}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* ── Panneau inférieur ── */}
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
                                "flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm font-medium transition-all",
                                active
                                  ? "border-primary bg-primary/8 text-primary"
                                  : "border-border hover:border-primary/40 text-muted-foreground hover:text-foreground",
                              ].join(" ")}>
                              <PlaneTakeoff size={12} />
                              <span>{so.icao}</span>
                              <span className="text-xs opacity-60">+{so.taxe}€</span>
                              {active && <Check size={10} className="text-primary" />}
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
                          Vous avez un voucher ? Renseignez-le à l&apos;étape <strong className="text-foreground">Informations</strong>.
                        </span>
                      </div>
                    </div>

                    {/* Continue */}
                    <div className="px-5 py-4">
                      <button
                        type="button"
                        disabled={routeData.waypoints.length === 0}
                        onClick={() => setStep("date-time")}
                        className="w-full h-11 rounded-xl bg-primary text-primary-foreground font-semibold text-sm flex items-center justify-center gap-2 hover:bg-primary/90 disabled:opacity-40 transition-all"
                      >
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
                <div className="bg-card rounded-2xl border border-border overflow-hidden" style={{ boxShadow: "var(--sh-sm)" }}>
                  <div className="px-6 pt-6 pb-4 border-b border-border">
                    <h2 className="text-lg font-bold text-foreground">Date & heure du vol</h2>
                    <p className="text-sm text-muted-foreground mt-1">Sélectionnez un jour disponible puis un créneau.</p>
                  </div>

                  <div className="px-6 py-5">
                    <div className="flex items-center justify-between mb-4">
                      <button type="button"
                        onClick={() => { if (calMonth === 1) { setCalMonth(12); setCalYear(y => y - 1); } else setCalMonth(m => m - 1); }}
                        className="w-9 h-9 rounded-lg border border-border flex items-center justify-center hover:bg-secondary transition-colors">
                        <ChevronLeft size={16} />
                      </button>
                      <span className="text-sm font-semibold">{MONTHS_FR[calMonth - 1]} {calYear}</span>
                      <button type="button"
                        onClick={() => { if (calMonth === 12) { setCalMonth(1); setCalYear(y => y + 1); } else setCalMonth(m => m + 1); }}
                        className="w-9 h-9 rounded-lg border border-border flex items-center justify-center hover:bg-secondary transition-colors">
                        <ChevronRight size={16} />
                      </button>
                    </div>
                    <div className="grid grid-cols-7 gap-0.5 mb-0.5">
                      {DAYS_FR.map((d, i) => (
                        <div key={i} className="text-center text-xs font-semibold text-muted-foreground py-1.5">{d}</div>
                      ))}
                    </div>
                    {calLoading ? (
                      <div className="flex items-center justify-center py-12">
                        <Loader2 size={20} className="animate-spin text-muted-foreground" />
                      </div>
                    ) : (
                      <div className="grid grid-cols-7 gap-0.5">{renderCalendar()}</div>
                    )}
                    <div className="flex items-center gap-5 mt-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-primary/20 border border-primary/40 inline-block" />Disponible</span>
                      <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-primary inline-block" />Sélectionné</span>
                    </div>
                  </div>

                  {form.date && (
                    <div className="px-6 pb-5 pt-4 border-t border-border">
                      <p className="text-sm font-semibold text-foreground mb-3">
                        Créneaux —{" "}
                        <span className="font-normal text-muted-foreground capitalize">
                          {new Date(form.date + "T12:00:00Z").toLocaleDateString("fr-BE", { weekday: "long", day: "numeric", month: "long" })}
                        </span>
                      </p>
                      {slotsLoading ? (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                          <Loader2 size={14} className="animate-spin" /> Chargement…
                        </div>
                      ) : slots.length === 0 ? (
                        <p className="text-sm text-muted-foreground">Aucun créneau disponible ce jour.</p>
                      ) : (
                        <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
                          {slots.map(s => (
                            <button key={s} type="button"
                              onClick={() => setForm(f => ({ ...f, heure: s }))}
                              className={[
                                "py-2.5 rounded-lg text-sm font-semibold border-2 transition-all",
                                form.heure === s ? "border-primary bg-primary text-primary-foreground" : "border-border hover:border-primary/50 hover:bg-secondary/50",
                              ].join(" ")}
                            >{s}</button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="px-6 pb-6 flex gap-3">
                    <button type="button" onClick={() => setStep("route")}
                      className="flex-1 h-12 rounded-xl border border-border text-sm font-semibold flex items-center justify-center gap-2 hover:bg-secondary transition-colors">
                      <ChevronLeft size={16} /> Retour
                    </button>
                    <button type="button" disabled={!form.date || !form.heure}
                      onClick={() => setStep("details")}
                      className="flex-1 h-12 rounded-xl bg-primary text-primary-foreground font-semibold text-sm flex items-center justify-center gap-2 hover:bg-primary/90 disabled:opacity-40 transition-all">
                      Continuer <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              )}

              {/* ── Step 3 : Informations ── */}
              {step === "details" && (
                <div className="bg-card rounded-2xl border border-border overflow-hidden" style={{ boxShadow: "var(--sh-sm)" }}>
                  <div className="px-6 pt-6 pb-4 border-b border-border">
                    <h2 className="text-lg font-bold text-foreground">Vos informations</h2>
                    <p className="text-sm text-muted-foreground mt-1">Ces informations permettent de préparer votre vol et d&apos;envoyer votre confirmation.</p>
                  </div>

                  <div className="px-6 py-5 space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {[
                        { label: "Prénom", key: "prenom", placeholder: "Jean", required: true },
                        { label: "Nom",    key: "nom",    placeholder: "Dupont", required: true },
                      ].map(({ label, key, placeholder, required }) => (
                        <div key={key}>
                          <label className="block text-sm font-medium text-foreground mb-1.5">{label} {required && <span className="text-destructive">*</span>}</label>
                          <input type="text" value={form[key as keyof FormData] as string} required={required}
                            onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                            className="w-full h-11 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                            placeholder={placeholder} />
                        </div>
                      ))}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-1.5">
                          <Mail size={12} className="inline mr-1" />Email <span className="text-destructive">*</span>
                        </label>
                        <input type="email" value={form.email} required onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                          className="w-full h-11 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                          placeholder="jean@exemple.com" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-1.5">
                          <Phone size={12} className="inline mr-1" />Téléphone
                        </label>
                        <input type="tel" value={form.telephone} onChange={e => setForm(f => ({ ...f, telephone: e.target.value }))}
                          className="w-full h-11 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                          placeholder="+32 470 00 00 00" />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-1.5">Passagers <span className="text-destructive">*</span></label>
                        <select value={form.passagers} onChange={e => setForm(f => ({ ...f, passagers: e.target.value }))}
                          className="w-full h-11 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                          <option value="1">1 passager</option>
                          <option value="2">2 passagers</option>
                          <option value="3">3 passagers</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-1.5">Poids total (kg) <span className="text-destructive">*</span></label>
                        <input type="number" value={form.poids_total} required min={1} max={500}
                          onChange={e => setForm(f => ({ ...f, poids_total: e.target.value }))}
                          className="w-full h-11 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                          placeholder="ex : 165" />
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground -mt-2">Poids cumulé de tous les passagers — requis pour le calcul masse &amp; centrage (max 178 kg).</p>

                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1.5">Remarques <span className="text-muted-foreground font-normal">(optionnel)</span></label>
                      <textarea value={form.commentaire} rows={3}
                        onChange={e => setForm(f => ({ ...f, commentaire: e.target.value }))}
                        className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                        placeholder="Lieux à survoler, occasion spéciale, questions…" />
                    </div>

                    {/* Voucher */}
                    <div className="pt-2 border-t border-border">
                      <label className="block text-sm font-medium text-foreground mb-1.5">
                        <Tag size={12} className="inline mr-1" />Voucher <span className="text-muted-foreground font-normal">(optionnel)</span>
                      </label>
                      <div className="flex gap-2">
                        <input type="text" value={form.voucherInput}
                          onChange={e => { setForm(f => ({ ...f, voucherInput: e.target.value.toUpperCase(), voucher: null })); setVoucherError(""); }}
                          onKeyDown={e => e.key === "Enter" && validateVoucher()}
                          className="flex-1 h-11 px-3 rounded-lg border border-input bg-background text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring uppercase tracking-widest"
                          placeholder="FH-XXXX-XXXX" />
                        <button type="button" onClick={validateVoucher}
                          disabled={!form.voucherInput.trim() || voucherLoading}
                          className="px-4 h-11 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 transition-colors flex items-center gap-1.5">
                          {voucherLoading ? <Loader2 size={14} className="animate-spin" /> : "Vérifier"}
                        </button>
                      </div>
                      {voucherError && (
                        <p className="mt-1.5 text-sm text-destructive flex items-center gap-1">
                          <AlertCircle size={13} /> {voucherError}
                        </p>
                      )}
                      {form.voucher && (
                        <div className="mt-2 flex items-center gap-2 text-sm text-green-700 bg-green-50 px-3 py-2.5 rounded-lg border border-green-200">
                          <CheckCircle size={14} />
                          <span><strong>{form.voucher.product_title}</strong> — {form.voucher.duration_minutes} min couverts</span>
                        </div>
                      )}
                      {form.voucher && dureMin > 0 && (
                        <p className="mt-1.5 text-xs text-muted-foreground">
                          Voucher couvre {Math.min(form.voucher.duration_minutes, dureMin)} min sur ~{dureMin} min estimés.
                          {billableMin > 0 ? ` Reste ${billableMin} min à facturer.` : " Vol entièrement couvert !"}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="px-6 pb-6 flex gap-3">
                    <button type="button" onClick={() => setStep("date-time")}
                      className="flex-1 h-12 rounded-xl border border-border text-sm font-semibold flex items-center justify-center gap-2 hover:bg-secondary transition-colors">
                      <ChevronLeft size={16} /> Retour
                    </button>
                    <button type="button"
                      disabled={!form.prenom || !form.nom || !form.email || !form.poids_total}
                      onClick={() => setStep("confirm")}
                      className="flex-1 h-12 rounded-xl bg-primary text-primary-foreground font-semibold text-sm flex items-center justify-center gap-2 hover:bg-primary/90 disabled:opacity-40 transition-all">
                      Continuer <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              )}

              {/* ── Step 4 : Confirmer ── */}
              {step === "confirm" && (
                <div className="bg-card rounded-2xl border border-border overflow-hidden" style={{ boxShadow: "var(--sh-sm)" }}>
                  <div className="px-6 pt-6 pb-4 border-b border-border">
                    <h2 className="text-lg font-bold text-foreground">Récapitulatif & confirmation</h2>
                    <p className="text-sm text-muted-foreground mt-1">Vérifiez votre demande avant de confirmer.</p>
                  </div>

                  <div className="px-6 py-5 space-y-4">
                    <div className="bg-secondary/40 rounded-xl p-4 space-y-2">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">Vos informations</p>
                      <div className="flex items-center gap-2.5 text-sm"><User size={14} className="text-muted-foreground" /><span className="font-semibold">{form.prenom} {form.nom}</span></div>
                      <div className="flex items-center gap-2.5 text-sm"><Mail size={14} className="text-muted-foreground" /><span className="text-muted-foreground">{form.email}</span></div>
                      <div className="flex items-center gap-2.5 text-sm"><Route size={14} className="text-muted-foreground" /><span className="text-muted-foreground">{routeData.distKm} km · ~{dureMin} min · {routeData.waypoints.length} point{routeData.waypoints.length > 1 ? "s" : ""}</span></div>
                    </div>

                    <div className="rounded-xl border border-border overflow-hidden">
                      <div className="px-4 py-3 bg-muted/30 border-b border-border">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Détail du prix</p>
                      </div>
                      <div className="p-4 space-y-2.5">
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
                        <div className="flex justify-between items-center pt-3 border-t border-border">
                          <div>
                            <p className="font-semibold text-sm text-foreground">Acompte à régler</p>
                            <p className="text-xs text-muted-foreground mt-0.5">Solde après le vol selon la durée réelle</p>
                          </div>
                          <span className={`text-2xl font-bold ${totalAcompte === 0 ? "text-green-600" : "text-primary"}`}>
                            {totalAcompte === 0 ? "Gratuit" : `${totalAcompte} €`}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3.5">
                      <Mail size={15} className="text-blue-600 mt-0.5 shrink-0" />
                      <p className="text-sm text-blue-800 leading-relaxed">
                        {totalAcompte > 0
                          ? `Après confirmation, vous recevrez un email à ${form.email} avec un lien sécurisé pour payer l'acompte de ${totalAcompte} €.`
                          : `Votre vol est entièrement couvert par votre voucher. Un email de confirmation vous sera envoyé à ${form.email}.`
                        }
                      </p>
                    </div>

                    <label className="flex items-start gap-3 cursor-pointer">
                      <input type="checkbox" checked={form.accept_cgp}
                        onChange={e => setForm(f => ({ ...f, accept_cgp: e.target.checked }))}
                        className="mt-0.5 w-4 h-4 accent-primary flex-shrink-0 rounded" />
                      <span className="text-sm text-muted-foreground leading-relaxed">
                        J&apos;accepte les{" "}
                        <a href="https://fly-horizons.com/cgp.html" target="_blank" rel="noopener noreferrer"
                          className="text-primary underline underline-offset-2 font-medium">
                          Conditions Générales de Participation
                        </a>{" "}
                        et que mes données soient utilisées pour traiter ma réservation.
                      </span>
                    </label>

                    {submitError && (
                      <p className="text-sm text-destructive flex items-center gap-1.5">
                        <AlertCircle size={14} /> {submitError}
                      </p>
                    )}
                  </div>

                  <div className="px-6 pb-6 flex gap-3">
                    <button type="button" onClick={() => setStep("details")}
                      className="flex-1 h-12 rounded-xl border border-border text-sm font-semibold flex items-center justify-center gap-2 hover:bg-secondary transition-colors">
                      <ChevronLeft size={16} /> Retour
                    </button>
                    <button type="button" disabled={!form.accept_cgp || submitting} onClick={handleSubmit}
                      className="flex-grow h-12 rounded-xl bg-primary text-primary-foreground font-semibold text-sm flex items-center justify-center gap-2 hover:bg-primary/90 disabled:opacity-40 transition-all">
                      {submitting ? (
                        <><Loader2 size={16} className="animate-spin" /> Envoi en cours…</>
                      ) : totalAcompte === 0 ? (
                        <><CheckCircle size={16} /> Confirmer mon vol</>
                      ) : (
                        <><Mail size={15} /> Recevoir le lien de paiement</>
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
                    {totalAcompte > 0 ? (
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
                            Cliquez sur le bouton dans l&apos;email pour payer l&apos;acompte de <strong className="text-foreground">{totalAcompte} €</strong> via Stripe.
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
                    className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors">
                    Retour à l&apos;accueil
                  </a>
                </div>
              )}
            </div>

            {/* ══ Sidebar ══ */}
            <div className="lg:w-72 xl:w-80 shrink-0 w-full" style={{ position: "sticky", top: CONTENT_PT - 8, alignSelf: "flex-start" }}>
              <Sidebar />
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
