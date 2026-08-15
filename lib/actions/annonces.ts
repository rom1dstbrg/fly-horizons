"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { evaluerPartPilote } from "@/lib/annonces-pilote";

async function checkPilote() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Non autorisé");
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "pilote") throw new Error("Non autorisé");

  const admin = createAdminClient();
  const { data: pilote } = await admin.from("pilotes").select("id, statut").eq("user_id", user.id).single();
  if (!pilote) throw new Error("Fiche pilote introuvable");
  if (pilote.statut !== "actif") throw new Error("Compte pilote désactivé");
  return pilote;
}

export async function createAnnonce(data: {
  date_vol: string;
  heure_vol: string;
  duree: number;
  places: number;
  prix_total: number;
  part_pilote: number;
}) {
  try {
    const pilote = await checkPilote();

    if (!data.date_vol || !data.heure_vol) return { error: "Date et heure obligatoires" };
    if (![30, 60, 90, 120].includes(data.duree)) return { error: "Durée invalide" };
    if (!(data.places >= 1 && data.places <= 3)) return { error: "Nombre de places invalide (1 à 3)" };

    const check = evaluerPartPilote(data.prix_total, data.part_pilote);
    if (check.level === "block") return { error: check.message };

    const admin = createAdminClient();
    const { error } = await admin.from("annonces_pilote").insert({
      pilote_id: pilote.id,
      date_vol: data.date_vol,
      heure_vol: data.heure_vol,
      duree: data.duree,
      places: data.places,
      prix_total: data.prix_total,
      part_pilote: data.part_pilote,
    });

    if (error) return { error: "Erreur création de l'annonce" };

    revalidatePath("/pilote/annonces");
    return { success: true, warning: check.level === "warn" ? check.message : null };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Erreur serveur" };
  }
}

export async function cancelAnnonce(id: string) {
  try {
    const pilote = await checkPilote();
    const admin = createAdminClient();
    const { error } = await admin
      .from("annonces_pilote")
      .update({ statut: "annulee" })
      .eq("id", id)
      .eq("pilote_id", pilote.id);
    if (error) return { error: error.message };
    revalidatePath("/pilote/annonces");
    return { success: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Erreur serveur" };
  }
}
