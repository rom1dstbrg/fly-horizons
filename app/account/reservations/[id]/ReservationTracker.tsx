"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  ArrowLeft,
  Check,
  CreditCard,
  Clock,
  Users,
  CalendarDays,
  Wifi,
  WifiOff,
  Map,
  Navigation,
  PlaneTakeoff,
  PlaneLanding,
  RotateCcw,
  Loader2,
  Download,
} from "lucide-react";
import { formatDuration } from "@/lib/vouchers";
import { generateClientRescheduleToken } from "@/lib/actions/reservations";

// Nouvelle DA (28/09) : même vocabulaire que succès/paiement — fond blanc,
// .pt-page, sans boîte. Ordinateur : timeline + itinéraire en colonne
// principale (7/12), récap du vol + actions rapides collants à droite
// (5/12, filet vertical) ; téléphone, une seule colonne empilée.

// ── Types ──────────────────────────────────────────────────────────────────

export interface ReservationData {
  id: string;
  date_vol: string;
  heure_vol: string | null;
  duree: number;
  passagers: number;
  statut: string;
  type_resa: string;
  payment_token: string | null;
  acompte: number | null;
  // Vol pilote (annonce) : réglé en direct au pilote par virement, pas de Stripe.
  // Le détail (QR, IBAN, reçu) vit sur /vol/annonce/paiement/[token] ; ici on
  // n'affiche qu'un résumé + le lien.
  pilotePayment?: {
    piloteNom: string;
    montant: number | null;
    paye: boolean;
  } | null;
  distance_km: number | null;
  created_at: string;
  route?: string | null;
  route_status?: string | null;
  route_token?: string | null;
  route_feedback?: string | null;
  waypoints?: Array<{ lat: number; lng: number; nom: string }> | null;
  latestProposalToken?: string | null;
  latestProposalStatus?: string | null;
  latestProposalWaypoints?: Array<{ lat: number; lng: number; nom?: string }> | null;
  packTitle?: string | null;
}

const ROUTE_STATUS_CONFIG: Record<string, { label: string; tone: string }> = {
  sent:                   { label: "En attente de votre validation", tone: "text-amber-700 bg-amber-50" },
  validated:              { label: "Itinéraire validé",              tone: "text-[#0b2238] bg-primary/15" },
  modification_requested: { label: "Modification demandée",          tone: "text-amber-700 bg-amber-50" },
};

interface Props {
  reservation: ReservationData;
  siteUrl: string;
}

const EYEBROW = "text-[11px] font-bold text-primary uppercase tracking-[3px]";
const SMALL_ACTION = "shrink-0 inline-flex items-center gap-1.5 text-[12.5px] font-bold text-foreground hover:text-primary transition-colors cursor-pointer whitespace-nowrap disabled:opacity-40 disabled:hover:text-foreground";
const PAY_CTA = "shrink-0 inline-flex items-center justify-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-black text-[#0b2238] shadow-gold-sm hover:bg-[#e6a800] transition-all cursor-pointer whitespace-nowrap";
const SOLID_CTA = "mt-5 inline-flex items-center gap-2 rounded-[10px] bg-[#0b2238] px-5 py-3 text-sm font-bold text-white hover:bg-[#0b2238]/90 transition-colors cursor-pointer";

// ── Status order ───────────────────────────────────────────────────────────

const STATUS_RANK: Record<string, number> = {
  demande_recue:    0,
  payment_pending:  1,
  en_attente:       2,
  en_attente_perso: 1,
  acompte_recu:     3,
  date_confirmee:   4,
  heure_confirmee:  5,
  vol_effectue:     6,
};

// ── Timelines ──────────────────────────────────────────────────────────────

const DATE_STEPS = [
  {
    key: "date_confirmee",
    label: "Date de vol confirmée",
    desc: (r: ReservationData) =>
      r.date_vol
        ? new Date(r.date_vol + "T12:00:00Z").toLocaleDateString("fr-BE", {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric",
          })
        : "En attente",
    doneDesc: (r: ReservationData) =>
      r.date_vol
        ? new Date(r.date_vol + "T12:00:00Z").toLocaleDateString("fr-BE", {
            weekday: "long",
            day: "numeric",
            month: "long",
          })
        : null,
  },
  {
    key: "heure_confirmee",
    label: "Créneau horaire confirmé",
    desc: (r: ReservationData) => formatHeure(r.heure_vol),
    doneDesc: (r: ReservationData) => formatHeure(r.heure_vol),
  },
  {
    key: "vol_effectue",
    label: "Vol effectué",
    desc: () => "À bientôt en l'air !",
    doneDesc: () => "Vol effectué. Merci !",
  },
];

