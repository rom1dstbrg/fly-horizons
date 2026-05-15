import { createAdminClient } from "@/lib/supabase/admin";
import { CouponForm } from "@/components/admin/CouponForm";
import { CouponsTableClient } from "@/components/admin/CouponsTableClient";

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

      {coupons && coupons.length > 0 && <CouponsTableClient coupons={coupons} />}
    </div>
  );
}