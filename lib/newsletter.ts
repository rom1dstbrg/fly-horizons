import { createAdminClient } from "@/lib/supabase/admin";
import { resend, EMAIL_FROM } from "@/lib/resend";
import { newsletterConfirmationEmail } from "@/lib/email-templates";

export async function optInNewsletter(email: string, prenom?: string | null): Promise<void> {
  try {
    const supabase = createAdminClient();
    const normalizedEmail = email.toLowerCase().trim();

    const { data: existing } = await supabase
      .from("newsletter_subscribers")
      .select("id, active")
      .eq("email", normalizedEmail)
      .maybeSingle();

    if (!existing) {
      await supabase.from("newsletter_subscribers").insert({
        email: normalizedEmail,
        prenom: prenom || null,
      });
    } else if (!existing.active) {
      await supabase
        .from("newsletter_subscribers")
        .update({ active: true, unsubscribed_at: null, subscribed_at: new Date().toISOString() })
        .eq("id", existing.id);
    } else {
      return; // Déjà abonné actif, pas d'email
    }

    const { data: sub } = await supabase
      .from("newsletter_subscribers")
      .select("unsubscribe_token")
      .eq("email", normalizedEmail)
      .maybeSingle();

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://fly-horizons.com";
    const unsubscribeUrl = `${siteUrl}/newsletter/unsubscribe?token=${sub?.unsubscribe_token ?? ""}`;

    await resend.emails.send({
      from: EMAIL_FROM,
      to: [normalizedEmail],
      subject: "Bienvenue dans la newsletter Fly Horizons",
      html: newsletterConfirmationEmail(prenom ?? null, unsubscribeUrl),
    });
  } catch {
    // Silencieux — l'opt-in newsletter ne doit jamais bloquer la réservation
  }
}
