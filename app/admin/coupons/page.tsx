import { createAdminClient } from "@/lib/supabase/admin";
import { formatPrice } from "@/lib/utils";
import { CouponForm } from "@/components/admin/CouponForm";
import { ToggleCouponActive } from "@/components/admin/ToggleCouponActive";
import { DeleteCouponButton } from "@/components/admin/DeleteCouponButton";

export const metadata = { title: "Coupons — Admin" };

export default async function AdminCouponsPage() {
  const adminSupabase = createAdminClient();

  const { data: coupons } = await adminSupabase
    .from("coupons")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Coupons</h1>
        <p className="text-muted-foreground text-sm mt-1">Codes de reduction</p>
      </div>

      <div className="card-premium p-6">
        <h2 className="font-semibold text-foreground mb-4">Nouveau coupon</h2>
        <CouponForm />
      </div>

      {coupons && coupons.length > 0 && (
        <div className="card-premium overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Code</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden sm:table-cell">Remise</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden md:table-cell">Utilisation</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden lg:table-cell">Expiration</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Actif</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Action</th>
              </tr>
            </thead>
            <tbody>
              {coupons.map((coupon) => (
                <tr key={coupon.id} className="border-b border-border last:border-0 hover:bg-secondary/30 transition-colors">
                  <td className="px-4 py-3">
                    <span className="font-mono text-sm font-bold text-primary">{coupon.code}</span>
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <span className="text-sm text-foreground">
                      {coupon.type === "percentage" ? `${coupon.value}%` : formatPrice(coupon.value)}
                    </span>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <span className="text-sm text-muted-foreground">{coupon.usage_count} fois</span>
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    <span className="text-sm text-muted-foreground">
                      {coupon.expires_at
                        ? new Date(coupon.expires_at).toLocaleDateString("fr-BE")
                        : "Aucune"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <ToggleCouponActive couponId={coupon.id} active={coupon.active} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <DeleteCouponButton couponId={coupon.id} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}