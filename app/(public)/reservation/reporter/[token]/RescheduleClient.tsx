"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { ArrowLeft, CalendarDays, Check, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { rescheduleReservation } from "@/lib/actions/reservations";
import { plageLabel } from "@/lib/pilote-creneaux";

// Page de report dans la nouvelle DA (28/09) : pas de boîte, filets entre les
// sections. Ordinateur : choix à gauche (calendrier puis créneaux), récapitulatif
// collant à droite avec le bouton, qui remplace l'ancienne étape « Vérifiez ».
// Téléphone : même ordre, le récapitulatif passe sous les créneaux. Après envoi,
// confirmation sur place (même schéma que la page contact).

const MONTHS_FR = ["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"];
const DAYS_FR   = ["Lun","Mar","Mer","Jeu","Ven","Sam","Dim"];

const EYEBROW = "text-[11px] font-bold text-primary uppercase tracking-[3px]";
const H2 = "text-[13px] font-bold text-foreground mb-3";
const NAV_BTN = "grid h-10 w-10 place-items-center rounded-xl border border-border text-foreground hover:border-foreground transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-default disabled:hover:border-border";
const SECONDARY = "inline-flex items-center gap-2 px-5 py-3 bg-white border border-border text-foreground rounded-[10px] text-sm font-bold hover:border-foreground transition-colors";

interface Props {
  token: string;
  currentDate: string;
  duree: number;
  prenom: string;
  nom: string;
  email: string;
  passagers: number;
  poids_total: number | null;
  /** Vol attribué à un pilote : on propose ses blocs de 2 h (sa grille de
   * disponibilités), sinon l'ancien calendrier du site. */
  piloteNom: string | null;
}

