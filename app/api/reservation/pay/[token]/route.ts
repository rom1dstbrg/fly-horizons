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
    return NextResponse.redirect(new URL("/reservation?error=lien_invalide", siteUrl));
  }

  const supabase = createAdminClient();

  const { data: resa } = await supabase
    .from("reservations")
    .select("*, clients(*)")
    .eq("payment_token", token)
    .eq("type_resa", "standard")
    .single();

  if (!resa) {
    return NextResponse.redirect(new URL("/reservation?error=lien_invalide", siteUrl));
  }

  if (resa.statut === "annulee") {
    return NextResponse.redirect(new URL("/reservation?error=reservation_annulee", siteUrl));
  }
  if (resa.statut !== "payment_pending") {
    return NextResponse.redirect(new URL("/reservation/success", siteUrl));
  }

  const montant = resa.acompte ?? 0;
  if (montant <= 0) {
    // Free reservation — mark as en_attente and redirect to success
    await supabase
      .from("reservations")
      .update({ statut: "en_attente", payment_token: null })
      .eq("id", resa.id);
    return NextResponse.redirect(new URL("/reservation/success", siteUrl));
  }

  // Resolve the voucher ID from the stored code so the webhook can mark it used
  let resolvedVoucherId = "";
  if (resa.voucher_code) {
    const { data: voucher } = await supabase
      .from("voucher_codes")
      .select("id")
      .eq("code", resa.voucher_code)
      .in("status", ["unused", "reserved"])
      .maybeSingle();
    if (voucher) resolvedVoucherId = voucher.id;
  }

  const c = resa.clients as { prenom: string; nom: string; email: string };
  const dateStr = new Date(resa.date_vol + "T12:00:00Z").toLocaleDateString("fr-BE", {
    day: "numeric", month: "long", year: "numeric",
  });

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    customer_email: c.email,
    locale: "fr",
    expires_at: Math.floor(Date.now() / 1000) + 30 * 60,
    line_items: [
      {
        price_data: {
          currency: "eur",
          product_data: {
            name: `Vol Fly Horizons — ${resa.duree} min`,
            description: `${dateStr} à ${resa.heure_vol} · ${c.prenom} ${c.nom}`,
          },
          unit_amount: Math.round(montant * 100),
        },
        quantity: 1,
      },
    ],
    metadata: {
      type: "reservation",
      reservationId: resa.id,
      clientId: resa.client_id,
      voucherId: resolvedVoucherId,
      voucherCode: resa.voucher_code || "",
      paymentToken: token,
    },
    success_url: `${siteUrl}/reservation/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${siteUrl}/reservation?cancelled=1`,
  });

  return NextResponse.redirect(session.url!);
}
