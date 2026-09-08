"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { resend, EMAIL_FROM, EMAIL_REPLY_TO } from "@/lib/resend";
import { requireAdmin, requireAdminOrOwningPilote } from "./auth-guards";
import { piloteLegalStatus } from "@/lib/pilote/legal";
import { piloteAssignedClientEmail, piloteAssignedPiloteEmail, piloteReleasedFlightAdminEmail, customEmail } from "@/lib/email-templates";

const ADMIN_EMAIL = "info@fly-horizons.com";

// Bloc B · assignation manuelle d'un vol standard à un pilote.
// Seul l'admin (Romain) assigne. Un pilote sur mesure (type_resa = 'perso')
// n'est pas concerné (questionnaire Q25).

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

async function logHistory(params: {
  reservation_id: string;
  action: string;
  old_value?: string | null;
  new_value?: string | null;
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

const PILOTE_LEGAL_COLS = "id, nom, email, statut, licence_numero, licence_expiration, medical_expiration, conditions_accepted_at";

/** Ferme toute offre « premier arrivé » encore ouverte sur ce vol (attribution manuelle prioritaire). */
async function closeOpenOffer(db: ReturnType<typeof createAdminClient>, reservationId: string) {
  try {
    await db.from("flight_offers").update({ statut: "annulee" }).eq("reservation_id", reservationId).eq("statut", "ouverte");
  } catch {
    // non-bloquant
  }
}

export type AssignablePilote = { id: string; nom: string; legalOk: boolean };

/** Pilotes actifs, avec leur statut légal, pour le sélecteur d'assignation. */
export async function listAssignablePilotes(): Promise<AssignablePilote[]> {
  try {
    await requireAdmin();
    const { data } = await createAdminClient()
      .from("pilotes")
      .select(PILOTE_LEGAL_COLS)
      .eq("statut", "actif")
      .order("nom");
    return (data ?? []).map((p) => ({ id: p.id, nom: p.nom, legalOk: piloteLegalStatus(p).ok }));
  } catch {
    return [];
  }
}

export async function assignPilote(reservationId: string, piloteId: string) {
  try {
    await requireAdmin();
    const db = createAdminClient();

    const { data: resa } = await db
      .from("reservations")
      .select("id, date_vol, heure_vol, duree, passagers, type_resa, statut, pilote_id, voucher_code, paye, clients(prenom, nom, email)")
      .eq("id", reservationId)
      .single();
    if (!resa) return { error: "Réservation introuvable" };
    if (resa.type_resa === "perso") return { error: "Les vols sur mesure ne sont pas attribuables à un pilote" };
    if (["annulee", "vol_effectue"].includes(resa.statut)) return { error: "Ce vol ne peut plus être attribué" };
    if (resa.voucher_code || (resa.paye ?? 0) > 0) return { error: "Ce vol est couvert par un voucher ou déjà payé à Fly Horizons — il reste opéré par Romain, pas attribuable à un pilote tiers" };
    if (resa.pilote_id === piloteId) return { error: "Ce vol est déjà attribué à ce pilote" };

    // Réassignation = le vol avait déjà un pilote. Dans ce cas, pas d'email
    // automatique au client (plan §5.4) — Romain le prévient lui-même via le
    // bouton « Prévenir le client du changement de pilote » (texte éditable).
    const isReassignment = !!resa.pilote_id;

    const { data: pilote } = await db.from("pilotes").select(PILOTE_LEGAL_COLS).eq("id", piloteId).single();
    if (!pilote) return { error: "Pilote introuvable" };
    if (pilote.statut !== "actif") return { error: "Ce pilote est désactivé" };
    if (!piloteLegalStatus(pilote).ok) return { error: "Ce pilote n'est pas en règle (profil incomplet ou périmé)" };

    // Conflit d'agenda : même pilote, même date, même heure, sur un autre vol non annulé.
    if (resa.heure_vol) {
      const { data: clash } = await db
        .from("reservations")
        .select("id")
        .eq("pilote_id", piloteId)
        .eq("date_vol", resa.date_vol)
        .eq("heure_vol", resa.heure_vol)
        .neq("statut", "annulee")
        .neq("id", reservationId)
        .limit(1);
      if (clash && clash.length > 0) return { error: "Ce pilote a déjà un vol sur ce créneau" };
    }

    const { error: updErr } = await db
      .from("reservations")
      .update({ pilote_id: piloteId, pilote_assigned_at: new Date().toISOString() })
      .eq("id", reservationId);
    if (updErr) return { error: updErr.message };
    await closeOpenOffer(db, reservationId);

    await logHistory({
      reservation_id: reservationId,
      action: isReassignment ? "reassign_pilote" : "assign_pilote",
      old_value: resa.pilote_id ?? null,
      new_value: pilote.nom,
      note: isReassignment ? `Vol réattribué à ${pilote.nom}` : `Vol attribué à ${pilote.nom}`,
    });

    const client = (Array.isArray(resa.clients) ? resa.clients[0] : resa.clients) as
      | { prenom: string | null; nom: string | null; email: string | null }
      | null;
    const dateStr = frDate(resa.date_vol);

    let emailError = false;
    // Email pilote
    try {
      if (pilote.email) {
        await resend.emails.send({
          from: EMAIL_FROM,
          to: [pilote.email],
          replyTo: EMAIL_REPLY_TO,
          subject: "Fly Horizons · Un vol vous a été attribué",
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
      console.error("[assignPilote] email pilote:", e);
      emailError = true;
    }
    // Email client immédiat — seulement à la première attribution. En cas de
    // réassignation, Romain prévient le client lui-même (bouton dédié).
    if (!isReassignment) {
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
        console.error("[assignPilote] email client:", e);
        emailError = true;
      }
    }

    revalidatePath("/admin/vols");
    revalidatePath("/pilote/vols");
    revalidatePath("/pilote");
    return { success: true, piloteNom: pilote.nom, emailError, reassigned: isReassignment };
  } catch {
    return { error: "Erreur serveur" };
  }
}

/**
 * Réassignation d'un vol déjà attribué à un autre pilote, en un seul geste :
 * met à jour la fiche, prévient le nouveau pilote, et envoie au client l'email
 * de changement de pilote rédigé/édité par Romain dans le popup (plan §5.4 :
 * pas d'email automatique, Romain contrôle le message).
 */
export async function reassignPilote(
  reservationId: string,
  piloteId: string,
  clientEmail: { subject: string; body: string },
) {
  try {
    await requireAdmin();
    const db = createAdminClient();

    const { data: resa } = await db
      .from("reservations")
      .select("id, date_vol, heure_vol, duree, passagers, type_resa, statut, pilote_id, voucher_code, paye, clients(prenom, nom, email)")
      .eq("id", reservationId)
      .single();
    if (!resa) return { error: "Réservation introuvable" };
    if (resa.type_resa === "perso") return { error: "Les vols sur mesure ne sont pas attribuables à un pilote" };
    if (["annulee", "vol_effectue"].includes(resa.statut)) return { error: "Ce vol ne peut plus être attribué" };
    if (resa.voucher_code || (resa.paye ?? 0) > 0) return { error: "Ce vol est couvert par un voucher ou déjà payé à Fly Horizons — il reste opéré par Romain" };
    if (!resa.pilote_id) return { error: "Ce vol n'a pas encore de pilote — utilisez « Assigner »" };
    if (resa.pilote_id === piloteId) return { error: "Ce vol est déjà attribué à ce pilote" };

    const { data: pilote } = await db.from("pilotes").select(PILOTE_LEGAL_COLS).eq("id", piloteId).single();
    if (!pilote) return { error: "Pilote introuvable" };
    if (pilote.statut !== "actif") return { error: "Ce pilote est désactivé" };
    if (!piloteLegalStatus(pilote).ok) return { error: "Ce pilote n'est pas en règle (profil incomplet ou périmé)" };

    if (resa.heure_vol) {
      const { data: clash } = await db
        .from("reservations")
        .select("id")
        .eq("pilote_id", piloteId)
        .eq("date_vol", resa.date_vol)
        .eq("heure_vol", resa.heure_vol)
        .neq("statut", "annulee")
        .neq("id", reservationId)
        .limit(1);
      if (clash && clash.length > 0) return { error: "Ce pilote a déjà un vol sur ce créneau" };
    }

    const { error: updErr } = await db
      .from("reservations")
      .update({ pilote_id: piloteId, pilote_assigned_at: new Date().toISOString() })
      .eq("id", reservationId);
    if (updErr) return { error: updErr.message };
    await closeOpenOffer(db, reservationId);

    await logHistory({
      reservation_id: reservationId,
      action: "reassign_pilote",
      old_value: resa.pilote_id,
      new_value: pilote.nom,
      note: `Vol réattribué à ${pilote.nom}`,
    });

    const client = (Array.isArray(resa.clients) ? resa.clients[0] : resa.clients) as
      | { prenom: string | null; nom: string | null; email: string | null }
      | null;
    const dateStr = frDate(resa.date_vol);

    let emailError = false;
    // Nouveau pilote
    try {
      if (pilote.email) {
        await resend.emails.send({
          from: EMAIL_FROM,
          to: [pilote.email],
          replyTo: EMAIL_REPLY_TO,
          subject: "Fly Horizons · Un vol vous a été attribué",
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
      console.error("[reassignPilote] email pilote:", e);
      emailError = true;
    }

    // Client — message de changement de pilote, édité par Romain.
    try {
      if (client?.email && clientEmail.subject.trim() && clientEmail.body.trim()) {
        await resend.emails.send({
          from: EMAIL_FROM,
          to: [client.email],
          replyTo: EMAIL_REPLY_TO,
          subject: clientEmail.subject,
          html: customEmail({ subject: clientEmail.subject, body: clientEmail.body }),
        });
      }
    } catch (e) {
      console.error("[reassignPilote] email client:", e);
      emailError = true;
    }

    revalidatePath("/admin/vols");
    revalidatePath("/pilote/vols");
    revalidatePath("/pilote");
    return { success: true, piloteNom: pilote.nom, emailError };
  } catch {
    return { error: "Erreur serveur" };
  }
}

/**
 * Le pilote « rend » un vol qui lui était attribué. Autorisé jusqu'à J-3 ;
 * au-delà il doit appeler Romain (garde-fou anti-abus du questionnaire).
 * Le vol redevient une demande à réassigner et Romain est notifié.
 */
export async function releaseAssignedFlight(reservationId: string) {
  try {
    const actor = await requireAdminOrOwningPilote(reservationId);
    const db = createAdminClient();

    const { data: resa } = await db
      .from("reservations")
      .select("id, date_vol, heure_vol, duree, statut, type_resa, pilote_id, clients(prenom, nom)")
      .eq("id", reservationId)
      .single();
    if (!resa) return { error: "Réservation introuvable" };
    if (!resa.pilote_id) return { error: "Ce vol n'est attribué à personne" };
    if (resa.type_resa === "annonce_pilote") return { error: "Ce vol vient de votre annonce, il ne peut pas être rendu ici" };
    if (["annulee", "vol_effectue"].includes(resa.statut)) return { error: "Ce vol est clôturé" };

    // J-3 : autorisé si le vol est à au moins 3 jours. Au-delà, il faut appeler Romain.
    const j3 = new Date();
    j3.setHours(0, 0, 0, 0);
    j3.setDate(j3.getDate() + 3);
    if (resa.date_vol < j3.toISOString().slice(0, 10)) {
      return { error: "Trop tard pour rendre ce vol en ligne (moins de 3 jours). Appelez Romain." };
    }

    const { data: pilote } = await db.from("pilotes").select("nom").eq("id", resa.pilote_id).single();
    const piloteNom = pilote?.nom ?? (actor.role === "pilote" ? actor.piloteNom : "Un pilote");

    const { error: updErr } = await db
      .from("reservations")
      .update({ pilote_id: null, pilote_assigned_at: null })
      .eq("id", reservationId);
    if (updErr) return { error: updErr.message };

    await logHistory({
      reservation_id: reservationId,
      action: "release_pilote",
      old_value: piloteNom,
      new_value: null,
      note: `${piloteNom} a rendu ce vol, à réassigner`,
      author: actor.role === "pilote" ? `pilote:${actor.piloteNom}` : "admin",
    });

    const client = (Array.isArray(resa.clients) ? resa.clients[0] : resa.clients) as
      | { prenom: string | null; nom: string | null }
      | null;

    let emailError = false;
    try {
      await resend.emails.send({
        from: EMAIL_FROM,
        to: [ADMIN_EMAIL],
        replyTo: EMAIL_REPLY_TO,
        subject: "Fly Horizons · Un pilote a rendu un vol",
        html: piloteReleasedFlightAdminEmail({
          piloteNom,
          clientNom: `${client?.prenom ?? ""} ${client?.nom ?? ""}`.trim() || "Client",
          dateStr: frDate(resa.date_vol),
          heure: resa.heure_vol ? resa.heure_vol.slice(0, 5) : null,
          volsUrl: `${siteUrl()}/admin/vols`,
        }),
      });
    } catch (e) {
      console.error("[releaseAssignedFlight] email admin:", e);
      emailError = true;
    }

    revalidatePath("/admin/vols");
    revalidatePath("/pilote/vols");
    revalidatePath("/pilote");
    return { success: true, emailError };
  } catch {
    return { error: "Erreur serveur" };
  }
}

export async function unassignPilote(reservationId: string) {
  try {
    await requireAdmin();
    const db = createAdminClient();

    const { data: resa } = await db
      .from("reservations")
      .select("id, pilote_id, pilotes(nom)")
      .eq("id", reservationId)
      .single();
    if (!resa) return { error: "Réservation introuvable" };
    if (!resa.pilote_id) return { success: true };

    const former = (Array.isArray(resa.pilotes) ? resa.pilotes[0] : resa.pilotes) as { nom: string } | null;

    const { error: updErr } = await db
      .from("reservations")
      .update({ pilote_id: null, pilote_assigned_at: null })
      .eq("id", reservationId);
    if (updErr) return { error: updErr.message };

    await logHistory({
      reservation_id: reservationId,
      action: "unassign_pilote",
      old_value: former?.nom ?? resa.pilote_id,
      new_value: null,
      note: former?.nom ? `Pilote retiré (${former.nom})` : "Pilote retiré",
    });

    revalidatePath("/admin/vols");
    revalidatePath("/pilote/vols");
    revalidatePath("/pilote");
    return { success: true };
  } catch {
    return { error: "Erreur serveur" };
  }
}
