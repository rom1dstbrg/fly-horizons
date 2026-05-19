"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

async function checkAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Non autorisé");
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") throw new Error("Non autorisé");
}

export async function updateClient(id: string, fields: {
  prenom?: string;
  nom?: string;
  telephone?: string | null;
}) {
  try {
    await checkAdmin();
    const supabase = createAdminClient();
    await supabase.from("clients").update(fields).eq("id", id);
    revalidatePath("/admin/clients");
    revalidatePath(`/admin/clients/${id}`);
    return { success: true };
  } catch {
    return { error: "Erreur serveur" };
  }
}
