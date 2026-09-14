"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdminOrOwningPilote } from "./auth-guards";
import { isPiloteVol } from "@/lib/pilote/payment";
import { resend, EMAIL_FROM, EMAIL_REPLY_TO } from "@/lib/resend";
import {
  annoncePaiementVirementEmail,
  annoncePaiementConfirmeEmail,
  postVolEmail,
} from "@/lib/email-templates";
import { brusselsTimestamp } from "@/lib/utils";

// Garde-fou anti-abus : un pilote ne peut marquer un vol « effectué » qu'au
// moins 8 h après l'heure prévue du décollage (empêche de clôturer un vol qui
// n'a pas eu lieu pour déclencher l'enquête / débloquer le reçu).
const VOL_EFFECTUE_DELAI_MS = 8 * 60 * 60 * 1000;

// Annonces pilote · paiement = virement direct au pilote (décision 08/09).
// Le montant dû par le client vit dans `reservations.acompte` (posé par
// /api/vol-annonce/submit) ; l'app ne fait que tracer « le client m'a payé »,
// aucun flux d'argent réel.

function siteUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL ?? "";
  return raw.startsWith("http://localhost") || raw.startsWith("http://127")
    ? raw
    : "https://fly-horizons.com";
}

async function loadPiloteVol(reservationId: string) {
  const db = createAdminClient();
  const { data } = await db
    .from("reservations")
    .select(
      "id, type_resa, pilote_id, annonce_id, statut, pre_payment_statut, payment_token, acompte, duree, date_vol, heure_vol, pilote_paye, clients(prenom, nom, email), pilotes(nom)",
    )
    .eq("id", reservationId)
    .single();
  return { db, resa: data };
}

function pick<T>(v: T | T[] | null | undefined): T | null {
  return Array.isArray(v) ? v[0] ?? null : v ?? null;
}

/** Le pilote (ou l'admin) confirme / infirme que le client a réglé (virement ou espèces). */
export async function setPilotePaye(
  reservationId: string,
  paye: boolean,
  mode: "virement" | "especes" = "virement",
) {
  try {
    const actor = await requireAdminOrOwningPilote(reservationId);
    const { db, resa } = await loadPiloteVol(reservationId);
    if (!resa) return { error: "Réservation introuvable" };
    if (!isPiloteVol(resa)) return { error: "Ce vol n'est pas géré par un pilote" };

    // Quand on marque « payé », la résa doit avancer : on la sort de
    // « payment_pending » et de tout statut de début (demande_recue / en_attente).
    // On restaure `pre_payment_statut` seulement s'il est déjà « avancé », sinon
    // on force `heure_confirmee` — sans ça une résa payée pouvait rester affichée
    // « demande reçue » (pilote ayant envoyé la route sans confirmer le créneau).
    const EARLY = ["payment_pending", "demande_recue", "en_attente", ""];
    let restored = resa.statut;
    if (paye && EARLY.includes(resa.statut)) {
      const pre = resa.pre_payment_statut ?? "";
      restored = EARLY.includes(pre) ? "heure_confirmee" : pre;
    }

    const { error } = await db
      .from("reservations")
      .update({
        pilote_paye: paye,
        pilote_paye_at: paye ? new Date().toISOString() : null,
        statut: restored,
        ...(paye ? { pre_payment_statut: null, payment_token: null } : {}),
      })
      .eq("id", reservationId);
    if (error) return { error: error.message };

    await db.from("reservation_history").insert({
      reservation_id: reservationId,
      action: "field_changed",
      field: "pilote_paye",
      old_value: resa.pilote_paye ? "payé" : "non payé",
      new_value: paye ? "payé" : "non payé",
      author: actor.role === "pilote" ? `pilote:${actor.piloteNom}` : "admin",
      note: paye
        ? mode === "especes"
          ? "Le client a payé le pilote en espèces"
          : "Le client a réglé le pilote par virement"
        : "Paiement pilote remis en attente",
    });

    revalidatePath("/admin/vols");
    revalidatePath("/admin/transactions");
    revalidatePath("/pilote/vols");

    // Email « paiement confirmé » au client — optionnel, on n'échoue pas la
    // confirmation si l'envoi rate (même logique que marquerVolEffectue).
    let emailError = false;
    if (paye) {
      const client = pick<{ prenom: string; nom: string; email: string }>(resa.clients);
      const pilote = pick<{ nom: string }>(resa.pilotes);
      if (client?.email && typeof resa.acompte === "number" && resa.acompte > 0) {
        const dateStr = new Date(resa.date_vol + "T12:00:00Z").toLocaleDateString("fr-BE", {
          weekday: "long", day: "numeric", month: "long", year: "numeric",
        });
        try {
          await resend.emails.send({
            from: EMAIL_FROM,
            to: [client.email],
            replyTo: EMAIL_REPLY_TO,
            subject: "Paiement confirmé · Fly Horizons",
            html: annoncePaiementConfirmeEmail({
              prenom: client.prenom,
              nom: client.nom,
              dateStr,
              heure: (resa.heure_vol ?? "").slice(0, 5),
              duree: resa.duree,
              piloteNom: pilote?.nom ?? "votre pilote",
              montant: resa.acompte,
              receiptUrl: `${siteUrl()}/api/invoice/reservation/${reservationId}`,
            }),
          });
        } catch {
          emailError = true;
        }
      }
    }

    return { success: true, statut: restored, emailError };
  } catch {
    return { error: "Erreur serveur" };
  }
}

