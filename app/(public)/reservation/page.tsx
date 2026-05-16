"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import {
  ChevronLeft, ChevronRight, Clock, Lock,
  CheckCircle, AlertCircle, Loader2, Tag, MapPin, Users, Calendar,
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
interface FormState {
  product: VolProduct | null;
  date: string; heure: string;
  prenom: string; nom: string; email: string; telephone: string;
  passengers: number; poids_total: string;
  voucherInput: string; voucher: VoucherInfo | null;
  accept_cgp: boolean;
}

const MONTHS_FR = ["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"];
const DAYS_FR   = ["Lun","Mar","Mer","Jeu","Ven","Sam","Dim"];

const STEPS: { key: Step; label: string }[] = [
  { key: "datetime", label: "Date & heure" },
  { key: "infos",    label: "Informations" },
  { key: "paiement", label: "Paiement" },
];

function computePrice(product: VolProduct | null, voucher: VoucherInfo | null) {
  if (!product) return { price: 0, discount: 0, full: 0 };
  const full = product.price;
  if (!voucher) return { price: full, discount: 0, full };
  const covered  = Math.min(product.voucher_duration_minutes, voucher.duration_minutes);
  const discount = Math.round((full / product.voucher_duration_minutes) * covered);
  return { price: Math.max(0, full - discount), discount, full };
}
function fmtVoucher(raw: string) {
  const c = raw.replace(/[^A-Z0-9]/gi, "").toUpperCase().slice(0, 16);
  return c.match(/.{1,4}/g)?.join("-") ?? c;
}

