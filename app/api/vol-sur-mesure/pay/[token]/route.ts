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

  // J-4 guard: payment link expires 4 days before the flight.
  // On bloque également si J-4 est à moins de 30 min : Stripe exige expires_at >= now+30min.
  const j4 = new Date(resa.date_vol + "T00:00:00Z");
  j4.setUTCDate(j4.getUTCDate() - 4);
  const j4Ts = Math.floor(j4.getTime() / 1000);
  const nowTs = Math.floor(Date.now() / 1000);
  if (nowTs >= j4Ts - 30 * 60) {
    return NextResponse.redirect(new URL("/vol-sur-mesure?error=lien_expire", siteUrl));
  }

  // Le voucher a déjà été réservé atomiquement au moment du checkout (statut "reserved").
  // Ici on récupère juste l'ID — on ne modifie pas le statut (déjà "reserved").
  // On accepte aussi "unused" au cas où une session précédente aurait expiré et le webhook
  // aurait libéré le voucher (ce qui ne devrait plus arriver, mais reste possible en cas de bug).
  let voucherId = "";
  if (resa.voucher_code) {
    const { data: voucherData } = await supabase
      .from("voucher_codes")
      .select("id")
      .eq("code", resa.voucher_code)
      .in("status", ["reserved", "unused"])
      .maybeSingle();

    if (!voucherData) {
      return NextResponse.redirect(new URL("/vol-sur-mesure?error=voucher_indisponible", siteUrl));
    }
    voucherId = voucherData.id;
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
      expires_at: Math.min(j4Ts, nowTs + 24 * 60 * 60), // max J-4, capped at 24h (Stripe limit)
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
    // Ne pas libérer le voucher ici — il a été réservé au checkout (pas dans cette route)
    // et doit rester "reserved" pour les tentatives suivantes.
    console.error("Stripe session creation error (vol-sur-mesure):", stripeError);
    return NextResponse.redirect(new URL("/vol-sur-mesure?error=erreur_paiement", siteUrl));
  }

  return NextResponse.redirect(session.url!);
}
