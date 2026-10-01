import Link from "next/link";
import { CalendarDays, Clock, CreditCard, MapPin, CheckCircle, ChevronRight, Download, AlertCircle, Star, Ticket, Send } from "lucide-react";
import { RescheduleButton } from "@/components/account/RescheduleButton";
import { WeatherWidget } from "@/components/account/WeatherWidget";
import { formatDuration } from "@/lib/vouchers";

// Nouvelle DA (28/09, maquette validée) : sans boîte, une liste séparée par des
// filets. Chaque bouton d'action garde un texte à côté de son icône (retour de
// Romain sur la v1 icônes seules).

const RESA_STATUS: Record<string, { label: string; color: string }> = {
  demande_recue:    { label: "Demande envoyée",  color: "text-yellow-700 bg-yellow-50 border-yellow-200" },
  payment_pending:  { label: "Paiement requis",  color: "text-orange-700 bg-orange-50 border-orange-200" },
  en_attente:       { label: "En attente",       color: "text-yellow-700 bg-yellow-50 border-yellow-200" },
  date_confirmee:   { label: "Date confirmée",   color: "text-foreground bg-secondary border-border" },
  heure_confirmee:  { label: "Vol confirmé",     color: "text-green-700 bg-green-50 border-green-200" },
  vol_effectue:     { label: "Vol effectué",     color: "text-purple-700 bg-purple-50 border-purple-200" },
  annulee:          { label: "Annulée",          color: "text-red-700 bg-red-50 border-red-200" },
  en_attente_perso: { label: "En cours",         color: "text-yellow-700 bg-yellow-50 border-yellow-200" },
  acompte_recu:     { label: "Provision reçue",  color: "text-emerald-700 bg-emerald-50 border-emerald-200" },
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
  pilote_nom?: string | null;
  route?: string | null;
  latestProposalToken?: string | null;
  latestProposalStatus?: string | null;
}

function formatHeure(h: string | null | undefined) {
  if (!h) return null;
  const [hh, mm] = h.split(":");
  return `${hh}h${mm}`;
}

const BTN = "inline-flex items-center gap-1.5 px-3 py-2 rounded-[9px] border border-border text-xs font-semibold text-foreground bg-white hover:border-foreground transition-colors";
const BTN_PRIMARY = "inline-flex items-center gap-1.5 px-3.5 py-2 rounded-[9px] bg-[#0b2238] text-white text-xs font-bold hover:bg-[#16334f] transition-colors";
const BTN_GOLD = "inline-flex items-center gap-1.5 px-3.5 py-2 rounded-[9px] bg-primary text-[#0b2238] text-xs font-bold hover:bg-[#e6a800] transition-colors";

export function ReservationsSection({ reservations }: { reservations: Reservation[] }) {
  if (reservations.length === 0) {
    return (
      <div className="py-10 text-center">
        <div className="w-11 h-11 rounded-full bg-secondary border border-border flex items-center justify-center mx-auto mb-3">
          <CalendarDays size={18} className="text-muted-foreground" />
        </div>
        <p className="text-sm font-semibold text-foreground">Aucune réservation</p>
        <p className="text-xs text-muted-foreground mt-1">Vos vols réservés apparaîtront ici.</p>
        <Link href="/nos-offres" className="inline-flex items-center gap-1 mt-4 text-xs font-semibold text-foreground hover:text-primary transition-colors">
          Voir les vols disponibles <ChevronRight size={12} />
        </Link>
      </div>
    );
  }

  const upcoming = reservations.filter((r) => new Date(r.date_vol + "T23:59:59") >= new Date());
  const past     = reservations.filter((r) => new Date(r.date_vol + "T23:59:59") < new Date());

  return (
    <div>
      {upcoming.length > 0 && (
        <div>
          <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-[1.5px] mb-1">À venir</p>
          {upcoming.map((r, idx) => <ResaRow key={r.id} resa={r} showWeather={idx === 0} />)}
        </div>
      )}
      {past.length > 0 && (
        <div className={upcoming.length > 0 ? "mt-2" : ""}>
          {upcoming.length > 0 && (
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-[1.5px] mb-1 mt-5">Passées</p>
          )}
          {past.map((r) => <ResaRow key={r.id} resa={r} showWeather={false} />)}
        </div>
      )}
    </div>
  );
}

