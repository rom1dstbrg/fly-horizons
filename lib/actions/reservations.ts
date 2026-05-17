"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { reservationDateConfirmeeEmail, reservationHeureConfirmeeEmail, reservationPaymentInvitationEmail } from "@/lib/email-templates";
import { resend, EMAIL_FROM, EMAIL_REPLY_TO } from "@/lib/resend";

async function checkAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Non autorisé");
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") throw new Error("Non autorisé");
}

export async function updateStatutReservation(id: string, statut: string) {
  try {
    await checkAdmin();
    const supabase = createAdminClient();
    await supabase.from("reservations").update({ statut }).eq("id", id);
    revalidatePath("/admin/reservations");
    return { success: true };
  } catch {
    return { error: "Erreur serveur" };
  }
}

export async function updateStatutReservationPerso(id: string, statut: string) {
  try {
    await checkAdmin();
    const supabase = createAdminClient();
    const extra: Record<string, string> = {};
    if (statut === "date_confirmee") extra.date_confirmee_at = new Date().toISOString();
    if (statut === "heure_confirmee") extra.heure_confirmee_at = new Date().toISOString();
    await supabase.from("reservations").update({ statut, ...extra }).eq("id", id);
    revalidatePath("/admin/vols-sur-mesure");
    return { success: true };
  } catch {
    return { error: "Erreur serveur" };
  }
}

export async function sendEmailConfirmation(id: string, type: "date" | "heure") {
  try {
    await checkAdmin();
    const supabase = createAdminClient();
    const { data: resa } = await supabase
      .from("reservations")
      .select("*, clients(*)")
      .eq("id", id)
      .single();
    if (!resa) return { error: "Réservation introuvable" };
    const client = resa.clients as { prenom: string; nom: string; email: string };
    const dateStr = new Date(resa.date_vol + "T12:00:00Z").toLocaleDateString("fr-BE", {
      weekday: "long", day: "numeric", month: "long", year: "numeric",
    });
    const subject = type === "date"
      ? "Fly Horizons — Votre date de vol est confirmée"
      : "Fly Horizons — Votre créneau horaire est confirmé";
    const html = type === "date"
      ? reservationDateConfirmeeEmail({ prenom: client.prenom, dateStr, duree: resa.duree })
      : reservationHeureConfirmeeEmail({ prenom: client.prenom, dateStr, heure: resa.heure_vol, duree: resa.duree });
    await resend.emails.send({ from: EMAIL_FROM, to: [client.email], replyTo: EMAIL_REPLY_TO, subject, html });
    const now = new Date().toISOString();
    const newStatut = type === "date" ? "date_confirmee" : "heure_confirmee";
    const timestampField = type === "date" ? "date_confirmee_at" : "heure_confirmee_at";
    await supabase.from("reservations")
      .update({ statut: newStatut, [timestampField]: now })
      .eq("id", id);
    revalidatePath("/admin/vols-sur-mesure");
    return { success: true };
  } catch {
    return { error: "Erreur envoi email" };
  }
}

export async function createAdminReservation(data: {
  client_id?: string;
  prenom?: string;
  nom?: string;
  email?: string;
  telephone?: string;
  date_vol: string;
  heure_vol: string;
  duree: number;
  passagers: number;
  poids_total?: number | null;
  voucher_code?: string;
  envoyer_paiement: boolean;
  montant_override?: number | null;
}) {
  try {
    await checkAdmin();
    const supabase = createAdminClient();

    // Resolve or create client
    let clientId = data.client_id;
    if (!clientId) {
      if (!data.prenom || !data.nom || !data.email) {
        return { error: "Prénom, nom et email obligatoires pour un nouveau client" };
      }
      const { data: newId } = await supabase.rpc("next_client_id");
      if (!newId) return { error: "Erreur génération ID client" };
      const { error: cliErr } = await supabase.from("clients").insert({
        id: newId,
        prenom: data.prenom,
        nom: data.nom,
        email: data.email,
        telephone: data.telephone || null,
      });
      if (cliErr) return { error: "Erreur création client" };
      clientId = newId;
    }

    const { data: client } = await supabase.from("clients").select("*").eq("id", clientId).single();
    if (!client) return { error: "Client introuvable" };

    // Calculate price
    const { data: settings } = await supabase
      .from("crm_settings")
      .select("key, value")
      .in("key", ["prix_heure"]);
    const prixHeure = parseFloat(settings?.find(s => s.key === "prix_heure")?.value ?? "254");

    let voucherDuration = 0;
    if (data.voucher_code) {
      const { data: voucher } = await supabase
        .from("voucher_codes")
        .select("duration_minutes")
        .eq("code", data.voucher_code.toUpperCase().trim())
        .eq("status", "unused")
        .maybeSingle();
      if (voucher) voucherDuration = voucher.duration_minutes ?? 0;
    }

    const billableMins = Math.max(0, data.duree - voucherDuration);
    const montant = data.montant_override != null
      ? data.montant_override
      : Math.round((prixHeure / 60) * billableMins);

    const paymentToken = data.envoyer_paiement && montant > 0
      ? crypto.randomUUID()
      : null;
    const statut = data.envoyer_paiement && montant > 0 ? "payment_pending" : "en_attente";

    const { data: resa, error: resaErr } = await supabase
      .from("reservations")
      .insert({
        client_id: clientId,
        date_vol: data.date_vol,
        heure_vol: data.heure_vol,
        duree: data.duree,
        passagers: data.passagers,
        poids_total: data.poids_total || null,
        statut,
        type_resa: "standard",
        voucher_code: data.voucher_code?.toUpperCase().trim() || null,
        payment_token: paymentToken,
        acompte: montant > 0 ? montant : null,
      })
      .select()
      .single();

    if (resaErr) return { error: "Erreur création réservation" };

    if (paymentToken && montant > 0) {
        const rawUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "";
      const siteUrl = rawUrl.startsWith("http://localhost") || rawUrl.startsWith("http://127")
        ? rawUrl
        : "https://fly-horizons.com";
      const paymentUrl = `${siteUrl}/api/reservation/pay/${paymentToken}`;
      const dateStr = new Date(data.date_vol + "T12:00:00Z").toLocaleDateString("fr-BE", {
        weekday: "long", day: "numeric", month: "long", year: "numeric",
      });
      await resend.emails.send({
        from: EMAIL_FROM,
        to: [client.email],
        replyTo: EMAIL_REPLY_TO,
        subject: "Votre réservation — Lien de paiement Fly Horizons",
        html: reservationPaymentInvitationEmail({
          prenom: client.prenom,
          nom: client.nom,
          dateStr,
          heure: data.heure_vol,
          duree: data.duree,
          montant,
          paymentUrl,
          voucherCode: data.voucher_code || null,
        }),
      });
    }

    revalidatePath("/admin/reservations");
    revalidatePath("/admin/clients");
    return { success: true, reservationId: resa.id };
  } catch (e) {
    console.error("createAdminReservation error:", e);
    return { error: "Erreur serveur" };
  }
}

export async function updateReservationPersoFields(id: string, fields: {
  passagers?: number;
  poids_total?: number | null;
  commentaire?: string | null;
  acompte?: number | null;
}) {
  try {
    await checkAdmin();
    const supabase = createAdminClient();
    await supabase.from("reservations").update(fields).eq("id", id);
    revalidatePath("/admin/vols-sur-mesure");
    return { success: true };
  } catch {
    return { error: "Erreur serveur" };
  }
}

