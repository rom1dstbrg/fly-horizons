import Link from "next/link";
import { AlertCircle, Plane, CheckCircle2 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { piloteLegalStatus } from "@/lib/pilote/legal";
import { OffreClaimClient } from "@/components/pilote/OffreClaimClient";

export const metadata = { title: "Offre de vol — Espace pilote" };

const PILOTE_LEGAL_COLS =
  "id, licence_numero, licence_expiration, medical_expiration, conditions_accepted_at";

function frDate(dateVol: string): string {
  return new Date(dateVol + "T12:00:00Z").toLocaleDateString("fr-BE", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function Notice({ tone, children }: { tone: "info" | "warn" | "ok"; children: React.ReactNode }) {
  const cls =
    tone === "warn"
      ? "bg-red-50 border-red-200 text-red-800"
      : tone === "ok"
        ? "bg-emerald-50 border-emerald-200 text-emerald-800"
        : "bg-[#f5f8ff] border-border text-foreground";
  const Icon = tone === "ok" ? CheckCircle2 : AlertCircle;
  return (
    <div className={`rounded-xl border p-4 flex items-start gap-3 ${cls}`}>
      <Icon size={18} className="shrink-0 mt-0.5" />
      <div className="text-sm leading-relaxed">{children}</div>
    </div>
  );
}

export default async function OffrePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const admin = createAdminClient();

  const { data: pilote } = await admin
    .from("pilotes")
    .select(PILOTE_LEGAL_COLS)
    .eq("user_id", user!.id)
    .single();

  const { data: offer } = await admin
    .from("flight_offers")
    .select(
      "id, statut, expires_at, claimed_by, reservation_id, reservations(id, date_vol, heure_vol, duree, passagers, statut, pilote_id)",
    )
    .eq("claim_token", token)
    .maybeSingle();

  const resa = offer
    ? ((Array.isArray(offer.reservations) ? offer.reservations[0] : offer.reservations) as
        | {
            id: string;
            date_vol: string;
            heure_vol: string | null;
            duree: number;
            passagers: number;
            statut: string;
            pilote_id: string | null;
          }
        | null)
    : null;

  const mine = !!pilote && !!resa && (resa.pilote_id === pilote.id || offer?.claimed_by === pilote.id);

  let blocked: React.ReactNode = null;

  if (!offer || !resa) {
    blocked = <Notice tone="warn">Lien invalide ou offre introuvable.</Notice>;
  } else if (mine) {
    blocked = (
      <Notice tone="ok">
        Ce vol est à vous.{" "}
        <Link href="/pilote/vols" className="font-semibold underline">
          Voir mes vols
        </Link>
      </Notice>
    );
  } else if (offer.statut === "pourvue") {
    blocked = <Notice tone="info">Ce vol a déjà été pris par un autre pilote.</Notice>;
  } else if (offer.statut === "annulee") {
    blocked = <Notice tone="info">Cette offre a été retirée par Fly Horizons.</Notice>;
  } else if (offer.statut === "expiree" || new Date(offer.expires_at) < new Date()) {
    blocked = <Notice tone="info">Cette offre a expiré. Contactez Romain si vous êtes intéressé.</Notice>;
  } else if (["annulee", "vol_effectue"].includes(resa.statut) || resa.pilote_id) {
    blocked = <Notice tone="info">Ce vol n&apos;est plus disponible.</Notice>;
  } else if (pilote && !piloteLegalStatus(pilote).ok) {
    blocked = (
      <Notice tone="warn">
        Votre profil pilote est incomplet ou périmé, vous ne pouvez pas prendre de vol.{" "}
        <Link href="/pilote/profil" className="font-semibold underline">
          Compléter mon profil
        </Link>
      </Notice>
    );
  } else if (pilote) {
    const { data: clash } = resa.heure_vol
      ? await admin
          .from("reservations")
          .select("id")
          .eq("pilote_id", pilote.id)
          .eq("date_vol", resa.date_vol)
          .eq("heure_vol", resa.heure_vol)
          .neq("statut", "annulee")
          .neq("id", resa.id)
          .limit(1)
      : { data: null };
    if (clash && clash.length > 0) {
      blocked = (
        <Notice tone="info">
          Vous avez déjà un vol sur ce créneau, vous ne pouvez pas prendre celui-ci.
        </Notice>
      );
    } else {
      const { data: refused } = await admin
        .from("flight_offer_refusals")
        .select("id")
        .eq("offer_id", offer.id)
        .eq("pilote_id", pilote.id)
        .maybeSingle();
      if (refused) {
        blocked = <Notice tone="info">Vous avez décliné cette offre.</Notice>;
      }
    }
  }

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-foreground flex items-center gap-2">
          <Plane size={20} className="text-primary" />
          Offre de vol
        </h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          Premier arrivé, premier servi. Prenez-le ou passez votre tour.
        </p>
      </div>

      {resa && (
        <div className="card-premium p-4 sm:p-5">
          <dl className="grid grid-cols-3 gap-y-3 text-sm">
            <dt className="text-muted-foreground">Date</dt>
            <dd className="col-span-2 font-semibold text-foreground capitalize">
              {frDate(resa.date_vol)}
              {resa.heure_vol ? ` · ${resa.heure_vol.slice(0, 5)}` : ""}
            </dd>
            <dt className="text-muted-foreground">Durée</dt>
            <dd className="col-span-2 font-semibold text-foreground">{resa.duree} min</dd>
            <dt className="text-muted-foreground">Passagers</dt>
            <dd className="col-span-2 font-semibold text-foreground">{resa.passagers}</dd>
          </dl>
        </div>
      )}

      {blocked ?? (
        <OffreClaimClient token={token} dateStr={resa ? frDate(resa.date_vol) : ""} />
      )}

      <Link href="/pilote/offres" className="inline-block text-sm text-muted-foreground hover:text-foreground">
        ← Toutes les offres
      </Link>
    </div>
  );
}
