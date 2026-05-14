import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendOrderConfirmation } from "@/lib/email-service";

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
    const orderId = session.metadata?.orderId;

    if (!orderId) {
      return NextResponse.json({ error: "OrderId manquant" }, { status: 400 });
    }

    const { data: order } = await adminSupabase
      .from("orders")
      .select("*, items:order_items(*)")
      .eq("id", orderId)
      .single();

    if (!order) {
      return NextResponse.json({ error: "Commande introuvable" }, { status: 404 });
    }

    // Adresse de livraison depuis Stripe
    const shippingDetails = session.shipping_details;
    const shippingAddress = shippingDetails?.address
      ? {
          full_name: shippingDetails.name ?? "",
          line1: shippingDetails.address.line1 ?? "",
          line2: shippingDetails.address.line2 ?? "",
          city: shippingDetails.address.city ?? "",
          postal_code: shippingDetails.address.postal_code ?? "",
          country: shippingDetails.address.country ?? "",
        }
      : order.shipping_address;

    // Mettre a jour la commande
    await adminSupabase
      .from("orders")
      .update({
        status: "paid",
        stripe_payment_intent: session.payment_intent as string,
        shipping_address: shippingAddress,
      })
      .eq("id", orderId);

    // Decrementer le stock
    for (const item of order.items ?? []) {
      if (!item.product_id) continue;
      const { data: product } = await adminSupabase
        .from("products")
        .select("stock")
        .eq("id", item.product_id)
        .single();

      if (product) {
        await adminSupabase
          .from("products")
          .update({ stock: Math.max(0, product.stock - item.quantity) })
          .eq("id", item.product_id);
      }
    }

    // Incrementer usage coupon
    if (order.coupon_code) {
      await adminSupabase.rpc("increment_coupon_usage", {
        coupon_code: order.coupon_code,
      });
    }

    // Envoyer email de confirmation
    const customerEmail = session.customer_details?.email ?? session.customer_email;
    if (customerEmail) {
      await sendOrderConfirmation({
        to: customerEmail,
        orderRef: orderId.slice(0, 8).toUpperCase(),
        items: order.items?.map((i: {
          title: string;
          quantity: number;
          unit_price: number;
        }) => ({
          title: i.title,
          quantity: i.quantity,
          unit_price: i.unit_price,
        })) ?? [],
        subtotal: order.subtotal,
        shippingCost: order.shipping_cost,
        discountAmount: order.discount_amount,
        total: order.total,
        couponCode: order.coupon_code,
        shippingAddress,
      });
    }

    console.log(`Commande ${orderId} payee, email envoye a ${customerEmail}`);
  }

  if (event.type === "checkout.session.expired") {
    const session = event.data.object as Stripe.Checkout.Session;
    const orderId = session.metadata?.orderId;
    if (orderId) {
      await adminSupabase
        .from("orders")
        .update({ status: "cancelled" })
        .eq("id", orderId)
        .eq("status", "pending");
    }
  }

  return NextResponse.json({ received: true });
}