/**
 * Renvoie au client l'email « réglez votre vol par virement » avec le lien vers
 * la page de paiement dédiée. Réservé à l'admin aujourd'hui côté drawer standard —
 * ici ouvert au pilote propriétaire de l'annonce (board item : « renvoyer le
 * lien de paiement »).
 */
export async function renvoyerLienVirement(reservationId: string) {
  try {
    const actor = await requireAdminOrOwningPilote(reservationId);
    const { db, resa } = await loadPiloteVol(reservationId);
    if (!resa) return { error: "Réservation introuvable" };
    if (!isPiloteVol(resa) || resa.type_resa !== "annonce_pilote") {
      return { error: "Ce vol n'est pas une annonce pilote" };
    }
    if (resa.pilote_paye) return { error: "Ce vol est déjà réglé" };
    const client = pick<{ prenom: string; nom: string; email: string }>(resa.clients);
    if (!client?.email) return { error: "Client sans email" };
    const pilote = pick<{ nom: string }>(resa.pilotes);
    if (!(typeof resa.acompte === "number" && resa.acompte > 0)) {
      return { error: "Aucun montant à régler sur ce vol" };
    }

    // Générer un payment_token si la route n'a pas encore été acceptée.
    let token = resa.payment_token;
    if (!token) {
      token = crypto.randomUUID();
      await db
        .from("reservations")
        .update({
          payment_token: token,
          statut: "payment_pending",
          pre_payment_statut: resa.statut === "payment_pending" ? null : resa.statut,
        })
        .eq("id", reservationId);
    }

    const dateStr = new Date(resa.date_vol + "T12:00:00Z").toLocaleDateString("fr-BE", {
      weekday: "long", day: "numeric", month: "long", year: "numeric",
    });

    await resend.emails.send({
      from: EMAIL_FROM,
      to: [client.email],
      replyTo: EMAIL_REPLY_TO,
      subject: "Réglez votre vol partagé · Fly Horizons",
      html: annoncePaiementVirementEmail({
        prenom: client.prenom,
        nom: client.nom,
        dateStr,
        heure: (resa.heure_vol ?? "").slice(0, 5),
        duree: resa.duree,
        montant: resa.acompte,
        piloteNom: pilote?.nom ?? "votre pilote",
        paiementUrl: `${siteUrl()}/vol/annonce/paiement/${token}`,
      }),
    });

    await db.from("reservation_history").insert({
      reservation_id: reservationId,
      action: "email_sent",
      field: "paiement_virement",
      new_value: "lien renvoyé",
      author: actor.role === "pilote" ? `pilote:${actor.piloteNom}` : "admin",
      note: "Lien de paiement (virement) renvoyé au client",
    });

    revalidatePath("/pilote/vols");
    return { success: true };
  } catch {
    return { error: "Erreur serveur" };
  }
}