// ── Page ────────────────────────────────────────────────────────────
export default function ReservationPage() {
  const router = useRouter();
  const [step, setStep]     = useState<Step>("datetime");
  const [prodLoading, setProdLoading] = useState(true);
  const [form, setForm] = useState<FormState>({
    product: null, date: "", heure: "",
    prenom: "", nom: "", email: "", telephone: "",
    passengers: 0, poids_total: "",
    voucherInput: "", voucher: null, accept_cgp: false,
  });

  const today = new Date();
  const [calYear,  setCalYear]  = useState(today.getFullYear());
  const [calMonth, setCalMonth] = useState(today.getMonth() + 1);
  const [availDays,    setAvailDays]    = useState<string[]>([]);
  const [calLoading,   setCalLoading]   = useState(false);
  const [slots,        setSlots]        = useState<string[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [vcLoading,    setVcLoading]    = useState(false);
  const [vcError,      setVcError]      = useState("");
  const [submitting,   setSubmitting]   = useState(false);
  const [submitError,  setSubmitError]  = useState("");

  // ── Data ─────────────────────────────────────────────────────────
  useEffect(() => {
    const sb = createClient();
    const dureeParam = parseInt(new URLSearchParams(window.location.search).get("duree") ?? "");

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

  useEffect(() => { if (step === "datetime") loadMonth(calYear, calMonth); }, [calYear, calMonth, loadMonth, step]);
  useEffect(() => {
    if (!form.date || !form.product) { setSlots([]); return; }
    setSlotsLoading(true);
    fetch(`/api/reservation/slots?date=${form.date}&duree=${form.product.voucher_duration_minutes}`)
      .then(r => r.json()).then(d => setSlots(d.slots ?? [])).finally(() => setSlotsLoading(false));
  }, [form.date, form.product]);

  // ── Voucher & submit ─────────────────────────────────────────────
  async function validateVoucher(code: string) {
    if (!code.trim()) return;
    setVcLoading(true); setVcError("");
    try {
      const r = await fetch(`/api/vouchers/validate?code=${encodeURIComponent(code.trim())}`);
      const d = await r.json();
      if (!d.valid) {
        setVcError(
          d.status === "expired"  ? "Ce voucher a expiré." :
          d.status === "used"     ? "Ce voucher a déjà été utilisé." :
          d.status === "reserved" ? "Ce voucher est en cours d'utilisation." : "Code invalide."
        );
        setForm(f => ({ ...f, voucher: null }));
      } else {
        setForm(f => ({ ...f, voucher: { code: d.code, duration_minutes: d.duration_minutes, product_title: d.product_title } }));
      }
    } catch { setVcError("Erreur de vérification."); }
    finally { setVcLoading(false); }
  }

  function handleVoucherChange(raw: string) {
    const fmt = fmtVoucher(raw);
    setForm(f => ({ ...f, voucherInput: fmt, voucher: null }));
    setVcError("");
    if (fmt.replace(/-/g, "").length === 16) validateVoucher(fmt);
  }

  async function handleSubmit() {
    setSubmitting(true); setSubmitError("");
    if (form.voucherInput && !form.voucher) { await validateVoucher(form.voucherInput); setSubmitting(false); return; }
    const { price } = computePrice(form.product, form.voucher);
    const payload = {
      prenom: form.prenom, nom: form.nom, email: form.email, telephone: form.telephone,
      duree, date: form.date, heure: form.heure,
      passengers: form.passengers, poids_total: form.poids_total ? parseInt(form.poids_total) : null,
      voucher_code: form.voucher?.code,
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
  const { price, discount, full: prixPlein } = computePrice(form.product, form.voucher);
  const stepIndex = STEPS.findIndex(s => s.key === step);
  const formattedDate = form.date
    ? new Date(form.date + "T12:00:00Z").toLocaleDateString("fr-BE", { weekday: "long", day: "numeric", month: "long" })
    : null;

  const ctaDisabled =
    step === "datetime" ? !form.date || !form.heure :
    step === "infos"    ? !form.prenom || !form.nom || !form.email || !form.poids_total || !form.passengers || vcLoading :
                          !form.accept_cgp || submitting;

  function handleCTA() {
    if (step === "datetime") { setStep("infos"); return; }
    if (step === "infos") {
      if (form.voucherInput && !form.voucher) validateVoucher(form.voucherInput).then(() => setStep("paiement"));
      else setStep("paiement");
      return;
    }
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

  // ── Render ───────────────────────────────────────────────────────
  if (prodLoading || !form.product) {
    return (
      <div className="bg-[#f5f5f7] flex-1 flex items-center justify-center">
        <Loader2 size={28} className="animate-spin text-muted-foreground/30" />
      </div>
    );
  }

  return (
    <div className="bg-[#f5f5f7] pb-16 flex-1">
      <div className="h-[84px]" />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
          {/* Page header — above grid so summary card top-aligns with main card */}
          <div className="mb-4">
            <div className="inline-flex items-center gap-2 mb-1.5">
              {step === "datetime" && <Calendar size={14} className="text-muted-foreground" />}
              {step === "infos"    && <Users    size={14} className="text-muted-foreground" />}
              {step === "paiement" && <Lock     size={14} className="text-muted-foreground" />}
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-[2px]">
                {step === "datetime" && "Calendrier"}
                {step === "infos"    && "Informations"}
                {step === "paiement" && "Paiement"}
              </p>
            </div>
            <h1 className="text-xl font-extrabold text-foreground">
              {step === "datetime" && "Date & heure de vol"}
              {step === "infos"    && "Vos informations"}
              {step === "paiement" && "Récapitulatif de votre réservation"}
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              {step === "datetime" && `Sélectionnez votre créneau pour un vol de ${formatDuration(duree)}.`}
              {step === "infos"    && "Ces informations servent à confirmer et préparer votre vol."}
              {step === "paiement" && "Vérifiez les détails avant de procéder au paiement."}
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6 items-start">

            {/* ── Main ── */}
            <div className="min-w-0 pb-20 lg:pb-0">

              {/* ─ Step 2 ─ */}
              {step === "datetime" && (
                <div className="rounded-2xl border border-border bg-white shadow-sm overflow-hidden">

                  {/* Calendrier */}
                  <div className="p-5">
                    <div className="flex items-center justify-between mb-4">
                      <button type="button"
                        onClick={() => { if (calMonth === 1) { setCalMonth(12); setCalYear(y => y - 1); } else setCalMonth(m => m - 1); }}
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-all border border-border cursor-pointer">
                        <ChevronLeft size={15} />
                      </button>
                      <span className="text-sm font-bold text-foreground">
                        {MONTHS_FR[calMonth - 1]} {calYear}
                      </span>
                      <button type="button"
                        onClick={() => { if (calMonth === 12) { setCalMonth(1); setCalYear(y => y + 1); } else setCalMonth(m => m + 1); }}
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-all border border-border cursor-pointer">
                        <ChevronRight size={15} />
                      </button>
                    </div>

                    <div className="grid grid-cols-7 mb-1">
                      {DAYS_FR.map((d, i) => (
                        <div key={i} className="h-8 flex items-center justify-center text-[9px] font-bold text-muted-foreground uppercase tracking-wider">
                          {d}
                        </div>
                      ))}
                    </div>

                    {calLoading
                      ? <div className="flex items-center justify-center h-44"><Loader2 size={20} className="animate-spin text-muted-foreground/30" /></div>
                      : <div className="grid grid-cols-7 gap-0.5">{renderCalendar()}</div>
                    }

                    <div className="flex flex-wrap items-center gap-4 mt-4 pt-4 border-t border-border text-[10px] text-muted-foreground">
                      <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-[#113356]" />Sélectionné</span>
                      <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full border-2 border-border" />Disponible</span>
                      <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-muted" />Indisponible</span>
                    </div>
                  </div>

                  {/* Séparation */}
                  <div className="border-t border-border" />

                  {/* Créneaux horaires */}
                  <div className="p-5">
                    {!form.date ? (
                      <div className="flex items-center gap-3 py-1">
                        <Clock size={14} className="text-muted-foreground/40 shrink-0" />
                        <p className="text-sm text-muted-foreground">Sélectionnez une date ci-dessus pour voir les créneaux disponibles</p>
                      </div>
                    ) : slotsLoading ? (
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
                        <div className="flex items-baseline gap-2 mb-3">
                          <p className="text-sm font-extrabold text-foreground capitalize">{formattedDate}</p>
                          <span className="text-xs text-muted-foreground">· {formatDuration(duree)}</span>
                        </div>
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
                </div>
              )}

              {/* ─ Step 3 ─ */}
              {step === "infos" && (
                <div className="rounded-2xl border border-border bg-white shadow-sm divide-y divide-border overflow-hidden">

                  {/* Contact */}
                  <div className="p-5 sm:p-7">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[2px] mb-4">Coordonnées</p>
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
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[2px] mb-4">Détails du vol</p>
                    <div className="space-y-5">

                      <div>
                        <label className="block text-sm font-semibold text-foreground mb-3">
                          Nombre de passagers <span className="text-muted-foreground font-normal">(requis)</span>
                        </label>
                        <div className="flex gap-2.5">
                          {[1, 2, 3].map(n => (
                            <button key={n} type="button"
                              onClick={() => setForm(f => ({ ...f, passengers: n }))}
                              className={[
                                "flex-1 py-2.5 rounded-xl border text-sm font-semibold transition-all duration-150 text-center cursor-pointer",
                                form.passengers === n
                                  ? "border-[#fbae17] bg-[#fbae17] text-[#0b2238] shadow-sm"
                                  : "border-border text-foreground hover:border-[#fbae17]/50 hover:bg-[#fbae17]/5 hover:text-[#fbae17]",
                              ].join(" ")}
                            >
                              {n} {n === 1 ? "passager" : "passagers"}
                            </button>
                          ))}
                        </div>
                        <p className="mt-2 text-xs text-muted-foreground">Prix identique quel que soit le nombre.</p>
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-foreground mb-2">
                          Poids total des passagers <span className="text-muted-foreground font-normal">(kg, requis)</span>
                        </label>
                        <div className="flex items-center gap-3">
                          <input type="number" value={form.poids_total} required min={1} max={500} placeholder="ex : 160"
                            onChange={e => setForm(f => ({ ...f, poids_total: e.target.value }))}
                            className="w-36 h-10 px-3 rounded-xl border border-border bg-white text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-[#fbae17]/20 focus:border-[#fbae17] transition-all placeholder:text-muted-foreground/40" />
                          <span className="text-sm text-muted-foreground">kg</span>
                        </div>
                        <p className="mt-2 text-xs text-muted-foreground">Somme de tous — requis pour le calcul masse &amp; centrage.</p>
                      </div>
                    </div>
                  </div>

                  {/* Voucher */}
                  <div className="p-5 sm:p-7">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[2px] mb-1.5">Bon de vol cadeau</p>
                    <p className="text-sm text-muted-foreground mb-4">Vous avez reçu un voucher ? Saisissez votre code ci-dessous.</p>
                    <div className="flex gap-2.5">
                      <input type="text" value={form.voucherInput}
                        onChange={e => handleVoucherChange(e.target.value)}
                        onKeyDown={e => e.key === "Enter" && validateVoucher(form.voucherInput)}
                        className="flex-1 h-10 px-3 rounded-xl border border-border bg-white text-sm font-mono uppercase tracking-widest text-foreground focus:outline-none focus:ring-2 focus:ring-[#fbae17]/20 focus:border-[#fbae17] transition-all placeholder:text-muted-foreground/40 placeholder:tracking-normal placeholder:font-sans"
                        placeholder="XXXX-XXXX-XXXX-XXXX" maxLength={19} />
                      <button type="button"
                        onClick={() => validateVoucher(form.voucherInput)}
                        disabled={!form.voucherInput.trim() || vcLoading}
                        className="px-4 h-10 rounded-xl border border-border bg-muted text-sm font-semibold text-foreground hover:bg-[#fbae17]/5 hover:border-[#fbae17]/40 hover:text-[#fbae17] disabled:opacity-40 transition-all flex items-center gap-1.5">
                        {vcLoading ? <Loader2 size={13} className="animate-spin" /> : <><Tag size={12} />Appliquer</>}
                      </button>
                    </div>
                    {vcError && (
                      <p className="mt-2.5 text-sm text-destructive flex items-center gap-1.5">
                        <AlertCircle size={13} className="shrink-0" /> {vcError}
                      </p>
                    )}
                    {form.voucher && (
                      <div className="mt-2.5 inline-flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 px-3.5 py-2 rounded-xl">
                        <CheckCircle size={13} />
                        <span><strong>{form.voucher.product_title}</strong> — {form.voucher.duration_minutes} min offerts</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ─ Step 4 ─ */}
              {step === "paiement" && (
                <div className="space-y-4">

                  {/* Recap card */}
                  <div className="rounded-2xl border border-border bg-white shadow-sm overflow-hidden">
                    <div className="bg-[#0b2238] px-6 py-6 flex items-start justify-between gap-4">
                      <div>
                        <p className="text-[#fbae17] text-[9px] font-black tracking-[3px] uppercase mb-3">Fly Horizons</p>
                        <h2 className="text-white text-base font-extrabold leading-snug">{form.product?.title}</h2>
                        <p className="text-white/50 text-sm mt-1.5 capitalize">
                          {formattedDate}{form.heure && ` · ${form.heure}`}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-white/30 text-[9px] uppercase tracking-widest mb-1">Durée</p>
                        <span className="bg-[#fbae17] text-[#0b2238] text-sm font-bold px-3 py-1 rounded-full">
                          {formatDuration(duree)}
                        </span>
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
                          <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-[2px] mb-0.5">{l}</p>
                          <p className="text-sm font-semibold text-foreground truncate">{v}</p>
                        </div>
                      ))}
                    </div>

                    <div className="px-6 py-5 flex items-end justify-between gap-4">
                      <div className="space-y-1">
                        {discount > 0 && (
                          <>
                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                              <span>Prix public</span>
                              <span className="line-through">{prixPlein} €</span>
                            </div>
                            <div className="flex items-center gap-4 text-xs text-green-600 font-medium">
                              <span>Voucher ({form.voucher?.duration_minutes} min)</span>
                              <span>−{discount} €</span>
                            </div>
                          </>
                        )}
                        <p className="text-xs text-muted-foreground">Par avion · jusqu&apos;à 3 passagers</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-[2px] mb-1">Total</p>
                        <p className={`text-3xl font-black tabular-nums ${price === 0 ? "text-green-600" : "text-[#113356]"}`}>
                          {price === 0 ? "Gratuit" : `${price} €`}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* CGP */}
                  <div className="rounded-2xl border border-border bg-white shadow-sm p-5">
                    <label className="flex items-start gap-3.5 cursor-pointer">
                      <input type="checkbox" checked={form.accept_cgp}
                        onChange={e => setForm(f => ({ ...f, accept_cgp: e.target.checked }))}
                        className="mt-0.5 w-4 h-4 accent-[#113356] shrink-0 cursor-pointer" />
                      <span className="text-sm text-muted-foreground leading-relaxed">
                        J&apos;ai lu et j&apos;accepte les{" "}
                        <a href="https://fly-horizons.com/cgp.html" target="_blank" rel="noopener noreferrer"
                          className="text-[#113356] underline underline-offset-2 font-semibold">
                          Conditions Générales de Participation
                        </a>{" "}
                        et j&apos;autorise l&apos;utilisation de mes données personnelles pour le traitement de cette réservation.
                      </span>
                    </label>
                  </div>

                  {submitError && (
                    <div className="flex items-center gap-2.5 text-sm text-destructive bg-destructive/5 border border-destructive/20 px-4 py-3.5 rounded-xl">
                      <AlertCircle size={14} className="shrink-0" /> {submitError}
                    </div>
                  )}
                </div>
              )}

              {/* ── Navigation ── */}
              <div className="mt-5 flex items-center justify-between gap-4">

                {/* Retour — gauche */}
                {stepIndex > 0 ? (
                  <button type="button" onClick={goBack}
                    className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer group">
                    <ChevronLeft size={15} className="group-hover:-translate-x-0.5 transition-transform" />
                    Retour
                  </button>
                ) : <div />}

                {/* Continuer — droite */}
                <div className="flex flex-col items-end gap-2">
                  <button type="button" disabled={ctaDisabled} onClick={handleCTA}
                    className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#113356] text-white rounded-xl text-sm font-bold transition-all duration-200 disabled:opacity-30 hover:bg-[#0b2238] shadow-sm hover:shadow-md hover:-translate-y-px active:translate-y-0 cursor-pointer">
                    {(submitting || vcLoading) && <Loader2 size={14} className="animate-spin" />}
                    {step === "paiement" && !submitting && price > 0 && <Lock size={13} />}
                    {step === "paiement" && !submitting && price === 0 && <CheckCircle size={13} />}
                    <span>
                      {step === "datetime" && (form.date && form.heure ? "Continuer" : form.date ? "Sélectionnez un créneau" : "Sélectionnez une date")}
                      {step === "infos"    && (vcLoading ? "Vérification…" : "Continuer vers le paiement")}
                      {step === "paiement" && (submitting ? "Traitement en cours…" : price === 0 ? "Confirmer gratuitement" : `Payer ${price} € en toute sécurité`)}
                    </span>
                    {!submitting && !vcLoading && step !== "paiement" && <ChevronRight size={15} />}
                  </button>
                  {step === "paiement" && price > 0 && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <Lock size={9} /> Paiement sécurisé Stripe
                    </p>
                  )}
                </div>

              </div>

            </div>

            {/* ── Summary sidebar ── */}
            <div className="hidden lg:block">
              <div className="sticky top-[96px]">
                <div className="rounded-2xl border border-border bg-white shadow-sm overflow-hidden">

                  {/* Image thumbnail */}
                  {form.product?.images?.[0]?.url && (
                    <div className="relative h-36 overflow-hidden">
                      <Image
                        src={form.product.images[0].url}
                        alt={form.product.title}
                        fill
                        className="object-cover"
                        sizes="300px"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#0b2238]/80 to-transparent" />
                      <div className="absolute bottom-3 left-4">
                        <span className="bg-[#fbae17] text-[#0b2238] text-xs font-bold px-2.5 py-1 rounded-full">
                          {formatDuration(form.product.voucher_duration_minutes)}
                        </span>
                      </div>
                    </div>
                  )}

                  <div className="bg-[#0b2238] px-4 py-3.5">
                    <p className="text-[#fbae17] text-[9px] font-black tracking-[3px] uppercase mb-2">Votre réservation</p>
                    {form.product ? (
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-white font-bold text-sm leading-snug">{form.product.title}</p>
                        {!form.product.images?.[0]?.url && (
                          <span className="bg-[#fbae17] text-[#0b2238] text-xs font-bold px-2.5 py-1 rounded-full shrink-0">
                            {formatDuration(form.product.voucher_duration_minutes)}
                          </span>
                        )}
                      </div>
                    ) : (
                      <p className="text-white/30 text-sm">Sélectionnez votre vol</p>
                    )}
                  </div>

                  <div className="px-4 py-3.5 space-y-2.5 border-b border-border">
                    <SumRow icon={<MapPin size={12} />} label="Départ" value="Charleroi · EBCI" />
                    {formattedDate && (
                      <SumRow icon={<Calendar size={12} />} label="Date" value={<span className="capitalize">{formattedDate}</span>} bright />
                    )}
                    {form.heure && (
                      <SumRow icon={<Clock size={12} />} label="Heure" value={form.heure} bright />
                    )}
                    {form.passengers > 0 && (
                      <SumRow icon={<Users size={12} />} label="Passagers" value={`${form.passengers} passager${form.passengers > 1 ? "s" : ""}`} />
                    )}
                    {form.voucher && (
                      <SumRow icon={<Tag size={12} />} label="Voucher" value={`−${discount} € · ${form.voucher.duration_minutes} min`} green />
                    )}
                  </div>

                  <div className="px-4 py-3.5">
                    {discount > 0 && (
                      <div className="flex justify-between text-xs text-muted-foreground mb-1">
                        <span>Prix public</span>
                        <span className="line-through">{prixPlein} €</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-muted-foreground">Total</span>
                      <span className={`text-xl font-black tabular-nums ${price === 0 && form.voucher ? "text-green-600" : "text-[#113356]"}`}>
                        {price === 0 && form.voucher ? "Gratuit" : form.product ? `${price} €` : "—"}
                      </span>
                    </div>
                    <p className="text-muted-foreground text-[10px] mt-1">Par avion · jusqu&apos;à 3 passagers</p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 px-1 mt-3">
                  <Lock size={9} className="text-muted-foreground/50 shrink-0" />
                  <p className="text-[10px] text-muted-foreground/60">Paiement sécurisé · Pilote EASA certifié</p>
                </div>
              </div>
            </div>

          </div>
      </div>

      {/* ── Mobile bottom bar ── */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 px-4 py-3.5 bg-white/95 backdrop-blur-md border-t border-border shadow-[0_-4px_24px_rgba(0,0,0,0.06)]">
        <div className="flex items-center gap-3">
          {stepIndex > 0 && (
            <button type="button" onClick={goBack}
              className="flex items-center gap-1 text-sm font-semibold text-muted-foreground shrink-0">
              <ChevronLeft size={15} /> Retour
            </button>
          )}
          <button type="button" disabled={ctaDisabled} onClick={handleCTA}
            className="flex-1 py-3.5 rounded-xl bg-[#113356] text-white font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-30 transition-all hover:bg-[#0b2238]">
            {(submitting || vcLoading) && <Loader2 size={14} className="animate-spin" />}
            {step === "paiement" && !submitting && price > 0 && <Lock size={13} />}
            <span>
              {step === "datetime" && (form.date && form.heure ? "Continuer" : form.date ? "Choisissez un créneau" : "Choisissez une date")}
              {step === "infos"    && (vcLoading ? "Vérification…" : "Continuer")}
              {step === "paiement" && (submitting ? "Traitement…" : price === 0 ? "Confirmer" : `Payer ${price} €`)}
            </span>
            {!submitting && !vcLoading && step !== "paiement" && <ChevronRight size={15} />}
          </button>
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
        {label}{required && <span className="text-muted-foreground font-normal"> *</span>}
      </label>
      <input type={type} value={value} required={required} placeholder={placeholder}
        onChange={e => onChange(e.target.value)}
        className="w-full h-10 px-3 rounded-xl border border-border bg-white text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-[#fbae17]/20 focus:border-[#fbae17] transition-all placeholder:text-muted-foreground/40" />
    </div>
  );
}

function SumRow({ icon, label, value, bright, green }: {
  icon: React.ReactNode; label: string; value: React.ReactNode; bright?: boolean; green?: boolean;
}) {
  return (
    <div className="flex items-start gap-2.5">
      <span className={`mt-0.5 shrink-0 ${green ? "text-green-500" : bright ? "text-[#fbae17]" : "text-muted-foreground/50"}`}>{icon}</span>
      <div className="min-w-0">
        <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-[2px]">{label}</p>
        <p className={`text-xs font-semibold mt-0.5 truncate ${green ? "text-green-600" : bright ? "text-foreground" : "text-muted-foreground"}`}>
          {value}
        </p>
      </div>
    </div>
  );
}
