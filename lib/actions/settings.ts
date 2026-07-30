"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { calculerPrixClient } from "@/lib/pilote-pricing";

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

export async function updateSiteSettings({
  calendar_closed,
  calendar_closed_message,
  chat_enabled,
  maintenance_mode,
  maintenance_message,
  maintenance_reopen_date,
}: {
  calendar_closed: boolean;
  calendar_closed_message: string;
  chat_enabled: boolean;
  maintenance_mode: boolean;
  maintenance_message: string;
  maintenance_reopen_date: string;
}) {
  try {
    await checkAdmin();
    const db = createAdminClient();
    await Promise.all([
      db.from("crm_settings").upsert({ key: "calendar_closed",          value: String(calendar_closed) }),
      db.from("crm_settings").upsert({ key: "calendar_closed_message",  value: calendar_closed_message.trim() }),
      db.from("crm_settings").upsert({ key: "chat_enabled",             value: String(chat_enabled) }),
      db.from("crm_settings").upsert({ key: "maintenance_mode",         value: String(maintenance_mode) }),
      db.from("crm_settings").upsert({ key: "maintenance_message",      value: maintenance_message.trim() }),
      db.from("crm_settings").upsert({ key: "maintenance_reopen_date",  value: maintenance_reopen_date.trim() }),
    ]);
    revalidatePath("/admin/settings");
    revalidatePath("/reservation");
    revalidatePath("/vol-sur-mesure");
    revalidatePath("/maintenance");
    revalidatePath("/");
    return { success: true };
  } catch {
    return { error: "Erreur serveur" };
  }
}

export async function addTarifAvion(prixHeure: number, actifDepuis: string, note?: string) {
  try {
    await checkAdmin();
    if (isNaN(prixHeure) || prixHeure <= 0) return { error: "Prix invalide" };
    if (!actifDepuis) return { error: "Date requise" };
    const db = createAdminClient();
    const { error } = await db.from("avion_tarifs").insert({
      prix_heure: prixHeure,
      actif_depuis: actifDepuis,
      note: note?.trim() || null,
    });
    if (error) return { error: error.message };
    revalidatePath("/admin/settings");
    revalidatePath("/admin/transactions");
    return { success: true };
  } catch {
    return { error: "Erreur serveur" };
  }
}

export async function deleteTarifAvion(id: string) {
  try {
    await checkAdmin();
    const db = createAdminClient();
    // Ne pas supprimer s'il n'y a qu'un seul tarif
    const { count } = await db.from("avion_tarifs").select("*", { count: "exact", head: true });
    if ((count ?? 0) <= 1) return { error: "Impossible de supprimer le seul tarif existant." };
    const { error } = await db.from("avion_tarifs").delete().eq("id", id);
    if (error) return { error: error.message };
    revalidatePath("/admin/settings");
    revalidatePath("/admin/transactions");
    return { success: true };
  } catch {
    return { error: "Erreur serveur" };
  }
}

export async function updatePrixVol(
  partType: "pourcentage" | "montant",
  partValeur: number,
  acomptePersoHeure: number
) {
  try {
    await checkAdmin();
    if (isNaN(partValeur) || partValeur < 0) return { error: "Valeur invalide" };
    if (isNaN(acomptePersoHeure) || acomptePersoHeure < 0) return { error: "Provision invalide" };
    const adminSupabase = createAdminClient();

    // Le prix client est toujours recalcule cote serveur depuis le cout avion actif —
    // jamais depuis une valeur envoyee par le client.
    const today = new Date().toISOString().slice(0, 10);
    const { data: tarif } = await adminSupabase
      .from("avion_tarifs")
      .select("prix_heure")
      .lte("actif_depuis", today)
      .order("actif_depuis", { ascending: false })
      .limit(1)
      .maybeSingle();
    const coutAvion = tarif?.prix_heure ?? 0;
    if (coutAvion <= 0) return { error: "Aucun tarif avion actif — ajoutez-en un d'abord." };

    const prixHeure = calculerPrixClient(coutAvion, 60, partType, partValeur);
    if (prixHeure <= 0) return { error: "Le prix calcule est nul ou negatif — verifiez votre part." };

    await adminSupabase.from("crm_settings").upsert({ key: "prix_heure", value: String(prixHeure) });
    await adminSupabase.from("crm_settings").upsert({ key: "part_pilote_type", value: partType });
    await adminSupabase.from("crm_settings").upsert({ key: "part_pilote_valeur", value: String(partValeur) });
    await adminSupabase.from("crm_settings").upsert({ key: "acompte_perso_heure", value: String(acomptePersoHeure) });

    // Synchronise le prix affiche sur les fiches produit (packs voucher actifs) avec le
    // prix reellement facture au checkout, pour qu'ils ne divergent jamais.
    for (const duree of [30, 60, 90, 120]) {
      await adminSupabase
        .from("products")
        .update({ price: Math.round((prixHeure / 60) * duree) })
        .eq("product_type", "voucher")
        .eq("voucher_duration_minutes", duree)
        .eq("active", true);
    }

    revalidatePath("/admin/settings");
    revalidatePath("/admin/boutique");
    revalidatePath("/packs");
    revalidatePath("/reservation");
    revalidatePath("/vol-sur-mesure");
    revalidatePath("/nos-offres");
    revalidatePath("/");
    return { success: true, prixHeure };
  } catch {
    return { error: "Erreur serveur" };
  }
}
