import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") return Response.json({ error: "Forbidden" }, { status: 403 });

  const adminSupabase = createAdminClient();

  const { count: contacts } = await adminSupabase
    .from("contacts")
    .select("*", { count: "exact", head: true })
    .eq("statut", "nouveau");

  return Response.json({ contacts: contacts ?? 0 });
}
