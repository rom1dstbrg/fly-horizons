import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/admin";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-04-22.dahlia",
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  if (!token) {
    return NextResponse.redirect(new URL("/vol-sur-mesure?error=lien_invalide", siteUrl));
  }

  const supabase = createAdminClient();

  const { data: resa } = await supabase
    .from("reservations")
    .select("*, clients(*)")
    .eq("payment_token", token)
    .single();

  if (!resa) {
    return NextResponse.redirect(new URL("/vol-sur-mesure?error=lien_invalide", siteUrl));
  }

  const totalAcompte = resa.acompte ?? 0;

  if (resa.statut === "annulee") {
    return NextResponse.redirect(new URL("/vol-sur-mesure?error=reservation_annulee", siteUrl));
  }

  // Already paid or covered by voucher
  if (totalAcompte <= 0 || resa.statut === "acompte_recu" || resa.statut === "vol_effectue" || resa.statut === "solde") {
    return NextResponse.redirect(new URL("/vol-sur-mesure/success", siteUrl));
  }

  // Atomic voucher claim — prevents double-use if two sessions are opened
  let voucherId = "";
  if (resa.voucher_code) {
    const { data: claimed } = await supabase
      .from("voucher_codes")
      .update({ status: "reserved" })
      .eq("code", resa.voucher_code)
      .eq("status", "unused")
      .select("id")
      .maybeSingle();

    // Voucher already reserved/used — abort rather than let payment proceed
    // with a voucher that won't be honoured
    if (!claimed) {
      return NextResponse.redirect(new URL("/vol-sur-mesure?error=voucher_indisponible", siteUrl));
    }
    voucherId = claimed.id;
  }

  const c = resa.clients as { prenom: string; nom: string; email: string };
  const dateStr = new Date(resa.date_vol + "T12:00:00Z").toLocaleDateString("fr-BE", {
    day: "numeric", month: "long", year: "numeric",
  });

  let session;
  try {
    session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      customer_email: c.email,
      locale: "fr",
      expires_at: Math.floor(Date.now() / 1000) + 30 * 60, // 30 min — libère le voucher plus vite
      line_items: [
        {
          price_data: {
            currency: "eur",
            product_data: {
              name: `Acompte vol sur mesure — ~${resa.duree} min`,
              description: `${dateStr} à ${resa.heure_vol} · ${c.prenom} ${c.nom}`,
            },
            unit_amount: Math.round(totalAcompte * 100),
          },
          quantity: 1,
        },
      ],
      metadata: {
        type: "reservation_perso",
        reservationId: resa.id,
        clientId: resa.client_id,
        voucherId,
        voucherCode: resa.voucher_code || "",
        couponCode: resa.coupon_code || "",
        paymentToken: token,
      },
      success_url: `${siteUrl}/vol-sur-mesure/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/vol-sur-mesure?cancelled=1`,
    });
  } catch (stripeError) {
    // Rollback voucher claim if Stripe session creation failed
    if (voucherId) {
      await supabase.from("voucher_codes").update({ status: "unused" }).eq("id", voucherId).eq("status", "reserved");
    }
    console.error("Stripe session creation error (vol-sur-mesure):", stripeError);
    return NextResponse.redirect(new URL("/vol-sur-mesure?error=erreur_paiement", siteUrl));
  }

  return NextResponse.redirect(session.url!);
}
