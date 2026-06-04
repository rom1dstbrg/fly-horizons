"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { resend, EMAIL_FROM, EMAIL_REPLY_TO } from "@/lib/resend";
import { toForeFlight, buildForeFlightRoute } from "@/lib/foreflight";
import { routeProposalEmail, paymentLinkEmail } from "@/lib/email-templates";

async function checkAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Non autorisé");
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") throw new Error("Non autorisé");
}

async function logHistory(params: {
  reservation_id: string;
  action: string;
  field?: string;
  old_value?: string | null;
  new_value?: string | null;
  author?: string;
  note?: string;
}) {
  try {
    const supabase = createAdminClient();
    await supabase.from("reservation_history").insert({
      reservation_id: params.reservation_id,
      action: params.action,
      field: params.field ?? null,
      old_value: params.old_value ?? null,
      new_value: params.new_value ?? null,
      author: params.author ?? "admin",
      note: params.note ?? null,
    });
  } catch {
    // Log non-bloquant
  }
}

// ── Mise à jour statut de paiement (manuel) ────────────────────────────────────

export async function updatePaymentStatus(
  reservationId: string,
  payment_status: "paid" | "unpaid" | "partial" | "refunded"
) {
  try {
    await checkAdmin();
    const supabase = createAdminClient();

    const { data: current } = await supabase
      .from("reservations")
      .select("payment_status")
      .eq("id", reservationId)
      .single();

    await supabase
      .from("reservations")
      .update({ payment_status })
      .eq("id", reservationId);

    await logHistory({
      reservation_id: reservationId,
      action: "field_changed",
      field: "payment_status",
      old_value: current?.payment_status ?? null,
      new_value: payment_status,
    });

    revalidatePath("/admin/vols");
    return { success: true };
  } catch {
    return { error: "Erreur serveur" };
  }
}

// ── Mise à jour complète de tous les champs ────────────────────────────────────

type ClientFields = {
  prenom?: string;
  nom?: string;
  email?: string;
  telephone?: string | null;
};

type ReservationFields = {
  date_vol?: string;
  heure_vol?: string | null;
  duree?: number;
  passagers?: number;
  poids_total?: number | null;
  acompte?: number | null;
  paye?: number | null;
  payment_status?: "paid" | "unpaid" | "partial" | "refunded";
  voucher_code?: string | null;
  coupon_code?: string | null;
  commentaire?: string | null;
  style_vol?: "rapide" | "vues" | null;
  route?: string | null;
};

export async function updateReservationAllFields(
  reservationId: string,
  clientFields: ClientFields,
  reservationFields: ReservationFields
) {
  try {
    await checkAdmin();
    const supabase = createAdminClient();

    // Récupérer les valeurs actuelles pour le diff
    const { data: current } = await supabase
      .from("reservations")
      .select("*, clients(*)")
      .eq("id", reservationId)
      .single();

    if (!current) return { error: "Réservation introuvable" };

    const currentClient = current.clients as Record<string, unknown> | null;

    // ── Mise à jour client ──────────────────────────────────────────────────────
    const clientUpdates: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(clientFields)) {
      if (value !== undefined) {
        clientUpdates[key] = value;
      }
    }

    if (Object.keys(clientUpdates).length > 0 && current.client_id) {
      await supabase.from("clients").update(clientUpdates).eq("id", current.client_id);

      for (const [field, newValue] of Object.entries(clientUpdates)) {
        const oldValue = currentClient?.[field];
        if (String(oldValue ?? "") !== String(newValue ?? "")) {
          await logHistory({
            reservation_id: reservationId,
            action: "field_changed",
            field: `client.${field}`,
            old_value: oldValue != null ? String(oldValue) : null,
            new_value: newValue != null ? String(newValue) : null,
          });
        }
      }
    }

    // ── Mise à jour réservation ────────────────────────────────────────────────
    const resaUpdates: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(reservationFields)) {
      if (value !== undefined) {
        resaUpdates[key] = value;
      }
    }

    if (Object.keys(resaUpdates).length > 0) {
      await supabase.from("reservations").update(resaUpdates).eq("id", reservationId);

      for (const [field, newValue] of Object.entries(resaUpdates)) {
        const oldValue = (current as Record<string, unknown>)[field];
        if (String(oldValue ?? "") !== String(newValue ?? "")) {
          await logHistory({
            reservation_id: reservationId,
            action: "field_changed",
            field,
            old_value: oldValue != null ? String(oldValue) : null,
            new_value: newValue != null ? String(newValue) : null,
          });
        }
      }
    }

    revalidatePath("/admin/vols");
    return { success: true };
  } catch (e) {
    console.error("updateReservationAllFields error:", e);
    return { error: "Erreur serveur" };
  }
}

