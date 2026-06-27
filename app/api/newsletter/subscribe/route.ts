import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { resend, EMAIL_FROM } from "@/lib/resend";
import { newsletterConfirmationEmail } from "@/lib/email-templates";

export async function POST(req: NextRequest) {
  try {
    const { email, prenom } = await req.json();

    const cleaned = email?.toLowerCase()?.trim();
    if (!cleaned || !cleaned.includes("@") || !cleaned.includes(".")) {
      return NextResponse.json({ error: "Email invalide." }, { status: 400 });
    }

    const supabase = createAdminClient();

    const { data: existing } = await supabase
      .from("newsletter_subscribers")
      .select("id, active")
      .eq("email", cleaned)
      .single();

    if (existing) {
      if (existing.active) {
        return NextResponse.json({ error: "already_subscribed" }, { status: 409 });
      }
      await supabase
        .from("newsletter_subscribers")
        .update({ active: true, unsubscribed_at: null, subscribed_at: new Date().toISOString(), prenom: prenom?.trim() || null })
        .eq("id", existing.id);
    } else {
      await supabase.from("newsletter_subscribers").insert({
        email: cleaned,
        prenom: prenom?.trim() || null,
      });
    }

    const { data: sub } = await supabase
      .from("newsletter_subscribers")
      .select("unsubscribe_token")
      .eq("email", cleaned)
      .single();

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://fly-horizons.com";
    const unsubscribeUrl = `${siteUrl}/newsletter/unsubscribe?token=${sub?.unsubscribe_token ?? ""}`;

    await resend.emails.send({
      from: EMAIL_FROM,
      to: [cleaned],
      subject: "Bienvenue dans la newsletter Fly Horizons",
      html: newsletterConfirmationEmail(prenom?.trim() || null, unsubscribeUrl),
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Newsletter subscribe error:", err);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
