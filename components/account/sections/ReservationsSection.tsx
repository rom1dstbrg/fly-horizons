"use client";

import Link from "next/link";
import { CalendarDays, Clock, CreditCard, MapPin, CheckCircle, ChevronRight, Download, AlertCircle, Star } from "lucide-react";
import { RescheduleButton } from "@/components/account/RescheduleButton";
import { WeatherWidget } from "@/components/account/WeatherWidget";
import { formatDuration } from "@/lib/vouchers";

const RESA_STATUS: Record<string, { label: string; color: string }> = {
  payment_pending:  { label: "Paiement requis",  color: "text-orange-600 bg-orange-50 border-orange-200" },
  en_attente:       { label: "En attente",        color: "text-yellow-600 bg-yellow-50 border-yellow-200" },
  date_confirmee:   { label: "Date confirmée",    color: "text-foreground bg-secondary border-border" },
  heure_confirmee:  { label: "Heure confirmée",   color: "text-green-600 bg-green-50 border-green-200" },
  vol_effectue:     { label: "Vol effectué",      color: "text-purple-600 bg-purple-50 border-purple-200" },
  annulee:          { label: "Annulée",           color: "text-red-600 bg-red-50 border-red-200" },
  en_attente_perso: { label: "En cours",          color: "text-yellow-600 bg-yellow-50 border-yellow-200" },
  acompte_recu:     { label: "Provision reçue",   color: "text-emerald-600 bg-emerald-50 border-emerald-200" },
};

export interface Reservation {
  id: string;
  date_vol: string;
  heure_vol: string | null;
  duree: number;
  passagers: number;
  statut: string;
  type_resa: string;
  payment_token: string | null;
  acompte: number | null;
  created_at: string;
  route?: string | null;
  route_status?: string | null;
  route_token?: string | null;
  waypoints?: Array<{ lat: number; lng: number; nom: string }> | null;
  latestProposalToken?: string | null;
  latestProposalStatus?: string | null;
}

function formatHeure(h: string | null | undefined) {
  if (!h) return null;
  const [hh, mm] = h.split(":");
  return `${hh}h${mm}`;
}

export function ReservationsSection({ reservations }: { reservations: Reservation[] }) {
  if (reservations.length === 0) {
    return (
      <div className="card-premium p-10 text-center">
        <div className="w-12 h-12 rounded-full bg-secondary border border-border flex items-center justify-center mx-auto mb-3">
          <CalendarDays size={20} className="text-muted-foreground" />
        </div>
        <p className="text-sm font-medium text-foreground">Aucune réservation</p>
        <p className="text-xs text-muted-foreground mt-1">Vos vols réservés apparaîtront ici.</p>
        <Link
          href="/reservation"
          className="inline-flex items-center gap-1 mt-4 text-xs font-semibold text-foreground hover:text-primary transition-colors"
        >
          Réserver un vol <ChevronRight size={12} />
        </Link>
      </div>
    );
  }

  const upcoming = reservations.filter((r) => new Date(r.date_vol + "T23:59:59") >= new Date());
  const past     = reservations.filter((r) => new Date(r.date_vol + "T23:59:59") < new Date());

  return (
    <div className="space-y-5">
      {upcoming.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">À venir</p>
          {upcoming.map((r, idx) => <ResaCard key={r.id} resa={r} upcoming showWeather={idx === 0} />)}
        </div>
      )}
      {past.length > 0 && (
        <div className="space-y-3">
          {upcoming.length > 0 && (
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Passées</p>
          )}
          {past.map((r) => <ResaCard key={r.id} resa={r} upcoming={false} showWeather={false} />)}
        </div>
      )}
    </div>
  );
}

