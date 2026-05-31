"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import {
  ChevronLeft, ChevronRight, Clock, Lock,
  CheckCircle, AlertCircle, AlertTriangle, Loader2, Users, ArrowRight, X, CloudRain,
} from "lucide-react";
import { formatDuration } from "@/lib/vouchers";

// ── Types ───────────────────────────────────────────────────────────
type Step = "datetime" | "infos" | "paiement";

interface VolProduct {
  id: string;
  title: string;
  short_description: string | null;
  price: number;
  voucher_duration_minutes: number;
  images?: { url: string }[];
}
interface VoucherInfo { code: string; duration_minutes: number; product_title: string; }
interface CouponInfo { code: string; type: string; value: number; }
interface FormState {
  product: VolProduct | null;
  date: string; heure: string;
  prenom: string; nom: string; email: string; telephone: string;
  passengers: number; poids_total: string; commentaire: string;
  codeInput: string;
  voucher: VoucherInfo | null;
  coupon: CouponInfo | null;
  accept_cgp: boolean;
}

const MONTHS_FR = ["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"];
const DAYS_FR   = ["Lun","Mar","Mer","Jeu","Ven","Sam","Dim"];

const STEPS: { key: Step; label: string }[] = [
  { key: "datetime", label: "Date & heure" },
  { key: "infos",    label: "Informations" },
  { key: "paiement", label: "Paiement" },
];

function computePrice(product: VolProduct | null, voucher: VoucherInfo | null, coupon: CouponInfo | null = null) {
  if (!product) return { price: 0, discount: 0, couponDiscount: 0, full: 0 };
  const full = product.price;
  let price = full;
  let discount = 0;
  if (voucher) {
    const covered = Math.min(product.voucher_duration_minutes, voucher.duration_minutes);
    discount = Math.round((full / product.voucher_duration_minutes) * covered);
    price = Math.max(0, price - discount);
  }
  let couponDiscount = 0;
  if (coupon && price > 0) {
    if (coupon.type === "percentage") {
      couponDiscount = Math.round((price * coupon.value) / 100);
    } else {
      couponDiscount = Math.min(coupon.value, price);
    }
    price = Math.max(0, price - couponDiscount);
  }
  return { price, discount, couponDiscount, full };
}

