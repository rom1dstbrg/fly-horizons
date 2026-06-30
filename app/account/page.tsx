import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { AccountTabs } from "@/components/account/AccountTabs";

export const metadata: Metadata = { title: "Mon compte — Fly Horizons" };

export default async function AccountPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?redirectTo=/account");

  const adminSupabase = createAdminClient();

  const [{ data: profile }, { data: addresses }, { data: orders }, { data: newsletterSub }] =
    await Promise.all([
      supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
      supabase.from("addresses").select("*").eq("user_id", user.id).order("is_default", { ascending: false }),
      supabase.from("orders").select("id, created_at, status, total, subtotal, discount_amount, coupon_code, shipping_cost, shipping_address")
        .eq("user_id", user.id).neq("status", "pending").order("created_at", { ascending: false }),
      adminSupabase.from("newsletter_subscribers").select("active").eq("email", user.email!.toLowerCase()).maybeSingle(),
    ]);

  // Voucher codes: by order + by email (vouchers sent manually)
  const orderIds = (orders ?? []).map((o) => o.id);
  const [{ data: byOrder }, { data: byEmail }] = await Promise.all([
    orderIds.length > 0
      ? adminSupabase.from("voucher_codes")
          .select("id, code, duration_minutes, status, order_id, product_title, expires_at")
          .in("order_id", orderIds)
      : Promise.resolve({ data: [] }),
    adminSupabase.from("voucher_codes")
      .select("id, code, duration_minutes, status, order_id, product_title, expires_at")
      .eq("recipient_email", user.email!.toLowerCase())
      .is("order_id", null),
  ]);

  const vouchers = [...(byOrder ?? []), ...(byEmail ?? [])] as {
    id: string; code: string; duration_minutes: number; status: string;
    order_id: string | null; product_title: string | null; expires_at: string | null;
  }[];

  // Reservations via client email lookup
  const { data: clients } = await adminSupabase
    .from("clients").select("id").eq("email", user.email!.toLowerCase());

  const clientIds = (clients ?? []).map((c) => c.id);

  type ResaRow = {
    id: string; date_vol: string; heure_vol: string | null; duree: number;
    passagers: number; statut: string; type_resa: string; payment_token: string | null;
    acompte: number | null; distance_km: number | null; created_at: string;
    route: string | null; route_status: string | null; route_token: string | null;
    waypoints: Array<{ lat: number; lng: number; nom: string }> | null;
  };

  let reservations: (ResaRow & { latestProposalToken: string | null; latestProposalStatus: string | null })[] = [];

  if (clientIds.length > 0) {
    const { data: resas } = await adminSupabase
      .from("reservations")
      .select("id, date_vol, heure_vol, duree, passagers, statut, type_resa, payment_token, acompte, distance_km, created_at, route, route_status, route_token, waypoints")
      .in("client_id", clientIds)
      .order("date_vol", { ascending: false });

    const rawResas = (resas ?? []) as ResaRow[];
    const latestProposal: Record<string, { token: string; status: string }> = {};

    if (rawResas.length > 0) {
      const { data: proposals } = await adminSupabase
        .from("route_proposals")
        .select("token, status, reservation_id")
        .in("reservation_id", rawResas.map((r) => r.id))
        .order("created_at", { ascending: false });

      for (const p of proposals ?? []) {
        if (!latestProposal[p.reservation_id]) {
          latestProposal[p.reservation_id] = { token: p.token, status: p.status };
        }
      }
    }

    reservations = rawResas.map((r) => ({
      ...r,
      latestProposalToken: latestProposal[r.id]?.token ?? null,
      latestProposalStatus: latestProposal[r.id]?.status ?? null,
    }));
  }

  const full_name =
    profile?.full_name ?? (user.user_metadata?.full_name as string | undefined) ?? "";

  return (
    <AccountTabs
      user={{
        email: user.email!,
        full_name,
        phone: profile?.phone ?? null,
        created_at: user.created_at,
        is_admin: profile?.role === "admin",
      }}
      stats={{
        reservations: reservations.length,
        vouchers: vouchers.filter((v) => v.status === "unused").length,
        orders: (orders ?? []).length,
      }}
      addresses={addresses ?? []}
      vouchers={vouchers}
      reservations={reservations}
      newsletterActive={newsletterSub?.active ?? null}
    />
  );
}
