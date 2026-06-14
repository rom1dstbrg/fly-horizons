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

// â”€â”€ Plages rÃ©currentes â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function createPlage(formData: FormData) {
  try {
    await checkAdmin();
    const db = createAdminClient();

    const jours = formData.getAll("jours").map(Number);
    const { error } = await db.from("disponibilites").insert({
      date_debut:  formData.get("date_debut") as string,
      date_fin:    formData.get("date_fin") as string,
      heure_debut: formData.get("heure_debut") as string,
      heure_fin:   formData.get("heure_fin") as string,
      jours:       jours.length ? jours : [0,1,2,3,4,5,6],
      actif:       true,
    });

    if (error) return { error: error.message };
    revalidatePath("/admin/vols");
    return { success: true };
  } catch {
    return { error: "Erreur serveur" };
  }
}

export async function updatePlage(id: string, formData: FormData) {
  try {
    await checkAdmin();
    const db = createAdminClient();

    const jours = formData.getAll("jours").map(Number);
    const { error } = await db.from("disponibilites").update({
      date_debut:  formData.get("date_debut") as string,
      date_fin:    formData.get("date_fin") as string,
      heure_debut: formData.get("heure_debut") as string,
      heure_fin:   formData.get("heure_fin") as string,
      jours:       jours.length ? jours : [0,1,2,3,4,5,6],
    }).eq("id", id);

    if (error) return { error: error.message };
    revalidatePath("/admin/vols");
    return { success: true };
  } catch {
    return { error: "Erreur serveur" };
  }
}

export async function togglePlageActif(id: string, actif: boolean) {
  try {
    await checkAdmin();
    const db = createAdminClient();
    const { error } = await db
      .from("disponibilites")
      .update({ actif })
      .eq("id", id);
    if (error) return { error: error.message };
    revalidatePath("/admin/vols");
    return { success: true };
  } catch {
    return { error: "Erreur serveur" };
  }
}

export async function deletePlage(id: string) {
  try {
    await checkAdmin();
    const db = createAdminClient();
    await db.from("disponibilites").delete().eq("id", id);
    revalidatePath("/admin/vols");
    return { success: true };
  } catch {
    return { error: "Erreur serveur" };
  }
}

// â”€â”€ Overrides individuels â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function upsertJourIndiv(formData: FormData) {
  try {
    await checkAdmin();
    const db = createAdminClient();

    const date   = formData.get("date") as string;
    const ferme  = formData.get("ferme") === "true";
    const hDebut = ferme ? null : (formData.get("heure_debut") as string) || null;
    const hFin   = ferme ? null : (formData.get("heure_fin") as string) || null;

    const { error } = await db.from("disponibilites_jours").upsert(
      { date, ferme, heure_debut: hDebut, heure_fin: hFin },
      { onConflict: "date" }
    );

    if (error) return { error: error.message };
    revalidatePath("/admin/vols");
    return { success: true };
  } catch {
    return { error: "Erreur serveur" };
  }
}

export async function deleteJourIndiv(id: string) {
  try {
    await checkAdmin();
    const db = createAdminClient();
    await db.from("disponibilites_jours").delete().eq("id", id);
    revalidatePath("/admin/vols");
    return { success: true };
  } catch {
    return { error: "Erreur serveur" };
  }
}
