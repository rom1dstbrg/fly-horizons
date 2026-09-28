"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowLeft, ArrowRight, ChevronLeft, ChevronRight, AlertCircle, Loader2, CheckCircle,
} from "lucide-react";
import { formatDuration } from "@/lib/vouchers";
import { blocsNecessaires, plageLabel } from "@/lib/pilote-creneaux";

// Réservation d'une annonce pilote, dans la nouvelle DA (même vocabulaire que
// /vol/annonce/[id] et la page de report : fond blanc, sans boîte, filets entre
// sections). Deux étapes dans une seule colonne (7/12) ; à droite (5/12,
// ordinateur), un résumé collant qui se complète au fil des choix — même
// composition que la colonne prix de la page produit. Téléphone : le résumé
// passe en ligne compacte sous le titre ; un seul bouton d'action, celui du
// bas de l'étape (pas de barre de prix dupliquée).

const MONTHS_FR = ["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"];
const DAYS_FR   = ["Lun","Mar","Mer","Jeu","Ven","Sam","Dim"];

const EYEBROW = "text-[11px] font-bold text-primary uppercase tracking-[3px]";
const NAV_BTN = "grid h-10 w-10 place-items-center rounded-xl border border-border text-foreground hover:border-foreground transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-default disabled:hover:border-border";
const FIELD = "w-full h-[52px] rounded-xl border border-border bg-secondary px-4 text-[15px] text-foreground placeholder:text-[#8a94a6] outline-none transition-colors focus:bg-white focus:border-foreground";
const LABEL = "block text-[13px] font-bold text-foreground mb-2";
const CTA = "inline-flex items-center justify-center gap-2 rounded-[10px] bg-primary px-6 py-[15px] text-sm font-black text-[#0b2238] shadow-gold hover:bg-[#e6a800] hover:-translate-y-px transition-all disabled:opacity-40 disabled:hover:translate-y-0 disabled:cursor-default cursor-pointer";

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

