"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

async function checkAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Non autorise");
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin") throw new Error("Non autorise");
}

export async function updateOrderStatus(orderId: string, status: string) {
  try {
    await checkAdmin();
    const adminSupabase = createAdminClient();
    const { error } = await adminSupabase
      .from("orders")
      .update({ status })
      .eq("id", orderId);
    if (error) return { error: error.message };
    revalidatePath("/admin/orders");
    revalidatePath("/admin");
    return { success: true };
  } catch {
    return { error: "Non autorise" };
  }
}