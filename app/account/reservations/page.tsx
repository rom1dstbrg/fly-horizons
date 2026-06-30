import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { CalendarDays, Clock, CreditCard, MapPin, CheckCircle, ChevronRight } from "lucide-react";
import { RescheduleButton } from "@/components/account/RescheduleButton";
import { formatDuration } from "@/lib/vouchers";

export const metadata: Metadata = { title: "Mes réservations — Fly Horizons" };

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

function formatHeure(h: string | null | undefined) {
  if (!h) return "En attente";
  const [hh, mm] = h.split(":");
  return `${hh}h${mm}`;
}

export default async function ReservationsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const adminSupabase = createAdminClient();

  const { data: clients } = await adminSupabase
    .from("clients")
    .select("id")
    .eq("email", user.email!.toLowerCase());

  const clientIds = (clients ?? []).map((c) => c.id);

  if (clientIds.length === 0) {
    return <Empty />;
  }

  const { data: resas } = await adminSupabase
    .from("reservations")
    .select("id, date_vol, heure_vol, duree, passagers, statut, type_resa, payment_token, acompte, distance_km, created_at, route, route_status, route_token, waypoints")
    .in("client_id", clientIds)
    .order("date_vol", { ascending: false });

  const rawResas = resas ?? [];

  if (rawResas.length === 0) {
    return <Empty />;
  }

  // Latest proposal per reservation
  const { data: proposals } = await adminSupabase
    .from("route_proposals")
    .select("token, status, reservation_id")
    .in("reservation_id", rawResas.map((r) => r.id))
    .order("created_at", { ascending: false });

  const latestProposal: Record<string, { token: string; status: string }> = {};
  for (const p of proposals ?? []) {
    if (!latestProposal[p.reservation_id]) {
      latestProposal[p.reservation_id] = { token: p.token, status: p.status };
    }
  }

  const upcoming = rawResas.filter((r) => new Date(r.date_vol + "T23:59:59") >= new Date());
  const past     = rawResas.filter((r) => new Date(r.date_vol + "T23:59:59") < new Date());

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Mes réservations</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {rawResas.length} réservation{rawResas.length !== 1 ? "s" : ""}
          {upcoming.length > 0 && ` · ${upcoming.length} à venir`}
        </p>
      </div>

      {upcoming.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">À venir</p>
          {upcoming.map((resa) => (
            <ResaCard
              key={resa.id}
              resa={resa}
              proposal={latestProposal[resa.id] ?? null}
              upcoming
            />
          ))}
        </div>
      )}

      {past.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            {upcoming.length > 0 ? "Passées" : "Réservations"}
          </p>
          {past.map((resa) => (
            <ResaCard
              key={resa.id}
              resa={resa}
              proposal={latestProposal[resa.id] ?? null}
              upcoming={false}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ResaCard({
  resa,
  proposal,
  upcoming,
}: {
  resa: {
    id: string;
    date_vol: string;
    heure_vol: string | null;
    duree: number;
    passagers: number;
    statut: string;
    type_resa: string;
    payment_token: string | null;
    acompte: number | null;
    route?: string | null;
    route_status?: string | null;
    route_token?: string | null;
    waypoints?: Array<{ lat: number; lng: number; nom: string }> | null;
  };
  proposal: { token: string; status: string } | null;
  upcoming: boolean;
}) {
  const status    = RESA_STATUS[resa.statut] ?? RESA_STATUS.en_attente;
  const isPerso   = resa.type_resa === "perso";
  const isPaid    = !["en_attente", "payment_pending", "en_attente_perso"].includes(resa.statut);
  const hasPayLink = resa.payment_token && !isPaid;
  const payUrl    = isPerso
    ? `/api/vol-sur-mesure/pay/${resa.payment_token}`
    : `/api/reservation/pay/${resa.payment_token}`;

  const dateFormatted = new Date(resa.date_vol + "T12:00:00Z").toLocaleDateString("fr-BE", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });

  const canReschedule =
    !["annulee", "vol_effectue", "payment_pending"].includes(resa.statut) &&
    (new Date(resa.date_vol + "T23:59:59Z").getTime() - Date.now()) > 48 * 60 * 60 * 1000;

  const carteHref = proposal?.token
    ? `/vol/proposition/${proposal.token}`
    : isPerso && (resa.waypoints as unknown[])?.length
    ? `/account/reservations/${resa.id}/carte`
    : null;

  return (
    <div className={`card-premium p-5 ${upcoming ? "border-l-[3px] border-l-navy" : ""}`}>
      <div className="flex items-start justify-between gap-4 mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1.5">
            <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${status.color}`}>
              {status.label}
            </span>
            {upcoming && (
              <span className="text-[11px] font-medium text-foreground bg-secondary px-2 py-0.5 rounded-full">
                À venir
              </span>
            )}
            {isPerso && (
              <span className="text-[11px] text-muted-foreground bg-secondary px-2 py-0.5 rounded-full border border-border">
                Sur mesure
              </span>
            )}
          </div>
          <p className="text-sm font-semibold text-foreground capitalize">{dateFormatted}</p>
          {resa.heure_vol && (
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              <Clock size={11} className="opacity-60" />
              {formatHeure(resa.heure_vol)}
            </p>
          )}
        </div>
        <div className="text-right shrink-0">
          <p className="text-sm font-bold text-foreground">{formatDuration(resa.duree)}</p>
          <p className="text-xs text-muted-foreground">de vol</p>
          {resa.passagers > 1 && (
            <p className="text-xs text-muted-foreground">{resa.passagers} pass.</p>
          )}
        </div>
      </div>

      {/* Route */}
      {resa.route && (
        <div className="mt-3 pt-3 border-t border-border space-y-2">
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
              Valider ou modifier
            </Link>
          )}
          {resa.route_status === "modification_requested" && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-secondary text-xs font-medium text-muted-foreground">
              Modification en cours de traitement
            </span>
          )}
        </div>
      )}

      {/* Payment link */}
      {hasPayLink && (
        <div className="mt-3 pt-3 border-t border-border">
          <Link
            href={payUrl}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-bold hover:brightness-105 transition-all"
          >
            <CreditCard size={12} />
            {isPerso ? "Régler la provision" : "Finaliser le paiement"}
            {resa.acompte != null ? ` · ${resa.acompte} €` : ""}
          </Link>
        </div>
      )}

      {/* Paid */}
      {isPaid && resa.acompte != null && (
        <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-border text-xs text-green-600 font-medium">
          <CheckCircle size={12} className="shrink-0" />
          Provision payée · {resa.acompte} €
        </div>
      )}

      {/* Footer actions */}
      <div className="flex items-center gap-2 flex-wrap mt-3 pt-3 border-t border-border">
        <Link
          href={`/account/reservations/${resa.id}`}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs font-semibold text-foreground hover:bg-secondary transition-colors"
        >
          Suivre la réservation
        </Link>
        {carteHref && (
          <Link
            href={carteHref}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs font-medium text-foreground hover:bg-secondary transition-colors"
          >
            <MapPin size={11} />
            Voir la carte
          </Link>
        )}
        {canReschedule && <RescheduleButton reservationId={resa.id} />}
      </div>
    </div>
  );
}

function Empty() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Mes réservations</h1>
        <p className="text-sm text-muted-foreground mt-0.5">0 réservation</p>
      </div>
      <div className="card-premium p-10 text-center">
        <div className="w-12 h-12 rounded-full bg-secondary border border-border flex items-center justify-center mx-auto mb-3">
          <CalendarDays size={20} className="text-muted-foreground" />
        </div>
        <p className="text-sm font-medium text-foreground">Aucune réservation</p>
        <p className="text-xs text-muted-foreground mt-1">Vos vols réservés apparaîtront ici.</p>
        <Link
          href="/reservation"
          className="inline-flex items-center gap-1 mt-4 text-xs text-foreground font-semibold hover:text-primary transition-colors"
        >
          Réserver un vol <ChevronRight size={12} />
        </Link>
      </div>
    </div>
  );
}
