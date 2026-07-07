import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { brusselsTimestamp } from "@/lib/utils";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-04-22.dahlia",
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const redirectAccount = new URL("/account/reservations", siteUrl);

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/login", siteUrl));

  const adminSupabase = createAdminClient();

  const { data: resa } = await adminSupabase
    .from("reservations")
    .select("*, clients(*)")
    .eq("id", id)
    .eq("type_resa", "standard")
    .eq("statut", "payment_pending")
    .single();

  if (!resa) return NextResponse.redirect(redirectAccount);

  // Vérifier que la réservation appartient à l'utilisateur connecté
  const c = resa.clients as { prenom: string; nom: string; email: string } | null;
  if (!c || c.email.toLowerCase() !== user.email!.toLowerCase()) {
    return NextResponse.redirect(redirectAccount);
  }

  // T-48h : si le vol est trop proche, annuler silencieusement
  const hoursUntil = (brusselsTimestamp(resa.date_vol, resa.heure_vol) - Date.now()) / (1000 * 60 * 60);
  if (hoursUntil < 48) {
    await adminSupabase
      .from("reservations")
      .update({ statut: "annulee", payment_token: null })
      .eq("id", id)
      .eq("statut", "payment_pending");
    return NextResponse.redirect(new URL("/reservation?error=lien_paiement_expire", siteUrl));
  }

  // Recalculer le montant côté serveur
  const { data: settings } = await adminSupabase
    .from("crm_settings")
    .select("key, value")
    .in("key", ["prix_heure"]);
  const prixHeure = parseFloat(settings?.find(s => s.key === "prix_heure")?.value ?? "254");

  const { data: packProduct } = await adminSupabase
    .from("products")
    .select("price")
    .eq("active", true)
    .eq("product_type", "voucher")
    .eq("voucher_duration_minutes", resa.duree)
    .maybeSingle();

  // Voucher
  let voucherMins = 0;
  let resolvedVoucherId = "";
  if (resa.voucher_code) {
    const { data: voucher } = await adminSupabase
      .from("voucher_codes")
      .select("id, duration_minutes")
      .eq("code", resa.voucher_code)
      .in("status", ["unused", "reserved"])
      .maybeSingle();
    if (voucher) { voucherMins = voucher.duration_minutes ?? 0; resolvedVoucherId = voucher.id; }
  }

  const billableMins = Math.max(0, resa.duree - voucherMins);
  const basePrice = packProduct?.price ?? Math.round((prixHeure / 60) * resa.duree);
  let amountCents = billableMins === 0 ? 0 : Math.round(
    packProduct ? basePrice * 100 : (prixHeure / 60) * billableMins * 100
  );

  // Coupon
  if (resa.coupon_code) {
    const { data: coupon } = await adminSupabase
      .from("coupons")
      .select("*")
      .eq("code", resa.coupon_code)
      .eq("active", true)
      .maybeSingle();
    if (coupon && !(coupon.expires_at && new Date(coupon.expires_at) < new Date())) {
      const discountCents = coupon.type === "percentage"
        ? Math.round(amountCents * coupon.value / 100)
        : Math.min(Math.round(coupon.value * 100), amountCents);
      amountCents = Math.max(0, amountCents - discountCents);
    }
  }

  if (amountCents <= 0) {
    await adminSupabase.from("reservations").update({ statut: "en_attente", payment_token: null }).eq("id", id);
    return NextResponse.redirect(new URL("/reservation/success", siteUrl));
  }

  const dateStr = new Date(resa.date_vol + "T12:00:00Z").toLocaleDateString("fr-BE", {
    day: "numeric", month: "long", year: "numeric",
  });

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    customer_email: c.email,
    locale: "fr",
    expires_at: Math.floor(Date.now() / 1000) + 30 * 60,
    line_items: [{
      price_data: {
        currency: "eur",
        product_data: {
          name: `Vol Fly Horizons — ${resa.duree} min`,
          description: `${dateStr} à ${resa.heure_vol} · ${c.prenom} ${c.nom}`,
        },
        unit_amount: amountCents,
      },
      quantity: 1,
    }],
    metadata: {
      type: "reservation",
      reservationId: resa.id,
      clientId: resa.client_id,
      voucherId: resolvedVoucherId,
      voucherCode: resa.voucher_code || "",
      couponCode: resa.coupon_code || "",
    },
    success_url: `${siteUrl}/reservation/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${siteUrl}/account/reservations`,
  });

  return NextResponse.redirect(session.url!);
}
