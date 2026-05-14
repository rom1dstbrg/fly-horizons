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

export async function updateShippingSettings(
  rateValues: Record<string, string>,
  threshold: string
) {
  try {
    await checkAdmin();
    const adminSupabase = createAdminClient();

    // Mettre a jour chaque taux de livraison
    for (const [id, value] of Object.entries(rateValues)) {
      const rate = parseFloat(value);
      if (isNaN(rate)) continue;
      await adminSupabase
        .from("shipping_rates")
        .update({ rate_standard: rate })
        .eq("id", id);
    }

    // Mettre a jour le seuil de livraison gratuite
    const thresholdValue = parseFloat(threshold);
    if (!isNaN(thresholdValue)) {
      await adminSupabase
        .from("settings")
        .upsert({
          key: "free_shipping_threshold",
          value: String(thresholdValue),
          updated_at: new Date().toISOString(),
        });
    }

    revalidatePath("/admin/settings");
    return { success: true };
  } catch {
    return { error: "Erreur serveur" };
  }
}