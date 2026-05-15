import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/admin";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-04-22.dahlia",
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { prenom, nom, email, telephone, duree, date, heure, amount_cents, voucher_code, voucher_id, poids_total } = body;

    if (!prenom || !nom || !email || !duree || !date || !heure || !amount_cents) {
      return NextResponse.json({ error: "Champs obligatoires manquants" }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Créer le client
    const { data: clientId } = await supabase.rpc("next_client_id");
    if (!clientId) return NextResponse.json({ error: "Erreur génération ID client" }, { status: 500 });

    await supabase.from("clients").insert({
      id: clientId,
      nom,
      prenom,
      email,
      telephone: telephone || null,
    });

    // Créer la réservation en attente de paiement
    const { data: resa, error: resaErr } = await supabase
      .from("reservations")
      .insert({
        client_id: clientId,
        date_vol: date,
        heure_vol: heure,
        duree: parseInt(duree),
        passagers: 1,
        statut: "payment_pending",
        type_resa: "standard",
        voucher_code: voucher_code || null,
        poids_total: poids_total ? parseInt(poids_total) : null,
      })
      .select()
      .single();

    if (resaErr) return NextResponse.json({ error: "Erreur création réservation" }, { status: 500 });

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
    const dateStr = new Date(date + "T12:00:00Z").toLocaleDateString("fr-BE", {
      day: "numeric", month: "long", year: "numeric",
    });

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      customer_email: email,
      locale: "fr",
      line_items: [
        {
          price_data: {
            currency: "eur",
            product_data: {
              name: `Vol Fly Horizons — ${duree} min`,
              description: `${dateStr} à ${heure} · ${prenom} ${nom}`,
            },
            unit_amount: parseInt(amount_cents),
          },
          quantity: 1,
        },
      ],
      metadata: {
        type: "reservation",
        reservationId: resa.id,
        clientId,
        voucherId: voucher_id || "",
        voucherCode: voucher_code || "",
      },
      success_url: `${siteUrl}/reservation/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/reservation?cancelled=1`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Reservation checkout error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
