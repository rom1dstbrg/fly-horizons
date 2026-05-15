import { createAdminClient } from "@/lib/supabase/admin";
import { OrdersClient } from "@/components/admin/OrdersClient";

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

  // Group voucher codes by order_id
  const vouchersByOrder: Record<string, { id: string; code: string; product_title: string; duration_minutes: number; status: string }[]> = {};
  for (const vc of voucherCodes ?? []) {
    if (!vc.order_id) continue;
    if (!vouchersByOrder[vc.order_id]) vouchersByOrder[vc.order_id] = [];
    vouchersByOrder[vc.order_id].push(vc);
  }

  const ordersWithVouchers = (orders ?? []).map((order) => ({
    ...order,
    voucher_codes: vouchersByOrder[order.id] ?? [],
  }));

  const total = ordersWithVouchers.length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Commandes</h1>
        <p className="text-muted-foreground text-sm mt-1">
          {total} commande{total !== 1 ? "s" : ""}
        </p>
      </div>

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
