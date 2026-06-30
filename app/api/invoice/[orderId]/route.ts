import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateInvoicePDFBuffer, type InvoiceData } from "@/lib/pdf/invoice-pdf";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new NextResponse("Non autorisé", { status: 401 });

  const { orderId } = await params;
  const detailed = req.nextUrl.searchParams.get("type") === "detaillee";

  const adminSupabase = createAdminClient();

  const { data: order } = await adminSupabase
    .from("orders")
    .select("id, created_at, status, total, subtotal, discount_amount, coupon_code, shipping_cost, shipping_address, items:order_items(title, quantity, unit_price)")
    .eq("id", orderId)
    .eq("user_id", user.id)
    .single();

  if (!order) return new NextResponse("Introuvable", { status: 404 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .maybeSingle();

  const data: InvoiceData = {
    orderId: order.id,
    createdAt: new Date(order.created_at),
    paidAt: null,
    customerName:
      profile?.full_name ??
      (order.shipping_address as { full_name?: string } | null)?.full_name ??
      "",
    customerEmail: user.email!,
    items: ((order.items ?? []) as { title: string; quantity: number; unit_price: number }[]).map(
      (it) => ({ title: it.title, quantity: it.quantity, unit_price: it.unit_price })
    ),
    subtotal: order.subtotal ?? order.total,
    shippingCost: (order.shipping_cost as number | null) ?? 0,
    discountAmount: (order.discount_amount as number | null) ?? 0,
    couponCode: (order.coupon_code as string | null) ?? null,
    total: order.total,
    shippingAddress: (order.shipping_address as InvoiceData["shippingAddress"]) ?? null,
  };

  const buffer = await generateInvoicePDFBuffer(data, detailed);
  const ref = `FH-${order.id.slice(0, 8).toUpperCase()}`;
  const suffix = detailed ? "-detaillee" : "";

  return new NextResponse(buffer as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="facture-${ref}${suffix}.pdf"`,
      "Content-Length": String(buffer.length),
    },
  });
}