// Virtual step — rendered with custom logic (not based on STATUS_RANK)
const PROPOSAL_STEP = {
  key: "route_proposal",
  label: "Proposition d'itinéraire",
  isVirtual: true,
};

const STANDARD_TIMELINE = [
  {
    key: "demande_recue",
    label: "Demande reçue",
    desc: () => "Votre pilote vérifie la disponibilité",
    doneDesc: () => "Demande reçue",
  },
  {
    key: "payment_pending",
    label: "Confirmation du paiement",
    desc: () => "En attente de votre paiement",
    doneDesc: () => "Paiement reçu",
  },
  {
    key: "en_attente",
    label: "Confirmation en cours",
    desc: () => "Nous vérifions les disponibilités",
    doneDesc: () => "Confirmé",
  },
  ...DATE_STEPS,
];

const STANDARD_TIMELINE_WITH_PROPOSAL = [
  {
    key: "demande_recue",
    label: "Demande reçue",
    desc: () => "Votre pilote vérifie la disponibilité",
    doneDesc: () => "Demande reçue",
  },
  {
    key: "payment_pending",
    label: "Confirmation du paiement",
    desc: () => "En attente de votre paiement",
    doneDesc: () => "Paiement reçu",
  },
  {
    key: "en_attente",
    label: "Confirmation en cours",
    desc: () => "Nous vérifions les disponibilités",
    doneDesc: () => "Confirmé",
  },
  PROPOSAL_STEP,
  ...DATE_STEPS,
];

const PERSO_TIMELINE = [
  {
    key: "en_attente_perso",
    label: "Demande reçue",
    desc: () => "Votre demande est en cours de traitement",
    doneDesc: () => "Demande reçue",
  },
  PROPOSAL_STEP,
  {
    key: "acompte_recu",
    label: "Provision reçue",
    desc: () => "En attente de votre règlement",
    doneDesc: () => "Provision confirmée",
  },
  ...DATE_STEPS,
];

// ── Helper ─────────────────────────────────────────────────────────────────

function formatHeure(h: string | null | undefined): string {
  if (!h) return "En attente";
  const [hh, mm] = h.split(":");
  return `${hh}h${mm}`;
}

