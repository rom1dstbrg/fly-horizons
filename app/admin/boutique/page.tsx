import { Suspense } from "react";
import { createAdminClient } from "@/lib/supabase/admin";
import { BoutiqueHub } from "@/components/admin/BoutiqueHub";
import { PageHeader } from "@/components/admin/PageHeader";

export const metadata = { title: "Boutique — Admin" };

export default async function BoutiquePage() {
  const db = createAdminClient();

  const [
    { data: allOrders },
    { data: voucherCodeLinks },
    { data: allVouchers },
    { data: allProducts },
    { data: rawClients },
    { data: coupons },
  ] = await Promise.all([
    db.from("orders").select("*, items:order_items(id, title, quantity, unit_price)").order("created_at", { ascending: false }),
    db.from("voucher_codes").select("id, code, order_id, product_title, duration_minutes, status"),
    db.from("voucher_codes").select("*").order("created_at", { ascending: false }),
    db.from("products").select("*, images:product_images(*)").order("created_at", { ascending: false }),
    db.from("clients").select("id, prenom, nom, email").order("nom"),
    db.from("coupons").select("*").order("created_at", { ascending: false }),
  ]);

  // Group voucher codes by order
  const vouchersByOrder: Record<string, { id: string; code: string; product_title: string; duration_minutes: number; status: string }[]> = {};
  for (const vc of voucherCodeLinks ?? []) {
    if (!vc.order_id) continue;
    if (!vouchersByOrder[vc.order_id]) vouchersByOrder[vc.order_id] = [];
    vouchersByOrder[vc.order_id].push(vc);
  }

  // Fetch profiles for customer names
  const userIds = [...new Set((allOrders ?? []).filter(o => o.user_id).map(o => o.user_id as string))];
  const { data: profiles } = userIds.length > 0
    ? await db.from("profiles").select("id, full_name, email").in("id", userIds)
    : { data: [] };
  const profilesById = Object.fromEntries((profiles ?? []).map(p => [p.id, p]));

  // Split and enrich orders
  const physicalOrders = (allOrders ?? [])
    .filter(order => !vouchersByOrder[order.id])
    .map(order => {
      const profile = order.user_id ? profilesById[order.user_id] : null;
      return {
        ...order,
        voucher_codes: [],
        customer_name: profile?.full_name ?? order.shipping_address?.full_name ?? null,
        customer_email: profile?.email ?? order.shipping_address?.email ?? null,
      };
    });

  const voucherOrders = (allOrders ?? [])
    .filter(order => !!vouchersByOrder[order.id])
    .map(order => {
      const profile = order.user_id ? profilesById[order.user_id] : null;
      return {
        ...order,
        voucher_codes: vouchersByOrder[order.id] ?? [],
        customer_name: profile?.full_name ?? order.shipping_address?.full_name ?? null,
        customer_email: profile?.email ?? order.shipping_address?.email ?? null,
      };
    });

  // Split products
  const physicalProducts = (allProducts ?? []).filter(
    p => p.product_type !== "voucher" && !p.voucher_duration_minutes
  );
  const voucherProducts = (allProducts ?? []).filter(
    p => p.product_type === "voucher" || (p.voucher_duration_minutes != null && p.voucher_duration_minutes > 0)
  );

  // Deduplicate clients by email
  const seen = new Set<string>();
  const clients = (rawClients ?? []).filter(c => {
    const key = c.email.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const allProductsList = allProducts ?? [];
  const vouchers = allVouchers ?? [];

  const stats = {
    commandes:      physicalOrders.length,
    volsAchetes:    voucherOrders.length,
    produitsActifs: allProductsList.filter(p => p.active).length,
    vouchersDispos: vouchers.filter((v: { status: string }) => v.status === "unused").length,
    coupons:        (coupons ?? []).length,
  };

  return (
    <div className="space-y-5">
      <PageHeader
        domain="boutique"
        title="Boutique"
        subtitle="Commandes, produits, vouchers et coupons"
      />

      <Suspense fallback={null}>
        <BoutiqueHub
          physicalOrders={physicalOrders}
          voucherOrders={voucherOrders}
          physicalProducts={physicalProducts as never}
          voucherProducts={voucherProducts as never}
          vouchers={vouchers}
          clients={clients}
          coupons={coupons ?? []}
          stats={stats}
        />
      </Suspense>
    </div>
  );
}
