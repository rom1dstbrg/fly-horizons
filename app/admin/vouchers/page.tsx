import { createAdminClient } from "@/lib/supabase/admin";
import { VouchersClient } from "@/components/admin/VouchersClient";
import { PageHeader } from "@/components/admin/PageHeader";

export const metadata = { title: "Vouchers — Admin" };

export default async function AdminVouchersPage() {
  const adminSupabase = createAdminClient();

  const [{ data: vouchers }, { data: rawClients }] = await Promise.all([
    adminSupabase
      .from("voucher_codes")
      .select("*")
      .order("created_at", { ascending: false }),
    adminSupabase
      .from("clients")
      .select("id, prenom, nom, email")
      .order("nom"),
  ]);

  // Deduplicate clients by email for the picker
  const seen = new Set<string>();
  const clients = (rawClients ?? []).filter(c => {
    const key = c.email.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const total   = vouchers?.length ?? 0;
  const unused  = vouchers?.filter((v) => v.status === "unused").length ?? 0;
  const used    = vouchers?.filter((v) => v.status === "used").length ?? 0;

  return (
    <div className="space-y-6">
      <PageHeader
        domain="boutique"
        title="Vouchers de vol"
        subtitle={`${total} code${total !== 1 ? "s" : ""} au total`}
      />

      <div className="grid grid-cols-3 gap-3">
        <div className="card-premium p-4 text-center">
          <p className="text-2xl font-bold text-primary">{unused}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Disponibles</p>
        </div>
        <div className="card-premium p-4 text-center">
          <p className="text-2xl font-bold text-green-500">{used}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Utilisés</p>
        </div>
        <div className="card-premium p-4 text-center">
          <p className="text-2xl font-bold text-foreground">{total}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Total émis</p>
        </div>
      </div>

      <VouchersClient vouchers={vouchers ?? []} clients={clients} />
    </div>
  );
}
