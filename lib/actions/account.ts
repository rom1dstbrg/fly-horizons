"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

async function getUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Non connecte");
  return { supabase, user };
}

// -----------------------------------------------
// PROFIL
// -----------------------------------------------
export async function updateProfile(formData: FormData) {
  try {
    const { supabase, user } = await getUser();

    const full_name = formData.get("full_name") as string;
    const phone = formData.get("phone") as string;

    const { error } = await supabase
      .from("profiles")
      .update({ full_name: full_name || null, phone: phone || null })
      .eq("id", user.id);

    if (error) return { error: error.message };
    revalidatePath("/account");
    return { success: true };
  } catch {
    return { error: "Non connecte" };
  }
}

// -----------------------------------------------
// ADRESSES
// -----------------------------------------------
export async function createAddress(formData: FormData) {
  try {
    const { supabase, user } = await getUser();

    const full_name   = formData.get("full_name") as string;
    const line1       = formData.get("line1") as string;
    const line2       = formData.get("line2") as string;
    const city        = formData.get("city") as string;
    const postal_code = formData.get("postal_code") as string;
    const country     = formData.get("country") as string;

    if (!full_name || !line1 || !city || !postal_code) {
      return { error: "Tous les champs obligatoires doivent etre remplis." };
    }

    // Verifier si c'est la premiere adresse (devient par defaut)
    const { count } = await supabase
      .from("addresses")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id);

    const is_default = count === 0;

    const { error } = await supabase
      .from("addresses")
      .insert({
        user_id: user.id,
        full_name,
        line1,
        line2: line2 || null,
        city,
        postal_code,
        country: country || "BE",
        is_default,
      });

    if (error) return { error: error.message };
    revalidatePath("/account");
    return { success: true };
  } catch {
    return { error: "Erreur serveur" };
  }
}

export async function updateAddress(addressId: string, formData: FormData) {
  try {
    const { supabase, user } = await getUser();

    const full_name   = formData.get("full_name") as string;
    const line1       = formData.get("line1") as string;
    const line2       = formData.get("line2") as string;
    const city        = formData.get("city") as string;
    const postal_code = formData.get("postal_code") as string;
    const country     = formData.get("country") as string;

    if (!full_name || !line1 || !city || !postal_code) {
      return { error: "Tous les champs obligatoires doivent etre remplis." };
    }

    const { error } = await supabase
      .from("addresses")
      .update({ full_name, line1, line2: line2 || null, city, postal_code, country })
      .eq("id", addressId)
      .eq("user_id", user.id);

    if (error) return { error: error.message };
    revalidatePath("/account");
    return { success: true };
  } catch {
    return { error: "Erreur serveur" };
  }
}

export async function deleteAddress(addressId: string) {
  try {
    const { supabase, user } = await getUser();

    const { error } = await supabase
      .from("addresses")
      .delete()
      .eq("id", addressId)
      .eq("user_id", user.id);

    if (error) return { error: error.message };
    revalidatePath("/account");
    return { success: true };
  } catch {
    return { error: "Erreur serveur" };
  }
}

export async function setDefaultAddress(addressId: string) {
  try {
    const { supabase, user } = await getUser();

    // Retirer le defaut de toutes les adresses
    await supabase
      .from("addresses")
      .update({ is_default: false })
      .eq("user_id", user.id);

    // Definir la nouvelle adresse par defaut
    const { error } = await supabase
      .from("addresses")
      .update({ is_default: true })
      .eq("id", addressId)
      .eq("user_id", user.id);

    if (error) return { error: error.message };
    revalidatePath("/account");
    return { success: true };
  } catch {
    return { error: "Erreur serveur" };
  }
}