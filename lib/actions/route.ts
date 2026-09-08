"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { routeFeedbackAdminEmail, piloteRouteFeedbackEmail } from "@/lib/email-templates";
import { resend, EMAIL_FROM, EMAIL_REPLY_TO } from "@/lib/resend";

const ADMIN_EMAIL = "info@fly-horizons.com";

export async function submitRouteResponse(
  token: string,
  type: "validated" | "modification_requested",
  feedback?: string
) {
  const supabase = createAdminClient();

  const { data: resa } = await supabase
    .from("reservations")
    .select("id, date_vol, heure_vol, route_responded_at, pilote_id, clients(prenom, nom, email), pilotes(nom, email)")
    .eq("route_token", token)
    .single();

  if (!resa) return { error: "Lien invalide ou expiré" };

  if (resa.route_responded_at) return { error: "Vous avez déjà répondu à cet itinéraire" };

  // 48h deadline check
  const timeStr = resa.heure_vol ? resa.heure_vol.slice(0, 5) : "23:59";
  const flightDateTime = new Date(`${resa.date_vol}T${timeStr}:00`);
  const deadline = new Date(flightDateTime.getTime() - 48 * 60 * 60 * 1000);
  if (new Date() > deadline) return { error: "Le délai de réponse est dépassé (48 h avant le vol)" };

  await supabase
    .from("reservations")
    .update({
      route_status: type,
      route_feedback: feedback?.trim() || null,
      route_responded_at: new Date().toISOString(),
    })
    .eq("id", resa.id);

  // Notifier l'admin
  try {
    const client = resa.clients as unknown as { prenom: string; nom: string; email: string };
    const dateStr = new Date(resa.date_vol + "T12:00:00Z").toLocaleDateString("fr-BE", {
      weekday: "long", day: "numeric", month: "long", year: "numeric",
    });
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://fly-horizons.com";
    const subjectLabel = type === "validated" ? "Itinéraire validé" : "Modification demandée";
    await resend.emails.send({
      from: EMAIL_FROM,
      to: [ADMIN_EMAIL],
      subject: `[Route] ${subjectLabel} · ${client.prenom} ${client.nom}`,
      html: routeFeedbackAdminEmail({
        clientPrenom: client.prenom,
        clientNom: client.nom,
        clientEmail: client.email,
        resaId: resa.id,
        dateStr,
        type,
        feedback: feedback?.trim() || null,
        adminUrl: `${siteUrl}/admin/reservations/${resa.id}`,
      }),
    });
  } catch (err) {
    // L'email admin ne doit pas faire échouer la réponse du client
    console.error("Route feedback admin email error:", err);
  }

  // Notifier le pilote assigné (vol standard attribué ou annonce).
  try {
    const pilote = (Array.isArray(resa.pilotes) ? resa.pilotes[0] : resa.pilotes) as
      | { nom: string; email: string | null }
      | null;
    if (resa.pilote_id && pilote?.email) {
      const client = (Array.isArray(resa.clients) ? resa.clients[0] : resa.clients) as
        | { prenom: string; nom: string }
        | null;
      const dateStr = new Date(resa.date_vol + "T12:00:00Z").toLocaleDateString("fr-BE", {
        weekday: "long", day: "numeric", month: "long", year: "numeric",
      });
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://fly-horizons.com";
      await resend.emails.send({
        from: EMAIL_FROM,
        to: [pilote.email],
        replyTo: EMAIL_REPLY_TO,
        subject: `[Route] ${type === "validated" ? "Itinéraire validé" : "Modification demandée"} · ${client?.prenom ?? ""} ${client?.nom ?? ""}`.trim(),
        html: piloteRouteFeedbackEmail({
          piloteNom: pilote.nom,
          clientNom: `${client?.prenom ?? ""} ${client?.nom ?? ""}`.trim() || "Le client",
          dateStr,
          type,
          feedback: feedback?.trim() || null,
          volsUrl: `${siteUrl}/pilote/vols`,
        }),
      });
    }
  } catch (err) {
    console.error("Route feedback pilote email error:", err);
  }

  return { success: true };
}
