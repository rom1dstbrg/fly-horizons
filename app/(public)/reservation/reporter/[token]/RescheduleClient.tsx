"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Calendar, Clock, Loader2, AlertCircle, RotateCcw } from "lucide-react";
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

  // "confirm" = step d'aperçu avant soumission finale
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

  // ── Disponibilités du mois ───────────────────────────────────────────────
  const loadMonth = useCallback(async (y: number, m: number) => {
    setCalLoading(true);
    try {
      const r = await fetch(`/api/reservation/month?year=${y}&month=${m}&duree=${duree}`);
      setAvailDays((await r.json()).available ?? []);
    } finally { setCalLoading(false); }
  }, [duree]);

  useEffect(() => { loadMonth(calYear, calMonth); }, [calYear, calMonth, loadMonth]);

  // ── Créneaux de la date choisie ──────────────────────────────────────────
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
            isSel              ? "bg-[#fbae17] text-[#0b2238] font-bold shadow-sm scale-105" :
            isAvail && !isPast ? "hover:bg-[#fbae17]/10 hover:text-[#fbae17] text-foreground/70 cursor-pointer font-semibold" :
                                 "text-muted-foreground/25 cursor-not-allowed text-xs",
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
      <div className="bg-[#f5f5f7] flex-1 flex flex-col pb-16 px-4">
        <div className="h-[84px]" />
        <div className="max-w-xl mx-auto w-full py-6">

          <div className="inline-flex items-center gap-2 mb-4">
            <RotateCcw size={14} className="text-muted-foreground" />
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-[2px]">Confirmation du report</p>
          </div>
          <h1 className="text-xl font-extrabold text-foreground mb-6">
            Vérifiez votre nouvelle date
          </h1>

          {/* Récap — même style que la résa */}
          <div className="rounded-2xl border border-border bg-white shadow-sm overflow-hidden mb-5">

            {/* Header sombre */}
            <div className="bg-[#0b2238] px-6 py-6 flex items-start justify-between gap-4">
              <div>
                <p className="text-[#fbae17] text-[9px] font-black tracking-[3px] uppercase mb-3">Fly Horizons</p>
                <h2 className="text-white text-base font-extrabold leading-snug">Vol privé · report</h2>
                <div className="mt-2 space-y-0.5">
                  <p className="text-white/40 text-xs line-through capitalize">{currentDateFormatted}</p>
                  <p className="text-green-400 text-sm font-bold capitalize">{selectedFormatted} à {selectedHeure}</p>
                </div>
              </div>
              <div className="shrink-0">
                <div className="inline-flex items-center gap-1.5 bg-black/40 backdrop-blur-md border border-white/15 rounded-xl px-3 py-1.5">
                  <span className="text-[#F2B705] font-black text-[13px] leading-none">{duree < 60 ? `${duree} min` : `${Math.floor(duree/60)}h${duree%60 > 0 ? String(duree%60).padStart(2,"0") : ""}`}</span>
                  <span className="text-white/50 text-[11px] leading-none">vol privé</span>
                </div>
              </div>
            </div>

            {/* Infos client */}
            <div className="px-6 py-5 grid grid-cols-2 gap-x-6 gap-y-4">
              {[
                { l: "Passager principal", v: `${prenom} ${nom}`.trim() },
                { l: "Email",              v: email },
                { l: "Passagers / Masse",  v: `${passagers} pax${poids_total ? ` · ${poids_total} kg` : ""}` },
                { l: "Aéroport",           v: "Charleroi · EBCI" },
              ].map(({ l, v }) => (
                <div key={l}>
                  <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-[2px] mb-0.5">{l}</p>
                  <p className="text-sm font-semibold text-foreground truncate">{v}</p>
                </div>
              ))}
            </div>

          </div>

          {error && (
            <div className="flex items-center gap-2.5 text-sm text-destructive bg-destructive/5 border border-destructive/20 px-4 py-3 rounded-xl mb-4">
              <AlertCircle size={14} className="shrink-0" /> {error}
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => { setStep("pick"); setError(""); }}
              disabled={submitting}
              className="flex-1 px-4 py-3 rounded-xl border border-border text-sm font-semibold text-muted-foreground hover:bg-muted transition-colors disabled:opacity-50"
            >
              Modifier
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={submitting}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-[#113356] text-white rounded-xl text-sm font-bold hover:bg-[#0b2238] transition-colors disabled:opacity-30 shadow-sm"
            >
              {submitting && <Loader2 size={14} className="animate-spin" />}
              {submitting ? "Confirmation…" : "Confirmer le report"}
            </button>
          </div>

          <p className="text-xs text-muted-foreground text-center mt-4">
            Vous recevrez un email de confirmation après validation.
          </p>
        </div>
      </div>
    );
  }

  // ── Step 1 — Calendrier + créneaux ───────────────────────────────────────
  return (
    <div className="bg-[#f5f5f7] flex-1 flex flex-col pb-16">
      <div className="h-[84px]" />

      <div className="max-w-xl mx-auto w-full px-4 sm:px-6 py-6">

        {/* Header */}
        <div className="mb-6">
          <div className="inline-flex items-center gap-2 mb-1.5">
            <Calendar size={14} className="text-muted-foreground" />
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-[2px]">Report de vol</p>
          </div>
          <h1 className="text-xl font-extrabold text-foreground">
            Choisissez une nouvelle date
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {prenom ? `Bonjour ${prenom}, votre` : "Votre"} vol prévu le{" "}
            <span className="font-semibold text-foreground capitalize">{currentDateFormatted}</span>{" "}
            est reporté. Sélectionnez une nouvelle date et un créneau horaire.
          </p>
        </div>

        {/* Calendrier + créneaux */}
        <div className="rounded-2xl border border-border bg-white shadow-sm overflow-hidden divide-y divide-border">

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
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-[#fbae17]" />Sélectionné</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full border-2 border-border" />Disponible</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-muted" />Indisponible</span>
            </div>
          </div>

          {/* Créneaux horaires */}
          <div className="p-5">
            {!selectedDate ? (
              <div className="flex items-center gap-3 py-1">
                <Clock size={14} className="text-muted-foreground/40 shrink-0" />
                <p className="text-sm text-muted-foreground">Sélectionnez une date pour voir les créneaux disponibles</p>
              </div>
            ) : slotsLoading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 size={18} className="animate-spin text-muted-foreground/30" />
              </div>
            ) : slots.length === 0 ? (
              <div className="flex items-center gap-3 py-1">
                <Clock size={14} className="text-muted-foreground/40 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-foreground capitalize">{selectedFormatted}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Aucun créneau disponible. Essayez une autre date.</p>
                </div>
              </div>
            ) : (
              <div>
                <div className="flex items-baseline gap-2 mb-3">
                  <p className="text-sm font-extrabold text-foreground capitalize">{selectedFormatted}</p>
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {slots.map(s => (
                    <button key={s} type="button"
                      onClick={() => { setSelectedHeure(s); setError(""); }}
                      className={[
                        "py-2.5 rounded-xl border text-sm font-bold transition-all duration-150 text-center cursor-pointer",
                        selectedHeure === s
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

        {/* Récap sélection + bouton */}
        <div className="mt-5 space-y-3">
          {selectedDate && selectedHeure && (
            <div className="rounded-xl border border-[#fbae17]/40 bg-[#fbae17]/5 px-4 py-3 flex items-center gap-3">
              <Calendar size={14} className="text-[#fbae17] shrink-0" />
              <p className="text-sm font-semibold text-foreground capitalize">
                {selectedFormatted} à {selectedHeure}
              </p>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2.5 text-sm text-destructive bg-destructive/5 border border-destructive/20 px-4 py-3 rounded-xl">
              <AlertCircle size={14} className="shrink-0" /> {error}
            </div>
          )}

          <button
            type="button"
            disabled={!selectedDate || !selectedHeure}
            onClick={() => setStep("confirm")}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-[#113356] text-white rounded-xl text-sm font-bold transition-all duration-200 disabled:opacity-30 hover:bg-[#0b2238] shadow-sm hover:shadow-md hover:-translate-y-px active:translate-y-0 cursor-pointer"
          >
            {selectedDate && selectedHeure
              ? "Continuer"
              : selectedDate
              ? "Sélectionnez un créneau horaire"
              : "Sélectionnez une date"}
          </button>

          <p className="text-xs text-muted-foreground text-center">
            Vous pourrez vérifier avant de confirmer.
          </p>
        </div>

      </div>
    </div>
  );
}
