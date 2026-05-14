import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendOrderConfirmation } from "@/lib/email-service";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-04-22.dahlia",
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { items, shippingCountry, couponCode } = body;

    if (!items || items.length === 0) {
      return NextResponse.json({ error: "Panier vide" }, { status: 400 });
    }

    const supabase = await createClient();
    const adminSupabase = createAdminClient();
    const { data: { user } } = await supabase.auth.getUser();

    const { data: shippingRate } = await adminSupabase
      .from("shipping_rates")
      .select("*")
      .eq("country_code", shippingCountry ?? "BE")
      .eq("active", true)
      .single();

    const shippingCost = shippingRate?.rate_standard ?? 4.95;

    const productIds = items.map((i: { id: string }) => i.id);
    const { data: products } = await adminSupabase
      .from("products")
      .select("*")
      .in("id", productIds)
      .eq("active", true);

    if (!products || products.length !== items.length) {
      return NextResponse.json({ error: "Un ou plusieurs produits sont indisponibles." }, { status: 400 });
    }

    for (const item of items) {
      const product = products.find((p) => p.id === item.id);
      if (!product) return NextResponse.json({ error: "Produit introuvable" }, { status: 400 });
      if (product.stock < item.quantity) return NextResponse.json({ error: `Stock insuffisant pour : ${product.title}` }, { status: 400 });
    }

    const subtotal = items.reduce(
      (sum: number, item: { price: number; quantity: number }) => sum + item.price * item.quantity, 0
    );

    let discountAmount = 0;
    let validCoupon = null;
    let isFreeEverything = false;

    if (couponCode) {
      const { data: coupon } = await adminSupabase
        .from("coupons")
        .select("*")
        .eq("code", couponCode.toUpperCase())
        .eq("active", true)
        .single();

      if (coupon) {
        const notExpired = !coupon.expires_at || new Date(coupon.expires_at) > new Date();
        if (notExpired) {
          if (coupon.type === "percentage") {
            if (coupon.value >= 100) {
              discountAmount = subtotal + shippingCost;
              isFreeEverything = true;
            } else {
              discountAmount = (subtotal * coupon.value) / 100;
            }
          } else {
            discountAmount = Math.min(coupon.value, subtotal);
          }
          validCoupon = coupon;
        }
      }
    }

    const total = Math.max(0, subtotal - discountAmount + (isFreeEverything ? 0 : shippingCost));

    const { data: order, error: orderError } = await adminSupabase
      .from("orders")
      .insert({
        user_id: user?.id ?? null,
        status: "pending",
        subtotal,
        shipping_cost: isFreeEverything ? 0 : shippingCost,
        discount_amount: discountAmount,
        total,
        coupon_code: validCoupon?.code ?? null,
        shipping_address: {},
      })
      .select()
      .single();

    if (orderError || !order) {
      return NextResponse.json({ error: "Erreur creation commande" }, { status: 500 });
    }

    await adminSupabase.from("order_items").insert(
      items.map((item: { id: string; title: string; price: number; quantity: number; image_url: string | null }) => ({
        order_id: order.id,
        product_id: item.id,
        title: item.title,
        unit_price: item.price,
        quantity: item.quantity,
        image_url: item.image_url,
      }))
    );

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

    // Coupon 100% : bypass Stripe
    if (isFreeEverything) {
      await adminSupabase.from("orders").update({ status: "paid" }).eq("id", order.id);

      for (const item of items) {
        const product = products.find((p) => p.id === item.id);
        if (product) {
          await adminSupabase.from("products")
            .update({ stock: Math.max(0, product.stock - item.quantity) })
            .eq("id", item.id);
        }
      }

      if (validCoupon) {
        await adminSupabase.rpc("increment_coupon_usage", { coupon_code: validCoupon.code });
      }

      if (user?.email) {
        await sendOrderConfirmation({
          to: user.email,
          orderRef: order.id.slice(0, 8).toUpperCase(),
          items: items.map((i: { title: string; price: number; quantity: number }) => ({
            title: i.title,
            quantity: i.quantity,
            unit_price: i.price,
          })),
          subtotal,
          shippingCost: 0,
          discountAmount,
          total: 0,
          couponCode: validCoupon?.code,
        });
      }

      return NextResponse.json({ url: `${siteUrl}/orders/success?order_id=${order.id}` });
    }

    // Line items Stripe — typage explicite sans SessionCreateParams
    type LineItem = {
      price_data: {
        currency: string;
        product_data: { name: string; images?: string[] };
        unit_amount: number;
      };
      quantity: number;
    };

    const lineItems: LineItem[] = [
      ...items.map((item: { title: string; price: number; quantity: number; image_url: string | null }) => ({
        price_data: {
          currency: "eur",
          product_data: {
            name: item.title,
            images: item.image_url ? [item.image_url] : [],
          },
          unit_amount: Math.round(item.price * 100),
        },
        quantity: item.quantity,
      })),
      {
        price_data: {
          currency: "eur",
          product_data: { name: `Livraison (${shippingRate?.country_name ?? "Belgique"})` },
          unit_amount: Math.round(shippingCost * 100),
        },
        quantity: 1,
      },
    ];

    if (discountAmount > 0) {
      lineItems.push({
        price_data: {
          currency: "eur",
          product_data: { name: `Reduction (${couponCode})` },
          unit_amount: -Math.round(discountAmount * 100),
        },
        quantity: 1,
      });
    }

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: lineItems,
      shipping_address_collection: {
        allowed_countries: ["BE", "FR", "NL", "DE"],
      },
      metadata: { orderId: order.id, userId: user?.id ?? "" },
      customer_email: user?.email ?? undefined,
      success_url: `${siteUrl}/orders/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/cart`,
      locale: "fr",
    });

    await adminSupabase.from("orders")
      .update({ stripe_session_id: session.id })
      .eq("id", order.id);

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Stripe checkout error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}