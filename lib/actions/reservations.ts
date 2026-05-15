"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { resend, EMAIL_FROM, EMAIL_REPLY_TO } from "@/lib/resend";

async function checkAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Non autorisé");
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") throw new Error("Non autorisé");
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
      ? buildEmailDate(client, dateStr, resa.duree)
      : buildEmailHeure(client, dateStr, resa.heure_vol, resa.duree);
    await resend.emails.send({ from: EMAIL_FROM, to: [client.email], replyTo: EMAIL_REPLY_TO, subject, html });
    if (type === "heure") {
      await supabase.from("reservations").update({ facture_envoyee_at: new Date().toISOString() }).eq("id", id);
    }
    revalidatePath("/admin/vols-sur-mesure");
    return { success: true };
  } catch {
    return { error: "Erreur envoi email" };
  }
}

function buildEmailDate(client: { prenom: string }, dateStr: string, duree: number) {
  return `<!DOCTYPE html><html><body style="font-family:'Segoe UI',Arial,sans-serif;background:#f0f4f8;margin:0;padding:24px;">
<div style="max-width:560px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(17,51,86,.1);">
  <div style="background:#113356;padding:28px 32px;">
    <p style="color:#F2B705;margin:0;font-size:11px;letter-spacing:2px;text-transform:uppercase;">Fly Horizons</p>
    <h1 style="color:#fff;margin:8px 0 0;font-size:20px;">Date de vol confirmée ✓</h1>
  </div>
  <div style="padding:32px;">
    <p style="color:#113356;">Bonjour <strong>${client.prenom}</strong>,</p>
    <p style="color:#4a5568;font-size:14px;">Votre date de vol sur mesure est confirmée :</p>
    <div style="background:#f8fafc;border-radius:10px;padding:20px;margin:20px 0;border:1px solid #e2e8f0;">
      <p style="margin:0;font-size:16px;font-weight:600;color:#113356;">${dateStr}</p>
      <p style="margin:6px 0 0;font-size:14px;color:#64748b;">Durée estimée : ${duree} minutes</p>
    </div>
    <p style="color:#4a5568;font-size:13px;">Nous vous recontacterons prochainement pour confirmer votre créneau horaire exact.</p>
    <p style="color:#113356;font-size:13px;font-weight:600;margin-top:20px;">L'équipe Fly Horizons</p>
  </div>
  <div style="background:#f8fafc;padding:16px 32px;border-top:1px solid #e2e8f0;text-align:center;">
    <p style="color:#94a3b8;font-size:11px;margin:0;">fly-horizons.com · info@fly-horizons.com</p>
  </div>
</div></body></html>`;
}

function buildEmailHeure(client: { prenom: string }, dateStr: string, heure: string, duree: number) {
  return `<!DOCTYPE html><html><body style="font-family:'Segoe UI',Arial,sans-serif;background:#f0f4f8;margin:0;padding:24px;">
<div style="max-width:560px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(17,51,86,.1);">
  <div style="background:#113356;padding:28px 32px;">
    <p style="color:#F2B705;margin:0;font-size:11px;letter-spacing:2px;text-transform:uppercase;">Fly Horizons</p>
    <h1 style="color:#fff;margin:8px 0 0;font-size:20px;">Créneau horaire confirmé ✓</h1>
  </div>
  <div style="padding:32px;">
    <p style="color:#113356;">Bonjour <strong>${client.prenom}</strong>,</p>
    <p style="color:#4a5568;font-size:14px;">Votre vol sur mesure est planifié :</p>
    <div style="background:#f8fafc;border-radius:10px;padding:20px;margin:20px 0;border:1px solid #e2e8f0;">
      <table style="width:100%;border-collapse:collapse;">
        <tr><td style="padding:4px 0;font-size:12px;color:#64748b;width:100px;">Date</td><td style="font-size:14px;font-weight:600;color:#113356;">${dateStr}</td></tr>
        <tr><td style="padding:4px 0;font-size:12px;color:#64748b;">Heure</td><td style="font-size:14px;font-weight:600;color:#113356;">${heure}</td></tr>
        <tr><td style="padding:4px 0;font-size:12px;color:#64748b;">Durée est.</td><td style="font-size:14px;color:#64748b;">${duree} minutes</td></tr>
      </table>
    </div>
    <p style="color:#4a5568;font-size:13px;">Rendez-vous à l'Aéroport de Charleroi (EBCI). À très bientôt à bord !</p>
    <p style="color:#113356;font-size:13px;font-weight:600;margin-top:20px;">L'équipe Fly Horizons</p>
  </div>
  <div style="background:#f8fafc;padding:16px 32px;border-top:1px solid #e2e8f0;text-align:center;">
    <p style="color:#94a3b8;font-size:11px;margin:0;">fly-horizons.com · info@fly-horizons.com</p>
  </div>
</div></body></html>`;
}
