"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

async function checkAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Non autorise");
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") throw new Error("Non autorise");
}

export async function addDepense(montant: number, description: string, date: string) {
  try {
    await checkAdmin();
    if (isNaN(montant) || montant <= 0) return { error: "Montant invalide" };
    if (!description.trim()) return { error: "Description requise" };
    if (!date) return { error: "Date requise" };
    const db = createAdminClient();
    const { error } = await db.from("depenses").insert({ montant, description: description.trim(), date });
    if (error) return { error: error.message };
    revalidatePath("/admin/transactions");
    return { success: true };
  } catch {
    return { error: "Erreur serveur" };
  }
}

export async function deleteDepense(id: string) {
  try {
    await checkAdmin();
    const db = createAdminClient();
    const { error } = await db.from("depenses").delete().eq("id", id);
    if (error) return { error: error.message };
    revalidatePath("/admin/transactions");
    return { success: true };
  } catch {
    return { error: "Erreur serveur" };
  }
}
