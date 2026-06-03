import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { AccountClient } from "./AccountClient";

export const metadata: Metadata = {
  title: "Mon compte — Fly Horizons",
};

export default async function AccountPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?redirectTo=/account");

  const adminSupabase = createAdminClient();

  // Fetch in parallel
  const [{ data: profile }, { data: addresses }, { data: orders }] =
    await Promise.all([
      supabase.from("profiles").select("*").eq("id", user.id).single(),
      supabase
        .from("addresses")
        .select("*")
        .eq("user_id", user.id)
        .order("is_default", { ascending: false }),
      supabase
        .from("orders")
        .select("id, created_at, status, total, subtotal, discount_amount, coupon_code, shipping_cost, shipping_address")
        .eq("user_id", user.id)
        .neq("status", "pending")
        .order("created_at", { ascending: false }),
    ]);

  // Voucher codes for all orders
  const orderIds = (orders ?? []).map((o) => o.id);
  type VoucherRow = {
    id: string;
    code: string;
    duration_minutes: number;
    status: string;
    order_id: string | null;
    product_title: string;
    expires_at: string | null;
  };
  let vouchersByOrder: Record<string, VoucherRow[]> = {};

  // Fetch by order_id AND by recipient_email (covers manually-created vouchers or failed auto-creation)
  const [{ data: byOrder }, { data: byEmail }] = await Promise.all([
    orderIds.length > 0
      ? adminSupabase
          .from("voucher_codes")
          .select("id, code, duration_minutes, status, order_id, product_title, expires_at")
          .in("order_id", orderIds)
      : Promise.resolve({ data: [] as VoucherRow[] }),
    user.email
      ? adminSupabase
          .from("voucher_codes")
          .select("id, code, duration_minutes, status, order_id, product_title, expires_at")
          .eq("recipient_email", user.email.toLowerCase())
          .is("order_id", null)
      : Promise.resolve({ data: [] as VoucherRow[] }),
  ]);

  const allVoucherRows: VoucherRow[] = [
    ...((byOrder ?? []) as VoucherRow[]),
    ...((byEmail ?? []) as VoucherRow[]),
  ];

  vouchersByOrder = allVoucherRows.reduce(
    (acc, v) => {
      const key = v.order_id ?? "_unlinked";
      if (!acc[key]) acc[key] = [];
      acc[key].push(v);
      return acc;
    },
    {} as typeof vouchersByOrder
  );

  // Reservations via email → client_id lookup
  let reservations: {
    id: string;
    date_vol: string;
    heure_vol: string | null;
    duree: number;
    passagers: number;
    statut: string;
    type_resa: string;
    payment_token: string | null;
    acompte: number | null;
    distance_km: number | null;
    created_at: string;
    route: string | null;
    route_status: string | null;
    route_token: string | null;
  }[] = [];

  if (user.email) {
    const { data: clients } = await adminSupabase
      .from("clients")
      .select("id")
      .eq("email", user.email.toLowerCase());

    const clientIds = (clients ?? []).map((c) => c.id);

    if (clientIds.length > 0) {
      const { data: resas } = await adminSupabase
        .from("reservations")
        .select(
          "id, date_vol, heure_vol, duree, passagers, statut, type_resa, payment_token, acompte, distance_km, created_at, route, route_status, route_token"
        )
        .in("client_id", clientIds)
        .order("date_vol", { ascending: false });
      reservations = resas ?? [];
    }
  }

  const full_name =
    profile?.full_name ??
    (user.user_metadata?.full_name as string | undefined) ??
    "";

  return (
    <AccountClient
      user={{
        id: user.id,
        email: user.email!,
        full_name,
        phone: profile?.phone ?? null,
        created_at: user.created_at,
        is_admin: profile?.role === "admin",
      }}
      addresses={addresses ?? []}
      orders={orders ?? []}
      vouchersByOrder={vouchersByOrder}
      reservations={reservations}
    />
  );
}