// ── Sauvegarder la route finale du pilote ─────────────────────────────────────

export async function saveFinalWaypoints(
  reservationId: string,
  final_waypoints: Array<{ lat: number; lng: number; nom?: string }>
) {
  try {
    await checkAdmin();
    const supabase = createAdminClient();

    await supabase
      .from("reservations")
      .update({ final_waypoints })
      .eq("id", reservationId);

    await logHistory({
      reservation_id: reservationId,
      action: "field_changed",
      field: "final_waypoints",
      new_value: `${final_waypoints.length} points`,
      note: "Route finale du pilote mise à jour",
    });

    revalidatePath("/admin/vols");
    return { success: true };
  } catch {
    return { error: "Erreur serveur" };
  }
}

// ── Envoyer une proposition de route au client ─────────────────────────────────

export async function sendRouteProposalToClient(
  reservationId: string,
  waypoints: Array<{ lat: number; lng: number; nom?: string }>,
  adminComment: string
) {
  try {
    await checkAdmin();
    const supabase = createAdminClient();

    const { data: resa } = await supabase
      .from("reservations")
      .select("*, clients(*)")
      .eq("id", reservationId)
      .single();

    if (!resa) return { error: "Réservation introuvable" };

    const client = resa.clients as { prenom: string; nom: string; email: string } | null;
    if (!client?.email) return { error: "Email client introuvable" };

    // Créer la proposition — on capture duree/acompte à l'instant de l'envoi
    // pour que le mail de paiement reflète la route proposée, pas l'estimé initial
    const { data: proposal, error: propError } = await supabase
      .from("route_proposals")
      .insert({
        reservation_id: reservationId,
        waypoints,
        admin_comment: adminComment,
        duree: resa.duree ?? null,
        acompte: resa.acompte ?? null,
      })
      .select("token")
      .single();

    if (propError || !proposal) return { error: "Erreur création proposition" };

    const rawUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "";
    const siteUrl = rawUrl.startsWith("http://localhost") || rawUrl.startsWith("http://127")
      ? rawUrl
      : "https://fly-horizons.com";

    const responseUrl = `${siteUrl}/vol/proposition/${proposal.token}`;
    const dateStr = new Date(resa.date_vol + "T12:00:00Z").toLocaleDateString("fr-BE", {
      weekday: "long", day: "numeric", month: "long", year: "numeric",
    });

    await resend.emails.send({
      from: EMAIL_FROM,
      to: [client.email],
      replyTo: EMAIL_REPLY_TO,
      subject: `Fly Horizons — Votre itinéraire personnalisé pour le ${dateStr}`,
      html: routeProposalEmail({
        prenom: client.prenom,
        dateStr,
        waypoints,
        adminComment,
        responseUrl,
      }),
    });

    await logHistory({
      reservation_id: reservationId,
      action: "route_proposal_sent",
      new_value: `${waypoints.length} points`,
      note: adminComment || undefined,
    });

    revalidatePath("/admin/vols");
    return { success: true };
  } catch (e) {
    console.error("sendRouteProposalToClient error:", e);
    return { error: "Erreur serveur" };
  }
}

// ── Réponse du client à une proposition (public, sans checkAdmin) ──────────────

