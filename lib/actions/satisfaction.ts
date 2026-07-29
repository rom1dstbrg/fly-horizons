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

export async function deleteSatisfactionSurvey(id: string, photos: string[]) {
  try {
    await checkAdmin();
    const supabase = createAdminClient();
    if (photos.length > 0) {
      await supabase.storage.from("satisfaction-photos").remove(photos);
    }
    await supabase.from("satisfaction_surveys").delete().eq("id", id);
    revalidatePath("/admin/satisfaction");
    return { success: true };
  } catch {
    return { error: "Non autorise" };
  }
}

// Libère l'espace de stockage sans supprimer l'avis (notes/commentaires conservés)
export async function deleteSurveyPhotos(id: string, photos: string[]) {
  try {
    await checkAdmin();
    const supabase = createAdminClient();
    if (photos.length > 0) {
      await supabase.storage.from("satisfaction-photos").remove(photos);
    }
    await supabase.from("satisfaction_surveys").update({ photos: [] }).eq("id", id);
    revalidatePath("/admin/satisfaction");
    return { success: true };
  } catch {
    return { error: "Non autorise" };
  }
}
