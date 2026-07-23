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

const VALID_ORDER_STATUSES = ["pending", "paid", "processing", "shipped", "delivered", "cancelled", "refunded"] as const;

export async function updateOrderStatus(orderId: string, status: string) {
  if (!VALID_ORDER_STATUSES.includes(status as typeof VALID_ORDER_STATUSES[number])) {
    return { error: "Statut invalide" };
  }
  try {
    await checkAdmin();
    const adminSupabase = createAdminClient();

    const { error } = await adminSupabase
      .from("orders")
      .update({ status })
      .eq("id", orderId);

    if (error) return { error: error.message };

    revalidatePath("/admin/boutique");
    revalidatePath("/admin");
    return { success: true };
  } catch {
    return { error: "Non autorise" };
  }
}
