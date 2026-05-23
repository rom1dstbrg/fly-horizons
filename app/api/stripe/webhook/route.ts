import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendOrderConfirmation, sendVoucherEmail } from "@/lib/email-service";
import { generateVoucherCode } from "@/lib/vouchers";
import type { VoucherEmailCode } from "@/lib/email-templates";
import { reservationPaymentConfirmationEmail, volSurMesureAcompteEmail } from "@/lib/email-templates";
import { resend, EMAIL_FROM, EMAIL_REPLY_TO } from "@/lib/resend";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-04-22.dahlia",
});

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Signature manquante" }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error("Webhook signature error:", err);
    return NextResponse.json({ error: "Signature invalide" }, { status: 400 });
  }

  const adminSupabase = createAdminClient();

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;

    // ── Vol sur mesure (acompte) ──────────────────────────────
    if (session.metadata?.type === "reservation_perso") {
      const { reservationId, voucherId, voucherCode, couponCode, paymentToken } = session.metadata;
      if (reservationId) {
        await adminSupabase.from("reservations")
          .update({ statut: "acompte_recu", payment_token: null })
          .eq("id", reservationId)
          .eq("statut", "en_attente"); // Garde idempotence — évite de rétrograder si déjà avancé
        if (voucherId) {
          await adminSupabase.from("voucher_codes").update({ status: "used", used_at: new Date().toISOString() }).eq("id", voucherId);
        }
        if (couponCode) {
          await adminSupabase.rpc("increment_coupon_usage", { coupon_code: couponCode });
        }
        const { data: resa } = await adminSupabase.from("reservations").select("*, clients(*)").eq("id", reservationId).single();
        if (resa?.clients) {
          const c = resa.clients as { prenom: string; nom: string; email: string };
          const dateStr = new Date(resa.date_vol + "T12:00:00Z").toLocaleDateString("fr-BE", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
          const montantPaye = session.amount_total ? session.amount_total / 100 : 0;
          await resend.emails.send({
            from: EMAIL_FROM, to: [c.email], replyTo: EMAIL_REPLY_TO,
            subject: "Confirmation de paiement — Vol sur mesure Fly Horizons",
            html: volSurMesureAcompteEmail({
              prenom: c.prenom,
              nom: c.nom,
              dateStr,
              heure: resa.heure_vol,
              dureeEstimee: resa.duree,
              voucherCode: voucherCode || null,
              montantPaye,
              reservationId: reservationId,
            }),
          });
          await resend.emails.send({
            from: EMAIL_FROM, to: [EMAIL_REPLY_TO],
            subject: `[Vol sur mesure payé] ${c.prenom} ${c.nom} — ${resa.date_vol}`,
            html: `<p>${c.prenom} ${c.nom} (${c.email}) a payé l'acompte pour un vol sur mesure le <strong>${resa.date_vol} à ${resa.heure_vol}</strong>, ~${resa.duree} min, ${resa.distance_km ?? "?"} km.</p><p>Waypoints : ${(resa.waypoints ?? []).length} points.</p>`,
          });
        }
      }
      return NextResponse.json({ received: true });
    }

    // ── Réservation standard ──────────────────────────────────
    if (session.metadata?.type === "reservation") {
      const { reservationId, voucherId, voucherCode, couponCode } = session.metadata;
      if (reservationId) {
        await adminSupabase
          .from("reservations")
          .update({ statut: "en_attente", payment_token: null })
          .eq("id", reservationId)
          .eq("statut", "payment_pending");

        if (voucherId) {
          await adminSupabase
            .from("voucher_codes")
            .update({ status: "used", used_at: new Date().toISOString() })
            .eq("id", voucherId);
        }

        if (couponCode) {
          await adminSupabase.rpc("increment_coupon_usage", { coupon_code: couponCode });
        }

        // Récupérer la réservation + client pour l'email
        const { data: resa } = await adminSupabase
          .from("reservations")
          .select("*, clients(*)")
          .eq("id", reservationId)
          .single();

        if (resa?.clients) {
          const c = resa.clients as { prenom: string; nom: string; email: string };
          const dateStr = new Date(resa.date_vol + "T12:00:00Z").toLocaleDateString("fr-BE", {
            weekday: "long", day: "numeric", month: "long", year: "numeric",
          });
          const montantPaye = session.amount_total ? session.amount_total / 100 : 0;
          await resend.emails.send({
            from: EMAIL_FROM,
            to: [c.email],
            replyTo: EMAIL_REPLY_TO,
            subject: "Confirmation de paiement — Fly Horizons",
            html: reservationPaymentConfirmationEmail({
              prenom: c.prenom,
              nom: c.nom,
              dateStr,
              heure: resa.heure_vol,
              duree: resa.duree,
              passengers: resa.passagers ?? undefined,
              poids_total: resa.poids_total ?? null,
              voucherCode: voucherCode || null,
              montantPaye,
              reservationId: reservationId,
            }),
          });

          await resend.emails.send({
            from: EMAIL_FROM,
            to: [EMAIL_REPLY_TO],
            subject: `[Réservation payée] ${c.prenom} ${c.nom} — ${resa.date_vol} à ${resa.heure_vol}`,
            html: `<p>${c.prenom} ${c.nom} (${c.email}) a payé et réservé le <strong>${resa.date_vol} à ${resa.heure_vol}</strong> pour ${resa.duree} min.</p>${voucherCode ? `<p>Voucher : ${voucherCode}</p>` : ""}`,
          });
        }
      }
      return NextResponse.json({ received: true });
    }

    // ── Commande shop ────────────────────────────────────────
    const orderId = session.metadata?.orderId;

    if (!orderId) {
      return NextResponse.json({ received: true });
    }

    const { data: order } = await adminSupabase
      .from("orders")
      .select("*, items:order_items(*)")
      .eq("id", orderId)
      .single();

    if (!order) {
      return NextResponse.json({ error: "Commande introuvable" }, { status: 404 });
    }

    // Récupère la session fraîche — shipping_details est dans collected_information (API 2026-04-22)
    const fullSession = await stripe.checkout.sessions.retrieve(session.id) as Stripe.Checkout.Session;

    const shippingDetails = fullSession.collected_information?.shipping_details ?? null;
    const customerEmail = fullSession.customer_details?.email ?? fullSession.customer_email ?? "";
    const customerName = shippingDetails?.name || fullSession.customer_details?.name || undefined;

    const shippingAddress = shippingDetails?.address
      ? {
          full_name: shippingDetails.name ?? "",
          email: customerEmail,
          line1: shippingDetails.address.line1 ?? "",
          line2: shippingDetails.address.line2 ?? "",
          city: shippingDetails.address.city ?? "",
          postal_code: shippingDetails.address.postal_code ?? "",
          country: shippingDetails.address.country ?? "",
        }
      : { ...order.shipping_address, email: customerEmail };

    await adminSupabase
      .from("orders")
      .update({
        status: "paid",
        stripe_payment_intent: fullSession.payment_intent as string,
        shipping_address: shippingAddress,
      })
      .eq("id", orderId);

    // Traitement par article : stock physique OU génération de codes voucher
    const voucherCodes: VoucherEmailCode[] = [];

    for (const item of order.items ?? []) {
      if (!item.product_id) continue;

      const { data: product } = await adminSupabase
        .from("products")
        .select("stock, product_type, voucher_duration_minutes")
        .eq("id", item.product_id)
        .single();

      if (!product) continue;

      const isVoucher = product.product_type === "voucher" ||
        (product.voucher_duration_minutes != null && product.voucher_duration_minutes > 0);

      if (isVoucher) {
        // Générer un code par quantité
        for (let i = 0; i < item.quantity; i++) {
          const code = generateVoucherCode();
          const expiresAt = new Date();
          expiresAt.setFullYear(expiresAt.getFullYear() + 1);
          await adminSupabase.from("voucher_codes").insert({
            code,
            order_id: orderId,
            order_item_id: item.id,
            product_id: item.product_id,
            duration_minutes: product.voucher_duration_minutes ?? 60,
            product_title: item.title,
            recipient_email: customerEmail || null,
            recipient_name: customerName ?? null,
            status: "unused",
            expires_at: expiresAt.toISOString(),
          });
          voucherCodes.push({
            code,
            duration_minutes: product.voucher_duration_minutes ?? 60,
            product_title: item.title,
          });
        }
      } else {
        // Décrémenter le stock pour les produits physiques
        await adminSupabase
          .from("products")
          .update({ stock: Math.max(0, product.stock - item.quantity) })
          .eq("id", item.product_id);
      }
    }

    if (order.coupon_code) {
      await adminSupabase.rpc("increment_coupon_usage", {
        coupon_code: order.coupon_code,
      });
    }

    if (customerEmail) {
      await sendOrderConfirmation({
        to: customerEmail,
        orderRef: orderId.slice(0, 8).toUpperCase(),
        customerName,
        items: order.items?.map((i: {
          title: string;
          quantity: number;
          unit_price: number;
          image_url?: string | null;
        }) => ({
          title: i.title,
          quantity: i.quantity,
          unit_price: i.unit_price,
          image_url: i.image_url ?? null,
        })) ?? [],
        subtotal: order.subtotal,
        shippingCost: order.shipping_cost,
        discountAmount: order.discount_amount,
        total: order.total,
        couponCode: order.coupon_code,
        shippingAddress,
        orderDate: order.created_at,
      });

      // Email voucher séparé avec les codes
      if (voucherCodes.length > 0) {
        await sendVoucherEmail({
          to: customerEmail,
          orderRef: orderId.slice(0, 8).toUpperCase(),
          customerName,
          codes: voucherCodes,
        });
      }
    }

    console.log(`Commande ${orderId} payée — ${voucherCodes.length} code(s) voucher générés`);
  }

  if (event.type === "checkout.session.expired") {
    const session = event.data.object as Stripe.Checkout.Session;
    const { orderId, voucherId, reservationId, type, paymentToken } = session.metadata ?? {};

    // Release any voucher that was atomically reserved for this session
    if (voucherId) {
      await adminSupabase
        .from("voucher_codes")
        .update({ status: "unused" })
        .eq("id", voucherId)
        .eq("status", "reserved");
    }

    // Cancel pending shop order
    if (orderId) {
      await adminSupabase
        .from("orders")
        .update({ status: "cancelled" })
        .eq("id", orderId)
        .eq("status", "pending");
    }

    // Cancel pending reservation — conditions séparées par type et par flux :
    // - standard, checkout direct (pas de paymentToken) : annuler immédiatement à l'expiration
    //   (le client avait 30 min devant lui au moment du checkout)
    // - standard, pay-later (paymentToken présent) : NE PAS annuler ici — le cron gère la
    //   deadline à T-48h avant le vol ; le client peut recliquer son lien autant de fois qu'il veut
    // - perso : en_attente → annulee (acompte_recu = déjà payée, ne pas toucher)
    if (reservationId && type === "reservation" && !paymentToken) {
      await adminSupabase
        .from("reservations")
        .update({ statut: "annulee" })
        .eq("id", reservationId)
        .eq("statut", "payment_pending");
    }
    if (reservationId && type === "reservation_perso") {
      await adminSupabase
        .from("reservations")
        .update({ statut: "annulee" })
        .eq("id", reservationId)
        .eq("statut", "en_attente");
    }
  }

  return NextResponse.json({ received: true });
}
