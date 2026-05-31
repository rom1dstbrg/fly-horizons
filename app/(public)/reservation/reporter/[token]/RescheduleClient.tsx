"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Calendar, Clock, Loader2, AlertCircle } from "lucide-react";
import { rescheduleReservation } from "@/lib/actions/reservations";

const MONTHS_FR = ["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"];
const DAYS_FR   = ["Lun","Mar","Mer","Jeu","Ven","Sam","Dim"];

interface Props {
  token: string;
  currentDate: string;
  duree: number;
  prenom: string;
  nom: string;
  email: string;
  passagers: number;
  poids_total: number | null;
}

export function RescheduleClient({ token, currentDate, duree, prenom, nom, email, passagers, poids_total }: Props) {
  const router = useRouter();

  const today = new Date();
  const minBookableDate = new Date(today);
  minBookableDate.setHours(0, 0, 0, 0);
  minBookableDate.setDate(minBookableDate.getDate() + 2);

  const [calYear,  setCalYear]  = useState(today.getFullYear());
  const [calMonth, setCalMonth] = useState(today.getMonth() + 1);
  const [availDays,  setAvailDays]  = useState<string[]>([]);
  const [calLoading, setCalLoading] = useState(false);

  const [selectedDate,  setSelectedDate]  = useState("");
  const [slots,         setSlots]         = useState<string[]>([]);
  const [slotsLoading,  setSlotsLoading]  = useState(false);
  const [selectedHeure, setSelectedHeure] = useState("");

  const [step, setStep] = useState<"pick" | "confirm">("pick");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const currentDateFormatted = new Date(currentDate + "T12:00:00Z").toLocaleDateString("fr-BE", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });

  const selectedFormatted = selectedDate
    ? new Date(selectedDate + "T12:00:00Z").toLocaleDateString("fr-BE", {
        weekday: "long", day: "numeric", month: "long", year: "numeric",
      })
    : null;

  const loadMonth = useCallback(async (y: number, m: number) => {
    setCalLoading(true);
    try {
      const r = await fetch(`/api/reservation/month?year=${y}&month=${m}&duree=${duree}`);
      setAvailDays((await r.json()).available ?? []);
    } finally { setCalLoading(false); }
  }, [duree]);

  useEffect(() => { loadMonth(calYear, calMonth); }, [calYear, calMonth, loadMonth]);

  useEffect(() => {
    if (!selectedDate) { setSlots([]); setSelectedHeure(""); return; }
    setSlotsLoading(true);
    fetch(`/api/reservation/slots?date=${selectedDate}&duree=${duree}`)
      .then(r => r.json())
      .then(d => setSlots(d.slots ?? []))
      .finally(() => setSlotsLoading(false));
  }, [selectedDate, duree]);

  function renderCalendar() {
    const firstDay = new Date(calYear, calMonth - 1, 1).getDay();
    const offset   = firstDay === 0 ? 6 : firstDay - 1;
    const total    = new Date(calYear, calMonth, 0).getDate();
    const cells: React.ReactNode[] = [];
    for (let i = 0; i < offset; i++) cells.push(<div key={`e${i}`} />);
    for (let d = 1; d <= total; d++) {
      const ds      = `${calYear}-${String(calMonth).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      const isAvail = availDays.includes(ds);
      const isSel   = selectedDate === ds;
      const isPast  = new Date(ds + "T12:00:00Z") < minBookableDate;
      cells.push(
        <button key={d} type="button" disabled={!isAvail || isPast}
          onClick={() => { setSelectedDate(ds); setSelectedHeure(""); setError(""); }}
          className={[
            "h-10 w-full rounded-lg text-sm font-medium transition-all duration-150 select-none flex items-center justify-center",
            isSel              ? "bg-primary text-primary-foreground font-bold shadow-sm scale-105" :
            isAvail && !isPast ? "hover:bg-primary/10 hover:text-primary text-foreground/70 cursor-pointer font-semibold" :
                                 "text-foreground/20 cursor-not-allowed text-xs",
          ].join(" ")}
        >{d}</button>
      );
    }
    return cells;
  }

  async function handleConfirm() {
    if (!selectedDate || !selectedHeure) return;
    setSubmitting(true);
    setError("");
    const result = await rescheduleReservation(token, selectedDate, selectedHeure);
    setSubmitting(false);
    if (result.error) {
      setError(result.error);
      setStep("pick");
    } else {
      const dateStr = result.newDateStr ?? `${selectedFormatted ?? selectedDate} à ${selectedHeure}`;
      router.replace(`/reservation/reporter/confirme?d=${encodeURIComponent(dateStr)}`);
    }
  }

  // ── Step 2 — Aperçu avant confirmation ──────────────────────────────────
  if (step === "confirm") {
    return (
      <div className="flex-1 flex items-center justify-center bg-gradient-navy px-4 pt-[86px] pb-16">
        <div className="max-w-xl w-full py-6">

          <p className="text-[10px] font-black text-primary uppercase tracking-[3px] mb-1">
            Report de vol
          </p>
          <h1 className="text-xl font-black text-foreground mb-6">
            Vérifiez votre nouvelle date
          </h1>

          <div className="card-premium overflow-hidden mb-5">

            <div className="bg-navy px-6 py-5 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-white text-base font-black leading-snug">Report de vol</h2>
                <div className="mt-2 space-y-0.5">
                  <p className="text-white/40 text-xs line-through capitalize">{currentDateFormatted}</p>
                  <p className="text-primary text-sm font-bold capitalize">{selectedFormatted} à {selectedHeure}</p>
                </div>
              </div>
              <div className="shrink-0">
                <div className="inline-flex items-center gap-1.5 bg-black/40 border border-white/15 rounded-lg px-3 py-1.5">
                  <span className="text-primary font-black text-[13px] leading-none">
                    {duree < 60 ? `${duree} min` : `${Math.floor(duree/60)}h${duree%60 > 0 ? String(duree%60).padStart(2,"0") : ""}`}
                  </span>
                  <span className="text-white/50 text-[11px] leading-none">avion léger</span>
                </div>
              </div>
            </div>

            <div className="px-6 py-5 grid grid-cols-2 gap-x-6 gap-y-4">
              {[
                { l: "Passager principal", v: `${prenom} ${nom}`.trim() },
                { l: "Email",              v: email },
                { l: "Passagers / Masse",  v: `${passagers} pax${poids_total ? ` · ${poids_total} kg` : ""}` },
                { l: "Aéroport",           v: "Charleroi · EBCI" },
              ].map(({ l, v }) => (
                <div key={l}>
                  <p className="text-[9px] font-black text-foreground/40 uppercase tracking-[2px] mb-0.5">{l}</p>
                  <p className="text-sm font-semibold text-foreground truncate">{v}</p>
                </div>
              ))}
            </div>

          </div>

          {error && (
            <div className="flex items-center gap-2.5 text-sm text-red-600 bg-red-50 border border-red-200 px-4 py-3 rounded-lg mb-4">
              <AlertCircle size={14} className="shrink-0" /> {error}
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => { setStep("pick"); setError(""); }}
              disabled={submitting}
              className="flex-1 px-4 py-3 rounded-lg border border-border text-sm font-semibold text-foreground/60 hover:bg-secondary hover:text-foreground transition-colors disabled:opacity-50"
            >
              Modifier
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={submitting}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-primary text-primary-foreground rounded-lg text-sm font-black hover:bg-[#e6a800] active:scale-[0.98] transition-all disabled:opacity-30 shadow-gold"
            >
              {submitting && <Loader2 size={14} className="animate-spin" />}
              {submitting ? "Confirmation…" : "Confirmer le report"}
            </button>
          </div>

          <p className="text-xs text-foreground/40 text-center mt-4">
            Vous recevrez un email de confirmation après validation.
          </p>
        </div>
      </div>
    );
  }

  // ── Step 1 — Calendrier + créneaux ───────────────────────────────────────
  return (
    <div className="flex-1 flex flex-col bg-gradient-navy pb-16">
      <div className="h-[84px]" />

      <div className="max-w-xl mx-auto w-full px-4 sm:px-6 py-6">

        <div className="mb-6">
          <p className="text-[10px] font-black text-primary uppercase tracking-[3px] mb-1">
            Report de vol
          </p>
          <h1 className="text-xl font-black text-foreground">
            Choisissez une nouvelle date
          </h1>
          <p className="text-sm text-foreground/50 mt-1">
            {prenom ? `Bonjour ${prenom}, votre` : "Votre"} vol prévu le{" "}
            <span className="font-semibold text-foreground capitalize">{currentDateFormatted}</span>{" "}
            est reporté. Sélectionnez une nouvelle date et un créneau horaire.
          </p>
        </div>

        <div className="card-premium overflow-hidden divide-y divide-border">

          {/* Calendrier */}
          <div className="p-5">
            <div className="flex items-center justify-between mb-4">
              <button type="button"
                onClick={() => { if (calMonth === 1) { setCalMonth(12); setCalYear(y => y - 1); } else setCalMonth(m => m - 1); }}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-foreground/40 hover:text-foreground hover:bg-secondary transition-all border border-border cursor-pointer">
                <ChevronLeft size={15} />
              </button>
              <span className="text-sm font-bold text-foreground">
                {MONTHS_FR[calMonth - 1]} {calYear}
              </span>
              <button type="button"
                onClick={() => { if (calMonth === 12) { setCalMonth(1); setCalYear(y => y + 1); } else setCalMonth(m => m + 1); }}
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

          {/* Créneaux horaires */}
          <div className="p-5">
            {!selectedDate ? (
              <div className="flex items-center gap-3 py-1">
                <Clock size={14} className="text-foreground/30 shrink-0" />
                <p className="text-sm text-foreground/50">Sélectionnez une date pour voir les créneaux disponibles</p>
              </div>
            ) : slotsLoading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 size={18} className="animate-spin text-foreground/20" />
              </div>
            ) : slots.length === 0 ? (
              <div className="flex items-center gap-3 py-1">
                <Clock size={14} className="text-foreground/30 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-foreground capitalize">{selectedFormatted}</p>
                  <p className="text-xs text-foreground/50 mt-0.5">Aucun créneau disponible. Essayez une autre date.</p>
                </div>
              </div>
            ) : (
              <div>
                <p className="text-sm font-black text-foreground capitalize mb-3">{selectedFormatted}</p>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {slots.map(s => (
                    <button key={s} type="button"
                      onClick={() => { setSelectedHeure(s); setError(""); }}
                      className={[
                        "py-2.5 rounded-lg border text-sm font-bold transition-all duration-150 text-center cursor-pointer",
                        selectedHeure === s
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

        <div className="mt-5 space-y-3">
          {selectedDate && selectedHeure && (
            <div className="rounded-lg border border-primary/40 bg-primary/5 px-4 py-3 flex items-center gap-3">
              <Calendar size={14} className="text-primary shrink-0" />
              <p className="text-sm font-semibold text-foreground capitalize">
                {selectedFormatted} à {selectedHeure}
              </p>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2.5 text-sm text-red-600 bg-red-50 border border-red-200 px-4 py-3 rounded-lg">
              <AlertCircle size={14} className="shrink-0" /> {error}
            </div>
          )}

          <button
            type="button"
            disabled={!selectedDate || !selectedHeure}
            onClick={() => setStep("confirm")}
            className="w-full flex items-center justify-center gap-2 px-6 py-3.5 bg-primary text-primary-foreground rounded-lg text-sm font-black transition-all disabled:opacity-30 hover:bg-[#e6a800] shadow-gold hover:-translate-y-px active:translate-y-0 active:scale-[0.98] cursor-pointer disabled:cursor-not-allowed"
          >
            {selectedDate && selectedHeure
              ? "Continuer"
              : selectedDate
              ? "Sélectionnez un créneau horaire"
              : "Sélectionnez une date"}
          </button>

          <p className="text-xs text-foreground/40 text-center">
            Vous pourrez vérifier avant de confirmer.
          </p>
        </div>

      </div>
    </div>
  );
}
