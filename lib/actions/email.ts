"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { orderConfirmationEmail } from "@/lib/email-templates";
import { sendOrderConfirmation } from "@/lib/email-service";

async function checkAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Non autorise");
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin") throw new Error("Non autorise");
}

async function getOrderData(orderId: string) {
  const adminSupabase = createAdminClient();

  const { data: order } = await adminSupabase
    .from("orders")
    .select("*, items:order_items(id, title, quantity, unit_price, image_url)")
    .eq("id", orderId)
    .single();

  if (!order) return null;

  let customerEmail: string = order.shipping_address?.email ?? "";
  if (!customerEmail && order.user_id) {
    const { data: profile } = await adminSupabase
      .from("profiles")
      .select("email")
      .eq("id", order.user_id)
      .single();
    customerEmail = profile?.email ?? "";
  }

  return { order, customerEmail };
}

export async function getEmailPreview(orderId: string): Promise<string> {
  await checkAdmin();

  const result = await getOrderData(orderId);
  if (!result) return "<p style='font-family:sans-serif;padding:20px'>Commande introuvable</p>";

  const { order, customerEmail } = result;
  const ref = order.id.slice(0, 8).toUpperCase();
  const name = order.shipping_address?.full_name;
  const address = order.shipping_address;

  return orderConfirmationEmail({
    orderRef: ref,
    customerEmail,
    customerName: name,
    items: order.items ?? [],
    subtotal: order.subtotal,
    shippingCost: order.shipping_cost ?? 0,
    discountAmount: order.discount_amount ?? 0,
    total: order.total,
    couponCode: order.coupon_code,
    shippingAddress: address,
    orderDate: order.created_at,
  });
}

export async function resendOrderEmail(orderId: string): Promise<{ success?: boolean; error?: string }> {
  await checkAdmin();

  const result = await getOrderData(orderId);
  if (!result) return { error: "Commande introuvable" };

  const { order, customerEmail } = result;
  if (!customerEmail) return { error: "Email client introuvable" };

  const ref = order.id.slice(0, 8).toUpperCase();
  const name = order.shipping_address?.full_name;
  const address = order.shipping_address;

  const r = await sendOrderConfirmation({
    to: customerEmail,
    orderRef: ref,
    customerName: name,
    items: order.items ?? [],
    subtotal: order.subtotal,
    shippingCost: order.shipping_cost ?? 0,
    discountAmount: order.discount_amount ?? 0,
    total: order.total,
    couponCode: order.coupon_code,
    shippingAddress: address,
    orderDate: order.created_at,
  });
  return r.error ? { error: String(r.error) } : { success: true };
}
