import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { AccountOverview } from "@/components/account/AccountOverview";

export const metadata: Metadata = { title: "Mon compte — Fly Horizons" };

export default async function AccountPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const adminSupabase = createAdminClient();

  const [{ data: profile }, { data: clients }, { count: orderCount }, { count: voucherCount }] =
    await Promise.all([
      supabase.from("profiles").select("full_name, phone, role").eq("id", user.id).maybeSingle(),
      adminSupabase.from("clients").select("id").eq("email", user.email!.toLowerCase()),
      adminSupabase.from("orders").select("*", { count: "exact", head: true }).eq("user_id", user.id).neq("status", "pending"),
      adminSupabase.from("voucher_codes").select("*", { count: "exact", head: true }).eq("recipient_email", user.email!.toLowerCase()),
    ]);

  const clientIds = (clients ?? []).map((c) => c.id);
  let reservationCount = 0;
  if (clientIds.length > 0) {
    const { count } = await adminSupabase
      .from("reservations")
      .select("*", { count: "exact", head: true })
      .in("client_id", clientIds);
    reservationCount = count ?? 0;
  }

  return (
    <AccountOverview
      user={{
        email: user.email!,
        full_name: profile?.full_name ?? (user.user_metadata?.full_name as string | undefined) ?? "",
        phone: profile?.phone ?? null,
        created_at: user.created_at,
        is_admin: profile?.role === "admin",
      }}
      stats={{
        reservations: reservationCount,
        vouchers: voucherCount ?? 0,
        orders: orderCount ?? 0,
      }}
    />
  );
}
