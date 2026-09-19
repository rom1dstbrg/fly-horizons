import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { resend, EMAIL_FROM, EMAIL_REPLY_TO } from "@/lib/resend";
import { pilotePaiementCheckinEmail } from "@/lib/email-templates";

const DELAI_JOURS = 3;

/**
 * POST /api/cron/pilote-payment-checkin
 *
 * Appelé une fois par jour (Vercel Cron). Auth : header
 * "Authorization: Bearer <CRON_SECRET>".
 *
 * Règlement des vols issus d'une annonce pilote = virement direct au pilote,
 * l'app ne peut pas savoir si le client a payé — seul le pilote peut le
 * constater sur son compte. Sans rappel, un impayé oublié traîne
 * silencieusement pour toujours (demande de Romain le 19/09, après un test
 * réel du flow annonce). Envoie un email au pilote, une seule fois par
 * réservation, dès que le vol a eu lieu depuis DELAI_JOURS et n'est toujours
 * pas marqué « payé ».
 */
export async function POST(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://fly-horizons.com";

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - DELAI_JOURS);
  const cutoffStr = cutoff.toISOString().slice(0, 10);

  const { data: reservations, error } = await supabase
    .from("reservations")
    .select("id, date_vol, acompte, clients(prenom, nom), pilotes(nom, email)")
    .eq("type_resa", "annonce_pilote")
    .neq("statut", "annulee")
    .not("pilote_paye", "is", true)
    .is("payment_checkin_sent_at", null)
    .lte("date_vol", cutoffStr);

  if (error) {
    console.error("[cron/pilote-payment-checkin] Supabase error:", error);
    return NextResponse.json({ error: "DB error" }, { status: 500 });
  }

  if (!reservations?.length) {
    return NextResponse.json({ reminded: 0 });
  }

  let reminded = 0;
  const errors: string[] = [];

  for (const resa of reservations) {
    const pilote = (Array.isArray(resa.pilotes) ? resa.pilotes[0] : resa.pilotes) as
      | { nom: string; email: string | null }
      | null;
    if (!pilote?.email) continue;

    const client = (Array.isArray(resa.clients) ? resa.clients[0] : resa.clients) as
      | { prenom: string | null; nom: string | null }
      | null;

    const jours = Math.round((Date.now() - new Date(resa.date_vol + "T12:00:00Z").getTime()) / 86_400_000);
    const dateStr = new Date(resa.date_vol + "T12:00:00Z").toLocaleDateString("fr-BE", {
      weekday: "long", day: "numeric", month: "long", year: "numeric",
    });

    try {
      await resend.emails.send({
        from: EMAIL_FROM,
        to: [pilote.email],
        replyTo: EMAIL_REPLY_TO,
        subject: `Rappel paiement · vol du ${dateStr}`,
        html: pilotePaiementCheckinEmail({
          clientNom: `${client?.prenom ?? ""} ${client?.nom ?? ""}`.trim() || "Client",
          dateStr,
          montant: resa.acompte,
          jours,
          volsUrl: `${siteUrl}/pilote/vols`,
        }),
      });
      await supabase
        .from("reservations")
        .update({ payment_checkin_sent_at: new Date().toISOString() })
        .eq("id", resa.id);
      reminded++;
    } catch (e) {
      errors.push(`Reminder failed for ${resa.id}: ${(e as Error).message}`);
      console.error(`[cron/pilote-payment-checkin] Erreur rappel ${resa.id}:`, e);
    }
  }

  return NextResponse.json({ reminded, errors: errors.length ? errors : undefined });
}
