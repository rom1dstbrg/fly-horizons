"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { serializePatch, type AppSettings } from "@/lib/app-settings";

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

/** Enregistre un lot de réglages (page Paramètres). Chaque valeur est validée côté serveur. */
export async function updateAppSettings(patch: Partial<AppSettings>) {
  try {
    await checkAdmin();
    const res = serializePatch(patch);
    if ("error" in res) return { error: res.error };
    if (res.rows.length === 0) return { success: true };
    const { error } = await createAdminClient().from("crm_settings").upsert(res.rows);
    if (error) return { error: "Enregistrement impossible." };
    revalidatePath("/admin/settings");
    revalidatePath("/admin", "layout");
    revalidatePath("/pilote", "layout");
    revalidatePath("/reservation");
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
