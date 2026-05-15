import { createAdminClient } from "@/lib/supabase/admin";
import { formatPrice } from "@/lib/utils";
import { VouchersClient } from "@/components/admin/VouchersClient";

export const metadata = { title: "Vouchers — Admin" };

export default async function AdminVouchersPage() {
  const adminSupabase = createAdminClient();

  const { data: vouchers } = await adminSupabase
    .from("voucher_codes")
    .select("*")
    .order("created_at", { ascending: false });

  const total   = vouchers?.length ?? 0;
  const unused  = vouchers?.filter((v) => v.status === "unused").length ?? 0;
  const used    = vouchers?.filter((v) => v.status === "used").length ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Vouchers de vol</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {total} code{total !== 1 ? "s" : ""} au total
          </p>
        </div>
      </div>

      {/* Stats */}
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

      {!vouchers || vouchers.length === 0 ? (
        <div className="card-premium p-12 text-center">
          <p className="text-muted-foreground">Aucun voucher émis pour le moment.</p>
          <p className="text-sm text-muted-foreground mt-2">
            Les codes sont générés automatiquement lors de l'achat d'un produit voucher.
          </p>
        </div>
      ) : (
        <VouchersClient vouchers={vouchers} />
      )}
    </div>
  );
}

// Unused import suppression
const _unused = formatPrice;
void _unused;
