"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  ArrowLeft,
  Check,
  CreditCard,
  Clock,
  Users,
  Calendar,
  Wifi,
  WifiOff,
  AlertTriangle,
  MapPin,
  CheckCircle,
  Navigation,
} from "lucide-react";
import { formatDuration } from "@/lib/vouchers";

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
  distance_km: number | null;
  created_at: string;
  route?: string | null;
  route_status?: string | null;
  route_token?: string | null;
  route_feedback?: string | null;
}

const ROUTE_STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  sent:                   { label: "En attente de votre validation", color: "text-amber-700 bg-amber-50 border-amber-200" },
  validated:              { label: "Itinéraire validé ✓",            color: "text-green-700 bg-green-50 border-green-200" },
  modification_requested: { label: "Modification demandée",          color: "text-red-700 bg-red-50 border-red-200" },
};

interface Props {
  reservation: ReservationData;
  siteUrl: string;
}

// ── Status order ───────────────────────────────────────────────────────────

const STATUS_RANK: Record<string, number> = {
  payment_pending:  0,
  en_attente:       1,
  en_attente_perso: 1,
  acompte_recu:     2,
  date_confirmee:   3,
  heure_confirmee:  4,
  vol_effectue:     5,
};

// ── Timelines ──────────────────────────────────────────────────────────────

const STANDARD_TIMELINE = [
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
    desc: (r: ReservationData) => r.heure_vol ?? "En attente",
    doneDesc: (r: ReservationData) => r.heure_vol,
  },
  {
    key: "vol_effectue",
    label: "Vol effectué",
    desc: () => "À bientôt en l'air !",
    doneDesc: () => "Vol effectué. Merci !",
  },
];

const PERSO_TIMELINE = [
  {
    key: "en_attente_perso",
    label: "Demande envoyée",
    desc: () => "Votre demande est en cours de traitement",
    doneDesc: () => "Demande reçue",
  },
  {
    key: "acompte_recu",
    label: "Acompte reçu",
    desc: () => "En attente de votre paiement",
    doneDesc: () => "Acompte confirmé",
  },
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
    desc: (r: ReservationData) => r.heure_vol ?? "En attente",
    doneDesc: (r: ReservationData) => r.heure_vol,
  },
  {
    key: "vol_effectue",
    label: "Vol effectué",
    desc: () => "À bientôt en l'air !",
    doneDesc: () => "Vol effectué. Merci !",
  },
];

