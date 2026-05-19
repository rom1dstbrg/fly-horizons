import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  // Auth check
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") return Response.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") ?? "").trim();

  if (!q || q.length < 2) {
    return Response.json({ clients: [], orders: [], vouchers: [] });
  }

  const adminSupabase = createAdminClient();

  const [{ data: clients }, { data: orders }, { data: vouchers }] = await Promise.all([
    adminSupabase
      .from("clients")
      .select("id, prenom, nom, email")
      .or(`prenom.ilike.%${q}%,nom.ilike.%${q}%,email.ilike.%${q}%`)
      .limit(5),
    adminSupabase
      .from("orders")
      .select("id, created_at, total, status")
      .ilike("id", `${q}%`)
      .limit(3),
    adminSupabase
      .from("voucher_codes")
      .select("id, code, recipient_email, status")
      .ilike("code", `%${q}%`)
      .limit(4),
  ]);

  return Response.json({
    clients: clients ?? [],
    orders: orders ?? [],
    vouchers: vouchers ?? [],
  });
}
