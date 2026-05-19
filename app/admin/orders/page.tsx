import { createAdminClient } from "@/lib/supabase/admin";
import { OrdersClient } from "@/components/admin/OrdersClient";
import { PageHeader } from "@/components/admin/PageHeader";

export const metadata = { title: "Commandes — Admin" };

export default async function AdminOrdersPage() {
  const adminSupabase = createAdminClient();

  const [{ data: orders }, { data: voucherCodes }] = await Promise.all([
    adminSupabase
      .from("orders")
      .select("*, items:order_items(id, title, quantity, unit_price)")
      .order("created_at", { ascending: false }),
    adminSupabase
      .from("voucher_codes")
      .select("id, code, order_id, product_title, duration_minutes, status"),
  ]);

  const userIds = [...new Set((orders ?? []).filter((o) => o.user_id).map((o) => o.user_id as string))];
  const { data: profiles } = userIds.length > 0
    ? await adminSupabase.from("profiles").select("id, full_name, email").in("id", userIds)
    : { data: [] };
  const profilesById = Object.fromEntries((profiles ?? []).map((p) => [p.id, p]));

  const vouchersByOrder: Record<string, { id: string; code: string; product_title: string; duration_minutes: number; status: string }[]> = {};
  for (const vc of voucherCodes ?? []) {
    if (!vc.order_id) continue;
    if (!vouchersByOrder[vc.order_id]) vouchersByOrder[vc.order_id] = [];
    vouchersByOrder[vc.order_id].push(vc);
  }

  const ordersWithVouchers = (orders ?? [])
    .filter((order) => !vouchersByOrder[order.id])
    .map((order) => {
      const profile = order.user_id ? profilesById[order.user_id] : null;
      const customer_name = profile?.full_name ?? order.shipping_address?.full_name ?? null;
      const customer_email = profile?.email ?? order.shipping_address?.email ?? null;
      return {
        ...order,
        voucher_codes: [],
        customer_name,
        customer_email,
      };
    });

  const total = ordersWithVouchers.length;

  return (
    <div className="space-y-5">
      <PageHeader
        domain="boutique"
        title="Commandes"
        subtitle={`${total} commande${total !== 1 ? "s" : ""}`}
      />

      {ordersWithVouchers.length === 0 ? (
        <div className="card-premium p-12 text-center">
          <p className="text-muted-foreground">Aucune commande pour le moment.</p>
        </div>
      ) : (
        <OrdersClient orders={ordersWithVouchers} />
      )}
    </div>
  );
}
