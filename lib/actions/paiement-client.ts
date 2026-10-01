"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { resend, EMAIL_FROM, EMAIL_REPLY_TO } from "@/lib/resend";
import { pilotePaiementDeclareEmail } from "@/lib/email-templates";
import { piloteVirementCommunication } from "@/lib/pilote/payment";
import { notifyPiloteReservation } from "@/lib/push";

// Page publique de paiement par virement (/vol/annonce/paiement/[token]) : le
// client prévient le pilote qu'il a viré. Le jeton de paiement fait office
// d'authentification. Le pilote dispose ensuite de 48 h pour confirmer (ou non)
// la réception : voir lib/reservation-signals.ts.

function pick<T>(v: T | T[] | null | undefined): T | null {
  return Array.isArray(v) ? v[0] ?? null : v ?? null;
}

export async function declarerPaiementClient(token: string): Promise<{ success: true } | { error: string }> {
  try {
    if (!token || token.length < 16) return { error: "Lien invalide" };
    const db = createAdminClient();
    const { data: resa } = await db
      .from("reservations")
      .select("id, statut, acompte, date_vol, pilote_paye, client_paiement_declare_at, clients(prenom, nom), pilotes(nom, email)")
      .eq("payment_token", token)
      .eq("type_resa", "annonce_pilote")
      .maybeSingle();
    if (!resa) return { error: "Lien invalide" };
    if (resa.statut === "annulee") return { error: "Cette demande est annulée" };
    if (resa.pilote_paye) return { success: true };
    if (resa.client_paiement_declare_at) return { success: true };

    // Réserve la déclaration d'abord : un double clic n'envoie qu'un seul email.
    const { data: claimed } = await db
      .from("reservations")
      .update({ client_paiement_declare_at: new Date().toISOString() })
      .eq("id", resa.id)
      .is("client_paiement_declare_at", null)
      .select("id")
      .maybeSingle();
    if (!claimed) return { success: true };

    const client = pick<{ prenom: string | null; nom: string | null }>(resa.clients);
    const pilote = pick<{ nom: string; email: string | null }>(resa.pilotes);
    const clientNom = `${client?.prenom ?? ""} ${client?.nom ?? ""}`.trim() || "Le client";

    await db.from("reservation_history").insert({
      reservation_id: resa.id,
      action: "field_changed",
      field: "client_paiement_declare",
      old_value: null,
      new_value: "virement déclaré",
      author: "client",
      note: "Le client indique avoir effectué le virement",
    });

    await notifyPiloteReservation(resa.id, "client_dit_paye");

    if (pilote?.email) {
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.startsWith("http://localhost")
        ? process.env.NEXT_PUBLIC_SITE_URL
        : "https://fly-horizons.com";
      const dateStr = new Date(resa.date_vol + "T12:00:00Z").toLocaleDateString("fr-BE", {
        weekday: "long", day: "numeric", month: "long", year: "numeric",
      });
      try {
        await resend.emails.send({
          from: EMAIL_FROM,
          to: [pilote.email],
          replyTo: EMAIL_REPLY_TO,
          subject: `${clientNom} dit avoir payé · vol du ${dateStr}`,
          html: pilotePaiementDeclareEmail({
            clientNom,
            dateStr,
            montant: resa.acompte,
            communication: piloteVirementCommunication(resa.date_vol, client?.nom ?? ""),
            transactionsUrl: `${siteUrl}/pilote/transactions`,
          }),
        });
      } catch (e) {
        console.error("[paiement-client] email pilote", e);
      }
    }
    return { success: true };
  } catch {
    return { error: "Erreur serveur" };
  }
}