function ResaCard({ resa, upcoming, showWeather = false }: { resa: Reservation; upcoming: boolean; showWeather?: boolean }) {
  const status     = RESA_STATUS[resa.statut] ?? RESA_STATUS.en_attente;
  const isPerso    = resa.type_resa === "perso";
  const isPaid     = !["en_attente", "payment_pending", "en_attente_perso"].includes(resa.statut);
  const hasPayLink = resa.payment_token && !isPaid;
  const payUrl     = isPerso
    ? `/api/vol-sur-mesure/pay/${resa.payment_token}`
    : `/api/reservation/pay/${resa.payment_token}`;

  const dateFormatted = new Date(resa.date_vol + "T12:00:00Z").toLocaleDateString("fr-BE", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });

  const heure = formatHeure(resa.heure_vol);

  const canReschedule =
    !["annulee", "vol_effectue", "payment_pending"].includes(resa.statut) &&
    (new Date(resa.date_vol + "T23:59:59Z").getTime() - Date.now()) > 48 * 60 * 60 * 1000;

  const carteHref = resa.latestProposalToken
    ? `/vol/proposition/${resa.latestProposalToken}`
    : isPerso && resa.waypoints?.length
    ? `/account/reservations/${resa.id}/carte`
    : null;

  return (
    <div className={`card-premium overflow-hidden ${upcoming ? "border-l-[3px] border-l-navy" : ""}`}>

      {/* Header */}
      <div className="px-5 pt-4 pb-3">
        {/* Badges */}
        <div className="flex items-center gap-2 flex-wrap mb-2.5">
          <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${status.color}`}>
            {status.label}
          </span>
          {isPerso && (
            <span className="text-[11px] text-muted-foreground bg-secondary px-2 py-0.5 rounded-full border border-border">
              Sur mesure
            </span>
          )}
        </div>

        {/* Date principale */}
        <p className="text-sm font-bold text-foreground capitalize">{dateFormatted}</p>

        {/* Méta : heure · durée · passagers */}
        <p className="text-xs text-muted-foreground mt-1 flex items-center gap-2 flex-wrap">
          {heure && (
            <span className="flex items-center gap-1">
              <Clock size={11} className="opacity-60" />
              {heure}
            </span>
          )}
          <span>{formatDuration(resa.duree)} de vol</span>
          {resa.passagers > 1 && <span>{resa.passagers} passagers</span>}
        </p>
      </div>

      {/* Paiement urgent — pleine largeur, bien visible */}
      {hasPayLink && (
        <div className="px-5 pb-4">
          <Link
            href={payUrl}
            className="flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-lg bg-primary text-primary-foreground text-xs font-black hover:bg-[#e6a800] transition-colors"
          >
            <CreditCard size={13} />
            {isPerso ? "Régler la provision" : "Finaliser le paiement"}
            {resa.acompte != null ? ` · ${resa.acompte} €` : ""}
          </Link>
        </div>
      )}

      {/* Paiement en préparation (pas encore de lien) */}
      {resa.statut === "payment_pending" && !resa.payment_token && (
        <div className="px-5 pb-4">
          <div className="flex items-start gap-2.5 p-3 rounded-lg bg-orange-50 border border-orange-200">
            <AlertCircle size={14} className="text-orange-500 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-orange-700">Lien de paiement en préparation</p>
              <p className="text-xs text-orange-600 mt-0.5">Vous le recevrez par email sous peu. Une question ?{" "}
                <a href="/contact" className="underline font-semibold">Nous contacter</a>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Itinéraire proposé */}
      {resa.route && (
        <div className="px-5 pb-4 pt-0">
          <div className="rounded-lg bg-secondary/50 border border-border p-3 space-y-2">
            <div className="flex items-start gap-2">
              <MapPin size={12} className="text-muted-foreground shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-0.5">
                  Itinéraire proposé
                </p>
                <p className="text-xs text-foreground leading-snug">{resa.route}</p>
              </div>
              {resa.route_status === "validated" && (
                <CheckCircle size={13} className="text-green-500 shrink-0 mt-0.5" />
              )}
            </div>
            {resa.route_status === "sent" && resa.route_token && (
              <Link
                href={`/vol/itineraire/${resa.route_token}`}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-amber-200 bg-amber-50 text-xs font-semibold text-amber-700 hover:bg-amber-100 transition-colors"
              >
                Valider ou modifier l&apos;itinéraire
              </Link>
            )}
            {resa.route_status === "modification_requested" && (
              <span className="inline-flex items-center text-xs text-muted-foreground">
                Modification en cours de traitement
              </span>
            )}
          </div>
        </div>
      )}

      {/* Météo */}
      {showWeather && (
        <div className="px-5 pb-4">
          <WeatherWidget date={resa.date_vol} bordered={false} />
        </div>
      )}

      {/* Footer */}
      <div className="px-5 py-3 border-t border-border bg-secondary/20 flex items-center gap-2 flex-wrap">

        {/* Provision payée */}
        {isPaid && resa.acompte != null && resa.acompte > 0 && (
          <span className="flex items-center gap-1 text-xs text-green-600 font-medium mr-auto">
            <CheckCircle size={11} className="shrink-0" />
            Provision payée · {resa.acompte} €
          </span>
        )}

        <Link
          href={`/account/reservations/${resa.id}`}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-foreground text-background text-xs font-semibold hover:bg-foreground/90 transition-colors"
        >
          Suivre la réservation
        </Link>

        {carteHref && (
          <Link
            href={carteHref}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs font-medium text-foreground bg-card hover:bg-secondary transition-colors"
          >
            <MapPin size={11} /> Carte
          </Link>
        )}

        {resa.acompte != null && resa.acompte > 0 && (
          <a
            href={`/api/invoice/reservation/${resa.id}`}
            download
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs font-medium text-foreground bg-card hover:bg-secondary transition-colors cursor-pointer"
          >
            <Download size={11} /> Facture
          </a>
        )}

        {canReschedule && (
          <div className="ml-auto">
            <RescheduleButton reservationId={resa.id} />
          </div>
        )}

        {resa.statut === "vol_effectue" && (
          <a
            href="https://g.page/r/fly-horizons/review"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-purple-200 bg-purple-50 text-xs font-semibold text-purple-700 hover:bg-purple-100 transition-colors ml-auto"
          >
            <Star size={11} /> Laisser un avis
          </a>
        )}
      </div>
    </div>
  );
}
