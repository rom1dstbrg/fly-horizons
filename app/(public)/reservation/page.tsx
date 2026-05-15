"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  ChevronLeft, ChevronRight, Check, MapPin, Clock,
  Tag, Lock, CheckCircle, AlertCircle, Loader2,
  User, Phone, Mail,
} from "lucide-react";

// ── Types ────────────────────────────────────────────────────
const DUREES = [30, 60, 90, 120] as const;
type Duree = typeof DUREES[number];
type Step = "date-time" | "details" | "payment";

const PACK_LABELS: Record<Duree, string> = {
  30:  "Vol découverte",
  60:  "Vol initiation",
  90:  "Vol panoramique",
  120: "Grand vol",
};

interface VoucherInfo {
  id?: string;
  code: string;
  duration_minutes: number;
  product_title: string;
}

interface FormData {
  duree: Duree;
  date: string;
  heure: string;
  prenom: string;
  nom: string;
  email: string;
  telephone: string;
  poids_total: string;
  voucherInput: string;
  voucher: VoucherInfo | null;
  accept_cgp: boolean;
}

const MONTHS_FR = ["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"];
const DAYS_FR   = ["L","M","M","J","V","S","D"];

function computePrice(duree: Duree, prixHeure: number, voucher: VoucherInfo | null, prixPack?: number) {
  const full = prixPack ?? Math.round((prixHeure / 60) * duree);
  if (!voucher) return { price: full, discount: 0, full };
  const covered = Math.min(duree, voucher.duration_minutes);
  const price = Math.round((prixHeure / 60) * Math.max(0, duree - covered));
  return { price, discount: full - price, full };
}

const STEPS: { key: Step; label: string }[] = [
  { key: "date-time", label: "Date & heure" },
  { key: "details",   label: "Détails" },
  { key: "payment",   label: "Paiement" },
];