/** Le pilote marque le vol effectué : minutes réelles + déclenche l'enquête satisfaction. */
export async function marquerVolEffectue(
  reservationId: string,
  dureeReelle?: number,
  commentaire?: string,
) {
  try {
    const actor = await requireAdminOrOwningPilote(reservationId);
    const { db, resa } = await loadPiloteVol(reservationId);
    if (!resa) return { error: "Réservation introuvable" };
    if (!isPiloteVol(resa)) return { error: "Ce vol n'est pas géré par un pilote" };
    if (resa.statut === "vol_effectue") return { error: "Ce vol est déjà marqué effectué" };
    if (resa.statut === "annulee") return { error: "Ce vol est annulé" };

    // Verrou 8 h — sauf pour l'admin (Romain), qui garde la main.
    if (actor.role === "pilote") {
      const debut = brusselsTimestamp(resa.date_vol, resa.heure_vol);
      if (Date.now() < debut + VOL_EFFECTUE_DELAI_MS) {
        return {
          error:
            "Vous pourrez marquer ce vol effectué au plus tôt 8 h après l'heure prévue du décollage.",
        };
      }
    }

    const dr =
      typeof dureeReelle === "number" && dureeReelle > 0 && dureeReelle <= 600
        ? Math.round(dureeReelle)
        : resa.duree;

    const { error } = await db
      .from("reservations")
      .update({ statut: "vol_effectue", duree_reelle: dr })
      .eq("id", reservationId);
    if (error) return { error: error.message };

    await db.from("reservation_history").insert({
      reservation_id: reservationId,
      action: "field_changed",
      field: "statut",
      old_value: resa.statut,
      new_value: "vol_effectue",
      author: actor.role === "pilote" ? `pilote:${actor.piloteNom}` : "admin",
      note: commentaire?.trim()
        ? `Vol effectué (${dr} min) — ${commentaire.trim()}`
        : `Vol effectué (${dr} min)`,
    });

    // Enquête satisfaction — même point d'entrée que le flux standard (postVolEmail
    // avec surveyUrl /satisfaction/[id]).
    let emailError = false;
    const client = pick<{ prenom: string; nom: string; email: string }>(resa.clients);
    if (client?.email) {
      const dateStr = new Date(resa.date_vol + "T12:00:00Z").toLocaleDateString("fr-BE", {
        weekday: "long", day: "numeric", month: "long", year: "numeric",
      });
      try {
        await resend.emails.send({
          from: EMAIL_FROM,
          to: [client.email],
          replyTo: EMAIL_REPLY_TO,
          subject: "Merci pour votre vol · Fly Horizons",
          html: postVolEmail({
            prenom: client.prenom,
            dateStr,
            duree: dr,
            surveyUrl: `${siteUrl()}/satisfaction/${reservationId}`,
          }),
        });
      } catch {
        emailError = true;
      }
    }

    revalidatePath("/admin/vols");
    revalidatePath("/pilote/vols");
    return { success: true, emailError };
  } catch {
    return { error: "Erreur serveur" };
  }
}

/**
 * Filet impayé : le pilote annule une demande jamais réglée. La réservation
 * passe `annulee` et l'annonce redevient disponible (pas de webhook = pas de
 * deadline automatique sur les annonces).
 */