function formatDate(dateStr: string) {
  return new Date(dateStr + "T12:00:00Z").toLocaleDateString("fr-BE", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

// ── Component ──────────────────────────────────────────────────────────────

export function ReservationTracker({ reservation: initial, siteUrl }: Props) {
  const router = useRouter();
  const [resa, setResa] = useState<ReservationData>(initial);
  const [liveStatus, setLiveStatus] = useState<"connecting" | "live" | "offline">("connecting");
  const [flashId, setFlashId] = useState<string | null>(null);
  const prevStatut = useRef(initial.statut);
  const [rescheduling, setRescheduling] = useState(false);

  // Sync when server re-renders (router.refresh)
  useEffect(() => {
    setResa(initial);
  }, [initial]);

  // Flash animation on status change
  useEffect(() => {
    if (resa.statut !== prevStatut.current) {
      setFlashId(resa.statut);
      prevStatut.current = resa.statut;
      const t = setTimeout(() => setFlashId(null), 2000);
      return () => clearTimeout(t);
    }
  }, [resa.statut]);

  // Supabase realtime + polling fallback
  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel(`resa-tracker-${resa.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "reservations",
          filter: `id=eq.${resa.id}`,
        },
        (payload) => {
          setResa((prev) => ({ ...prev, ...(payload.new as Partial<ReservationData>) }));
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") setLiveStatus("live");
        else if (status === "CLOSED" || status === "CHANNEL_ERROR") setLiveStatus("offline");
      });

    // Polling fallback — refresh server data every 30 s
    const interval = setInterval(() => router.refresh(), 30_000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [resa.id, router]);

  async function handleReschedule() {
    setRescheduling(true);
    const result = await generateClientRescheduleToken(resa.id);
    setRescheduling(false);
    if ("error" in result && result.error) {
      alert(result.error);
    } else if ("token" in result && result.token) {
      router.push(`/reservation/reporter/${result.token}`);
    }
  }

  const canReschedule =
    !["annulee", "vol_effectue", "payment_pending", "demande_recue"].includes(resa.statut) &&
    (new Date(resa.date_vol + "T23:59:59Z").getTime() - Date.now()) > 48 * 60 * 60 * 1000;

  const isPerso = resa.type_resa === "perso";
  const isCancelled = resa.statut === "annulee";
  const currentRank = STATUS_RANK[resa.statut] ?? 0;

  const timeline = isPerso
    ? PERSO_TIMELINE
    : resa.latestProposalToken
    ? STANDARD_TIMELINE_WITH_PROPOSAL
    : STANDARD_TIMELINE;

  const piloteVol = !!resa.pilotePayment;
  const isPaid = !["payment_pending", "en_attente_perso", "demande_recue"].includes(resa.statut);
  const hasPaymentLink = !piloteVol && resa.payment_token && !isPaid && !isCancelled;

  const paymentUrl = isPerso
    ? `${siteUrl}/api/vol-sur-mesure/pay/${resa.payment_token}`
    : `${siteUrl}/api/reservation/pay/${resa.payment_token}`;

  const typeLabel = isPerso ? "Vol sur mesure" : (resa.packTitle ?? "Vol partagé");
  const title = resa.statut === "vol_effectue"
    ? "Vol effectué"
    : isCancelled
    ? "Réservation annulée"
    : resa.date_vol
    ? formatDate(resa.date_vol)
    : "Votre réservation";

  const hasBoardingPass =
    ["heure_confirmee", "vol_effectue"].includes(resa.statut) &&
    ((resa.latestProposalWaypoints?.length ?? 0) > 0 || !!resa.route);
  const hasEbciAccess = ["date_confirmee", "heure_confirmee", "vol_effectue"].includes(resa.statut);

  return (
    <main className="bg-white pt-page pb-16 lg:pb-24">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 xl:px-10">

        <Link href="/account#reservations" className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-muted-foreground hover:text-foreground transition-colors mb-3.5 lg:mb-[18px]">
          <ArrowLeft size={15} /> Mon compte
        </Link>

        <div className="max-w-[680px]">
          <div className="flex items-center justify-between gap-3 flex-wrap mb-2.5">
            <p className={EYEBROW}>Suivi de réservation</p>
            <LiveDot status={liveStatus} />
          </div>
          <h1 className="text-[28px] lg:text-[40px] font-black text-foreground leading-[1.05] tracking-[-0.02em]">
            {title}
          </h1>
          <p className="mt-2.5 text-[15px] text-foreground/70">{typeLabel}</p>

          <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-[13.5px] text-foreground/60">
            <span className="inline-flex items-center gap-1.5"><Clock size={14} />{formatDuration(resa.duree)}</span>
            {resa.passagers > 0 && (
              <span className="inline-flex items-center gap-1.5"><Users size={14} />{resa.passagers} passager{resa.passagers > 1 ? "s" : ""}</span>
            )}
            {resa.heure_vol && (
              <span className="inline-flex items-center gap-1.5"><Clock size={14} />{formatHeure(resa.heure_vol)}</span>
            )}
            {resa.distance_km && (
              <span className="inline-flex items-center gap-1.5"><Navigation size={14} />{resa.distance_km} km</span>
            )}
          </div>
        </div>

        {isCancelled ? (
          <div className="mt-8 pt-7 border-t border-border max-w-[680px]">
            <p className="text-[15px] leading-relaxed text-foreground/70">
              Cette réservation a été annulée. Contactez-nous si vous avez des questions.
            </p>
            <Link href="/contact" className="mt-4 inline-flex items-center gap-1.5 text-sm font-bold text-foreground hover:text-primary transition-colors">
              Nous contacter →
            </Link>
          </div>
        ) : (
          <div className="mt-8 pt-7 lg:mt-10 lg:pt-10 border-t border-border lg:grid lg:grid-cols-12">

            {/* ── Colonne principale : timeline + itinéraire ────────────── */}
            <section className="lg:col-span-7">
              <p className={`${EYEBROW} mb-5`}>Suivi de votre réservation</p>
              <ol>
                {timeline.map((step, i) => {
                  const isVirtual = "isVirtual" in step && step.isVirtual;
                  let isCompleted: boolean;
                  let isCurrent: boolean;
                  let description: string | null;

                  if (isVirtual && step.key === "route_proposal") {
                    const proposalStatus = resa.latestProposalStatus;
                    const hasProposal = !!resa.latestProposalToken;
                    if (isPerso) {
                      isCompleted = currentRank > (STATUS_RANK["en_attente_perso"] ?? 1);
                      isCurrent = !isCompleted && hasProposal;
                    } else {
                      isCompleted = proposalStatus === "accepted" || currentRank >= (STATUS_RANK["date_confirmee"] ?? 3);
                      isCurrent = !isCompleted && hasProposal;
                    }
                    if (isCompleted) description = "Itinéraire validé";
                    else if (proposalStatus === "modification_requested") description = "Modification en cours de traitement";
                    else if (proposalStatus === "pending") description = "En attente de votre validation";
                    else description = "En attente de la proposition de votre pilote";
                  } else {
                    const stepFn = step as { key: string; label: string; desc: (r: ReservationData) => string | null; doneDesc: (r: ReservationData) => string | null };
                    const stepRank = STATUS_RANK[step.key] ?? i;
                    // Dernière étape de la timeline : pas de rang suivant pour la faire
                    // basculer en "terminé", donc <= plutôt que < (sinon elle reste
                    // affichée en "en cours" indéfiniment une fois le vol effectué).
                    const isLastStep = i === timeline.length - 1;
                    isCompleted = isLastStep ? stepRank <= currentRank : stepRank < currentRank;
                    isCurrent = !isCompleted && stepRank === currentRank;
                    description = isCompleted ? stepFn.doneDesc(resa) : stepFn.desc(resa);
                  }

                  const isFlashing = flashId === step.key;
                  const isLast = i === timeline.length - 1;

                  return (
                    <li key={step.key} className="flex gap-3.5 pb-6 last:pb-0">
                      <span className="flex flex-col items-center shrink-0">
                        <span
                          className={[
                            "w-7 h-7 rounded-full grid place-items-center shrink-0 transition-all duration-500",
                            isFlashing ? "bg-primary scale-110" :
                            isCompleted ? "bg-[#0b2238]" :
                            isCurrent ? "bg-primary" :
                            "bg-secondary",
                          ].join(" ")}
                        >
                          {isCompleted && <Check size={13} className="text-primary" strokeWidth={2.5} />}
                          {isCurrent && !isCompleted && <span className="w-2 h-2 rounded-full bg-[#0b2238] animate-pulse" />}
                        </span>
                        {!isLast && (
                          <span className={`w-px flex-1 mt-1.5 min-h-[26px] transition-colors duration-500 ${isCompleted ? "bg-[#0b2238]/20" : "bg-border"}`} />
                        )}
                      </span>
                      <div className="pt-0.5">
                        <p className={`text-[15px] font-bold leading-tight transition-colors duration-300 ${
                          isFlashing ? "text-primary" : isCompleted || isCurrent ? "text-foreground" : "text-foreground/35"
                        }`}>
                          {step.label}
                        </p>
                        {description && (
                          <p className={`mt-1 text-[13.5px] leading-relaxed first-letter:uppercase transition-colors duration-300 ${
                            isCompleted || isCurrent ? "text-foreground/60" : "text-foreground/30"
                          }`}>
                            {description}
                          </p>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ol>

              {/* Itinéraire — ancien système (texte libre) */}
              {resa.route && (
                <div className="mt-9 pt-8 border-t border-border">
                  <div className="flex items-center justify-between gap-3 mb-4">
                    <p className={EYEBROW}>Itinéraire proposé</p>
                    {resa.route_status && ROUTE_STATUS_CONFIG[resa.route_status] && (
                      <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${ROUTE_STATUS_CONFIG[resa.route_status].tone}`}>
                        {ROUTE_STATUS_CONFIG[resa.route_status].label}
                      </span>
                    )}
                  </div>
                  <p className="text-[14.5px] text-foreground/75 whitespace-pre-line leading-relaxed">{resa.route}</p>
                  {resa.route_feedback && (
                    <div className="mt-4 rounded-xl bg-amber-50 px-4 py-3">
                      <p className="text-[11px] font-bold text-amber-700 uppercase tracking-wide mb-1">Votre retour</p>
                      <p className="text-[13px] text-amber-700 leading-relaxed">{resa.route_feedback}</p>
                    </div>
                  )}
                  {resa.route_status === "sent" && resa.route_token && (
                    <Link href={`/vol/itineraire/${resa.route_token}`} className={SOLID_CTA}>
                      Valider ou modifier la route
                    </Link>
                  )}
                  {resa.route_status === "validated" && (
                    <p className="mt-4 flex items-center gap-1.5 text-[13px] font-semibold text-foreground">
                      <Check size={14} className="text-primary" /> Vous avez validé cet itinéraire
                    </p>
                  )}
                </div>
              )}

              {/* Proposition de route — nouveau système */}
              {resa.latestProposalToken && (
                <div className="mt-9 pt-8 border-t border-border">
                  <div className="flex items-center justify-between gap-3 mb-1">
                    <p className={EYEBROW}>
                      {resa.latestProposalStatus === "accepted" ? "Itinéraire confirmé" : "Votre itinéraire de vol"}
                    </p>
                    {resa.latestProposalStatus === "pending" && (
                      <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full text-primary bg-primary/10">À valider</span>
                    )}
                    {resa.latestProposalStatus === "accepted" && (
                      <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full text-[#0b2238] bg-primary/15">Confirmé</span>
                    )}
                    {resa.latestProposalStatus === "modification_requested" && (
                      <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full text-amber-700 bg-amber-50">Révision en cours</span>
                    )}
                  </div>

                  <p className="mt-3 text-[13.5px] text-foreground/65 leading-relaxed">
                    {resa.latestProposalStatus === "pending" && "Votre pilote a préparé votre itinéraire personnalisé. C'est le parcours que vous allez réaliser ; consultez-le et confirmez-le."}
                    {resa.latestProposalStatus === "modification_requested" && "Votre pilote prépare un nouvel itinéraire en tenant compte de vos souhaits."}
                    {resa.latestProposalStatus === "accepted" && "Votre itinéraire est confirmé. Votre pilote a tout ce qu'il faut pour préparer le vol."}
                  </p>

                  {resa.latestProposalWaypoints && resa.latestProposalWaypoints.length > 0 && (
                    <WaypointsList waypoints={resa.latestProposalWaypoints} />
                  )}

                  <Link href={`/vol/proposition/${resa.latestProposalToken}`} className={SOLID_CTA}>
                    <Map size={14} /> Afficher sur la carte
                  </Link>
                </div>
              )}

              {/* Waypoints — sans proposition (vol sur mesure) */}
              {isPerso && !resa.latestProposalToken && resa.waypoints && resa.waypoints.length > 0 && (
                <div className="mt-9 pt-8 border-t border-border">
                  <p className={`${EYEBROW} mb-1`}>Vos destinations souhaitées</p>
                  <WaypointsList waypoints={resa.waypoints} />
                  <Link href={`/account/reservations/${resa.id}/carte`} className={SOLID_CTA}>
                    <Map size={14} /> Afficher sur la carte
                  </Link>
                </div>
              )}
            </section>

            {/* ── Colonne latérale : récap du vol + actions (collante) ──── */}
            <aside className="mt-9 pt-8 border-t border-border lg:col-span-5 lg:mt-0 lg:pt-0 lg:pl-14 lg:ml-14 lg:border-l lg:border-t-0 lg:border-border">
              <div className="sticky top-[100px]">
                <p className={`${EYEBROW} mb-4`}>Votre vol</p>

                <dl className="text-[14px] mb-2">
                  <div className="flex justify-between gap-4 py-2.5 border-b border-border">
                    <dt className="text-foreground/55">Type</dt>
                    <dd className="text-right font-semibold text-foreground">{typeLabel}</dd>
                  </div>
                  {resa.date_vol && (
                    <div className="flex justify-between gap-4 py-2.5 border-b border-border">
                      <dt className="flex items-center gap-1.5 text-foreground/55"><CalendarDays size={14} /> Date</dt>
                      <dd className="text-right font-semibold text-foreground capitalize">{formatDate(resa.date_vol)}</dd>
                    </div>
                  )}
                  <div className="flex justify-between gap-4 py-2.5 border-b border-border">
                    <dt className="flex items-center gap-1.5 text-foreground/55"><Clock size={14} /> Heure</dt>
                    <dd className="text-right font-semibold text-foreground">{formatHeure(resa.heure_vol)}</dd>
                  </div>
                  <div className="flex justify-between gap-4 py-2.5 border-b border-border">
                    <dt className="text-foreground/55">Durée</dt>
                    <dd className="text-right font-semibold text-foreground">{formatDuration(resa.duree)}</dd>
                  </div>
                  {resa.passagers > 0 && (
                    <div className="flex justify-between gap-4 py-2.5 border-b border-border">
                      <dt className="flex items-center gap-1.5 text-foreground/55"><Users size={14} /> Passagers</dt>
                      <dd className="text-right font-semibold text-foreground">{resa.passagers}</dd>
                    </div>
                  )}
                  {resa.distance_km && (
                    <div className="flex justify-between gap-4 py-2.5 border-b border-border">
                      <dt className="flex items-center gap-1.5 text-foreground/55"><Navigation size={14} /> Distance</dt>
                      <dd className="text-right font-semibold text-foreground">{resa.distance_km} km</dd>
                    </div>
                  )}
                  <div className="flex justify-between gap-4 py-2.5">
                    <dt className="text-foreground/55">Référence</dt>
                    <dd className="text-right font-mono text-[12.5px] text-foreground/60">#{resa.id.slice(0, 8).toUpperCase()}</dd>
                  </div>
                </dl>

                <div>
                  {hasPaymentLink && (
                    <ActionRow
                      Icon={CreditCard}
                      title={isPerso ? "Provision requise" : "Paiement requis"}
                      action={
                        <Link href={paymentUrl} className={PAY_CTA}>
                          Payer{resa.acompte != null ? ` ${resa.acompte} €` : ""}
                        </Link>
                      }
                    >
                      {isPerso ? "Réglez la provision pour confirmer votre vol." : "Réglez le montant pour confirmer votre réservation."}
                    </ActionRow>
                  )}

                  {piloteVol && resa.pilotePayment && (
                    <ActionRow
                      Icon={CreditCard}
                      title="Participation aux frais"
                      action={
                        resa.pilotePayment.paye ? (
                          <a href={`/api/invoice/reservation/${resa.id}`} className={SMALL_ACTION}>
                            <Download size={13} /> Reçu
                          </a>
                        ) : resa.payment_token ? (
                          <Link href={`/vol/annonce/paiement/${resa.payment_token}`} className={PAY_CTA}>
                            Régler{resa.pilotePayment.montant != null ? ` ${resa.pilotePayment.montant} €` : ""}
                          </Link>
                        ) : null
                      }
                    >
                      {resa.pilotePayment.paye ? "Réglée. " : "En attente de votre virement. "}
                      {resa.pilotePayment.montant != null ? `${resa.pilotePayment.montant} €` : "Montant"} à virer
                      directement à {resa.pilotePayment.piloteNom}. Fly Horizons n&apos;encaisse rien sur ce vol.
                    </ActionRow>
                  )}

                  {hasEbciAccess && (
                    <ActionRow Icon={Navigation} title="Accès à l'aérodrome" action={<Link href="/access-ebci" className={SMALL_ACTION}>Voir →</Link>}>
                      GPS, parking, accueil à Charleroi (EBCI).
                    </ActionRow>
                  )}

                  {hasBoardingPass && (
                    <ActionRow
                      Icon={PlaneTakeoff}
                      title="Boarding pass"
                      action={
                        <a href={`/api/boarding-pass/${resa.id}`} className={SMALL_ACTION}>
                          <Download size={13} /> Télécharger
                        </a>
                      }
                    >
                      À imprimer avant le vol.
                    </ActionRow>
                  )}

                  {canReschedule && (
                    <ActionRow
                      Icon={RotateCcw}
                      title="Reporter le vol"
                      action={
                        <button type="button" onClick={handleReschedule} disabled={rescheduling} className={SMALL_ACTION}>
                          {rescheduling && <Loader2 size={13} className="animate-spin" />}
                          Reporter
                        </button>
                      }
                    >
                      Jusqu&apos;à 48 h avant, sans frais.
                    </ActionRow>
                  )}
                </div>

                <p className="mt-6 pt-6 border-t border-border text-center text-[13px] text-foreground/60">
                  Une question ?{" "}
                  <Link href="/contact" className="font-bold text-foreground hover:text-primary transition-colors">
                    Contactez-nous
                  </Link>
                </p>
              </div>
            </aside>
          </div>
        )}

      </div>
    </main>
  );
}

