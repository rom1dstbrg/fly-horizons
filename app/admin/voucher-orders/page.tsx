import { createAdminClient } from "@/lib/supabase/admin";
import { VoucherOrdersClient } from "@/components/admin/VoucherOrdersClient";
import { PageHeader } from "@/components/admin/PageHeader";

export const metadata = { title: "Commandes vols — Admin" };

export default async function AdminVoucherOrdersPage() {
  const adminSupabase = createAdminClient();

  const [{ data: allOrders }, { data: voucherCodes }] = await Promise.all([
    adminSupabase
      .from("orders")
      .select("*, items:order_items(id, title, quantity, unit_price)")
      .order("created_at", { ascending: false }),
    adminSupabase
      .from("voucher_codes")
      .select("id, code, order_id, product_title, duration_minutes, status"),
  ]);

  // Group voucher codes by order
  const vouchersByOrder: Record<string, { id: string; code: string; product_title: string; duration_minutes: number; status: string }[]> = {};
  for (const vc of voucherCodes ?? []) {
    if (!vc.order_id) continue;
    if (!vouchersByOrder[vc.order_id]) vouchersByOrder[vc.order_id] = [];
    vouchersByOrder[vc.order_id].push(vc);
  }

  // Keep only orders that have at least one voucher code
  const voucherOrderIds = new Set(Object.keys(vouchersByOrder));
  const orders = (allOrders ?? []).filter((o) => voucherOrderIds.has(o.id));

  // Enrich with profile names
  const userIds = [...new Set(orders.filter((o) => o.user_id).map((o) => o.user_id as string))];
  const { data: profiles } = userIds.length > 0
    ? await adminSupabase.from("profiles").select("id, full_name, email").in("id", userIds)
    : { data: [] };
  const profilesById = Object.fromEntries((profiles ?? []).map((p) => [p.id, p]));

  const enrichedOrders = orders.map((order) => {
    const profile = order.user_id ? profilesById[order.user_id] : null;
    return {
      ...order,
      voucher_codes: vouchersByOrder[order.id] ?? [],
      customer_name: profile?.full_name ?? order.shipping_address?.full_name ?? null,
      customer_email: profile?.email ?? order.shipping_address?.email ?? null,
    };
  });

  const total = enrichedOrders.length;

  return (
    <div className="space-y-5">
      <PageHeader
        domain="boutique"
        title="Commandes vols"
        subtitle={`${total} commande${total !== 1 ? "s" : ""}`}
      />

      <VoucherOrdersClient orders={enrichedOrders} />
    </div>
  );
}
