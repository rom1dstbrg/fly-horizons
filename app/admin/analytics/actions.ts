"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function resetAnalytics() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Non autorisé" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin") return { error: "Non autorisé" };

  const adminClient = createAdminClient();
  const { error } = await adminClient
    .from("page_views")
    .delete()
    .gte("created_at", "1970-01-01");

  if (error) return { error: "Erreur lors de la réinitialisation" };

  revalidatePath("/admin/analytics");
}
