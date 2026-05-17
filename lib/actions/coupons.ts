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

export async function createCoupon(formData: FormData) {
  try {
    await checkAdmin();
    const adminSupabase = createAdminClient();

    const code = (formData.get("code") as string).toUpperCase().trim();
    const type = formData.get("type") as "percentage" | "fixed";
    const value = parseFloat(formData.get("value") as string);
    const expiresAt = formData.get("expires_at") as string;
    const maxUsesRaw = formData.get("max_uses") as string;
    const maxUsesPerUserRaw = formData.get("max_uses_per_user") as string;
    const maxUses = maxUsesRaw ? parseInt(maxUsesRaw) : null;
    const maxUsesPerUser = maxUsesPerUserRaw ? parseInt(maxUsesPerUserRaw) : null;
    const appliesTo = (formData.get("applies_to") as string) || null;

    if (!code || isNaN(value) || value <= 0) {
      return { error: "Code et valeur requis." };
    }
    if (type === "percentage" && value > 100) {
      return { error: "Le pourcentage ne peut pas depasser 100." };
    }

    const { error } = await adminSupabase
      .from("coupons")
      .insert({
        code,
        type,
        value,
        active: true,
        expires_at: expiresAt || null,
        max_uses: maxUses,
        max_uses_per_user: maxUsesPerUser,
        applies_to: appliesTo,
      });

    if (error) {
      if (error.message.includes("unique")) {
        return { error: "Ce code existe deja." };
      }
      return { error: error.message };
    }

    revalidatePath("/admin/coupons");
    return { success: true };
  } catch {
    return { error: "Erreur serveur" };
  }
}

export async function updateCoupon(couponId: string, data: {
  code?: string;
  type?: "percentage" | "fixed";
  value?: number;
  expires_at?: string | null;
  max_uses?: number | null;
  max_uses_per_user?: number | null;
  applies_to?: "voucher" | "physical" | null;
}) {
  try {
    await checkAdmin();
    const adminSupabase = createAdminClient();
    const update: Record<string, unknown> = {};
    if (data.code) update.code = data.code.toUpperCase().trim();
    if (data.type) update.type = data.type;
    if (data.value !== undefined) update.value = data.value;
    if ("expires_at" in data) update.expires_at = data.expires_at || null;
    if ("max_uses" in data) update.max_uses = data.max_uses ?? null;
    if ("max_uses_per_user" in data) update.max_uses_per_user = data.max_uses_per_user ?? null;
    if ("applies_to" in data) update.applies_to = data.applies_to ?? null;
    const { error } = await adminSupabase.from("coupons").update(update).eq("id", couponId);
    if (error) return { error: error.message };
    revalidatePath("/admin/coupons");
    return { success: true };
  } catch {
    return { error: "Non autorise" };
  }
}

export async function toggleCouponActive(couponId: string, active: boolean) {
  try {
    await checkAdmin();
    const adminSupabase = createAdminClient();
    const { error } = await adminSupabase
      .from("coupons")
      .update({ active })
      .eq("id", couponId);
    if (error) return { error: error.message };
    revalidatePath("/admin/coupons");
    return { success: true };
  } catch {
    return { error: "Non autorise" };
  }
}