const fmtLong = (iso: string) =>
  new Date(iso + "T12:00:00Z").toLocaleDateString("fr-BE", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });

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
  // Le passager réserve un bloc de 2 h entier (deux pour un vol plus long) ;
  // l'heure exacte du décollage se cale ensuite avec le pilote.
  const nbBlocs = blocsNecessaires(annonce.duree);
  const slotLabel = (s: string) => plageLabel(Number(s.slice(0, 2)), nbBlocs);

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

  const moveMonth = (delta: number) => {
    const d = new Date(calYear, calMonth - 1 + delta, 1);
    setCalYear(d.getFullYear());
    setCalMonth(d.getMonth() + 1);
    loadMonth(d.getFullYear(), d.getMonth() + 1);
  };
  const atFirstMonth = calYear < today.getFullYear() || (calYear === today.getFullYear() && calMonth <= today.getMonth() + 1);

  const firstDay = new Date(calYear, calMonth - 1, 1).getDay();
  const offset = firstDay === 0 ? 6 : firstDay - 1;
  const total = new Date(calYear, calMonth, 0).getDate();
  const cells: React.ReactNode[] = [];
  for (let i = 0; i < offset; i++) cells.push(<span key={`e${i}`} />);
  for (let d = 1; d <= total; d++) {
    const ds = `${calYear}-${String(calMonth).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const isPast = new Date(ds + "T12:00:00Z") < minBookableDate;
    const isAvail = availDays.includes(ds) && !isPast;
    const isSel = date === ds;
    cells.push(
      <button
        key={d}
        type="button"
        disabled={!isAvail}
        aria-pressed={isSel}
        aria-label={`${d} ${MONTHS_FR[calMonth - 1]}${isAvail ? "" : ", indisponible"}`}
        onClick={() => { setDate(ds); setHeure(""); }}
        className={[
          "h-11 sm:h-[52px] w-full rounded-xl text-[15px] tabular-nums transition-colors",
          isSel   ? "bg-primary text-[#0b2238] font-black cursor-pointer" :
          isAvail ? "bg-secondary text-foreground font-bold hover:bg-[#fdf4d6] cursor-pointer" :
                    "text-foreground/25 cursor-default",
        ].join(" ")}
      >{d}</button>,
    );
  }

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
      router.push("/reservation/success?type=annonce");
    } catch {
      setSubmitError("Erreur réseau, veuillez réessayer.");
      setSubmitting(false);
    }
  }

  function handleCTA() {
    if (step === "datetime") { setStep("infos"); window.scrollTo({ top: 0, behavior: "smooth" }); return; }
    handleSubmit();
  }

  const unit = annonce.modeVente === "place" ? "/ personne" : "/ avion";
  const prefix = annonce.modeVente === "place" ? "dès " : "";
  const dateChoisie = date ? `${fmtLong(date)}, ${slotLabel(heure)}` : null;

  return (
    <main className="bg-white pb-16 lg:pb-24">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 xl:px-10 pt-page">

        <Link href={`/vol/annonce/${annonce.id}`} className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-muted-foreground hover:text-foreground transition-colors mb-3.5 lg:mb-[18px]">
          <ArrowLeft size={15} /> Retour à l&apos;annonce
        </Link>

        <p className={`${EYEBROW} mb-2.5`}>{step === "datetime" ? "Étape 1 sur 2" : "Étape 2 sur 2"}</p>
        <h1 className="text-[28px] lg:text-[40px] font-black text-foreground leading-[1.05] tracking-[-0.02em]">
          {step === "datetime" ? "Choisissez un créneau." : "Vos informations."}
        </h1>
        <p className="mt-2.5 max-w-[620px] text-[15px] leading-[1.7] text-foreground/70">
          {step === "datetime"
            ? <>Un créneau libre chez {annonce.piloteNom}, pour un vol de {formatDuration(annonce.duree)}.</>
            : "Ces informations servent à confirmer et préparer votre vol avec le pilote."}
        </p>

        {/* Le vol, en une ligne (téléphone : remplace le résumé latéral) */}
        <dl className="mt-5 flex flex-wrap gap-x-6 gap-y-1 text-[13.5px] lg:hidden">
          <div className="flex gap-1.5"><dt className="text-foreground/55">Pilote</dt><dd className="font-semibold text-foreground">{annonce.piloteNom}</dd></div>
          <div className="flex gap-1.5"><dt className="text-foreground/55">Prix</dt><dd className="font-semibold text-foreground">{prefix}{annonce.prixClient} € <span className="text-foreground/55 font-normal">{unit}</span></dd></div>
        </dl>

        <div className="mt-8 pt-7 lg:mt-10 lg:pt-10 border-t border-border lg:grid lg:grid-cols-12">

          {/* Colonne principale : l'étape en cours */}
          <div className="lg:col-span-7">
            {step === "datetime" && (
              <>
                <p className="flex items-start gap-1.5 text-[13px] text-foreground/60 mb-6">
                  <AlertCircle size={14} className="shrink-0 mt-0.5 text-primary" />
                  Créneau souhaité, pas garanti : le pilote confirme votre demande, puis fixe avec vous l&apos;heure exacte du décollage.
                </p>

                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-[17px] font-black text-foreground">{MONTHS_FR[calMonth - 1]} {calYear}</h2>
                  <div className="flex gap-2">
                    <button type="button" aria-label="Mois précédent" disabled={atFirstMonth || calLoading} onClick={() => moveMonth(-1)} className={NAV_BTN}><ChevronLeft size={16} /></button>
                    <button type="button" aria-label="Mois suivant" disabled={calLoading} onClick={() => moveMonth(1)} className={NAV_BTN}><ChevronRight size={16} /></button>
                  </div>
                </div>
                <div className="grid grid-cols-7 gap-1.5 sm:gap-2 mb-1.5">
                  {DAYS_FR.map((d) => (
                    <span key={d} className="text-center text-[11px] font-bold uppercase tracking-[1px] text-muted-foreground">{d}</span>
                  ))}
                </div>
                {calLoading
                  ? <div className="grid h-[280px] place-items-center"><Loader2 size={20} className="animate-spin text-muted-foreground/40" /></div>
                  : <div className="grid grid-cols-7 gap-1.5 sm:gap-2">{cells}</div>}
                {!calLoading && availDays.length === 0 && (
                  <p className="mt-4 text-sm text-foreground/60">Aucune date libre ce mois-ci. Regardez le mois suivant.</p>
                )}

                {date && (
                  <div className="mt-8 pt-7 border-t border-border">
                    <h2 className="mb-3 text-[17px] font-black text-foreground first-letter:uppercase">{fmtLong(date)}</h2>
                    {slotsLoading ? (
                      <Loader2 size={18} className="animate-spin text-muted-foreground/40" />
                    ) : slots.length === 0 ? (
                      <p className="text-[15px] text-foreground/60">Plus aucun créneau libre ce jour-là. Choisissez une autre date.</p>
                    ) : (
                      <div data-xs-grid className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {slots.map((s) => (
                          <button
                            key={s}
                            type="button"
                            aria-pressed={heure === s}
                            onClick={() => setHeure(s)}
                            className={[
                              "h-[52px] rounded-xl border text-[15px] font-bold tabular-nums transition-colors cursor-pointer",
                              heure === s ? "border-primary bg-primary text-[#0b2238]" : "border-border bg-white text-foreground hover:border-foreground",
                            ].join(" ")}
                          >{slotLabel(s)}</button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}

            {step === "infos" && (
              <div className="space-y-8">
                <section>
                  <p className={`${EYEBROW} mb-4`}>Coordonnées</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
                    <label className="block mb-4"><span className={LABEL}>Prénom</span>
                      <input value={prenom} onChange={(e) => setPrenom(e.target.value)} required placeholder="Jean" className={FIELD} /></label>
                    <label className="block mb-4"><span className={LABEL}>Nom</span>
                      <input value={nom} onChange={(e) => setNom(e.target.value)} required placeholder="Dupont" className={FIELD} /></label>
                  </div>
                  <label className="block mb-4"><span className={LABEL}>Email</span>
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="jean@exemple.com" className={FIELD} /></label>
                  <label className="block"><span className={LABEL}>Téléphone</span>
                    <input type="tel" value={telephone} onChange={(e) => setTelephone(e.target.value)} placeholder="+32 470 00 00 00" className={FIELD} /></label>
                </section>

                <section className="pt-7 border-t border-border">
                  <p className={`${EYEBROW} mb-4`}>Détails du vol</p>
                  <span className={LABEL}>Nombre de passagers</span>
                  <div className="flex flex-wrap gap-2 mb-5">
                    {Array.from({ length: annonce.places }, (_, i) => i + 1).map((n) => (
                      <button
                        key={n}
                        type="button"
                        aria-pressed={passagers === n}
                        onClick={() => setPassagers(n)}
                        className={[
                          "h-11 px-4 rounded-xl border text-sm font-bold transition-colors cursor-pointer",
                          passagers === n ? "border-primary bg-primary text-[#0b2238]" : "border-border bg-white text-foreground hover:border-foreground",
                        ].join(" ")}
                      >{n} {n === 1 ? "passager" : "passagers"}</button>
                    ))}
                  </div>
                  <label className="block">
                    <span className={LABEL}>Message pour le pilote <span className="font-normal text-foreground/45">(optionnel)</span></span>
                    <textarea
                      value={commentaire}
                      onChange={(e) => setCommentaire(e.target.value)}
                      rows={3}
                      maxLength={500}
                      className="w-full rounded-xl border border-border bg-secondary px-4 py-3 text-[15px] text-foreground placeholder:text-[#8a94a6] outline-none transition-colors focus:bg-white focus:border-foreground resize-none"
                    />
                  </label>
                </section>

                <section className="pt-7 border-t border-border">
                  <label className="flex items-start gap-3.5 cursor-pointer">
                    <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5 h-4 w-4 shrink-0 accent-primary cursor-pointer" />
                    <span className="text-[14px] leading-relaxed text-foreground/70">
                      J&apos;accepte que mon nom, mon email et mon téléphone soient transmis à{" "}
                      <strong className="text-foreground">{annonce.piloteNom}</strong>, qui organise ce vol, pour qu&apos;il puisse
                      me contacter et préparer le vol avec moi.
                    </span>
                  </label>
                </section>

                {submitError && (
                  <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{submitError}</p>
                )}
              </div>
            )}

            <div className="mt-8 pt-7 border-t border-border flex items-center justify-between gap-4">
              {step === "infos" ? (
                <button type="button" onClick={() => setStep("datetime")} className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors cursor-pointer group">
                  <ChevronLeft size={15} className="group-hover:-translate-x-0.5 transition-transform" /> Retour
                </button>
              ) : <span />}

              <button type="button" disabled={ctaDisabled} onClick={handleCTA} className={CTA}>
                {submitting && <Loader2 size={15} className="animate-spin" />}
                {step === "infos" && !submitting && <CheckCircle size={14} />}
                {step === "datetime" && (date && heure ? "Continuer" : date ? "Sélectionnez un créneau" : "Sélectionnez une date")}
                {step === "infos" && (submitting ? "Envoi en cours…" : "Envoyer ma demande")}
                {!submitting && step === "datetime" && <ArrowRight size={15} />}
              </button>
            </div>
          </div>

          {/* Résumé collant (ordinateur) : même composition que la colonne prix de la page produit */}
          <aside className="hidden lg:block lg:col-span-5 lg:pl-14 lg:ml-14 lg:border-l lg:border-border">
            <div className="sticky top-[100px]">
              {annonce.coverImage && (
                <div className="relative mb-5 aspect-[16/10] overflow-hidden rounded-xl">
                  <Image src={annonce.coverImage} alt={annonce.titre} fill className="object-cover" sizes="420px" />
                </div>
              )}
              <p className={`${EYEBROW} mb-2`}>Votre réservation</p>
              <p className="mb-5">
                <span className="text-[36px] font-black leading-none text-foreground">{prefix}{annonce.prixClient}&nbsp;€</span>
                <span className="ml-1.5 text-sm text-muted-foreground">{unit}</span>
              </p>
              <dl className="text-[14px]">
                {[
                  ["Pilote", annonce.piloteNom],
                  ["Départ", "Charleroi · EBCI"],
                  ["Date", dateChoisie ? <span className="first-letter:uppercase">{fmtLong(date)}</span> : <span className="text-foreground/35">à choisir</span>],
                  ["Créneau", heure ? slotLabel(heure) : <span className="text-foreground/35">—</span>],
                  ["Passagers", step === "infos" ? `${passagers} ${passagers > 1 ? "passagers" : "passager"}` : <span className="text-foreground/35">à préciser</span>],
                ].map(([l, v]) => (
                  <div key={l as string} className="flex justify-between gap-4 py-2.5 border-b border-border last:border-b-0">
                    <dt className="text-foreground/55">{l}</dt>
                    <dd className="text-right font-semibold text-foreground">{v}</dd>
                  </div>
                ))}
              </dl>
              <p className="mt-4 text-[12.5px] leading-relaxed text-foreground/55">
                Vous ne payez pas à cette étape : le pilote vous enverra les infos de paiement une fois votre créneau confirmé.
              </p>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