function ResaRow({ resa, showWeather = false }: { resa: Reservation; showWeather?: boolean }) {
  const status     = RESA_STATUS[resa.statut] ?? RESA_STATUS.en_attente;
  const isPerso    = resa.type_resa === "perso";
  const isPaid     = !["en_attente", "payment_pending", "en_attente_perso", "demande_recue"].includes(resa.statut);
  const hasPayLink = resa.payment_token && !isPaid;
  const payUrl     = isPerso
    ? `/api/vol-sur-mesure/pay/${resa.payment_token}`
    : `/api/reservation/pay/${resa.payment_token}`;

  const dateFormatted = new Date(resa.date_vol + "T12:00:00Z").toLocaleDateString("fr-BE", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });

  const heure = formatHeure(resa.heure_vol);

  const canReschedule =
    !["annulee", "vol_effectue", "payment_pending", "demande_recue"].includes(resa.statut) &&
    (new Date(resa.date_vol + "T23:59:59Z").getTime() - Date.now()) > 48 * 60 * 60 * 1000;

  const carteHref = resa.latestProposalToken ? `/vol/proposition/${resa.latestProposalToken}` : null;

  return (
    <div className="py-5 border-b border-border last:border-b-0">

      <div className="flex items-center gap-2 flex-wrap mb-2">
        <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border ${status.color}`}>
          {status.label}
        </span>
        {isPerso && (
          <span className="text-[11px] text-muted-foreground bg-secondary px-2.5 py-1 rounded-full border border-border">
            Sur mesure
          </span>
        )}
        {isPaid && resa.acompte != null && resa.acompte > 0 && (
          <span className="ml-auto flex items-center gap-1 text-[12px] text-green-700 font-medium">
            <CheckCircle size={12} className="shrink-0" /> Provision payée · {resa.acompte} €
          </span>
        )}
      </div>

      <p className="text-[15px] font-bold text-foreground capitalize">{dateFormatted}</p>
      <p className="text-[13px] text-muted-foreground mt-1 flex items-center gap-3 flex-wrap">
        {heure && <span className="flex items-center gap-1"><Clock size={12} className="opacity-60" />{heure}</span>}
        <span>{formatDuration(resa.duree)} de vol</span>
        {resa.passagers > 1 && <span>{resa.passagers} passagers</span>}
        {resa.pilote_nom && <span className="font-semibold text-foreground">Avec {resa.pilote_nom}</span>}
      </p>

      {hasPayLink && (
        <Link href={payUrl} className={`${BTN_GOLD} mt-3 w-full sm:w-auto justify-center`}>
          <CreditCard size={13} />
          {isPerso ? "Régler la provision" : "Finaliser le paiement"}
          {resa.acompte != null ? ` · ${resa.acompte} €` : ""}
        </Link>
      )}

      {resa.statut === "payment_pending" && !resa.payment_token && (
        !isPerso ? (
          <a href={`/api/reservation/resume/${resa.id}`} className={`${BTN_GOLD} mt-3`}>
            <CreditCard size={13} /> Finaliser le paiement
          </a>
        ) : (
          <div className="mt-3 flex items-start gap-2.5 p-3 rounded-[10px] bg-orange-50 border border-orange-200">
            <AlertCircle size={14} className="text-orange-500 shrink-0 mt-0.5" />
            <p className="text-xs text-orange-700">
              <span className="font-semibold">Lien de paiement en préparation.</span> Vous le recevrez par email sous peu.
              Une question ? <Link href="/contact" className="underline font-semibold">Nous contacter</Link>
            </p>
          </div>
        )
      )}

      {showWeather && <div className="mt-3"><WeatherWidget date={resa.date_vol} bordered={false} /></div>}

      <div className="mt-4 flex items-center gap-2 flex-wrap">
        <Link href={`/account/reservations/${resa.id}`} className={BTN_PRIMARY}>
          <Send size={13} /> Suivre la réservation
        </Link>

        {carteHref && (
          <Link href={carteHref} className={BTN}><MapPin size={13} /> Carte</Link>
        )}
        {["heure_confirmee", "vol_effectue"].includes(resa.statut) && (
          <a href={`/api/boarding-pass/${resa.id}`} className={BTN}><Ticket size={13} /> Boarding pass</a>
        )}
        {resa.acompte != null && resa.acompte > 0 && (
          <a href={`/api/invoice/reservation/${resa.id}`} download className={BTN}><Download size={13} /> Reçu</a>
        )}

        {canReschedule && <div className="ml-auto"><RescheduleButton reservationId={resa.id} /></div>}

        {resa.statut === "vol_effectue" && (
          <a
            href="https://g.page/r/fly-horizons/review"
            target="_blank"
            rel="noopener noreferrer"
            className={`${BTN_GOLD} ml-auto`}
          >
            <Star size={13} /> Laisser un avis
          </a>
        )}
      </div>
    </div>
  );
}