// ── Sous-composants ──────────────────────────────────────────────────────

function LiveDot({ status }: { status: "connecting" | "live" | "offline" }) {
  if (status === "live") {
    return (
      <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-green-600">
        <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" /> En direct
      </span>
    );
  }
  if (status === "offline") {
    return (
      <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground">
        <WifiOff size={11} /> Hors ligne
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground">
      <Wifi size={11} className="opacity-50" /> Connexion…
    </span>
  );
}

function ActionRow({
  Icon,
  title,
  action,
  children,
}: {
  Icon: LucideIcon;
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3.5 py-4 border-b border-border last:border-b-0">
      <span className="w-[38px] h-[38px] shrink-0 rounded-[10px] bg-secondary grid place-items-center text-[#0b2238]">
        <Icon size={16} />
      </span>
      <div className="min-w-0 flex-1 text-[13px] leading-relaxed text-foreground/65">
        <p className="font-bold text-foreground text-[13.5px] mb-0.5">{title}</p>
        {children}
      </div>
      {action}
    </div>
  );
}

// Itinéraire Charleroi → escales → Charleroi, réutilisé par la proposition
// (nouveau système) et les destinations souhaitées (vol sur mesure sans
// proposition).
function WaypointsList({ waypoints }: { waypoints: Array<{ nom?: string }> }) {
  return (
    <ol className="mt-5 mb-1">
      <li className="flex gap-3.5">
        <span className="flex flex-col items-center shrink-0">
          <span className="w-7 h-7 rounded-full bg-[#0b2238] grid place-items-center shrink-0">
            <PlaneTakeoff size={13} className="text-primary" />
          </span>
          <span className="w-px flex-1 bg-border mt-1.5 min-h-[22px]" />
        </span>
        <div className="pb-4 pt-0.5">
          <p className="text-[14px] font-bold text-foreground">Charleroi EBCI</p>
          <p className="text-[12px] text-foreground/50 mt-0.5">Départ</p>
        </div>
      </li>
      {waypoints.map((wp, i) => (
        <li key={i} className="flex gap-3.5">
          <span className="flex flex-col items-center shrink-0">
            <span className="w-7 h-7 rounded-full bg-secondary grid place-items-center shrink-0 text-[11px] font-black text-foreground">
              {i + 1}
            </span>
            <span className="w-px flex-1 bg-border mt-1.5 min-h-[22px]" />
          </span>
          <div className="pb-4 pt-0.5">
            <p className="text-[14px] font-bold text-foreground">{wp.nom?.trim() || `Point ${i + 1}`}</p>
          </div>
        </li>
      ))}
      <li className="flex gap-3.5">
        <span className="w-7 h-7 rounded-full bg-[#0b2238] grid place-items-center shrink-0">
          <PlaneLanding size={13} className="text-primary" />
        </span>
        <div className="pt-0.5">
          <p className="text-[14px] font-bold text-foreground">Charleroi EBCI</p>
          <p className="text-[12px] text-foreground/50 mt-0.5">Retour</p>
        </div>
      </li>
    </ol>
  );
}
