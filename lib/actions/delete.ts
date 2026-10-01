"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

async function checkAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Non autorise");
  const { data: profile } = await supabase
    .from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") throw new Error("Non autorise");
}

export async function deleteClient(clientId: string) {
  try {
    await checkAdmin();
    const adminSupabase = createAdminClient();
    // Supprime d'abord les rÃ©servations associÃ©es (au cas oÃ¹ pas de cascade FK)
    await adminSupabase.from("reservations").delete().eq("client_id", clientId);
    const { error } = await adminSupabase.from("clients").delete().eq("id", clientId);
    if (error) return { error: error.message };
    revalidatePath("/admin/clients");
    revalidatePath("/admin/vols");
    revalidatePath("/admin/vols");
    return { success: true };
  } catch {
    return { error: "Erreur suppression client" };
  }
}

export async function deleteReservationStandard(resaId: string) {
  try {
    await checkAdmin();
    const adminSupabase = createAdminClient();

    const { data: resa } = await adminSupabase
      .from("reservations")
      .select("voucher_code")
      .eq("id", resaId)
      .single();

    if (resa?.voucher_code) {
      await adminSupabase
        .from("voucher_codes")
        .update({ status: "unused", used_at: null })
        .eq("code", resa.voucher_code)
        .in("status", ["reserved", "used"]);
    }

    const { error } = await adminSupabase
      .from("reservations")
      .delete()
      .eq("id", resaId);
    if (error) return { error: error.message };
    revalidatePath("/admin/vols");
    revalidatePath("/admin");
    return { success: true };
  } catch {
    return { error: "Erreur suppression" };
  }
}

