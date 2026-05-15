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

  // Already paid or covered by voucher
  if (totalAcompte <= 0 || resa.statut === "acompte_recu" || resa.statut === "vol_effectue" || resa.statut === "solde") {
    return NextResponse.redirect(new URL("/vol-sur-mesure/success", siteUrl));
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
      voucherId: "",
      voucherCode: resa.voucher_code || "",
      paymentToken: token,
    },
    success_url: `${siteUrl}/vol-sur-mesure/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${siteUrl}/vol-sur-mesure?cancelled=1`,
  });

  return NextResponse.redirect(session.url!);
}
