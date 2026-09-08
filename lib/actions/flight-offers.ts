"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { resend, EMAIL_FROM, EMAIL_REPLY_TO } from "@/lib/resend";
import { requireAdmin, requireSelfActivePilote } from "./auth-guards";
import { piloteLegalStatus } from "@/lib/pilote/legal";
import {
  flightOfferEmail,
  piloteAssignedClientEmail,
  piloteAssignedPiloteEmail,
} from "@/lib/email-templates";

// Bloc C · mise en jeu automatique d'un vol à tous les pilotes actifs et en
// règle (« premier arrivé »). Fenêtre de 48h, expiration par cron.

const OFFER_TTL_HOURS = 48;

const PILOTE_LEGAL_COLS =
  "id, nom, email, statut, licence_numero, licence_expiration, medical_expiration, conditions_accepted_at";

function siteUrl() {
  const raw = process.env.NEXT_PUBLIC_SITE_URL ?? "";
  return raw.startsWith("http://localhost") || raw.startsWith("http://127") ? raw : "https://fly-horizons.com";
}

function frDate(dateVol: string): string {
  return new Date(dateVol + "T12:00:00Z").toLocaleDateString("fr-BE", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function frDateTime(iso: string): string {
  return new Date(iso).toLocaleString("fr-BE", {
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });
}

async function logHistory(params: {
  reservation_id: string;
  action: string;
  new_value?: string | null;
  old_value?: string | null;
  note?: string;
  author?: string;
}) {
  try {
    await createAdminClient().from("reservation_history").insert({
      reservation_id: params.reservation_id,
      action: params.action,
      field: null,
      old_value: params.old_value ?? null,
      new_value: params.new_value ?? null,
      author: params.author ?? "admin",
      note: params.note ?? null,
    });
  } catch {
    // Log non-bloquant.
  }
}

/** Le pilote a-t-il déjà un vol non annulé sur ce créneau exact ? */
async function hasAgendaConflict(
  db: ReturnType<typeof createAdminClient>,
  piloteId: string,
  dateVol: string,
  heureVol: string | null,
  excludeReservationId: string,
): Promise<boolean> {
  if (!heureVol) return false;
  const { data } = await db
    .from("reservations")
    .select("id")
    .eq("pilote_id", piloteId)
    .eq("date_vol", dateVol)
    .eq("heure_vol", heureVol)
    .neq("statut", "annulee")
    .neq("id", excludeReservationId)
    .limit(1);
  return !!(data && data.length > 0);
}

export type OpenOfferInfo = { sentTo: number; expiresAt: string } | null;

/** État d'offre pour le drawer admin (bloc « Pilote »). */
export async function getOpenOffer(reservationId: string): Promise<OpenOfferInfo> {
  try {
    await requireAdmin();
    const { data } = await createAdminClient()
      .from("flight_offers")
      .select("sent_to, expires_at")
      .eq("reservation_id", reservationId)
      .eq("statut", "ouverte")
      .maybeSingle();
    return data ? { sentTo: data.sent_to ?? 0, expiresAt: data.expires_at } : null;
  } catch {
    return null;
  }
}

/** Romain met un vol en jeu : offre à tous les pilotes actifs, en règle, sans conflit d'agenda. */
export async function createOffer(reservationId: string) {
  try {
    await requireAdmin();
    const db = createAdminClient();

    const { data: resa } = await db
      .from("reservations")
      .select("id, date_vol, heure_vol, duree, passagers, type_resa, statut, pilote_id, voucher_code, paye")
      .eq("id", reservationId)
      .single();
    if (!resa) return { error: "Réservation introuvable" };
    if (resa.type_resa === "perso") return { error: "Les vols sur mesure ne sont pas concernés" };
    if (["annulee", "vol_effectue"].includes(resa.statut)) return { error: "Ce vol ne peut plus être mis en jeu" };
    if (resa.voucher_code || (resa.paye ?? 0) > 0) return { error: "Ce vol est couvert par un voucher ou déjà payé à Fly Horizons — il reste opéré par Romain" };
    if (resa.pilote_id) return { error: "Ce vol est déjà attribué — retirez le pilote avant de le proposer à tous" };

    const { data: existing } = await db
      .from("flight_offers")
      .select("id")
      .eq("reservation_id", reservationId)
      .eq("statut", "ouverte")
      .maybeSingle();
    if (existing) return { error: "Une offre est déjà en cours pour ce vol" };

    const { data: pilotes } = await db.from("pilotes").select(PILOTE_LEGAL_COLS).eq("statut", "actif").order("nom");
    const eligibles: Array<{ nom: string; email: string | null }> = [];
    for (const p of pilotes ?? []) {
      if (!piloteLegalStatus(p).ok) continue;
      if (await hasAgendaConflict(db, p.id, resa.date_vol, resa.heure_vol, reservationId)) continue;
      eligibles.push({ nom: p.nom, email: p.email });
    }

    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + OFFER_TTL_HOURS * 3600 * 1000).toISOString();

    const { error: insErr } = await db.from("flight_offers").insert({
      reservation_id: reservationId,
      statut: "ouverte",
      claim_token: token,
      sent_to: eligibles.length,
      expires_at: expiresAt,
    });
    if (insErr) return { error: insErr.message };

    await logHistory({
      reservation_id: reservationId,
      action: "offer_created",
      new_value: String(eligibles.length),
      note: `Vol proposé à ${eligibles.length} pilote${eligibles.length > 1 ? "s" : ""} (premier arrivé, 48h)`,
    });

    const dateStr = frDate(resa.date_vol);
    const expiresStr = frDateTime(expiresAt);
    const offreUrl = `${siteUrl()}/pilote/offre/${token}`;

    let emailError = false;
    for (const p of eligibles) {
      if (!p.email) continue;
      try {
        await resend.emails.send({
          from: EMAIL_FROM,
          to: [p.email],
          replyTo: EMAIL_REPLY_TO,
          subject: "Fly Horizons · Un vol est disponible",
          html: flightOfferEmail({
            piloteNom: p.nom,
            dateStr,
            heure: resa.heure_vol ? resa.heure_vol.slice(0, 5) : null,
            duree: resa.duree,
            passagers: resa.passagers,
            expiresStr,
            offreUrl,
          }),
        });
      } catch (e) {
        console.error("[createOffer] email pilote:", e);
        emailError = true;
      }
    }

    revalidatePath("/admin/vols");
    revalidatePath("/pilote");
    revalidatePath("/pilote/offres");
    return { success: true, sentTo: eligibles.length, emailError };
  } catch {
    return { error: "Erreur serveur" };
  }
}

/** Romain retire une offre en cours (revient à la gestion manuelle). */
export async function cancelOffer(reservationId: string) {
  try {
    await requireAdmin();
    const db = createAdminClient();

    const { data: cancelled } = await db
      .from("flight_offers")
      .update({ statut: "annulee" })
      .eq("reservation_id", reservationId)
      .eq("statut", "ouverte")
      .select("id")
      .maybeSingle();
    if (!cancelled) return { error: "Aucune offre en cours pour ce vol" };

    await logHistory({
      reservation_id: reservationId,
      action: "offer_cancelled",
      note: "Offre retirée",
    });

    revalidatePath("/admin/vols");
    revalidatePath("/pilote");
    revalidatePath("/pilote/offres");
    return { success: true };
  } catch {
    return { error: "Erreur serveur" };
  }
}

type OfferRow = {
  id: string;
  reservation_id: string;
  statut: string;
  expires_at: string;
};

async function loadOfferByToken(db: ReturnType<typeof createAdminClient>, token: string) {
  const { data } = await db
    .from("flight_offers")
    .select("id, reservation_id, statut, expires_at")
    .eq("claim_token", token)
    .maybeSingle();
  return (data as OfferRow | null) ?? null;
}

/** Le pilote prend le vol. UPDATE atomique sur statut='ouverte' → un seul gagnant. */
export async function claimOffer(token: string) {
  try {
    const { piloteId } = await requireSelfActivePilote();
    const db = createAdminClient();

    const { data: pilote } = await db.from("pilotes").select(PILOTE_LEGAL_COLS).eq("id", piloteId).single();
    if (!pilote) return { error: "Fiche pilote introuvable" };
    if (!piloteLegalStatus(pilote).ok) return { error: "Complétez votre profil avant de prendre un vol" };

    const offer = await loadOfferByToken(db, token);
    if (!offer) return { error: "Offre introuvable" };
    if (offer.statut === "pourvue") return { error: "Ce vol vient d'être pris par un autre pilote" };
    if (offer.statut === "annulee") return { error: "Cette offre a été retirée" };
    if (offer.statut === "expiree" || new Date(offer.expires_at) < new Date()) {
      await db.from("flight_offers").update({ statut: "expiree" }).eq("id", offer.id).eq("statut", "ouverte");
      return { error: "Cette offre a expiré" };
    }

    const { data: resa } = await db
      .from("reservations")
      .select("id, date_vol, heure_vol, duree, passagers, statut, pilote_id, voucher_code, paye, clients(prenom, nom, email)")
      .eq("id", offer.reservation_id)
      .single();
    if (!resa) return { error: "Réservation introuvable" };
    if (["annulee", "vol_effectue"].includes(resa.statut) || resa.pilote_id) {
      return { error: "Ce vol n'est plus disponible" };
    }
    if (resa.voucher_code || (resa.paye ?? 0) > 0) return { error: "Ce vol n'est plus disponible" };
    if (await hasAgendaConflict(db, piloteId, resa.date_vol, resa.heure_vol, resa.id)) {
      return { error: "Vous avez déjà un vol sur ce créneau, vous ne pouvez pas le prendre" };
    }

    // Claim atomique : le premier passe, les suivants récupèrent 0 ligne.
    const { data: won } = await db
      .from("flight_offers")
      .update({ statut: "pourvue", claimed_by: piloteId, claimed_at: new Date().toISOString() })
      .eq("id", offer.id)
      .eq("statut", "ouverte")
      .select("id")
      .maybeSingle();
    if (!won) return { error: "Ce vol vient d'être pris par un autre pilote" };

    await db
      .from("reservations")
      .update({ pilote_id: piloteId, pilote_assigned_at: new Date().toISOString() })
      .eq("id", resa.id);

    await logHistory({
      reservation_id: resa.id,
      action: "claim_offer",
      new_value: pilote.nom,
      note: `${pilote.nom} a pris ce vol via la mise en jeu`,
      author: `pilote:${pilote.nom}`,
    });

    const client = (Array.isArray(resa.clients) ? resa.clients[0] : resa.clients) as
      | { prenom: string | null; nom: string | null; email: string | null }
      | null;
    const dateStr = frDate(resa.date_vol);

    let emailError = false;
    try {
      if (client?.email) {
        await resend.emails.send({
          from: EMAIL_FROM,
          to: [client.email],
          replyTo: EMAIL_REPLY_TO,
          subject: "Fly Horizons · Votre pilote pour ce vol",
          html: piloteAssignedClientEmail({
            prenom: client.prenom ?? "",
            dateStr,
            duree: resa.duree,
            piloteNom: pilote.nom,
            piloteUrl: `${siteUrl()}/nos-pilotes/${pilote.id}`,
          }),
        });
      }
    } catch (e) {
      console.error("[claimOffer] email client:", e);
      emailError = true;
    }
    try {
      if (pilote.email) {
        await resend.emails.send({
          from: EMAIL_FROM,
          to: [pilote.email],
          replyTo: EMAIL_REPLY_TO,
          subject: "Fly Horizons · Vous avez pris ce vol",
          html: piloteAssignedPiloteEmail({
            piloteNom: pilote.nom,
            clientNom: `${client?.prenom ?? ""} ${client?.nom ?? ""}`.trim() || "Client",
            dateStr,
            heure: resa.heure_vol ? resa.heure_vol.slice(0, 5) : null,
            duree: resa.duree,
            passagers: resa.passagers,
            volsUrl: `${siteUrl()}/pilote/vols`,
          }),
        });
      }
    } catch (e) {
      console.error("[claimOffer] email pilote:", e);
      emailError = true;
    }

    revalidatePath("/admin/vols");
    revalidatePath("/pilote/vols");
    revalidatePath("/pilote/offres");
    revalidatePath("/pilote");
    return { success: true, dateStr, emailError };
  } catch {
    return { error: "Erreur serveur" };
  }
}

/** Le pilote passe son tour : trace le refus, l'offre disparaît de sa liste. */
export async function refuseOffer(token: string) {
  try {
    const { piloteId } = await requireSelfActivePilote();
    const db = createAdminClient();

    const offer = await loadOfferByToken(db, token);
    if (!offer) return { error: "Offre introuvable" };

    // Idempotent : la contrainte UNIQUE(offer_id, pilote_id) absorbe un double clic.
    await db.from("flight_offer_refusals").upsert(
      { offer_id: offer.id, pilote_id: piloteId },
      { onConflict: "offer_id,pilote_id", ignoreDuplicates: true },
    );

    revalidatePath("/pilote/offres");
    revalidatePath("/pilote");
    return { success: true };
  } catch {
    return { error: "Erreur serveur" };
  }
}