// ── Page ────────────────────────────────────────────────────────────
export default function ReservationPage() {
  const router = useRouter();
  const [step, setStep]     = useState<Step>("datetime");
  const [prodLoading, setProdLoading] = useState(true);
  const [form, setForm] = useState<FormState>({
    product: null, date: "", heure: "",
    prenom: "", nom: "", email: "", telephone: "",
    passengers: 0, poids_total: "", commentaire: "",
    codeInput: "", voucher: null, coupon: null,
    accept_cgp: false,
  });

  const today = new Date();
  const minBookableDate = new Date(today);
  minBookableDate.setHours(0, 0, 0, 0);
  minBookableDate.setDate(minBookableDate.getDate() + 2);
  const [calYear,  setCalYear]  = useState(today.getFullYear());
  const [calMonth, setCalMonth] = useState(today.getMonth() + 1);
  const [availDays,    setAvailDays]    = useState<string[]>([]);
  const [calLoading,   setCalLoading]   = useState(false);
  const [slots,        setSlots]        = useState<string[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [codeLoading, setCodeLoading] = useState(false);
  const [codeError,   setCodeError]   = useState("");
  const [submitting,   setSubmitting]   = useState(false);
  const [submitError,  setSubmitError]  = useState("");
  const [payLaterSubmitting, setPayLaterSubmitting] = useState(false);

  // ── Data ─────────────────────────────────────────────────────────
  useEffect(() => {
    const sb = createClient();
    const params = new URLSearchParams(window.location.search);
    const dureeParam = parseInt(params.get("duree") ?? "");
    const codeParam  = params.get("code") ?? "";

    if (!dureeParam) { router.replace("/nos-offres"); return; }

    sb.from("products")
      .select("id, title, short_description, price, voucher_duration_minutes, images:product_images(url)")
      .eq("active", true).eq("product_type", "voucher").eq("voucher_duration_minutes", dureeParam)
      .single()
      .then(({ data }) => {
        if (data) {
          setForm(f => ({ ...f, product: data as VolProduct }));
        } else {
          router.replace("/nos-offres");
        }
        setProdLoading(false);

        if (codeParam) {
          const cleaned = codeParam.replace(/[^A-Z0-9]/gi, "").toUpperCase();
          setCodeLoading(true);
          if (cleaned.length === 16) {
            const formatted = cleaned.match(/.{1,4}/g)!.join("-");
            setForm(f => ({ ...f, codeInput: formatted }));
            fetch(`/api/vouchers/validate?code=${encodeURIComponent(formatted)}`)
              .then(r => r.json()).then(d => {
                if (d.valid) {
                  setForm(f => ({ ...f, voucher: { code: d.code, duration_minutes: d.duration_minutes, product_title: d.product_title } }));
                  setCodeLoading(false);
                } else if (!d.status || (d.status !== "expired" && d.status !== "used" && d.status !== "reserved")) {
                  fetch(`/api/promo/validate?code=${encodeURIComponent(cleaned)}`)
                    .then(r => r.json()).then(d2 => {
                      if (d2.valid) setForm(f => ({ ...f, coupon: { code: d2.code, type: d2.type, value: d2.value } }));
                      else setCodeError(d2.error || "Code invalide.");
                    }).finally(() => setCodeLoading(false));
                } else {
                  setCodeError(d.status === "expired" ? "Ce voucher a expiré." : d.status === "used" ? "Ce voucher a déjà été utilisé." : "Ce voucher est en cours d'utilisation.");
                  setCodeLoading(false);
                }
              });
          } else {
            setForm(f => ({ ...f, codeInput: cleaned }));
            fetch(`/api/promo/validate?code=${encodeURIComponent(cleaned)}`)
              .then(r => r.json()).then(d => {
                if (d.valid) setForm(f => ({ ...f, coupon: { code: d.code, type: d.type, value: d.value } }));
                else setCodeError(d.error || "Code invalide.");
              }).finally(() => setCodeLoading(false));
          }
        }
      });

    sb.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      sb.from("profiles").select("full_name, phone").eq("id", user.id).single()
        .then(({ data }) => {
          const p = (data?.full_name ?? "").split(" ");
          setForm(f => ({ ...f, email: user.email ?? "", prenom: p[0] ?? "", nom: p.slice(1).join(" "), telephone: data?.phone ?? "" }));
        });
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const duree = form.product?.voucher_duration_minutes ?? 60;

  const loadMonth = useCallback(async (y: number, m: number) => {
    if (!form.product) return;
    setCalLoading(true);
    try {
      const r = await fetch(`/api/reservation/month?year=${y}&month=${m}&duree=${form.product.voucher_duration_minutes}`);
      setAvailDays((await r.json()).available ?? []);
    } finally { setCalLoading(false); }
  }, [form.product]);

  useEffect(() => {
    if (!form.date || !form.product) { setSlots([]); return; }
    setSlotsLoading(true);
    fetch(`/api/reservation/slots?date=${form.date}&duree=${form.product.voucher_duration_minutes}`)
      .then(r => r.json()).then(d => setSlots(d.slots ?? [])).finally(() => setSlotsLoading(false));
  }, [form.date, form.product]);

  // Find first month with available slots silently (no flash of empty months)
  useEffect(() => {
    if (!form.product) return;
    let cancelled = false;
    const dureeMin = form.product.voucher_duration_minutes;
    async function findFirstMonth() {
      setCalLoading(true);
      const sy = today.getFullYear(), sm = today.getMonth() + 1;
      for (let offset = 0; offset < 6; offset++) {
        let m = sm + offset, y = sy;
        while (m > 12) { m -= 12; y++; }
        try {
          const r = await fetch(`/api/reservation/month?year=${y}&month=${m}&duree=${dureeMin}`);
          if (cancelled) return;
          const available = (await r.json()).available ?? [];
          if (available.length > 0 || offset === 5) {
            setCalYear(y); setCalMonth(m); setAvailDays(available);
            setCalLoading(false); return;
          }
        } catch { if (!cancelled) setCalLoading(false); return; }
      }
      if (!cancelled) setCalLoading(false);
    }
    findFirstMonth();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.product]);

  async function applyCode(override?: string) {
    const raw = (override ?? form.codeInput).replace(/\s/g, "").toUpperCase();
    if (!raw) return;
    const alnum = raw.replace(/-/g, "");
    setCodeLoading(true); setCodeError("");
    setForm(f => ({ ...f, voucher: null, coupon: null }));
    try {
      if (alnum.length === 16) {
        const formatted = alnum.match(/.{1,4}/g)!.join("-");
        const r = await fetch(`/api/vouchers/validate?code=${encodeURIComponent(formatted)}`);
        const d = await r.json();
        if (d.valid) {
          setForm(f => ({ ...f, voucher: { code: d.code, duration_minutes: d.duration_minutes, product_title: d.product_title } }));
          return;
        }
        if (d.status === "expired")  { setCodeError("Ce voucher a expiré."); return; }
        if (d.status === "used")     { setCodeError("Ce voucher a déjà été utilisé."); return; }
        if (d.status === "reserved") { setCodeError("Ce voucher est en cours d'utilisation."); return; }
      }
      const r2 = await fetch(`/api/promo/validate?code=${encodeURIComponent(alnum)}`);
      const d2 = await r2.json();
      if (d2.valid) {
        setForm(f => ({ ...f, coupon: { code: d2.code, type: d2.type, value: d2.value } }));
      } else {
        setCodeError(d2.error || "Code invalide, vérifiez et réessayez.");
      }
    } catch { setCodeError("Erreur de connexion, veuillez réessayer."); }
    finally { setCodeLoading(false); }
  }

  async function handleSubmit() {
    setSubmitting(true); setSubmitError("");
    const { price } = computePrice(form.product, form.voucher, form.coupon);
    const payload = {
      prenom: form.prenom, nom: form.nom, email: form.email, telephone: form.telephone,
      duree, date: form.date, heure: form.heure,
      passengers: form.passengers, poids_total: form.poids_total ? parseInt(form.poids_total) : null,
      voucher_code: form.voucher?.code,
      coupon_code: form.coupon?.code || undefined,
      commentaire: form.commentaire || undefined,
    };
    if (price === 0) {
      const r = await fetch("/api/reservation/submit", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const d = await r.json();
      if (!r.ok) { setSubmitError(d.error || "Erreur."); setSubmitting(false); return; }
      router.push("/reservation/success");
    } else {
      const r = await fetch("/api/reservation/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...payload, amount_cents: price * 100 }) });
      const d = await r.json();
      if (!r.ok) { setSubmitError(d.error || "Erreur."); setSubmitting(false); return; }
      window.location.href = d.url;
    }
  }

  async function handlePayLater() {
    setPayLaterSubmitting(true); setSubmitError("");
    const { price } = computePrice(form.product, form.voucher, form.coupon);
    const payload = {
      prenom: form.prenom, nom: form.nom, email: form.email, telephone: form.telephone,
      duree, date: form.date, heure: form.heure,
      passengers: form.passengers, poids_total: form.poids_total ? parseInt(form.poids_total) : null,
      voucher_code: form.voucher?.code,
      coupon_code: form.coupon?.code || undefined,
      commentaire: form.commentaire || undefined,
    };
    const r = await fetch("/api/reservation/pay-later", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...payload, amount_cents: price * 100 }) });
    const d = await r.json();
    if (!r.ok) { setSubmitError(d.error || "Erreur."); setPayLaterSubmitting(false); return; }
    router.push("/reservation/success?mode=pay-later");
  }

  // ── Computed ─────────────────────────────────────────────────────
  const { price, discount, couponDiscount, full: prixPlein } = computePrice(form.product, form.voucher, form.coupon);
  const stepIndex = STEPS.findIndex(s => s.key === step);

  const MAX_WEIGHT  = 190;
  const CRIT_WEIGHT = 220;
  const weightKg    = parseInt(form.poids_total) || 0;
  const weightWarn  = weightKg > MAX_WEIGHT && weightKg < CRIT_WEIGHT;
  const weightCrit  = weightKg >= CRIT_WEIGHT;
  const formattedDate = form.date
    ? new Date(form.date + "T12:00:00Z").toLocaleDateString("fr-BE", { weekday: "long", day: "numeric", month: "long" })
    : null;

  const ctaDisabled =
    step === "datetime" ? !form.date || !form.heure :
    step === "infos"    ? !form.prenom || !form.nom || !form.email || !form.poids_total || !form.passengers :
                          !form.accept_cgp || submitting || payLaterSubmitting || codeLoading;

  async function handleCTA() {
    if (step === "datetime") { setStep("infos"); return; }
    if (step === "infos") { setStep("paiement"); return; }
    handleSubmit();
  }

  function goBack() {
    if (stepIndex > 0) setStep(STEPS[stepIndex - 1].key);
  }

  // ── Calendar ─────────────────────────────────────────────────────
  function renderCalendar() {
    const firstDay = new Date(calYear, calMonth - 1, 1).getDay();
    const offset   = firstDay === 0 ? 6 : firstDay - 1;
    const total    = new Date(calYear, calMonth, 0).getDate();
    const cells: React.ReactNode[] = [];
    for (let i = 0; i < offset; i++) cells.push(<div key={`e${i}`} />);
    for (let d = 1; d <= total; d++) {
      const ds      = `${calYear}-${String(calMonth).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      const isAvail = availDays.includes(ds);
      const isSel   = form.date === ds;
      const isPast  = new Date(ds + "T12:00:00Z") < minBookableDate;
      cells.push(
        <button key={d} type="button" disabled={!isAvail || isPast}
          onClick={() => setForm(f => ({ ...f, date: ds, heure: "" }))}
          className={[
            "h-10 w-full rounded-lg text-sm font-medium transition-all duration-150 select-none flex items-center justify-center",
            isSel              ? "bg-primary text-primary-foreground font-bold shadow-sm scale-105" :
            isAvail && !isPast ? "text-foreground/70 cursor-pointer font-semibold hover:bg-primary/10 hover:text-primary" :
                                 "text-foreground/20 cursor-not-allowed text-xs",
          ].join(" ")}
        >{d}</button>
      );
    }
    return cells;
  }

  // ── Render ───────────────────────────────────────────────────────
  if (prodLoading || !form.product) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gradient-navy">
        <Loader2 size={28} className="animate-spin text-foreground/20" />
      </div>
    );
  }

  return (
    <div className="flex-1 bg-gradient-navy pb-16">
      <div className="h-[84px]" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">

        {/* Page header */}
        <div className="mb-4">
          <p className="text-[10px] font-black text-primary uppercase tracking-[3px] mb-1">
            {step === "datetime" && "Étape 1 sur 3"}
            {step === "infos"    && "Étape 2 sur 3"}
            {step === "paiement" && "Étape 3 sur 3"}
          </p>
          <h1 className="text-xl font-black text-foreground">
            {step === "datetime" && "Date & heure de vol"}
            {step === "infos"    && "Vos informations"}
            {step === "paiement" && "Récapitulatif de votre réservation"}
          </h1>
          <p className="text-sm text-foreground/50 mt-1">
            {step === "datetime" && `Sélectionnez votre créneau pour un vol de ${formatDuration(duree)}.`}
            {step === "infos"    && "Ces informations servent à confirmer et préparer votre vol."}
            {step === "paiement" && "Vérifiez les détails avant de procéder au paiement."}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6 items-start">

          {/* ── Main ── */}
          <div className="min-w-0">

            {/* ─ Step 1 : Date & heure ─ */}
            {step === "datetime" && (
              <>
                <div className="mb-4 flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
                  <AlertTriangle size={14} className="text-amber-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-800 leading-relaxed">
                    <span className="font-semibold">Limite de poids : 190 kg total passagers.</span>{" "}
                    Vérifiez ce critère avant de choisir votre créneau ; le poids vous sera demandé à l&apos;étape suivante.
                  </p>
                </div>

                <div className="card-premium overflow-hidden">

                  {/* Calendrier */}
                  <div className="p-5">
                    <div className="flex items-center justify-between mb-4">
                      <button type="button"
                        onClick={() => { const ny = calMonth === 1 ? calYear - 1 : calYear; const nm = calMonth === 1 ? 12 : calMonth - 1; setCalYear(ny); setCalMonth(nm); loadMonth(ny, nm); }}
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-foreground/40 hover:text-foreground hover:bg-secondary transition-all border border-border cursor-pointer">
                        <ChevronLeft size={15} />
                      </button>
                      <span className="text-sm font-bold text-foreground">
                        {MONTHS_FR[calMonth - 1]} {calYear}
                      </span>
                      <button type="button"
                        onClick={() => { const ny = calMonth === 12 ? calYear + 1 : calYear; const nm = calMonth === 12 ? 1 : calMonth + 1; setCalYear(ny); setCalMonth(nm); loadMonth(ny, nm); }}
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-foreground/40 hover:text-foreground hover:bg-secondary transition-all border border-border cursor-pointer">
                        <ChevronRight size={15} />
                      </button>
                    </div>

                    <div className="grid grid-cols-7 mb-1">
                      {DAYS_FR.map((d, i) => (
                        <div key={i} className="h-8 flex items-center justify-center text-[9px] font-bold text-foreground/40 uppercase tracking-wider">
                          {d}
                        </div>
                      ))}
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

                  <div className="border-t border-border" />

                  {/* Créneaux horaires */}
                  <div className="p-5">
                    {!form.date ? (
                      <div className="flex items-center gap-3 py-1">
                        <Clock size={14} className="text-foreground/30 shrink-0" />
                        <p className="text-sm text-foreground/50">Sélectionnez une date ci-dessus pour voir les créneaux disponibles</p>
                      </div>
                    ) : slotsLoading ? (
                      <div className="flex items-center justify-center py-4">
                        <Loader2 size={18} className="animate-spin text-foreground/20" />
                      </div>
                    ) : slots.length === 0 ? (
                      <div className="flex items-center gap-3 py-1">
                        <Clock size={14} className="text-foreground/30 shrink-0" />
                        <div>
                          <p className="text-sm font-semibold text-foreground capitalize">{formattedDate}</p>
                          <p className="text-xs text-foreground/50 mt-0.5">Aucun créneau disponible. Essayez une autre date.</p>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div className="flex items-baseline gap-2 mb-3">
                          <p className="text-sm font-black text-foreground capitalize">{formattedDate}</p>
                          <span className="text-xs text-foreground/40">· {formatDuration(duree)}</span>
                        </div>
                        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                          {slots.map(s => (
                            <button key={s} type="button"
                              onClick={() => setForm(f => ({ ...f, heure: s }))}
                              className={[
                                "py-2.5 rounded-lg border text-sm font-bold transition-all duration-150 text-center cursor-pointer",
                                form.heure === s
                                  ? "border-primary bg-primary text-primary-foreground shadow-sm"
                                  : "border-border text-foreground hover:border-primary/50 hover:bg-primary/5 hover:text-primary",
                              ].join(" ")}
                            >{s}</button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}

            {/* ─ Step 2 : Infos ─ */}
            {step === "infos" && (
              <div className="card-premium divide-y divide-border overflow-hidden">

                {/* Contact */}
                <div className="p-5 sm:p-7">
                  <p className="text-[10px] font-black text-primary uppercase tracking-[3px] mb-4">Coordonnées</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field label="Prénom" required value={form.prenom} onChange={v => setForm(f => ({ ...f, prenom: v }))} placeholder="Jean" />
                    <Field label="Nom" required value={form.nom} onChange={v => setForm(f => ({ ...f, nom: v }))} placeholder="Dupont" />
                    <div className="sm:col-span-2">
                      <Field label="Email" required type="email" value={form.email} onChange={v => setForm(f => ({ ...f, email: v }))} placeholder="jean@exemple.com" />
                    </div>
                    <div className="sm:col-span-2">
                      <Field label="Téléphone" type="tel" value={form.telephone} onChange={v => setForm(f => ({ ...f, telephone: v }))} placeholder="+32 470 00 00 00" />
                    </div>
                  </div>
                </div>

                {/* Vol */}
                <div className="p-5 sm:p-7">
                  <p className="text-[10px] font-black text-primary uppercase tracking-[3px] mb-4">Détails du vol</p>
                  <div className="space-y-5">

                    <div>
                      <label className="block text-sm font-semibold text-foreground mb-3">
                        Nombre de passagers <span className="text-foreground/40 font-normal">(requis)</span>
                      </label>
                      <div className="flex gap-2.5">
                        {[1, 2, 3].map(n => (
                          <button key={n} type="button"
                            onClick={() => setForm(f => ({ ...f, passengers: n }))}
                            className={[
                              "flex-1 py-2.5 rounded-lg border text-sm font-semibold transition-all duration-150 text-center cursor-pointer",
                              form.passengers === n
                                ? "border-primary bg-primary text-primary-foreground shadow-sm"
                                : "border-border text-foreground hover:border-primary/50 hover:bg-primary/5 hover:text-primary",
                            ].join(" ")}
                          >
                            {n} {n === 1 ? "passager" : "passagers"}
                          </button>
                        ))}
                      </div>
                      <p className="mt-2 text-xs text-foreground/40">Prix identique quel que soit le nombre.</p>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-foreground mb-2">
                        Poids total des passagers <span className="text-foreground/40 font-normal">(kg, requis)</span>
                      </label>
                      <div className="flex items-center gap-3">
                        <input type="number" value={form.poids_total} required min={1} max={500} placeholder="ex : 160"
                          onChange={e => setForm(f => ({ ...f, poids_total: e.target.value }))}
                          className="w-36 h-10 px-3 rounded-lg border border-border bg-input text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all placeholder:text-foreground/30" />
                        <span className="text-sm text-foreground/50">kg</span>
                      </div>
                      <p className="mt-2 text-xs text-foreground/40">Total passagers, requis pour le calcul masse &amp; centrage (max {MAX_WEIGHT} kg).</p>
                      {weightWarn && !weightCrit && (
                        <div className="mt-2.5 flex items-start gap-2.5 bg-amber-50 border border-amber-200 px-3.5 py-3 rounded-lg text-sm text-amber-800">
                          <AlertTriangle size={14} className="shrink-0 mt-0.5 text-amber-500" />
                          <p>Le poids total dépasse la limite recommandée de {MAX_WEIGHT} kg. Vous pouvez continuer votre réservation, mais votre pilote vérifiera la faisabilité selon la configuration du vol.</p>
                        </div>
                      )}
                      {weightCrit && (
                        <div className="mt-2.5 flex items-start gap-2.5 bg-red-50 border border-red-200 px-3.5 py-3 rounded-lg text-sm text-red-800">
                          <AlertCircle size={14} className="shrink-0 mt-0.5 text-red-500" />
                          <p>Le poids total est très élevé ({CRIT_WEIGHT} kg+). Vous pouvez continuer, mais le vol dépendra des conditions exactes. Votre pilote vous contactera pour confirmer la faisabilité.</p>
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-foreground mb-2">
                        Remarque <span className="text-foreground/40 font-normal">(facultatif)</span>
                      </label>
                      <textarea
                        value={form.commentaire}
                        onChange={e => setForm(f => ({ ...f, commentaire: e.target.value }))}
                        placeholder="Occasion spéciale, demande particulière, informations utiles pour le pilote…"
                        rows={3}
                        maxLength={500}
                        className="w-full px-3 py-2.5 rounded-lg border border-border bg-input text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all placeholder:text-foreground/30 resize-none"
                      />
                      <p className="mt-1 text-xs text-foreground/40 text-right">{form.commentaire.length}/500</p>
                    </div>
                  </div>
                </div>

              </div>
            )}

            {/* ─ Step 3 : Paiement ─ */}
            {step === "paiement" && (
              <div className="space-y-4">

                {/* Recap card */}
                <div className="card-premium overflow-hidden">
                  <div className="bg-navy px-6 py-6 flex items-start justify-between gap-4">
                    <div>
                      <h2 className="text-white text-base font-black leading-snug">{form.product?.title}</h2>
                      <p className="text-white/50 text-sm mt-1.5 capitalize">
                        {formattedDate}{form.heure && ` · ${form.heure}`}
                      </p>
                    </div>
                    <div className="shrink-0">
                      <div className="inline-flex items-center gap-1.5 bg-black/40 border border-white/15 rounded-lg px-3 py-1.5">
                        <span className="text-primary font-black text-[13px] leading-none">{formatDuration(duree)}</span>
                        <span className="text-white/50 text-[11px] leading-none">avion léger</span>
                      </div>
                    </div>
                  </div>

                  <div className="px-6 py-5 grid grid-cols-2 gap-x-6 gap-y-4 border-b border-border">
                    {[
                      { l: "Passager principal", v: `${form.prenom} ${form.nom}` },
                      { l: "Email",              v: form.email },
                      { l: "Passagers / Masse",  v: `${form.passengers} pax · ${form.poids_total} kg` },
                      { l: "Aéroport",           v: "Charleroi · EBCI" },
                    ].map(({ l, v }) => (
                      <div key={l}>
                        <p className="text-[9px] font-black text-foreground/40 uppercase tracking-[2px] mb-0.5">{l}</p>
                        <p className="text-sm font-semibold text-foreground truncate">{v}</p>
                      </div>
                    ))}
                  </div>

                  <div className="px-6 py-5 flex items-end justify-between gap-4">
                    <div className="space-y-1">
                      {(discount > 0 || couponDiscount > 0) && (
                        <p className="text-sm text-foreground/40 line-through tabular-nums">{prixPlein} €</p>
                      )}
                      {discount > 0 && (
                        <p className="text-xs text-green-600 font-medium">Voucher −{discount} €</p>
                      )}
                      {couponDiscount > 0 && (
                        <p className="text-xs text-green-600 font-medium">Code promo −{couponDiscount} €</p>
                      )}
                      <p className="text-xs text-foreground/40">Par avion · jusqu&apos;à 3 passagers</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-[9px] font-black text-foreground/40 uppercase tracking-[2px] mb-0.5">Acompte</p>
                      <p className={`text-3xl font-black tabular-nums ${price === 0 ? "text-green-600" : "text-foreground"}`}>
                        {price === 0 ? "Gratuit" : `${price} €`}
                      </p>
                    </div>
                  </div>

                  {/* Note HOBBS */}
                  <div className="px-6 pb-5">
                    <div className="bg-amber-50 border border-amber-100 rounded-lg px-4 py-3 flex items-start gap-2.5">
                      <AlertTriangle size={11} className="text-amber-500 shrink-0 mt-0.5" />
                      <p className="text-[11px] text-amber-800/80 leading-relaxed">
                        <strong className="text-amber-900">Prix calculé à la minute réelle.</strong>{" "}
                        Après le vol, l&apos;avion dispose d&apos;un compteur (HOBBS) qui mesure le temps exact passé en vol.
                        Si votre vol dure moins que prévu, la différence vous est <strong>remboursée sous 24 h</strong>.
                        S&apos;il dure un peu plus, un petit complément vous est facturé dans le même délai. En pratique, l&apos;écart reste minime.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Code réduction — mobile uniquement */}
                <div className="lg:hidden card-premium p-5">
                  <p className="text-[10px] font-black text-primary uppercase tracking-[3px] mb-3">Bon cadeau / Code promo</p>
                  <CodeField
                    codeInput={form.codeInput} voucher={form.voucher} coupon={form.coupon}
                    discount={discount} codeLoading={codeLoading} codeError={codeError}
                    onCodeChange={val => { setForm(f => ({ ...f, codeInput: val })); setCodeError(""); if (val.replace(/-/g, "").length === 16) applyCode(val); }}
                    onKeyDown={e => e.key === "Enter" && applyCode()}
                    onApply={() => applyCode()}
                    onClear={() => { setForm(f => ({ ...f, codeInput: "", voucher: null, coupon: null })); setCodeError(""); }}
                    size="lg"
                  />
                </div>

                {/* Politique annulation */}
                <div className="card-premium p-5">
                  <p className="text-[10px] font-black text-primary uppercase tracking-[3px] mb-3">Annulation, météo &amp; passagers</p>
                  <div className="space-y-2.5">
                    <div className="flex items-start gap-2.5">
                      <CheckCircle size={12} className="text-green-500 shrink-0 mt-0.5" />
                      <p className="text-xs text-foreground/60 leading-relaxed">Annulation gratuite jusqu&apos;à <strong className="text-foreground">48 h avant</strong> le vol.</p>
                    </div>
                    <div className="flex items-start gap-2.5">
                      <CloudRain size={12} className="text-foreground/30 shrink-0 mt-0.5" />
                      <p className="text-xs text-foreground/60 leading-relaxed">En cas de météo défavorable, le vol est reporté sans frais. <strong className="text-foreground">C&apos;est votre pilote qui décide, jusqu&apos;à 2 h avant le départ</strong>, selon les conditions réelles à l&apos;aéroport.</p>
                    </div>
                    <div className="flex items-start gap-2.5">
                      <Users size={12} className="text-foreground/30 shrink-0 mt-0.5" />
                      <p className="text-xs text-foreground/60 leading-relaxed">Maximum <strong className="text-foreground">3 passagers</strong> par vol (avion léger), sans exception.</p>
                    </div>
                  </div>
                </div>

                {/* CGP */}
                <div className="card-premium p-5">
                  <label className="flex items-start gap-3.5 cursor-pointer">
                    <input type="checkbox" checked={form.accept_cgp}
                      onChange={e => setForm(f => ({ ...f, accept_cgp: e.target.checked }))}
                      className="mt-0.5 w-4 h-4 accent-primary shrink-0 cursor-pointer" />
                    <span className="text-sm text-foreground/60 leading-relaxed">
                      J&apos;ai lu et j&apos;accepte les{" "}
                      <Link href="/cgp" className="text-primary underline underline-offset-2 font-semibold hover:text-[#e6a800] transition-colors">
                        Conditions Générales de Participation
                      </Link>{" "}
                      et j&apos;autorise l&apos;utilisation de mes données personnelles pour le traitement de cette réservation.
                    </span>
                  </label>
                </div>

                {submitError && (
                  <div className="flex items-center gap-2.5 text-sm text-red-700 bg-red-50 border border-red-200 px-4 py-3.5 rounded-lg">
                    <AlertCircle size={14} className="shrink-0" /> {submitError}
                  </div>
                )}
              </div>
            )}

            {/* ── Navigation ── */}
            <div className="mt-5 flex items-center justify-between gap-4">

              {stepIndex > 0 ? (
                <button type="button" onClick={goBack}
                  className="flex items-center gap-1.5 text-sm font-medium text-foreground/50 hover:text-foreground transition-colors cursor-pointer group">
                  <ChevronLeft size={15} className="group-hover:-translate-x-0.5 transition-transform" />
                  Retour
                </button>
              ) : <div />}

              <div className="flex flex-col items-end gap-2">
                <button type="button" disabled={ctaDisabled} onClick={handleCTA}
                  className="inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-primary text-primary-foreground rounded-lg text-sm font-black transition-all disabled:opacity-30 hover:bg-[#e6a800] shadow-gold hover:-translate-y-px active:translate-y-0 active:scale-[0.98] cursor-pointer disabled:cursor-not-allowed">
                  {(submitting || codeLoading) && <Loader2 size={14} className="animate-spin" />}
                  {step === "paiement" && !submitting && price > 0 && <Lock size={13} />}
                  {step === "paiement" && !submitting && price === 0 && <CheckCircle size={13} />}
                  <span>
                    {step === "datetime" && (form.date && form.heure ? "Continuer" : form.date ? "Sélectionnez un créneau" : "Sélectionnez une date")}
                    {step === "infos"    && "Continuer vers le paiement"}
                    {step === "paiement" && (submitting ? "Traitement en cours…" : price === 0 ? "Confirmer gratuitement" : `Payer ${price} € en toute sécurité`)}
                  </span>
                  {!submitting && step !== "paiement" && <ChevronRight size={15} />}
                </button>

                {step === "paiement" && price > 0 && (
                  <button
                    type="button"
                    disabled={ctaDisabled}
                    onClick={handlePayLater}
                    className="inline-flex items-center justify-center gap-2 px-6 py-2.5 border border-border text-foreground/50 rounded-lg text-sm font-medium transition-colors disabled:opacity-30 hover:text-foreground hover:border-foreground/20 cursor-pointer"
                  >
                    {payLaterSubmitting && <Loader2 size={13} className="animate-spin" />}
                    Recevoir un lien de paiement par email
                  </button>
                )}

                {step === "paiement" && price > 0 && (
                  <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 flex items-start gap-1.5 text-right leading-snug max-w-xs">
                    <AlertTriangle size={11} className="shrink-0 mt-0.5" />
                    <span>Sans paiement immédiat, le créneau n&apos;est <strong>pas sécurisé</strong>. Un autre client peut le réserver entre-temps.</span>
                  </p>
                )}
              </div>

            </div>

          </div>

          {/* ── Summary sidebar ── */}
          <div className="hidden lg:block sticky top-[96px] self-start space-y-4">
              <div className="card-premium overflow-hidden">

                {form.product?.images?.[0]?.url && (
                  <div className="relative h-36 overflow-hidden">
                    <Image
                      src={form.product.images[0].url}
                      alt={form.product.title}
                      fill
                      className="object-cover"
                      sizes="300px"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-navy/60 to-transparent" />
                  </div>
                )}

                {/* Header */}
                <div className="px-5 pt-5 pb-4 border-b border-border">
                  <p className="text-[10px] font-bold text-primary uppercase tracking-[2px] mb-1">Votre réservation</p>
                  <p className="text-foreground text-2xl font-black leading-none tabular-nums">
                    {form.product
                      ? (price === 0 && (form.voucher || form.coupon) ? "Gratuit" : `${price} €`)
                      : "—"}
                  </p>
                  {form.product && (
                    <p className="text-muted-foreground text-xs mt-1">{form.product.title} · {formatDuration(duree)}</p>
                  )}
                </div>

                {/* Info rows */}
                <div className="p-4 space-y-2.5 text-sm border-b border-border">
                  {[
                    { l: "Départ",    v: "Charleroi · EBCI" },
                    { l: "Date",      v: formattedDate ? <span className="capitalize">{formattedDate}</span> : <span className="text-muted-foreground">Non sélectionnée</span> },
                    { l: "Heure",     v: form.heure || <span className="text-muted-foreground">—</span> },
                    { l: "Passagers", v: form.passengers > 0 ? `${form.passengers} passager${form.passengers > 1 ? "s" : ""}` : <span className="text-muted-foreground">—</span> },
                  ].map(({ l, v }) => (
                    <div key={l} className="flex items-center justify-between gap-2">
                      <span className="text-muted-foreground text-xs">{l}</span>
                      <span className="font-semibold text-xs text-right">{v}</span>
                    </div>
                  ))}
                </div>

                {/* Code réduction sidebar */}
                <div className="px-4 py-3.5 border-b border-border">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[2px] mb-2.5">Bon cadeau / Code promo</p>
                  <CodeField
                    codeInput={form.codeInput} voucher={form.voucher} coupon={form.coupon}
                    discount={discount} codeLoading={codeLoading} codeError={codeError}
                    onCodeChange={val => { setForm(f => ({ ...f, codeInput: val })); setCodeError(""); if (val.replace(/-/g, "").length === 16) applyCode(val); }}
                    onKeyDown={e => e.key === "Enter" && applyCode()}
                    onApply={() => applyCode()}
                    onClear={() => { setForm(f => ({ ...f, codeInput: "", voucher: null, coupon: null })); setCodeError(""); }}
                    size="sm"
                  />
                </div>

                {/* Total */}
                <div className="px-4 py-3.5 space-y-2">
                  {discount > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Voucher</span>
                      <span className="text-xs font-semibold text-green-600">−{discount} €</span>
                    </div>
                  )}
                  {couponDiscount > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Code promo</span>
                      <span className="text-xs font-semibold text-green-600">−{couponDiscount} €</span>
                    </div>
                  )}
                  {(discount > 0 || couponDiscount > 0) && (
                    <div className="flex items-center justify-between border-t border-border pt-2">
                      <span className="text-[10px] font-black text-foreground/40 uppercase tracking-[2px]">Total après remise</span>
                      <span className={`text-2xl font-black tabular-nums ${price === 0 ? "text-green-600" : "text-foreground"}`}>
                        {price === 0 ? "Gratuit" : `${price} €`}
                      </span>
                    </div>
                  )}
                  <p className="text-muted-foreground text-[10px]">Par avion · jusqu&apos;à 3 passagers</p>
                </div>
              </div>

              {form.voucher && (
                <div className="mt-4 card-premium p-4">
                  <p className="text-xs font-black text-foreground mb-1.5">
                    Vous voulez voler plus longtemps ?
                  </p>
                  <p className="text-[11.5px] text-foreground/50 leading-relaxed mb-3">
                    Choisissez une durée supérieure dans nos offres et entrez votre code voucher
                    à l&apos;étape paiement : vous ne payez que la différence.
                  </p>
                  <Link
                    href="/nos-offres"
                    className="inline-flex items-center gap-1.5 text-[11.5px] font-bold text-primary hover:text-[#e6a800] transition-colors"
                  >
                    Voir toutes les durées
                    <ArrowRight size={11} />
                  </Link>
                </div>
              )}

          </div>

        </div>
      </div>

    </div>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────
function Field({ label, required, type = "text", value, onChange, placeholder }: {
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

function CodeField({ codeInput, voucher, coupon, discount, codeLoading, codeError, onCodeChange, onKeyDown, onApply, onClear, size }: {
  codeInput: string; voucher: VoucherInfo | null; coupon: CouponInfo | null;
  discount: number; codeLoading: boolean; codeError: string;
  onCodeChange: (v: string) => void; onKeyDown: (e: React.KeyboardEvent) => void;
  onApply: () => void; onClear: () => void; size: "sm" | "lg";
}) {
  const h = size === "lg" ? "h-11" : "h-9";
  const px = size === "lg" ? "px-4 text-sm" : "px-3 text-xs";
  const btnPx = size === "lg" ? "px-5 text-sm" : "px-3 text-xs";

  if (voucher || coupon) {
    return (
      <div className="flex items-center gap-2 bg-green-50 border border-green-100 px-3 py-2.5 rounded-lg">
        <CheckCircle size={size === "lg" ? 13 : 12} className="text-green-600 shrink-0" />
        <p className={`font-semibold text-green-800 flex-1 min-w-0 truncate ${size === "lg" ? "text-sm" : "text-xs"}`}>
          {voucher
            ? `${voucher.product_title} · −${discount} €`
            : `${coupon!.code} · −${coupon!.type === "percentage" ? `${coupon!.value}%` : `${coupon!.value} €`}`}
        </p>
        <button type="button" onClick={onClear} className="shrink-0 text-foreground/30 hover:text-red-500 transition-colors cursor-pointer">
          <X size={size === "lg" ? 14 : 13} />
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="flex gap-1.5">
        <input type="text" value={codeInput}
          onChange={e => onCodeChange(e.target.value.toUpperCase().replace(/\s/g, ""))}
          onKeyDown={onKeyDown}
          placeholder="Voucher ou code promo"
          maxLength={19}
          className={`flex-1 ${h} ${px} rounded-lg border border-border bg-input font-mono uppercase tracking-wide text-foreground focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary transition-all placeholder:text-foreground/30 placeholder:tracking-normal placeholder:font-sans placeholder:normal-case`} />
        <button type="button" onClick={onApply}
          disabled={!codeInput.trim() || codeLoading}
          className={`${h} ${btnPx} rounded-lg bg-primary text-primary-foreground font-black hover:bg-[#e6a800] disabled:opacity-40 transition-all flex items-center justify-center shadow-sm cursor-pointer whitespace-nowrap`}>
          {codeLoading ? <Loader2 size={size === "lg" ? 14 : 12} className="animate-spin" /> : "OK"}
        </button>
      </div>
      {codeError && (
        <p className={`text-red-600 mt-1.5 flex items-center gap-1 ${size === "lg" ? "text-xs" : "text-[11px]"}`}>
          <AlertCircle size={size === "lg" ? 12 : 10} className="shrink-0" /> {codeError}
        </p>
      )}
    </>
  );
}
