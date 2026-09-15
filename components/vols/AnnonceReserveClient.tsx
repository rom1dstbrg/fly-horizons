"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  ChevronLeft, ChevronRight, Clock, AlertCircle, Loader2, CheckCircle,
} from "lucide-react";
import { formatDuration } from "@/lib/vouchers";

const MONTHS_FR = ["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"];
const DAYS_FR   = ["Lun","Mar","Mer","Jeu","Ven","Sam","Dim"];

type Step = "datetime" | "infos";

export interface AnnonceReserveInfo {
  id: string;
  titre: string;
  duree: number;
  places: number;
  prixClient: number;
  modeVente: "avion" | "place";
  piloteNom: string;
  coverImage: string | null;
}

export function AnnonceReserveClient({ annonce }: { annonce: AnnonceReserveInfo }) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("datetime");

  const today = new Date();
  const minBookableDate = new Date(today);
  minBookableDate.setHours(0, 0, 0, 0);
  minBookableDate.setDate(minBookableDate.getDate() + 2);

  const [calYear, setCalYear] = useState(today.getFullYear());
  const [calMonth, setCalMonth] = useState(today.getMonth() + 1);
  const [availDays, setAvailDays] = useState<string[]>([]);
  const [calLoading, setCalLoading] = useState(true);
  const [date, setDate] = useState("");
  const [heure, setHeure] = useState("");
  const [slots, setSlots] = useState<string[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);

  const [prenom, setPrenom] = useState("");
  const [nom, setNom] = useState("");
  const [email, setEmail] = useState("");
  const [telephone, setTelephone] = useState("");
  const [passagers, setPassagers] = useState(1);
  const [commentaire, setCommentaire] = useState("");
  const [consent, setConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const loadMonth = useCallback(async (y: number, m: number) => {
    setCalLoading(true);
    try {
      const r = await fetch(`/api/vol-annonce/month?annonce_id=${annonce.id}&year=${y}&month=${m}`);
      setAvailDays((await r.json()).available ?? []);
    } finally { setCalLoading(false); }
  }, [annonce.id]);

  // Trouve silencieusement le premier mois avec des dispos (pas de flash de mois vide).
  useEffect(() => {
    let cancelled = false;
    async function findFirstMonth() {
      setCalLoading(true);
      const sy = today.getFullYear(), sm = today.getMonth() + 1;
      for (let offset = 0; offset < 6; offset++) {
        let m = sm + offset, y = sy;
        while (m > 12) { m -= 12; y++; }
        try {
          const r = await fetch(`/api/vol-annonce/month?annonce_id=${annonce.id}&year=${y}&month=${m}`);
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
  }, [annonce.id]);

  useEffect(() => {
    if (!date) { setSlots([]); return; }
    setSlotsLoading(true);
    fetch(`/api/vol-annonce/slots?annonce_id=${annonce.id}&date=${date}`)
      .then(r => r.json()).then(d => setSlots(d.slots ?? [])).finally(() => setSlotsLoading(false));
  }, [date, annonce.id]);

  function renderCalendar() {
    const firstDay = new Date(calYear, calMonth - 1, 1).getDay();
    const offset = firstDay === 0 ? 6 : firstDay - 1;
    const total = new Date(calYear, calMonth, 0).getDate();
    const cells: React.ReactNode[] = [];
    for (let i = 0; i < offset; i++) cells.push(<div key={`e${i}`} />);
    for (let d = 1; d <= total; d++) {
      const ds = `${calYear}-${String(calMonth).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      const isAvail = availDays.includes(ds);
      const isSel = date === ds;
      const isPast = new Date(ds + "T12:00:00Z") < minBookableDate;
      cells.push(
        <button key={d} type="button" disabled={!isAvail || isPast}
          onClick={() => { setDate(ds); setHeure(""); }}
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

  const formattedDate = date
    ? new Date(date + "T12:00:00Z").toLocaleDateString("fr-BE", { weekday: "long", day: "numeric", month: "long" })
    : null;

  const ctaDisabled =
    step === "datetime"
      ? !date || !heure
      : !prenom || !nom || !email || !consent || submitting;

  async function handleSubmit() {
    setSubmitting(true);
    setSubmitError("");
    try {
      const r = await fetch("/api/vol-annonce/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          annonce_id: annonce.id, prenom, nom, email, telephone,
          passagers, date_vol: date, heure_vol: heure, commentaire,
          accept_data_sharing: consent,
        }),
      });
      const d = await r.json();
      if (!r.ok) { setSubmitError(d.error || "Erreur."); setSubmitting(false); return; }
      router.push("/reservation/success");
    } catch {
      setSubmitError("Erreur réseau, veuillez réessayer.");
      setSubmitting(false);
    }
  }

  function handleCTA() {
    if (step === "datetime") { setStep("infos"); return; }
    handleSubmit();
  }

  return (
    <div className="flex-1 bg-gradient-navy pb-16">
      <div className="h-[98px]" />
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-6">

        <div className="mb-4">
          <p className="text-[10px] font-black text-primary uppercase tracking-[3px] mb-1">
            {step === "datetime" ? "Étape 1 sur 2" : "Étape 2 sur 2"}
          </p>
          <h1 className="text-xl font-black text-foreground">
            {step === "datetime" ? "Date & heure de vol" : "Vos informations"}
          </h1>
          <p className="text-sm text-foreground/50 mt-1">
            {step === "datetime"
              ? `Sélectionnez un créneau libre chez ${annonce.piloteNom}, pour un vol de ${formatDuration(annonce.duree)}.`
              : "Ces informations servent à confirmer et préparer votre vol avec le pilote."}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6 items-start">

          <div className="min-w-0">

            {step === "datetime" && (
              <>
                <p className="flex items-start gap-1.5 text-xs text-foreground/60 mb-3">
                  <AlertCircle size={13} className="shrink-0 mt-0.5 text-primary" />
                  Créneau souhaité, pas garanti : le pilote confirme votre demande sous peu.
                </p>

                <div className="card-premium overflow-hidden">
                  <div className="p-5">
                    <div className="flex items-center justify-between mb-4">
                      <button type="button"
                        onClick={() => { const ny = calMonth === 1 ? calYear - 1 : calYear; const nm = calMonth === 1 ? 12 : calMonth - 1; setCalYear(ny); setCalMonth(nm); loadMonth(ny, nm); }}
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-foreground/40 hover:text-foreground hover:bg-secondary transition-all border border-border cursor-pointer"
                        aria-label="Mois précédent">
                        <ChevronLeft size={15} />
                      </button>
                      <span className="text-sm font-bold text-foreground">{MONTHS_FR[calMonth - 1]} {calYear}</span>
                      <button type="button"
                        onClick={() => { const ny = calMonth === 12 ? calYear + 1 : calYear; const nm = calMonth === 12 ? 1 : calMonth + 1; setCalYear(ny); setCalMonth(nm); loadMonth(ny, nm); }}
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-foreground/40 hover:text-foreground hover:bg-secondary transition-all border border-border cursor-pointer"
                        aria-label="Mois suivant">
                        <ChevronRight size={15} />
                      </button>
                    </div>

                    <div className="grid grid-cols-7 mb-1">
                      {DAYS_FR.map((d, i) => (
                        <div key={i} className="h-8 flex items-center justify-center text-[9px] font-bold text-foreground/40 uppercase tracking-wider">{d}</div>
                      ))}
                    </div>

                    {calLoading
                      ? <div className="flex items-center justify-center h-44"><Loader2 size={20} className="animate-spin text-foreground/20" /></div>
                      : <div className="grid grid-cols-7 gap-0.5">{renderCalendar()}</div>}

                    <div className="flex flex-wrap items-center gap-4 mt-4 pt-4 border-t border-border text-[10px] text-foreground/40">
                      <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-primary" />Sélectionné</span>
                      <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full border-2 border-border" />Disponible</span>
                      <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-border" />Indisponible</span>
                    </div>
                  </div>

                  <div className="border-t border-border" />

                  <div className="p-5">
                    {!date ? (
                      <div className="flex items-center gap-3 py-1">
                        <Clock size={14} className="text-foreground/30 shrink-0" />
                        <p className="text-sm text-foreground/50">Sélectionnez une date ci-dessus pour voir les créneaux disponibles</p>
                      </div>
                    ) : slotsLoading ? (
                      <div className="flex items-center justify-center py-4"><Loader2 size={18} className="animate-spin text-foreground/20" /></div>
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
                          <span className="text-xs text-foreground/40">· {formatDuration(annonce.duree)}</span>
                        </div>
                        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                          {slots.map(s => (
                            <button key={s} type="button" onClick={() => setHeure(s)}
                              className={[
                                "py-2.5 rounded-lg border text-sm font-bold transition-all duration-150 text-center cursor-pointer",
                                heure === s
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

            {step === "infos" && (
              <div className="card-premium divide-y divide-border overflow-hidden">
                <div className="p-5 sm:p-7">
                  <p className="text-[10px] font-black text-primary uppercase tracking-[3px] mb-4">Coordonnées</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field label="Prénom" required value={prenom} onChange={setPrenom} placeholder="Jean" />
                    <Field label="Nom" required value={nom} onChange={setNom} placeholder="Dupont" />
                    <div className="sm:col-span-2">
                      <Field label="Email" required type="email" value={email} onChange={setEmail} placeholder="jean@exemple.com" />
                    </div>
                    <div className="sm:col-span-2">
                      <Field label="Téléphone" type="tel" value={telephone} onChange={setTelephone} placeholder="+32 470 00 00 00" />
                    </div>
                  </div>
                </div>

                <div className="p-5 sm:p-7">
                  <p className="text-[10px] font-black text-primary uppercase tracking-[3px] mb-4">Détails du vol</p>
                  <div className="space-y-5">
                    <div>
                      <label className="block text-sm font-semibold text-foreground mb-3">Nombre de passagers</label>
                      <div className="flex gap-2.5">
                        {Array.from({ length: annonce.places }, (_, i) => i + 1).map(n => (
                          <button key={n} type="button" onClick={() => setPassagers(n)}
                            className={[
                              "flex-1 py-2.5 rounded-lg border text-sm font-semibold transition-all duration-150 text-center cursor-pointer",
                              passagers === n
                                ? "border-primary bg-primary text-primary-foreground shadow-sm"
                                : "border-border text-foreground hover:border-primary/50 hover:bg-primary/5 hover:text-primary",
                            ].join(" ")}
                          >{n} {n === 1 ? "passager" : "passagers"}</button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-foreground mb-2">Message pour le pilote <span className="text-foreground/40 font-normal">(optionnel)</span></label>
                      <textarea value={commentaire} onChange={e => setCommentaire(e.target.value)}
                        rows={3} maxLength={500}
                        className="w-full px-3 py-2.5 rounded-lg border border-border bg-input text-sm text-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" />
                    </div>
                  </div>
                </div>

                <div className="p-5 sm:p-7">
                  <label className="flex items-start gap-3.5 cursor-pointer">
                    <input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)}
                      className="mt-0.5 w-4 h-4 accent-primary shrink-0 cursor-pointer" />
                    <span className="text-sm text-foreground/60 leading-relaxed">
                      J&apos;accepte que mon nom, mon email et mon téléphone soient transmis à{" "}
                      <strong className="text-foreground">{annonce.piloteNom}</strong>, qui organise ce vol, pour
                      qu&apos;il puisse me contacter et préparer le vol avec moi.
                    </span>
                  </label>
                </div>

                {submitError && (
                  <div className="flex items-center gap-2.5 text-sm text-red-700 bg-red-50 border border-red-200 px-4 py-3.5 rounded-lg m-5 sm:m-7 mt-0">
                    <AlertCircle size={14} className="shrink-0" /> {submitError}
                  </div>
                )}
              </div>
            )}

            <div className="mt-5 flex items-center justify-between gap-4">
              {step === "infos" ? (
                <button type="button" onClick={() => setStep("datetime")}
                  className="flex items-center gap-1.5 text-sm font-medium text-foreground/50 hover:text-foreground transition-colors cursor-pointer group">
                  <ChevronLeft size={15} className="group-hover:-translate-x-0.5 transition-transform" />
                  Retour
                </button>
              ) : <div />}

              <button type="button" disabled={ctaDisabled} onClick={handleCTA}
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-primary text-primary-foreground rounded-lg text-sm font-black transition-all disabled:opacity-30 hover:brightness-105 shadow-gold hover:-translate-y-px active:translate-y-0 active:scale-[0.98] cursor-pointer disabled:cursor-not-allowed">
                {submitting && <Loader2 size={14} className="animate-spin" />}
                {step === "infos" && !submitting && <CheckCircle size={13} />}
                <span>
                  {step === "datetime" && (date && heure ? "Continuer" : date ? "Sélectionnez un créneau" : "Sélectionnez une date")}
                  {step === "infos" && (submitting ? "Envoi en cours…" : "Envoyer ma demande")}
                </span>
                {!submitting && step === "datetime" && <ChevronRight size={15} />}
              </button>
            </div>
          </div>

          <div className="hidden lg:block sticky top-[96px] self-start space-y-4">
            <div className="card-premium overflow-hidden">
              {annonce.coverImage && (
                <div className="relative h-36 overflow-hidden">
                  <Image src={annonce.coverImage} alt={annonce.titre} fill className="object-cover" sizes="300px" />
                  <div className="absolute inset-0 bg-gradient-to-t from-navy/60 to-transparent" />
                </div>
              )}
              <div className="px-5 pt-5 pb-4 border-b border-border">
                <p className="text-[10px] font-bold text-primary uppercase tracking-[2px] mb-1">Votre réservation</p>
                <p className="text-foreground text-2xl font-black leading-none tabular-nums">{annonce.prixClient} €</p>
                <p className="text-muted-foreground text-xs mt-1">{annonce.titre} · {formatDuration(annonce.duree)}</p>
              </div>
              <div className="p-4 space-y-2.5 text-sm">
                {[
                  { l: "Pilote",    v: annonce.piloteNom },
                  { l: "Départ",    v: "Charleroi · EBCI" },
                  { l: "Date",      v: formattedDate ? <span className="capitalize">{formattedDate}</span> : <span className="text-muted-foreground">Non sélectionnée</span> },
                  { l: "Heure",     v: heure || <span className="text-muted-foreground">—</span> },
                  { l: "Passagers", v: `${passagers} passager${passagers > 1 ? "s" : ""}` },
                ].map(({ l, v }) => (
                  <div key={l} className="flex items-center justify-between gap-2">
                    <span className="text-muted-foreground text-xs">{l}</span>
                    <span className="font-semibold text-xs text-right">{v}</span>
                  </div>
                ))}
              </div>
              <p className="px-4 pb-4 text-[10px] text-muted-foreground">
                Vous ne payez pas à cette étape : le pilote vous enverra les infos de paiement une
                fois votre créneau confirmé.
              </p>
            </div>
            <Link href={`/vol/annonce/${annonce.id}`} className="flex items-center gap-1.5 text-xs font-semibold text-white/50 hover:text-white transition-colors">
              <ChevronLeft size={13} /> Retour à l&apos;annonce
            </Link>
          </div>

        </div>
      </div>
    </div>
  );
}

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
