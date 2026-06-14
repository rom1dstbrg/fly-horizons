"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import {
  ChevronLeft, ChevronRight, Clock, Lock,
  CheckCircle, AlertCircle, AlertTriangle, Loader2, ArrowRight, X,
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
  passengers: number; poids_total: string; poids_unknown: boolean; commentaire: string;
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
    passengers: 0, poids_total: "", poids_unknown: false, commentaire: "",
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
  const [calendarClosed,  setCalendarClosed]  = useState(false);
  const [closedMessage,   setClosedMessage]   = useState("");

  // ── Auth state
  const [user, setUser] = useState<SupabaseUser | null>(null);

  // ── Calendar closed check ────────────────────────────────────────
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

  // ── Data ─────────────────────────────────────────────────────────
  useEffect(() => {
    const sb = createClient();
    const params = new URLSearchParams(window.location.search);
    const dureeParam = parseInt(params.get("duree") ?? "");
    const codeParam  = params.get("code") ?? "";

    if (!dureeParam) { router.replace("/nos-offres"); return; }

    // Restore form saved before optional login redirect
    try {
      const saved = sessionStorage.getItem("rsv_state");
      if (saved) {
        const { prenom, nom, email, telephone, passengers, poids_total, poids_unknown, commentaire, date, heure } =
          JSON.parse(saved) as Partial<FormState>;
        setForm(f => ({
          ...f,
          prenom: prenom ?? f.prenom, nom: nom ?? f.nom,
          email: email ?? f.email, telephone: telephone ?? f.telephone,
          passengers: passengers ?? f.passengers, poids_total: poids_total ?? f.poids_total,
          poids_unknown: poids_unknown ?? f.poids_unknown,
          commentaire: commentaire ?? f.commentaire,
          date: date ?? f.date, heure: heure ?? f.heure,
        }));
        sessionStorage.removeItem("rsv_state");
      }
    } catch { /* ignore */ }

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

    sb.auth.getUser().then(({ data: { user: authUser } }) => {
      if (!authUser) return;
      setUser(authUser);
      sb.from("profiles").select("full_name, phone").eq("id", authUser.id).single()
        .then(({ data }) => {
          const p = (data?.full_name ?? "").split(" ");
          setForm(f => ({ ...f, email: authUser.email ?? "", prenom: p[0] ?? "", nom: p.slice(1).join(" "), telephone: data?.phone ?? "" }));
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

  // ── Auth helpers ─────────────────────────────────────────────────
  function handleLoginRedirect() {
    const search = window.location.search;
    sessionStorage.setItem("rsv_state", JSON.stringify({
      prenom: form.prenom, nom: form.nom, email: form.email, telephone: form.telephone,
      passengers: form.passengers, poids_total: form.poids_total, poids_unknown: form.poids_unknown, commentaire: form.commentaire,
      date: form.date, heure: form.heure,
    }));
    window.location.href = `/login?redirectTo=${encodeURIComponent(`/reservation${search}`)}`;
  }

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
      passengers: form.passengers, poids_total: form.poids_unknown ? null : (form.poids_total ? parseInt(form.poids_total) : null),
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

  // ── Computed ─────────────────────────────────────────────────────
  const { price, discount, couponDiscount, full: prixPlein } = computePrice(form.product, form.voucher, form.coupon);
  const stepIndex = STEPS.findIndex(s => s.key === step);

  const MAX_WEIGHT  = 190;
  const CRIT_WEIGHT = 250;
  const weightKg    = parseInt(form.poids_total) || 0;
  const weightWarn  = weightKg > MAX_WEIGHT && weightKg < CRIT_WEIGHT;
  const weightCrit  = weightKg >= CRIT_WEIGHT;
  const formattedDate = form.date
    ? new Date(form.date + "T12:00:00Z").toLocaleDateString("fr-BE", { weekday: "long", day: "numeric", month: "long" })
    : null;

  const ctaDisabled =
    step === "datetime" ? !form.date || !form.heure :
    step === "infos"    ? !form.prenom || !form.nom || !form.email || !form.passengers || submitting :
                          !form.accept_cgp || submitting || codeLoading;

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
  if (calendarClosed) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gradient-navy px-4">
        <div className="max-w-md w-full bg-white/5 border border-white/10 rounded-2xl p-8 text-center space-y-4">
          <p className="text-2xl font-black text-white">Réservations suspendues</p>
          <p className="text-sm text-white/60 leading-relaxed">
            {closedMessage || "Les réservations sont temporairement suspendues. Contactez-nous pour toute demande."}
          </p>
          <Link href="/contact" className="inline-block mt-2 px-6 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:bg-primary/90 transition-colors">
            Nous contacter
          </Link>
        </div>
      </div>
    );
  }

  if (prodLoading || !form.product) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gradient-navy">
        <Loader2 size={28} className="animate-spin text-foreground/20" />
      </div>
    );
  }

  return (
    <div className="flex-1 bg-gradient-navy pb-16">
      <div className="h-[98px]" />

      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-6">

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
                <div className="card-premium overflow-hidden">

                  {/* Calendrier */}
                  <div className="p-5">
                    <div className="flex items-center justify-between mb-4">
                      <button type="button"
                        onClick={() => { const ny = calMonth === 1 ? calYear - 1 : calYear; const nm = calMonth === 1 ? 12 : calMonth - 1; setCalYear(ny); setCalMonth(nm); loadMonth(ny, nm); }}
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-foreground/40 hover:text-foreground hover:bg-secondary transition-all border border-border cursor-pointer"
                        aria-label="Mois précédent">
                        <ChevronLeft size={15} />
                      </button>
                      <span className="text-sm font-bold text-foreground">
                        {MONTHS_FR[calMonth - 1]} {calYear}
                      </span>
                      <button type="button"
                        onClick={() => { const ny = calMonth === 12 ? calYear + 1 : calYear; const nm = calMonth === 12 ? 1 : calMonth + 1; setCalYear(ny); setCalMonth(nm); loadMonth(ny, nm); }}
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-foreground/40 hover:text-foreground hover:bg-secondary transition-all border border-border cursor-pointer"
                        aria-label="Mois suivant">
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
                      <Field label="Email" required type="email" value={form.email}
                        onChange={v => setForm(f => ({ ...f, email: v }))}
                        placeholder="jean@exemple.com" />
                      {!user && (
                        <p className="mt-1.5 text-xs text-foreground/40">
                          Déjà client ?{" "}
                          <button type="button" onClick={handleLoginRedirect}
                            className="text-primary hover:underline font-medium cursor-pointer">
                            Connectez-vous
                          </button>{" "}
                          pour pré-remplir vos informations.
                        </p>
                      )}
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
                        Poids total des passagers <span className="text-foreground/40 font-normal">(kg, facultatif)</span>
                      </label>

                      {!form.poids_unknown && (
                        <div className="flex items-center gap-3">
                          <input type="number" value={form.poids_total} min={1} max={500} placeholder="ex : 160"
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
                          form.poids_unknown
                            ? "bg-primary border-primary"
                            : "border-border bg-input group-hover:border-primary/60",
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


                      {!form.poids_unknown && weightWarn && !weightCrit && (
                        <div className="mt-2.5 flex items-start gap-2.5 bg-blue-50 border border-blue-100 px-3.5 py-3 rounded-lg text-sm text-blue-800">
                          <AlertTriangle size={14} className="shrink-0 mt-0.5 text-blue-400" />
                          <p>Poids un peu élevé — pas de problème, votre pilote vérifiera les conditions le jour J et vous tiendra informé si besoin.</p>
                        </div>
                      )}
                      {!form.poids_unknown && weightCrit && (
                        <div className="mt-2.5 flex items-start gap-2.5 bg-blue-50 border border-blue-100 px-3.5 py-3 rounded-lg text-sm text-blue-800">
                          <AlertCircle size={14} className="shrink-0 mt-0.5 text-blue-400" />
                          <p>Pour ce poids, votre pilote vous contactera avant le vol pour confirmer ensemble. <a href="/contact" className="underline font-semibold hover:brightness-90">Contactez-nous</a> si vous souhaitez vérifier dès maintenant.</p>
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
                  <div className="px-6 py-5 flex items-start justify-between gap-4 border-b border-border">
                    <div>
                      <h2 className="text-foreground text-base font-black leading-snug">{form.product?.title}</h2>
                      <p className="text-muted-foreground text-sm mt-1 capitalize">
                        {formattedDate}{form.heure && ` · ${form.heure}`}
                      </p>
                    </div>
                    <div className="shrink-0">
                      <div className="inline-flex items-center gap-1.5 bg-secondary border border-border rounded-lg px-3 py-1.5">
                        <span className="text-primary font-black text-[13px] leading-none">{formatDuration(duree)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="px-6 py-5 grid grid-cols-2 gap-x-6 gap-y-4 border-b border-border">
                    {[
                      { l: "Passager principal", v: `${form.prenom} ${form.nom}` },
                      { l: "Email",              v: form.email },
                      { l: "Passagers / Masse",  v: form.poids_unknown ? `${form.passengers} pax · certifié < 250 kg` : form.poids_total ? `${form.passengers} pax · ${form.poids_total} kg` : `${form.passengers} pax` },
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
                      <p className="text-[9px] font-black text-foreground/40 uppercase tracking-[2px] mb-0.5">Prix du vol</p>
                      <p className={`text-3xl font-black tabular-nums ${price === 0 ? "text-green-600" : "text-foreground"}`}>
                        {price === 0 ? "Gratuit" : `${price} €`}
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

                {/* CGP */}
                <div className="card-premium p-5">
                  <label className="flex items-start gap-3.5 cursor-pointer">
                    <input type="checkbox" checked={form.accept_cgp}
                      onChange={e => setForm(f => ({ ...f, accept_cgp: e.target.checked }))}
                      className="mt-0.5 w-4 h-4 accent-primary shrink-0 cursor-pointer" />
                    <span className="text-sm text-foreground/60 leading-relaxed">
                      J&apos;ai lu et j&apos;accepte les{" "}
                      <Link href="/cgp" target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-2 font-semibold hover:brightness-90 transition-all">
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
                  className="inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-primary text-primary-foreground rounded-lg text-sm font-black transition-all disabled:opacity-30 hover:brightness-105 shadow-gold hover:-translate-y-px active:translate-y-0 active:scale-[0.98] cursor-pointer disabled:cursor-not-allowed">
                  {(submitting || codeLoading) && <Loader2 size={14} className="animate-spin" />}
                  {step === "paiement" && !submitting && price > 0 && <Lock size={13} />}
                  {step === "paiement" && !submitting && price === 0 && <CheckCircle size={13} />}
                  <span>
                    {step === "datetime" && (form.date && form.heure ? "Continuer" : form.date ? "Sélectionnez un créneau" : "Sélectionnez une date")}
                    {step === "infos" && (submitting ? "En cours…" : "Continuer vers le paiement")}
                    {step === "paiement" && (submitting ? "Traitement en cours…" : price === 0 ? "Confirmer gratuitement" : `Payer ${price} € en toute sécurité`)}
                  </span>
                  {!submitting && step !== "paiement" && <ChevronRight size={15} />}
                </button>

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
                    className="inline-flex items-center gap-1.5 text-[11.5px] font-bold text-primary hover:brightness-90 transition-all"
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
function Field({ label, required, type = "text", value, onChange, placeholder, onBlur }: {
  label: string; required?: boolean; type?: string;
  value: string; onChange: (v: string) => void; placeholder?: string; onBlur?: () => void;
}) {
  return (
    <div>
      <label className="block text-sm font-semibold text-foreground mb-2">
        {label}{required && <span className="text-foreground/40 font-normal"> *</span>}
      </label>
      <input type={type} value={value} required={required} placeholder={placeholder}
        onChange={e => onChange(e.target.value)}
        onBlur={onBlur}
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
        <button type="button" onClick={onClear} className="shrink-0 text-foreground/30 hover:text-red-500 transition-colors cursor-pointer" aria-label="Retirer le code">
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
          className={`${h} ${btnPx} rounded-lg bg-primary text-primary-foreground font-black hover:brightness-105 disabled:opacity-40 transition-all flex items-center justify-center shadow-sm cursor-pointer whitespace-nowrap`}>
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
