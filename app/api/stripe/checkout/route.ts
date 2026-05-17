import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendOrderConfirmation, sendVoucherEmail } from "@/lib/email-service";
import { generateVoucherCode } from "@/lib/vouchers";
import type { VoucherEmailCode } from "@/lib/email-templates";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-04-22.dahlia",
});

// A product is a voucher if product_type = "voucher" OR it has a duration set
// (handles products created before the product_type column was added)
function isVoucherProduct(p: { product_type?: string | null; voucher_duration_minutes?: number | null }) {
  return p.product_type === "voucher" || (p.voucher_duration_minutes != null && p.voucher_duration_minutes > 0);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { items, shippingCountry, couponCode, shippingAddress: clientAddress } = body;

    if (!items || items.length === 0) {
      return NextResponse.json({ error: "Panier vide" }, { status: 400 });
    }

    const supabase = await createClient();
    const adminSupabase = createAdminClient();
    const { data: { user } } = await supabase.auth.getUser();

    const productIds = items.map((i: { id: string }) => i.id);
    const { data: products } = await adminSupabase
      .from("products")
      .select("*")
      .in("id", productIds)
      .eq("active", true);

    if (!products || products.length !== items.length) {
      return NextResponse.json({ error: "Un ou plusieurs produits sont indisponibles." }, { status: 400 });
    }

    const allVouchers = products.every(isVoucherProduct);

    for (const item of items) {
      const product = products.find((p) => p.id === item.id);
      if (!product) return NextResponse.json({ error: "Produit introuvable" }, { status: 400 });
      if (!isVoucherProduct(product) && product.stock < item.quantity) {
        return NextResponse.json({ error: `Stock insuffisant pour : ${product.title}` }, { status: 400 });
      }
    }

    // Shipping cost is 0 for voucher-only orders
    let shippingCost = 0;
    let shippingRateData = null;
    if (!allVouchers && shippingCountry) {
      const { data: shippingRate } = await adminSupabase
        .from("shipping_rates")
        .select("*")
        .eq("country_code", shippingCountry)
        .eq("active", true)
        .single();
      shippingRateData = shippingRate;
      shippingCost = shippingRate?.rate_standard ?? 4.95;
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

      if (!coupon) {
        return NextResponse.json({ error: "Code promo invalide." }, { status: 400 });
      }
      if (coupon.expires_at && new Date(coupon.expires_at) <= new Date()) {
        return NextResponse.json({ error: "Ce code promo a expiré." }, { status: 400 });
      }
      if (coupon.max_uses && (coupon.usage_count ?? 0) >= coupon.max_uses) {
        return NextResponse.json({ error: "Ce code promo n'est plus disponible (quota atteint)." }, { status: 400 });
      }
      if (coupon.max_uses_per_user && user) {
        const { count } = await adminSupabase
          .from("orders")
          .select("id", { count: "exact", head: true })
          .eq("coupon_code", coupon.code)
          .eq("user_id", user.id)
          .neq("status", "cancelled");
        if ((count ?? 0) >= coupon.max_uses_per_user) {
          return NextResponse.json({ error: "Vous avez déjà utilisé ce code promo." }, { status: 400 });
        }
      }

      // Calculer le sous-total applicable selon la restriction du coupon
      const applicableSubtotal = coupon.applies_to === "voucher"
        ? items.reduce((sum: number, item: { id: string; price: number; quantity: number }) => {
            const p = products.find(p => p.id === item.id);
            return sum + (p && isVoucherProduct(p) ? item.price * item.quantity : 0);
          }, 0)
        : coupon.applies_to === "physical"
        ? items.reduce((sum: number, item: { id: string; price: number; quantity: number }) => {
            const p = products.find(p => p.id === item.id);
            return sum + (p && !isVoucherProduct(p) ? item.price * item.quantity : 0);
          }, 0)
        : subtotal;

      if (coupon.type === "percentage") {
        discountAmount = coupon.value >= 100
          ? applicableSubtotal
          : (applicableSubtotal * coupon.value) / 100;
      } else {
        discountAmount = Math.min(coupon.value, applicableSubtotal);
      }
      isFreeEverything = Math.max(0, subtotal - discountAmount + shippingCost) === 0;
      validCoupon = coupon;
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

    // Coupon 100% : bypass Stripe — handle stock + voucher codes here
    if (isFreeEverything) {
      const savedAddress = clientAddress
        ? { ...clientAddress, email: user?.email ?? "" }
        : { email: user?.email ?? "" };

      await adminSupabase.from("orders").update({
        status: "paid",
        shipping_address: savedAddress,
      }).eq("id", order.id);

      const voucherCodes: VoucherEmailCode[] = [];

      for (const item of items) {
        const product = products.find((p) => p.id === item.id);
        if (!product) continue;

        if (isVoucherProduct(product)) {
          for (let i = 0; i < item.quantity; i++) {
            const code = generateVoucherCode();
            await adminSupabase.from("voucher_codes").insert({
              code,
              order_id: order.id,
              product_id: item.id,
              duration_minutes: product.voucher_duration_minutes ?? 60,
              product_title: item.title,
              recipient_email: user?.email ?? null,
              recipient_name: clientAddress?.full_name ?? null,
              status: "unused",
            });
            voucherCodes.push({
              code,
              duration_minutes: product.voucher_duration_minutes ?? 60,
              product_title: item.title,
            });
          }
        } else {
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
          customerName: clientAddress?.full_name || undefined,
          items: items.map((i: { title: string; price: number; quantity: number; image_url?: string | null }) => ({
            title: i.title,
            quantity: i.quantity,
            unit_price: i.price,
            image_url: i.image_url ?? null,
          })),
          subtotal,
          shippingCost: 0,
          discountAmount,
          total: 0,
          couponCode: validCoupon?.code,
          shippingAddress: clientAddress ?? undefined,
          orderDate: new Date().toISOString(),
        });

        if (voucherCodes.length > 0) {
          await sendVoucherEmail({
            to: user.email,
            orderRef: order.id.slice(0, 8).toUpperCase(),
            customerName: clientAddress?.full_name || undefined,
            codes: voucherCodes,
          });
        }
      }

      return NextResponse.json({ url: `${siteUrl}/orders/success?order_id=${order.id}` });
    }

    type LineItem = {
      price_data: {
        currency: string;
        product_data: { name: string; images?: string[] };
        unit_amount: number;
      };
      quantity: number;
    };

    const lineItems: LineItem[] = items.map((item: { title: string; price: number; quantity: number; image_url: string | null }) => ({
      price_data: {
        currency: "eur",
        product_data: {
          name: item.title,
          images: item.image_url ? [item.image_url] : [],
        },
        unit_amount: Math.round(item.price * 100),
      },
      quantity: item.quantity,
    }));

    if (!allVouchers && shippingCost > 0) {
      lineItems.push({
        price_data: {
          currency: "eur",
          product_data: { name: `Livraison (${shippingRateData?.country_name ?? shippingCountry})` },
          unit_amount: Math.round(shippingCost * 100),
        },
        quantity: 1,
      });
    }

    const sessionParams: Parameters<typeof stripe.checkout.sessions.create>[0] = {
      mode: "payment",
      payment_method_types: ["card"],
      line_items: lineItems,
      metadata: { orderId: order.id, userId: user?.id ?? "" },
      customer_email: user?.email ?? undefined,
      success_url: `${siteUrl}/orders/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/cart`,
      locale: "fr",
    };

    if (discountAmount > 0) {
      const stripeCoupon = await stripe.coupons.create({
        amount_off: Math.round(discountAmount * 100),
        currency: "eur",
        duration: "once",
        name: `Reduction ${couponCode}`,
      });
      sessionParams.discounts = [{ coupon: stripeCoupon.id }];
    }

    if (!allVouchers) {
      sessionParams.shipping_address_collection = {
        allowed_countries: ["BE", "FR", "NL", "DE"],
      };
    } else {
      sessionParams.phone_number_collection = { enabled: true };
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    await adminSupabase.from("orders")
      .update({ stripe_session_id: session.id })
      .eq("id", order.id);

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Stripe checkout error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
