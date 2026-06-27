import { createAdminClient } from "@/lib/supabase/admin";

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
    }
  } catch {
    // Silencieux — l'opt-in newsletter ne doit jamais bloquer la réservation
  }
}
