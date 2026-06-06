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
  activeValues: Record<string, boolean>,
  threshold: string
) {
  try {
    await checkAdmin();
    const adminSupabase = createAdminClient();

    for (const [id, value] of Object.entries(rateValues)) {
      const rate = parseFloat(value);
      if (isNaN(rate)) continue;
      await adminSupabase
        .from("shipping_rates")
        .update({ rate_standard: rate, active: activeValues[id] ?? true })
        .eq("id", id);
    }

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

export async function addShippingCountry(
  countryCode: string,
  countryName: string,
  rate: number
) {
  try {
    await checkAdmin();
    const adminSupabase = createAdminClient();

    const { error } = await adminSupabase
      .from("shipping_rates")
      .insert({
        country_code: countryCode.toUpperCase(),
        country_name: countryName,
        rate_standard: rate,
        active: true,
      });

    if (error) return { error: error.message };

    revalidatePath("/admin/settings");
    return { success: true };
  } catch {
    return { error: "Erreur serveur" };
  }
}

export async function deleteShippingCountry(id: string) {
  try {
    await checkAdmin();
    const adminSupabase = createAdminClient();

    await adminSupabase
      .from("shipping_rates")
      .delete()
      .eq("id", id);

    revalidatePath("/admin/settings");
    return { success: true };
  } catch {
    return { error: "Erreur serveur" };
  }
}

export async function updateOperationalSettings({
  welcome_code,
  welcome_discount_type,
  welcome_discount_value,
}: {
  welcome_code: string;
  welcome_discount_type: "percentage" | "fixed";
  welcome_discount_value: number;
}) {
  try {
    await checkAdmin();
    const newCode = welcome_code.trim().toUpperCase();
    if (!newCode) return { error: "Code invalide" };
    if (isNaN(welcome_discount_value) || welcome_discount_value <= 0) return { error: "Remise invalide" };

    const adminSupabase = createAdminClient();

    const { data: oldRow } = await adminSupabase
      .from("crm_settings").select("value").eq("key", "welcome_code").single();
    const oldCode = (oldRow?.value as string | undefined)?.toUpperCase();

    await Promise.all([
      adminSupabase.from("crm_settings").upsert({ key: "welcome_code",           value: newCode }),
      adminSupabase.from("crm_settings").upsert({ key: "welcome_discount_type",  value: welcome_discount_type }),
      adminSupabase.from("crm_settings").upsert({ key: "welcome_discount_value", value: String(welcome_discount_value) }),
    ]);

    if (oldCode && oldCode !== newCode) {
      await adminSupabase.from("coupons").update({ active: false }).eq("code", oldCode);
    }

    await adminSupabase.from("coupons").upsert(
      { code: newCode, type: welcome_discount_type, value: welcome_discount_value, active: true, max_uses_per_user: 1 },
      { onConflict: "code" }
    );

    revalidatePath("/admin/settings");
    revalidatePath("/");
    return { success: true };
  } catch {
    return { error: "Erreur serveur" };
  }
}

export async function updatePrixVol(prixHeure: number, acomptePersoHeure: number) {
  try {
    await checkAdmin();
    if (isNaN(prixHeure) || prixHeure <= 0) return { error: "Prix invalide" };
    if (isNaN(acomptePersoHeure) || acomptePersoHeure < 0) return { error: "Provision invalide" };
    const adminSupabase = createAdminClient();
    await adminSupabase
      .from("crm_settings")
      .upsert({ key: "prix_heure", value: String(prixHeure) });
    await adminSupabase
      .from("crm_settings")
      .upsert({ key: "acompte_perso_heure", value: String(acomptePersoHeure) });
    revalidatePath("/admin/settings");
    revalidatePath("/packs");
    revalidatePath("/reservation");
    revalidatePath("/vol-sur-mesure");
    return { success: true };
  } catch {
    return { error: "Erreur serveur" };
  }
}