// ── Helper ─────────────────────────────────────────────────────────────────

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

  const isPerso = resa.type_resa === "perso";
  const isCancelled = resa.statut === "annulee";
  const timeline = isPerso ? PERSO_TIMELINE : STANDARD_TIMELINE;
  const currentRank = STATUS_RANK[resa.statut] ?? 0;

  const isPaid = !["payment_pending"].includes(resa.statut);
  const hasPaymentLink = resa.payment_token && !isPaid && !isCancelled;

  const paymentUrl = isPerso
    ? `${siteUrl}/api/vol-sur-mesure/pay/${resa.payment_token}`
    : `${siteUrl}/api/reservation/pay/${resa.payment_token}`;

  return (
    <main className="min-h-screen bg-gradient-navy pt-24 pb-16">
      <div className="container-shop max-w-2xl">

        {/* Back link */}
        <Link
          href="/account#reservations"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <ArrowLeft size={15} />
          Mon compte
        </Link>

        {/* Header card */}
        <div className="card-premium p-6 mb-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs text-muted-foreground mb-1">
                {isPerso ? "Vol sur mesure" : "Baptême de l'air"} · #{resa.id.slice(0, 8).toUpperCase()}
              </p>
              <h1 className="text-xl font-bold text-foreground">
                {resa.statut === "vol_effectue"
                  ? "Vol effectué"
                  : isCancelled
                  ? "Réservation annulée"
                  : resa.date_vol
                  ? formatDate(resa.date_vol)
                  : "Votre réservation"}
              </h1>
              <div className="flex items-center gap-3 mt-2 flex-wrap">
                <span className="text-sm text-muted-foreground flex items-center gap-1">
                  <Clock size={13} className="opacity-60" />
                  {formatDuration(resa.duree)}
                </span>
                {resa.passagers > 0 && (
                  <span className="text-sm text-muted-foreground flex items-center gap-1">
                    <Users size={13} className="opacity-60" />
                    {resa.passagers} passager{resa.passagers > 1 ? "s" : ""}
                  </span>
                )}
                {resa.heure_vol && (
                  <span className="text-sm text-muted-foreground flex items-center gap-1">
                    <Calendar size={13} className="opacity-60" />
                    {resa.heure_vol}
                  </span>
                )}
              </div>
            </div>

            {/* Live indicator */}
            <div
              className={`flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1.5 rounded-full border shrink-0 transition-all ${
                liveStatus === "live"
                  ? "bg-green-50 text-green-600 border-green-200"
                  : liveStatus === "offline"
                  ? "bg-secondary text-muted-foreground border-border"
                  : "bg-secondary text-muted-foreground border-border"
              }`}
            >
              {liveStatus === "live" ? (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                  En direct
                </>
              ) : liveStatus === "offline" ? (
                <>
                  <WifiOff size={11} />
                  Hors ligne
                </>
              ) : (
                <>
                  <Wifi size={11} className="opacity-50" />
                  Connexion…
                </>
              )}
            </div>
          </div>

          {/* Payment link */}
          {hasPaymentLink && (
            <div className="mt-4 pt-4 border-t border-border flex items-center gap-3">
              <CreditCard size={15} className="text-primary shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-foreground">{isPerso ? "Acompte requis" : "Paiement requis"}</p>
                <p className="text-xs text-muted-foreground">
                  {isPerso ? "Réglez l’acompte pour confirmer votre vol" : "Réglez le montant pour confirmer votre réservation"}
                </p>
              </div>
              <Link
                href={paymentUrl}
                className="shrink-0 px-4 py-2 bg-[#F2B705] text-[#113356] rounded-xl text-xs font-bold hover:bg-[#e6a800] transition-colors"
              >
                Payer {resa.acompte != null ? `${resa.acompte} €` : ""}
              </Link>
            </div>
          )}
        </div>

        {/* Cancelled state */}
        {isCancelled ? (
          <div className="card-premium p-6 border-red-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-50 border border-red-200 flex items-center justify-center shrink-0">
                <AlertTriangle size={18} className="text-red-500" />
              </div>
              <div>
                <p className="text-sm font-semibold text-red-600">Réservation annulée</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Cette réservation a été annulée. Contactez-nous si vous avez des questions.
                </p>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-border">
              <Link
                href="/contact"
                className="text-xs font-medium text-primary hover:text-gold-500 transition-colors"
              >
                Nous contacter →
              </Link>
            </div>
          </div>
        ) : (
          /* Timeline */
          <div className="card-premium p-6">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-6">
              Suivi de votre réservation
            </p>

            <div className="space-y-0">
              {timeline.map((step, i) => {
                const stepRank = STATUS_RANK[step.key] ?? i;
                const isCompleted = stepRank < currentRank;
                const isCurrent = stepRank === currentRank;
                const isFlashing = flashId === step.key;
                const isLast = i === timeline.length - 1;

                const description = isCompleted
                  ? step.doneDesc(resa)
                  : step.desc(resa);

                return (
                  <div key={step.key} className="flex gap-4">
                    {/* Dot + line column */}
                    <div className="flex flex-col items-center">
                      <div
                        className={`w-7 h-7 rounded-full border-2 flex items-center justify-center shrink-0 transition-all duration-500 ${
                          isFlashing
                            ? "bg-[#F2B705] border-[#F2B705] scale-110"
                            : isCompleted
                            ? "bg-green-500 border-green-500"
                            : isCurrent
                            ? "bg-[#113356] border-[#113356]"
                            : "bg-white border-border"
                        }`}
                      >
                        {isCompleted && (
                          <Check size={13} className="text-white" strokeWidth={2.5} />
                        )}
                        {isCurrent && !isCompleted && (
                          <span className="w-2.5 h-2.5 rounded-full bg-white animate-pulse" />
                        )}
                      </div>
                      {!isLast && (
                        <div
                          className={`w-px flex-1 my-1 min-h-[28px] transition-colors duration-500 ${
                            isCompleted ? "bg-green-200" : "bg-border"
                          }`}
                        />
                      )}
                    </div>

                    {/* Content column */}
                    <div className={`flex-1 pb-6 ${isLast ? "pb-0" : ""}`}>
                      <p
                        className={`text-sm font-semibold leading-tight transition-colors duration-300 ${
                          isFlashing
                            ? "text-[#F2B705]"
                            : isCompleted
                            ? "text-green-700"
                            : isCurrent
                            ? "text-foreground"
                            : "text-muted-foreground/60"
                        }`}
                      >
                        {step.label}
                      </p>
                      {description && (
                        <p
                          className={`text-xs mt-0.5 capitalize transition-colors duration-300 ${
                            isCompleted
                              ? "text-green-600/70"
                              : isCurrent
                              ? "text-muted-foreground"
                              : "text-muted-foreground/40"
                          }`}
                        >
                          {description}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Route proposée */}
        {resa.route && (
          <div className="card-premium p-6 mt-5">
            <div className="flex items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-[#113356]/10 flex items-center justify-center shrink-0">
                  <MapPin size={14} className="text-[#113356]" />
                </div>
                <p className="text-xs font-semibold text-foreground uppercase tracking-wider">
                  Itinéraire proposé
                </p>
              </div>
              {resa.route_status && ROUTE_STATUS_CONFIG[resa.route_status] && (
                <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border ${ROUTE_STATUS_CONFIG[resa.route_status].color}`}>
                  {ROUTE_STATUS_CONFIG[resa.route_status].label}
                </span>
              )}
            </div>

            <p className="text-sm text-foreground whitespace-pre-line leading-relaxed">
              {resa.route}
            </p>

            {resa.route_feedback && (
              <div className="mt-4 bg-amber-50 border border-amber-200 rounded-xl p-3">
                <p className="text-[11px] font-semibold text-amber-700 uppercase tracking-wider mb-1">Votre retour</p>
                <p className="text-xs text-amber-700 leading-relaxed">{resa.route_feedback}</p>
              </div>
            )}

            {resa.route_status === "sent" && resa.route_token && (
              <div className="mt-4 pt-4 border-t border-border">
                <Link
                  href={`/vol/itineraire/${resa.route_token}`}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-[#113356] text-white rounded-xl text-xs font-bold hover:bg-[#0b2238] transition-colors"
                >
                  Valider ou modifier la route →
                </Link>
              </div>
            )}

            {resa.route_status === "validated" && (
              <div className="mt-4 pt-4 border-t border-border flex items-center gap-1.5 text-green-600 text-xs font-medium">
                <CheckCircle size={13} />
                Vous avez validé cet itinéraire
              </div>
            )}
          </div>
        )}

        {/* Accès EBCI — visible dès que la date est confirmée */}
        {["date_confirmee", "heure_confirmee", "vol_effectue"].includes(resa.statut) && (
          <div className="card-premium p-5 mt-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-[#113356]/8 flex items-center justify-center shrink-0">
              <Navigation size={16} className="text-[#113356]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground">Comment accéder à l&apos;aérodrome ?</p>
              <p className="text-xs text-muted-foreground mt-0.5">GPS, parking, accueil : tout est détaillé sur notre page d&apos;accès.</p>
            </div>
            <Link
              href="/access-ebci"
              className="shrink-0 text-xs font-bold text-[#113356] hover:text-primary transition-colors"
            >
              Voir →
            </Link>
          </div>
        )}

        {/* Contact footer */}
        <p className="text-center text-xs text-muted-foreground mt-6">
          Une question ?{" "}
          <Link href="/contact" className="text-primary hover:text-gold-500 transition-colors font-medium">
            Contactez-nous
          </Link>
        </p>

      </div>
    </main>
  );
}