export async function respondToRouteProposal(
  token: string,
  status: "accepted" | "modification_requested",
  clientComment?: string
) {
  try {
    const supabase = createAdminClient();

    const { data: proposal } = await supabase
      .from("route_proposals")
      .select("*, reservations(id, acompte, payment_token, duree, date_vol, type_resa, statut, payment_status, clients(prenom, nom, email))")
      .eq("token", token)
      .single();

    if (!proposal) return { error: "Proposition introuvable ou lien expiré" };
    if (proposal.status !== "pending") return { error: "Cette proposition a déjà été traitée" };

    await supabase
      .from("route_proposals")
      .update({
        status,
        client_comment: clientComment ?? null,
        responded_at: new Date().toISOString(),
      })
      .eq("token", token);

    const resa = proposal.reservations as {
      id: string;
      acompte: number | null;
      payment_token: string | null;
      duree: number;
      date_vol: string;
      type_resa: string;
      statut: string;
      payment_status: string | null;
      clients: { prenom: string; nom: string; email: string } | null;
    } | null;

    // Valeurs capturées au moment de l'envoi de la proposition (reflètent la route proposée)
    const proposalDuree = (proposal as { duree?: number | null }).duree ?? resa?.duree ?? 0;
    const proposalAcompte = (proposal as { acompte?: number | null }).acompte ?? resa?.acompte ?? 0;

    if (resa?.id) {
      await logHistory({
        reservation_id: resa.id,
        action: "client_response",
        field: "route_proposal",
        new_value: status,
        author: "client",
        note: clientComment ?? undefined,
      });
    }

    const client = resa?.clients;
    const isPerso = resa?.type_resa === "perso";

    // Relecture fraîche juste avant la logique de paiement — réduit la fenêtre de race condition
    // au cas où le webhook Stripe aurait mis à jour entre le fetch initial et maintenant
    let freshPaymentToken: string | null = resa?.payment_token ?? null;
    let alreadyPaid = resa?.statut === "acompte_recu" || resa?.payment_status === "paid";
    if (isPerso && resa?.id) {
      const { data: freshResa } = await supabase
        .from("reservations")
        .select("statut, payment_status, payment_token")
        .eq("id", resa.id)
        .single();
      if (freshResa) {
        alreadyPaid = freshResa.statut === "acompte_recu" || freshResa.payment_status === "paid";
        freshPaymentToken = freshResa.payment_token ?? null;
      }
    }

    // Lien de paiement uniquement pour les vols sur mesure non encore payés
    // (les vols fixe sont déjà payés via Stripe ; les perso peuvent avoir payé via le lien initial)
    let paymentToken: string | null = null;
    if (isPerso && !alreadyPaid) {
      paymentToken = freshPaymentToken;
      // Si pas de payment_token (admin a modifié l'acompte ou voucher initial), en générer un
      if (status === "accepted" && resa?.id && !paymentToken && proposalAcompte > 0) {
        paymentToken = crypto.randomUUID();
        await supabase
          .from("reservations")
          .update({ payment_token: paymentToken })
          .eq("id", resa.id);
      }
    }

    // Notification admin
    await resend.emails.send({
      from: EMAIL_FROM,
      to: [EMAIL_REPLY_TO],
      subject: `[Route ${status === "accepted" ? "acceptée ✓" : "modification demandée"}] ${client?.prenom ?? ""} ${client?.nom ?? ""}`,
      html: `<p><strong>${client?.prenom} ${client?.nom}</strong> a ${status === "accepted" ? "accepté" : "demandé une modification pour"} la proposition de route.</p>${clientComment ? `<p><strong>Commentaire :</strong> ${clientComment}</p>` : ""}`,
    });

    // Lien de paiement au client — uniquement vol sur mesure non encore payé avec acompte
    if (isPerso && !alreadyPaid && status === "accepted" && client?.email && paymentToken && proposalAcompte > 0) {
      const rawUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "";
      const siteUrl = rawUrl.startsWith("http://localhost") || rawUrl.startsWith("http://127")
        ? rawUrl
        : "https://fly-horizons.com";
      const paymentUrl = `${siteUrl}/api/vol-sur-mesure/pay/${paymentToken}`;
      const dateStr = new Date((resa?.date_vol ?? "") + "T12:00:00Z").toLocaleDateString("fr-BE", {
        weekday: "long", day: "numeric", month: "long", year: "numeric",
      });

      await resend.emails.send({
        from: EMAIL_FROM,
        to: [client.email],
        replyTo: EMAIL_REPLY_TO,
        subject: `Fly Horizons — Finalisez votre réservation`,
        html: paymentLinkEmail({
          prenom: client.prenom,
          dateStr,
          duree: proposalDuree,
          acompte: proposalAcompte,
          paymentUrl,
        }),
      });
    }

    return { success: true };
  } catch (e) {
    console.error("respondToRouteProposal error:", e);
    return { error: "Erreur serveur" };
  }
}

// ── Récupérer l'historique d'une réservation ───────────────────────────────────

export async function getReservationHistory(reservationId: string) {
  try {
    await checkAdmin();
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from("reservation_history")
      .select("*")
      .eq("reservation_id", reservationId)
      .order("created_at", { ascending: false });

    if (error) return { error: "Erreur chargement historique" };
    return { data: data ?? [] };
  } catch {
    return { error: "Erreur serveur" };
  }
}

// ── Récupérer les propositions de route d'une réservation ─────────────────────

export async function getRouteProposals(reservationId: string) {
  try {
    await checkAdmin();
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from("route_proposals")
      .select("*")
      .eq("reservation_id", reservationId)
      .order("created_at", { ascending: false });

    if (error) return { error: "Erreur chargement propositions" };
    return { data: data ?? [] };
  } catch {
    return { error: "Erreur serveur" };
  }
}