// ── Page ─────────────────────────────────────────────────────
export default function ReservationPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("date-time");
  const [prixHeure, setPrixHeure] = useState(254);
  const [packPrices, setPackPrices] = useState<Partial<Record<Duree, number>>>({});
  const [form, setForm] = useState<FormData>({
    duree: 60, date: "", heure: "",
    prenom: "", nom: "", email: "", telephone: "", poids_total: "",
    voucherInput: "", voucher: null, accept_cgp: false,
  });

  const today = new Date();
  const [calYear,  setCalYear]  = useState(today.getFullYear());
  const [calMonth, setCalMonth] = useState(today.getMonth() + 1);
  const [availableDays,   setAvailableDays]   = useState<string[]>([]);
  const [calLoading,      setCalLoading]      = useState(false);
  const [slots,           setSlots]           = useState<string[]>([]);
  const [slotsLoading,    setSlotsLoading]    = useState(false);
  const [voucherLoading,  setVoucherLoading]  = useState(false);
  const [voucherError,    setVoucherError]    = useState("");
  const [submitting,      setSubmitting]      = useState(false);
  const [submitError,     setSubmitError]     = useState("");

  // Lire ?duree= dans l'URL et pré-sélectionner
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const d = parseInt(params.get("duree") ?? "");
    if (([30, 60, 90, 120] as number[]).includes(d)) {
      setForm(f => ({ ...f, duree: d as Duree }));
    }
  }, []);

  // Prix + auth
  useEffect(() => {
    const sb = createClient();
    // Charger les prix depuis les produits voucher (source unique)
    sb.from("products")
      .select("price, voucher_duration_minutes")
      .eq("active", true)
      .eq("product_type", "voucher")
      .then(({ data }) => {
        if (!data) return;
        const prices: Partial<Record<Duree, number>> = {};
        let totalRate = 0; let count = 0;
        data.forEach(p => {
          const d = p.voucher_duration_minutes as Duree;
          if (d && p.price) {
            prices[d] = p.price;
            totalRate += (p.price / d) * 60;
            count++;
          }
        });
        setPackPrices(prices);
        // prix_heure dérivé des produits pour le calcul de différence voucher
        if (count > 0) setPrixHeure(Math.round(totalRate / count));
      });
    // Fallback: prix_heure depuis crm_settings si pas de produits configurés
    sb.from("crm_settings").select("value").eq("key", "prix_heure").single()
      .then(({ data }) => { if (data?.value && Object.keys({}).length === 0) setPrixHeure(parseFloat(data.value)); });
    sb.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      sb.from("profiles").select("full_name, phone").eq("id", user.id).single()
        .then(({ data }) => {
          const parts = (data?.full_name || "").split(" ");
          setForm(f => ({ ...f, email: user.email ?? "", prenom: parts[0] ?? "", nom: parts.slice(1).join(" ") ?? "", telephone: data?.phone ?? "" }));
        });
    });
  }, []);

  const loadMonth = useCallback(async (y: number, m: number) => {
    setCalLoading(true);
    try {
      const r = await fetch(`/api/reservation/month?year=${y}&month=${m}&duree=${form.duree}`);
      const d = await r.json();
      setAvailableDays(d.available ?? []);
    } finally { setCalLoading(false); }
  }, [form.duree]);

  useEffect(() => { loadMonth(calYear, calMonth); }, [calYear, calMonth, loadMonth]);

  useEffect(() => {
    if (!form.date) { setSlots([]); return; }
    setSlotsLoading(true);
    fetch(`/api/reservation/slots?date=${form.date}&duree=${form.duree}`)
      .then(r => r.json()).then(d => setSlots(d.slots ?? []))
      .finally(() => setSlotsLoading(false));
  }, [form.date, form.duree]);

  async function validateVoucher() {
    if (!form.voucherInput.trim()) return;
    setVoucherLoading(true); setVoucherError("");
    try {
      const r = await fetch(`/api/vouchers/validate?code=${encodeURIComponent(form.voucherInput.trim())}`);
      const d = await r.json();
      if (!d.valid) {
        setVoucherError(d.status === "expired" ? "Ce voucher a expiré." : d.status === "used" ? "Ce voucher a déjà été utilisé." : "Code invalide.");
        setForm(f => ({ ...f, voucher: null }));
      } else {
        setForm(f => ({ ...f, voucher: { code: d.code, duration_minutes: d.duration_minutes, product_title: d.product_title } }));
      }
    } catch { setVoucherError("Erreur de vérification."); }
    finally { setVoucherLoading(false); }
  }

  async function handleSubmit() {
    setSubmitting(true); setSubmitError("");
    const { price } = computePrice(form.duree, prixHeure, form.voucher);
    const payload = { prenom: form.prenom, nom: form.nom, email: form.email, telephone: form.telephone, duree: form.duree, date: form.date, heure: form.heure, poids_total: form.poids_total ? parseInt(form.poids_total) : null, voucher_code: form.voucher?.code };
    if (price === 0) {
      const r = await fetch("/api/reservation/submit", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const d = await r.json();
      if (!r.ok) { setSubmitError(d.error || "Erreur."); setSubmitting(false); return; }
      router.push("/reservation/success");
    } else {
      const r = await fetch("/api/reservation/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...payload, amount_cents: price * 100, voucher_id: form.voucher?.id }) });
      const d = await r.json();
      if (!r.ok) { setSubmitError(d.error || "Erreur."); setSubmitting(false); return; }
      window.location.href = d.url;
    }
  }

  // Prix du pack: depuis le produit si dispo, sinon calcul depuis prix_heure
  const prixPack = packPrices[form.duree] ?? Math.round((prixHeure / 60) * form.duree);
  const { price, discount, full: prixPlein } = computePrice(form.duree, prixHeure, form.voucher, prixPack);
  const stepIndex = STEPS.findIndex(s => s.key === step);

  // ── Calendar ─────────────────────────────────────────────
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
            "h-9 w-full rounded-lg text-sm font-medium transition-all select-none",
            isSel   ? "bg-primary text-primary-foreground shadow-sm" :
            isAvail && !isPast ? "hover:bg-primary/10 text-foreground" :
            "text-muted-foreground/25 cursor-not-allowed",
          ].join(" ")}
        >{d}</button>
      );
    }
    return cells;
  }

  // ── Sidebar ───────────────────────────────────────────────
  const formattedDate = form.date
    ? new Date(form.date + "T12:00:00Z").toLocaleDateString("fr-BE", { weekday: "long", day: "numeric", month: "long" })
    : null;

  function Sidebar() {
    return (
      <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden lg:sticky lg:top-[130px]">

        {/* Visual pack */}
        <div className="relative h-40 bg-[#0b2238] flex flex-col items-center justify-center gap-1 overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,#1a4a7a_0%,#0b2238_70%)]" />
          <p className="relative text-[#F2B705] text-[10px] font-bold tracking-[3px] uppercase mb-1">Fly Horizons</p>
          <p className="relative text-white text-5xl font-black leading-none">{form.duree}<span className="text-2xl font-bold">min</span></p>
          <p className="relative text-white/50 text-xs font-medium tracking-wide mt-1">{PACK_LABELS[form.duree]}</p>
        </div>

        {/* Info */}
        <div className="p-5 space-y-4">

          <div>
            <p className="font-semibold text-foreground">{PACK_LABELS[form.duree]} · {form.duree} min</p>
            <div className="flex items-baseline gap-2 mt-1">
              <p className={`text-2xl font-bold ${price === 0 && form.voucher ? "text-green-600" : "text-primary"}`}>
                {price === 0 && form.voucher ? "Gratuit" : `${price} €`}
              </p>
              {discount > 0 && (
                <p className="text-sm text-muted-foreground line-through">{prixPlein} €</p>
              )}
            </div>
            {discount > 0 && (
              <p className="text-xs text-green-600 font-medium mt-0.5">−{discount} € avec votre voucher</p>
            )}
          </div>

          <div className="space-y-2.5 border-t border-border pt-4">
            <div className="flex items-start gap-2.5">
              <MapPin size={13} className="text-muted-foreground mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-medium text-foreground">Aéroport de Charleroi (EBCI)</p>
                <p className="text-xs text-muted-foreground">Charleroi, Belgique</p>
              </div>
            </div>
            <div className="flex items-center gap-2.5">
              <Clock size={13} className="text-muted-foreground shrink-0" />
              <p className="text-xs text-muted-foreground">{form.duree} minutes de vol</p>
            </div>
            {formattedDate && (
              <div className="flex items-center gap-2.5">
                <Check size={13} className="text-primary shrink-0" />
                <p className="text-xs text-foreground font-medium capitalize">
                  {formattedDate}{form.heure ? ` · ${form.heure}` : ""}
                </p>
              </div>
            )}
          </div>

          <p className="text-[11px] text-muted-foreground pt-1 border-t border-border">
            Vol privé en avion léger avec un pilote professionnel.
          </p>
        </div>
      </div>
    );
  }

  // ── Progress bar ──────────────────────────────────────────
  const allSteps = [...STEPS, { key: "success" as const, label: "Réservé" }];

  return (
    <div className="min-h-screen bg-[#f5f5f7] dark:bg-background">

      {/* Spacer qui pousse le contenu sous le header fixe (top-3.5 + h-[60px] = 74px) */}
      <div className="h-[86px] bg-white dark:bg-card" />

      {/* Progress header — sticky juste sous le header du site */}
      <div className="sticky top-[76px] z-[39] bg-white dark:bg-card border-b border-border shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-center">
          <div className="flex items-center">
            {allSteps.map((s, i) => {
              const isPast   = i < stepIndex;
              const isActive = s.key === step;
              return (
                <div key={s.key} className="flex items-center">
                  <div className="flex flex-col items-center gap-1 px-1">
                    <div className={[
                      "w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold transition-all",
                      isPast   ? "bg-primary text-primary-foreground" :
                      isActive ? "bg-primary text-primary-foreground ring-[3px] ring-primary/25" :
                                 "bg-muted text-muted-foreground",
                    ].join(" ")}>
                      {isPast ? <Check size={11} /> : i + 1}
                    </div>
                    <span className={`text-[10px] hidden sm:block whitespace-nowrap font-medium leading-none ${isActive ? "text-foreground" : "text-muted-foreground"}`}>
                      {s.label}
                    </span>
                  </div>
                  {i < allSteps.length - 1 && (
                    <div className={`w-8 sm:w-14 h-px mx-0.5 mb-3.5 transition-all ${isPast ? "bg-primary" : "bg-border"}`} />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Layout */}
      <div className="max-w-5xl mx-auto px-4 py-8 pb-16">
        <div className="flex flex-col lg:flex-row gap-6">

          {/* ══ Main content ══ */}
          <div className="flex-1 min-w-0 space-y-4">

            {/* ── Step 1 : Date & heure ── */}
            {step === "date-time" && (
              <div className="bg-white dark:bg-card rounded-2xl border border-border shadow-sm overflow-hidden">

                {/* Duration */}
                <div className="px-6 pt-6 pb-4 border-b border-border">
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest mb-3">Durée du vol</p>
                  <div className="grid grid-cols-4 gap-2">
                    {DUREES.map(d => {
                      const p = packPrices[d] ?? Math.round((prixHeure / 60) * d);
                      const sel = form.duree === d;
                      return (
                        <button key={d} type="button"
                          onClick={() => setForm(f => ({ ...f, duree: d, date: "", heure: "" }))}
                          className={[
                            "flex flex-col items-center py-3 px-2 rounded-xl border-2 transition-all",
                            sel ? "border-primary bg-primary/5 shadow-sm" : "border-border hover:border-primary/40 hover:bg-secondary/50",
                          ].join(" ")}
                        >
                          <span className={`text-sm font-bold ${sel ? "text-primary" : "text-foreground"}`}>{d} min</span>
                          <span className="text-xs text-muted-foreground mt-0.5">{p} €</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Calendar */}
                <div className="px-6 py-5">
                  <div className="flex items-center justify-between mb-4">
                    <button type="button"
                      onClick={() => { if (calMonth === 1) { setCalMonth(12); setCalYear(y => y - 1); } else setCalMonth(m => m - 1); }}
                      className="w-8 h-8 rounded-lg border border-border flex items-center justify-center hover:bg-secondary transition-colors">
                      <ChevronLeft size={15} />
                    </button>
                    <span className="text-sm font-semibold">{MONTHS_FR[calMonth - 1]} {calYear}</span>
                    <button type="button"
                      onClick={() => { if (calMonth === 12) { setCalMonth(1); setCalYear(y => y + 1); } else setCalMonth(m => m + 1); }}
                      className="w-8 h-8 rounded-lg border border-border flex items-center justify-center hover:bg-secondary transition-colors">
                      <ChevronRight size={15} />
                    </button>
                  </div>

                  <div className="grid grid-cols-7 gap-0.5 mb-0.5">
                    {DAYS_FR.map((d, i) => (
                      <div key={i} className="text-center text-[11px] font-medium text-muted-foreground/60 py-1">{d}</div>
                    ))}
                  </div>

                  {calLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 size={20} className="animate-spin text-muted-foreground" />
                    </div>
                  ) : (
                    <div className="grid grid-cols-7 gap-0.5">
                      {renderCalendar()}
                    </div>
                  )}

                  <div className="flex items-center gap-4 mt-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-primary/20 border border-primary/40 inline-block" />Disponible</span>
                    <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-primary inline-block" />Sélectionné</span>
                  </div>
                </div>

                {/* Time slots */}
                {form.date && (
                  <div className="px-6 pb-5 pt-4 border-t border-border">
                    <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest mb-3">
                      Créneaux disponibles
                      <span className="font-normal normal-case tracking-normal ml-1 text-foreground/60">
                        — {new Date(form.date + "T12:00:00Z").toLocaleDateString("fr-BE", { weekday: "long", day: "numeric", month: "long" })}
                      </span>
                    </p>
                    {slotsLoading ? (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                        <Loader2 size={14} className="animate-spin" /> Chargement…
                      </div>
                    ) : slots.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Aucun créneau disponible ce jour.</p>
                    ) : (
                      <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                        {slots.map(s => (
                          <button key={s} type="button"
                            onClick={() => setForm(f => ({ ...f, heure: s }))}
                            className={[
                              "py-2 rounded-lg text-sm font-medium border-2 transition-all",
                              form.heure === s ? "border-primary bg-primary text-primary-foreground" : "border-border hover:border-primary/50 hover:bg-secondary/50",
                            ].join(" ")}
                          >{s}</button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Description */}
                <div className="px-6 pb-5 pt-4 border-t border-border">
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest mb-2">À propos</p>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Vol en avion léger au départ de l&apos;Aéroport de Charleroi (EBCI), avec un pilote professionnel.
                    Vols disponibles en semaine et le week-end selon disponibilités.
                  </p>
                  <p className="text-xs text-muted-foreground/70 mt-2">
                    Vous avez un numéro de vol ? Vous pourrez le renseigner à l&apos;étape suivante.
                  </p>
                </div>

                <div className="px-6 pb-6">
                  <button type="button" disabled={!form.date || !form.heure}
                    onClick={() => setStep("details")}
                    className="w-full h-11 rounded-xl bg-primary text-primary-foreground font-semibold text-sm flex items-center justify-center gap-2 hover:bg-primary/90 disabled:opacity-35 transition-all">
                    Continuer <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}

            {/* ── Step 2 : Détails ── */}
            {step === "details" && (
              <div className="bg-white dark:bg-card rounded-2xl border border-border shadow-sm p-6 space-y-4">

                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: "Prénom", key: "prenom", placeholder: "Jean", type: "text" },
                    { label: "Nom",    key: "nom",    placeholder: "Dupont", type: "text" },
                  ].map(({ label, key, placeholder, type }) => (
                    <div key={key}>
                      <label className="block text-xs font-medium text-muted-foreground mb-1.5">{label} <span className="text-destructive">*</span></label>
                      <input type={type} value={form[key as keyof FormData] as string} required
                        onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                        className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                        placeholder={placeholder} />
                    </div>
                  ))}
                </div>

                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                    <Mail size={11} className="inline mr-1" />Email <span className="text-destructive">*</span>
                  </label>
                  <input type="email" value={form.email} required onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                    className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder="jean@exemple.com" />
                </div>

                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                    <Phone size={11} className="inline mr-1" />Téléphone
                  </label>
                  <input type="tel" value={form.telephone} onChange={e => setForm(f => ({ ...f, telephone: e.target.value }))}
                    className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder="+32 470 00 00 00" />
                </div>

                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                    Poids total des passagers (kg) <span className="text-destructive">*</span>
                  </label>
                  <input type="number" value={form.poids_total} required min={1} max={500}
                    onChange={e => setForm(f => ({ ...f, poids_total: e.target.value }))}
                    className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder="ex : 160" />
                  <p className="mt-1 text-xs text-muted-foreground">Somme de tous les passagers — requis pour le calcul masse & centrage.</p>
                </div>

                {/* Voucher */}
                <div className="pt-1 border-t border-border">
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                    <Tag size={11} className="inline mr-1" />Numéro de vol <span className="text-muted-foreground/50 font-normal">(optionnel)</span>
                  </label>
                  <div className="flex gap-2">
                    <input type="text" value={form.voucherInput}
                      onChange={e => { setForm(f => ({ ...f, voucherInput: e.target.value.toUpperCase(), voucher: null })); setVoucherError(""); }}
                      onKeyDown={e => e.key === "Enter" && validateVoucher()}
                      className="flex-1 h-10 px-3 rounded-lg border border-input bg-background text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring uppercase"
                      placeholder="FH-XXXX-XXXX" />
                    <button type="button" onClick={validateVoucher}
                      disabled={!form.voucherInput.trim() || voucherLoading}
                      className="px-4 h-10 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors flex items-center gap-1.5">
                      {voucherLoading ? <Loader2 size={14} className="animate-spin" /> : "Vérifier"}
                    </button>
                  </div>
                  {voucherError && (
                    <p className="mt-1.5 text-xs text-destructive flex items-center gap-1"><AlertCircle size={12} /> {voucherError}</p>
                  )}
                  {form.voucher && (
                    <div className="mt-2 flex items-center gap-2 text-xs text-green-600 dark:text-green-400 bg-green-500/10 px-3 py-2 rounded-lg">
                      <CheckCircle size={13} />
                      <span><strong>{form.voucher.product_title}</strong> ({form.voucher.duration_minutes} min) — appliqué</span>
                    </div>
                  )}
                </div>

                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setStep("date-time")}
                    className="flex-1 h-11 rounded-xl border border-border text-sm font-medium flex items-center justify-center gap-2 hover:bg-secondary transition-colors">
                    <ChevronLeft size={16} /> Retour
                  </button>
                  <button type="button"
                    disabled={!form.prenom || !form.nom || !form.email || !form.poids_total}
                    onClick={() => setStep("payment")}
                    className="flex-1 h-11 rounded-xl bg-primary text-primary-foreground font-semibold text-sm flex items-center justify-center gap-2 hover:bg-primary/90 disabled:opacity-35 transition-all">
                    Continuer <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}

            {/* ── Step 3 : Paiement ── */}
            {step === "payment" && (
              <div className="bg-white dark:bg-card rounded-2xl border border-border shadow-sm p-6 space-y-4">

                {/* Récap identité */}
                <div className="bg-secondary/40 rounded-xl p-4 space-y-1.5">
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest mb-2">Récapitulatif</p>
                  <div className="flex items-center gap-2 text-sm"><User size={13} className="text-muted-foreground" /><span className="font-medium">{form.prenom} {form.nom}</span></div>
                  <div className="flex items-center gap-2 text-sm"><Mail size={13} className="text-muted-foreground" /><span className="text-muted-foreground">{form.email}</span></div>
                  {form.telephone && <div className="flex items-center gap-2 text-sm"><Phone size={13} className="text-muted-foreground" /><span className="text-muted-foreground">{form.telephone}</span></div>}
                </div>

                {/* Prix */}
                <div className="rounded-xl border border-border p-4 space-y-2">
                  {discount > 0 && (
                    <>
                      <div className="flex justify-between text-sm text-muted-foreground">
                        <span>Prix standard ({form.duree} min)</span>
                        <span className="line-through">{prixPlein} €</span>
                      </div>
                      <div className="flex justify-between text-sm text-green-600 dark:text-green-400">
                        <span>Voucher ({form.voucher?.duration_minutes} min offerts)</span>
                        <span>−{discount} €</span>
                      </div>
                    </>
                  )}
                  <div className="flex justify-between items-center pt-1 border-t border-border">
                    <span className="font-semibold">Total</span>
                    <span className={`text-2xl font-bold ${price === 0 ? "text-green-600" : "text-primary"}`}>
                      {price === 0 ? "Gratuit" : `${price} €`}
                    </span>
                  </div>
                </div>

                {/* CGP */}
                <label className="flex items-start gap-3 cursor-pointer">
                  <input type="checkbox" checked={form.accept_cgp}
                    onChange={e => setForm(f => ({ ...f, accept_cgp: e.target.checked }))}
                    className="mt-0.5 w-4 h-4 accent-primary flex-shrink-0 rounded" />
                  <span className="text-xs text-muted-foreground leading-relaxed">
                    J&apos;accepte les{" "}
                    <a href="https://fly-horizons.com/cgp.html" target="_blank" rel="noopener noreferrer"
                      className="text-primary underline underline-offset-2">
                      Conditions Générales de Participation
                    </a>{" "}
                    et que mes données soient utilisées pour traiter ma réservation.
                  </span>
                </label>

                {submitError && (
                  <p className="text-xs text-destructive flex items-center gap-1.5">
                    <AlertCircle size={13} /> {submitError}
                  </p>
                )}

                <div className="flex gap-3">
                  <button type="button" onClick={() => setStep("details")}
                    className="flex-1 h-11 rounded-xl border border-border text-sm font-medium flex items-center justify-center gap-2 hover:bg-secondary transition-colors">
                    <ChevronLeft size={16} /> Retour
                  </button>
                  <button type="button" disabled={!form.accept_cgp || submitting} onClick={handleSubmit}
                    className="flex-grow h-11 rounded-xl bg-primary text-primary-foreground font-semibold text-sm flex items-center justify-center gap-2 hover:bg-primary/90 disabled:opacity-35 transition-all">
                    {submitting ? (
                      <><Loader2 size={16} className="animate-spin" /> Traitement…</>
                    ) : price === 0 ? (
                      <><CheckCircle size={16} /> Confirmer gratuitement</>
                    ) : (
                      <><Lock size={15} /> Payer {price} € par carte</>
                    )}
                  </button>
                </div>

                {price > 0 && (
                  <p className="text-center text-xs text-muted-foreground flex items-center justify-center gap-1.5">
                    <Lock size={10} /> Paiement sécurisé par <strong>Stripe</strong> — vos données ne sont jamais stockées
                  </p>
                )}
              </div>
            )}
          </div>

          {/* ══ Sidebar ══ */}
          <div className="lg:w-64 xl:w-72 shrink-0">
            <Sidebar />
          </div>

        </div>
      </div>
    </div>
  );
}