export async function cancelAnnonceDemande(reservationId: string) {
  try {
    const actor = await requireAdminOrOwningPilote(reservationId);
    const { db, resa } = await loadPiloteVol(reservationId);
    if (!resa) return { error: "Réservation introuvable" };
    if (resa.type_resa !== "annonce_pilote") return { error: "Ce vol n'est pas une annonce pilote" };
    if (resa.pilote_paye) return { error: "Ce vol est réglé, il ne peut pas être annulé ici" };
    if (resa.statut === "vol_effectue") return { error: "Ce vol a déjà eu lieu" };

    const { error } = await db
      .from("reservations")
      .update({ statut: "annulee", payment_token: null })
      .eq("id", reservationId);
    if (error) return { error: error.message };

    // Remettre l'annonce en vente.
    if (resa.annonce_id) {
      const { data: annonce } = await db
        .from("annonces_pilote")
        .select("id, mode_vente, places, places_reservees, statut")
        .eq("id", resa.annonce_id)
        .maybeSingle();
      if (annonce) {
        if (annonce.mode_vente === "place") {
          const { data: r } = await db
            .from("reservations")
            .select("passagers")
            .eq("id", reservationId)
            .maybeSingle();
          const freed = Math.max(0, (annonce.places_reservees ?? 0) - (r?.passagers ?? 1));
          await db
            .from("annonces_pilote")
            .update({ places_reservees: freed, statut: "publiee" })
            .eq("id", annonce.id);
        } else {
          await db
            .from("annonces_pilote")
            .update({ statut: "publiee" })
            .eq("id", annonce.id)
            .eq("statut", "reservee");
        }
      }
    }

    await db.from("reservation_history").insert({
      reservation_id: reservationId,
      action: "field_changed",
      field: "statut",
      old_value: resa.statut,
      new_value: "annulee",
      author: actor.role === "pilote" ? `pilote:${actor.piloteNom}` : "admin",
      note: "Demande annulée (non réglée) — annonce remise en vente",
    });

    revalidatePath("/pilote/vols");
    revalidatePath("/pilote/annonces");
    return { success: true };
  } catch {
    return { error: "Erreur serveur" };
  }
}

/**
 * Le pilote ajuste passagers / poids total de sa propre annonce (onglet
 * Modifier du drawer, readonly pour le reste — Q33). Cohérent pour une annonce
 * que le pilote organise lui-même, contrairement à un vol assigné.
 */
export async function updateAnnoncePassagersPoids(
  reservationId: string,
  passagers: number,
  poidsTotal: number | null,
) {
  try {
    const actor = await requireAdminOrOwningPilote(reservationId);
    const db = createAdminClient();
    const { data: resa } = await db
      .from("reservations")
      .select("id, type_resa, passagers, poids_total")
      .eq("id", reservationId)
      .single();
    if (!resa) return { error: "Réservation introuvable" };
    if (resa.type_resa !== "annonce_pilote") {
      return { error: "Ce vol n'est pas une annonce pilote" };
    }
    if (!(Number.isFinite(passagers) && passagers >= 1)) {
      return { error: "Nombre de passagers invalide" };
    }

    const { error } = await db
      .from("reservations")
      .update({ passagers, poids_total: poidsTotal })
      .eq("id", reservationId);
    if (error) return { error: error.message };

    await db.from("reservation_history").insert({
      reservation_id: reservationId,
      action: "field_changed",
      field: "passagers/poids_total",
      old_value: `${resa.passagers} pax · ${resa.poids_total ?? "—"} kg`,
      new_value: `${passagers} pax · ${poidsTotal ?? "—"} kg`,
      author: actor.role === "pilote" ? `pilote:${actor.piloteNom}` : "admin",
      note: "Passagers / poids modifiés par le pilote",
    });

    revalidatePath("/pilote/vols");
    revalidatePath("/admin/vols");
    return { success: true };
  } catch {
    return { error: "Erreur serveur" };
  }
}