const fmtLong = (iso: string) =>
  new Date(iso + "T12:00:00Z").toLocaleDateString("fr-BE", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
const fmtDuree = (m: number) => (m < 60 ? `${m} min` : `${Math.floor(m / 60)} h${m % 60 ? String(m % 60).padStart(2, "0") : ""}`);

export function RescheduleClient({ token, currentDate, duree, prenom, nom, passagers, piloteNom }: Props) {
  const today = new Date();
  const minBookableDate = new Date(today);
  minBookableDate.setHours(0, 0, 0, 0);
  minBookableDate.setDate(minBookableDate.getDate() + 2);
  const firstMonth = { y: today.getFullYear(), m: today.getMonth() + 1 };

  const [calYear,  setCalYear]  = useState(firstMonth.y);
  const [calMonth, setCalMonth] = useState(firstMonth.m);
  const [availDays,  setAvailDays]  = useState<string[]>([]);
  const [calLoading, setCalLoading] = useState(false);

  const [selectedDate,  setSelectedDate]  = useState("");
  const [slots,         setSlots]         = useState<string[]>([]);
  const [slotsLoading,  setSlotsLoading]  = useState(false);
  const [selectedHeure, setSelectedHeure] = useState("");
  const [nbBlocs,       setNbBlocs]       = useState(1);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState<string | null>(null);

  // Pilote : « 13 h – 15 h » (bloc de 2 h, l'heure exacte se cale avec lui). Sinon « 09:30 ».
  const slotLabel = (s: string) => (piloteNom ? plageLabel(Number(s.slice(0, 2)), nbBlocs) : s);
  const q = `token=${encodeURIComponent(token)}`;

  const loadMonth = useCallback(async (y: number, m: number) => {
    setCalLoading(true);
    try {
      const r = await fetch(piloteNom
        ? `/api/reservation/reporter/month?${q}&year=${y}&month=${m}`
        : `/api/reservation/month?year=${y}&month=${m}&duree=${duree}`);
      setAvailDays((await r.json()).available ?? []);
    } finally { setCalLoading(false); }
  }, [duree, piloteNom, q]);

  useEffect(() => { loadMonth(calYear, calMonth); }, [calYear, calMonth, loadMonth]);

  useEffect(() => {
    if (!selectedDate) { setSlots([]); setSelectedHeure(""); return; }
    setSlotsLoading(true);
    fetch(piloteNom
      ? `/api/reservation/reporter/slots?${q}&date=${selectedDate}`
      : `/api/reservation/slots?date=${selectedDate}&duree=${duree}`)
      .then(r => r.json())
      .then(d => { setSlots(d.slots ?? []); setNbBlocs(d.blocs ?? 1); })
      .finally(() => setSlotsLoading(false));
  }, [selectedDate, duree, piloteNom, q]);

  const moveMonth = (delta: number) => {
    const d = new Date(calYear, calMonth - 1 + delta, 1);
    setCalYear(d.getFullYear());
    setCalMonth(d.getMonth() + 1);
  };
  const atFirstMonth = calYear === firstMonth.y && calMonth === firstMonth.m;

  async function handleConfirm() {
    if (!selectedDate || !selectedHeure) return;
    setSubmitting(true);
    setError("");
    const result = await rescheduleReservation(token, selectedDate, selectedHeure);
    setSubmitting(false);
    if (result.error) { setError(result.error); return; }
    setDone(result.newDateStr ?? `${fmtLong(selectedDate)}, ${slotLabel(selectedHeure)}`);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // ── Confirmation sur place ──────────────────────────────────────────────
  if (done) {
    return (
      <main className="bg-white pt-page pb-24">
        <div role="status" className="max-w-[640px] mx-auto px-4 sm:px-6">
          <div className="w-12 h-12 rounded-full bg-primary text-[#0b2238] grid place-items-center mb-[18px]">
            <Check size={22} strokeWidth={2.5} />
          </div>
          <h1 className="text-[34px] lg:text-[40px] font-black text-foreground leading-[1.03] tracking-[-0.02em] mb-3">Report enregistré.</h1>
          <p className="text-[15px] leading-[1.7] text-foreground/75 mb-2">
            Votre vol est reporté au <strong className="text-foreground">{done}</strong>.
          </p>
          <p className="text-[15px] leading-[1.7] text-foreground/75 mb-2">
            {piloteNom
              ? <>{piloteNom} vous confirme l&apos;heure exacte du décollage dans les prochains jours.</>
              : <>Nous vous confirmons l&apos;heure du vol dans les prochains jours.</>}{" "}
            Vous recevez un récapitulatif par email.
          </p>
          <p className="text-[15px] leading-[1.7] text-foreground/75">Pensez à vérifier vos spams si rien n&apos;arrive.</p>
          <div className="flex flex-wrap gap-2.5 mt-[22px]">
            <Link href="/account#reservations" className={SECONDARY}><CalendarDays size={15} /> Voir ma réservation</Link>
            <Link href="/" className={SECONDARY}><ArrowLeft size={15} /> Retour à l&apos;accueil</Link>
          </div>
        </div>
      </main>
    );
  }

  // ── Calendrier ──────────────────────────────────────────────────────────
  const firstDay = new Date(calYear, calMonth - 1, 1).getDay();
  const offset   = firstDay === 0 ? 6 : firstDay - 1;
  const total    = new Date(calYear, calMonth, 0).getDate();
  const cells: React.ReactNode[] = [];
  for (let i = 0; i < offset; i++) cells.push(<span key={`e${i}`} />);
  for (let d = 1; d <= total; d++) {
    const ds      = `${calYear}-${String(calMonth).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const isPast  = new Date(ds + "T12:00:00Z") < minBookableDate;
    const isAvail = availDays.includes(ds) && !isPast;
    const isSel   = selectedDate === ds;
    cells.push(
      <button
        key={d}
        type="button"
        disabled={!isAvail}
        aria-pressed={isSel}
        aria-label={`${d} ${MONTHS_FR[calMonth - 1]}${isAvail ? "" : ", indisponible"}`}
        onClick={() => { setSelectedDate(ds); setSelectedHeure(""); setError(""); }}
        className={[
          "h-11 sm:h-12 w-full rounded-xl text-[15px] tabular-nums transition-colors",
          isSel   ? "bg-primary text-[#0b2238] font-black cursor-pointer" :
          isAvail ? "bg-secondary text-foreground font-bold hover:bg-[#fdf4d6] cursor-pointer" :
                    "text-foreground/25 cursor-default",
        ].join(" ")}
      >{d}</button>,
    );
  }

  const choix = selectedDate && selectedHeure ? `${fmtLong(selectedDate)}, ${slotLabel(selectedHeure)}` : null;

  return (
    <main className="bg-white pt-page pb-24">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 xl:px-10 grid lg:grid-cols-12 gap-x-16">

        {/* ── Choix ── */}
        <div className="lg:col-span-7">
          <p className={`${EYEBROW} mb-3`}>Report de vol</p>
          <h1 className="text-[34px] lg:text-[48px] font-black text-foreground leading-[1.03] tracking-[-0.02em]">
            Choisissez une nouvelle date.
          </h1>
          <p className="mt-4 max-w-[560px] text-[15px] leading-[1.7] text-foreground/75">
            {prenom ? `Bonjour ${prenom}, votre` : "Votre"} vol du <span className="font-semibold text-foreground">{fmtLong(currentDate)}</span> est reporté.{" "}
            {piloteNom
              ? <>Les dates proposées sont celles où {piloteNom} est disponible. Vous choisissez un créneau de 2 h ; l&apos;heure exacte du décollage se fixe ensuite avec votre pilote.</>
              : <>Choisissez une date puis une heure de départ.</>}
          </p>

          <section className="mt-10 pt-8 border-t border-border">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[17px] font-black text-foreground">{MONTHS_FR[calMonth - 1]} {calYear}</h2>
              <div className="flex gap-2">
                <button type="button" aria-label="Mois précédent" disabled={atFirstMonth} onClick={() => moveMonth(-1)} className={NAV_BTN}><ChevronLeft size={16} /></button>
                <button type="button" aria-label="Mois suivant" onClick={() => moveMonth(1)} className={NAV_BTN}><ChevronRight size={16} /></button>
              </div>
            </div>
            <div className="grid grid-cols-7 gap-1.5 sm:gap-2 mb-1.5">
              {DAYS_FR.map((d) => (
                <span key={d} className="text-center text-[11px] font-bold uppercase tracking-[1px] text-muted-foreground">{d}</span>
              ))}
            </div>
            {calLoading
              ? <div className="grid h-[290px] place-items-center"><Loader2 size={20} className="animate-spin text-muted-foreground/40" /></div>
              : <div className="grid grid-cols-7 gap-1.5 sm:gap-2">{cells}</div>}
            {!calLoading && availDays.length === 0 && (
              <p className="mt-4 text-sm text-foreground/60">Aucune date libre ce mois-ci. Regardez le mois suivant.</p>
            )}
          </section>

          <section className="mt-10 pt-8 border-t border-border">
            <h2 className={H2}>{piloteNom ? "Créneau" : "Heure de départ"}</h2>
            {!selectedDate ? (
              <p className="text-[15px] text-foreground/60">Choisissez d&apos;abord une date.</p>
            ) : slotsLoading ? (
              <Loader2 size={18} className="animate-spin text-muted-foreground/40" />
            ) : slots.length === 0 ? (
              <p className="text-[15px] text-foreground/60">Plus aucun créneau libre ce jour-là. Choisissez une autre date.</p>
            ) : (
              <>
                <p className="mb-3 text-[15px] font-semibold text-foreground first-letter:uppercase">{fmtLong(selectedDate)}</p>
                <div data-xs-grid className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {slots.map((s) => (
                    <button
                      key={s}
                      type="button"
                      aria-pressed={selectedHeure === s}
                      onClick={() => { setSelectedHeure(s); setError(""); }}
                      className={[
                        "h-[52px] rounded-xl border text-[15px] font-bold tabular-nums transition-colors cursor-pointer",
                        selectedHeure === s ? "border-primary bg-primary text-[#0b2238]" : "border-border bg-white text-foreground hover:border-foreground",
                      ].join(" ")}
                    >{slotLabel(s)}</button>
                  ))}
                </div>
              </>
            )}
          </section>
        </div>

        {/* ── Récapitulatif + confirmation ── */}
        <aside className="lg:col-span-5 mt-10 pt-8 border-t border-border lg:mt-0 lg:pt-0 lg:border-t-0">
          <div className="lg:sticky lg:top-[112px]">
            <p className={`${EYEBROW} mb-4`}>Votre vol</p>
            <dl className="text-[15px]">
              <div className="flex justify-between gap-4 py-3 border-b border-border">
                <dt className="text-foreground/60">Ancienne date</dt>
                <dd className="text-right text-foreground/45 line-through first-letter:uppercase">{fmtLong(currentDate)}</dd>
              </div>
              <div className="flex justify-between gap-4 py-3 border-b border-border">
                <dt className="text-foreground/60">Nouvelle date</dt>
                <dd className={`text-right font-bold ${choix ? "text-foreground" : "text-foreground/35"}`}>
                  {choix ? <>
                    <span className="block first-letter:uppercase">{fmtLong(selectedDate)}</span>
                    <span className="block whitespace-nowrap">{slotLabel(selectedHeure)}</span>
                  </> : "À choisir"}
                </dd>
              </div>
              {piloteNom && (
                <div className="flex justify-between gap-4 py-3 border-b border-border">
                  <dt className="text-foreground/60">Pilote</dt>
                  <dd className="text-right font-semibold text-foreground">{piloteNom}</dd>
                </div>
              )}
              <div className="flex justify-between gap-4 py-3 border-b border-border">
                <dt className="text-foreground/60">Durée</dt>
                <dd className="text-right font-semibold text-foreground">{fmtDuree(duree)}</dd>
              </div>
              <div className="flex justify-between gap-4 py-3 border-b border-border">
                <dt className="text-foreground/60">Passagers</dt>
                <dd className="text-right font-semibold text-foreground">{`${prenom} ${nom}`.trim() || "Vous"}{passagers > 1 ? ` + ${passagers - 1}` : ""}</dd>
              </div>
            </dl>

            {error && (
              <p role="alert" className="mt-5 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</p>
            )}

            <button
              type="button"
              onClick={handleConfirm}
              disabled={!choix || submitting}
              className="mt-6 w-full inline-flex items-center justify-center gap-2 px-[26px] py-[15px] bg-primary text-[#0b2238] rounded-[10px] text-[15px] font-black hover:bg-[#e6a800] disabled:opacity-40 disabled:cursor-default transition-colors shadow-gold cursor-pointer"
            >
              {submitting && <Loader2 size={16} className="animate-spin" />}
              {submitting ? "Enregistrement…" : choix ? "Confirmer le report" : selectedDate ? "Choisissez un créneau" : "Choisissez une date"}
            </button>
            <p className="mt-3 text-[13px] leading-relaxed text-foreground/55">
              Le prix et le paiement ne changent pas. Vous recevez un email de confirmation.
            </p>
          </div>
        </aside>
      </div>
    </main>
  );
}
