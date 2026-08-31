import { Suspense } from "react";
import { createAdminClient } from "@/lib/supabase/admin";
import { BoutiqueHub } from "@/components/admin/BoutiqueHub";
import { PageHeader } from "@/components/admin/PageHeader";

export const metadata = { title: "Boutique — Admin" };

export default async function BoutiquePage() {
  const db = createAdminClient();

  const [
    { data: rawVouchers },
    { data: voucherProducts },
    { data: rawClients },
    { data: coupons },
    { data: crmSettings },
  ] = await Promise.all([
    db.from("voucher_codes").select("*").order("created_at", { ascending: false }),
    db.from("products").select("*, images:product_images(*)").eq("product_type", "voucher").order("created_at", { ascending: false }),
    db.from("clients").select("id, prenom, nom, email, telephone").order("nom"),
    db.from("coupons").select("*").order("created_at", { ascending: false }),
    db.from("crm_settings").select("key, value").in("key", ["prix_heure"]),
  ]);

  // Enrichir les vouchers avec les infos de commande Stripe
  const orderIds = (rawVouchers ?? []).map(v => v.order_id).filter(Boolean) as string[];
  const { data: linkedOrders } = orderIds.length > 0
    ? await db.from("orders").select("id, total, status, created_at, shipping_address, user_id").in("id", orderIds)
    : { data: [] };

  const ordersById = Object.fromEntries((linkedOrders ?? []).map(o => [o.id, o]));

  // Index clients by email for phone/id enrichment
  const clientsByEmail = Object.fromEntries(
    (rawClients ?? []).filter(c => c.email).map(c => [c.email.toLowerCase(), c])
  );

  const vouchers = (rawVouchers ?? []).map(v => {
    const matchedClient = v.recipient_email
      ? clientsByEmail[v.recipient_email.toLowerCase()]
      : null;
    const order = v.order_id ? (ordersById[v.order_id] ?? null) : null;
    const shippingAddress = order?.shipping_address as { full_name?: string; email?: string } | null;
    return {
      ...v,
      order,
      client_telephone: matchedClient?.telephone ?? null,
      client_id: matchedClient?.id ?? null,
      buyer_name: shippingAddress?.full_name ?? null,
      buyer_email: shippingAddress?.email ?? null,
    };
  });

  const prixHeure60 = parseFloat(
    (crmSettings ?? []).find((s: { key: string; value: string }) => s.key === "prix_heure")?.value ?? "0"
  ) || null;

  // Deduplicate clients by email
  const seen = new Set<string>();
  const clients = (rawClients ?? []).filter(c => {
    const key = (c.email ?? c.id).toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return (
    <div className="space-y-5">
      <PageHeader
        domain="boutique"
        title="Les vols"
        subtitle="Offres, itinéraires et escales"
      />

      <Suspense fallback={null}>
        <BoutiqueHub
          voucherProducts={voucherProducts as never}
          vouchers={vouchers}
          clients={clients}
          coupons={coupons ?? []}
          prixHeure60={prixHeure60}
        />
      </Suspense>
    </div>
  );
}
