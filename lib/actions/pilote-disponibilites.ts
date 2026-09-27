"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { DispoPlage, DispoJourIndiv } from "@/lib/dispo-utils";

// Dispos du pilote — un seul calendrier, partagé par toutes ses annonces.
// Même modèle et mêmes signatures que le calendrier admin (lib/actions/disponibilites.ts),
// tables pilote_disponibilites / pilote_disponibilites_jours scopées par pilote_id :
// le composant DispoPlanner sert les deux. Chaque écriture filtre sur le pilote
// connecté, un pilote ne peut jamais toucher le calendrier d'un autre.

const PATH = "/pilote/disponibilites";

async function checkPilote() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Non autorisé");
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "pilote" && profile?.role !== "admin") throw new Error("Non autorisé");

  const db = createAdminClient();
  const { data: pilote } = await db.from("pilotes").select("id").eq("user_id", user.id).single();
  if (!pilote) throw new Error("Fiche pilote introuvable");
  return { piloteId: pilote.id as string, db };
}

export interface PiloteDispoState {
  plages: DispoPlage[];
  exceptions: DispoJourIndiv[];
}

export async function getPiloteDisponibilites(): Promise<PiloteDispoState> {
  const { piloteId, db } = await checkPilote();
  const [{ data: plages }, { data: exceptions }] = await Promise.all([
    db.from("pilote_disponibilites").select("*").eq("pilote_id", piloteId).order("date_debut"),
    db.from("pilote_disponibilites_jours").select("*").eq("pilote_id", piloteId).order("date"),
  ]);
  return { plages: plages ?? [], exceptions: exceptions ?? [] };
}

function plageFromForm(formData: FormData) {
  const jours = formData.getAll("jours").map(Number);
  return {
    date_debut: formData.get("date_debut") as string,
    date_fin: formData.get("date_fin") as string,
    heure_debut: formData.get("heure_debut") as string,
    heure_fin: formData.get("heure_fin") as string,
    jours: jours.length ? jours : [0, 1, 2, 3, 4, 5, 6],
  };
}

// ── Plages récurrentes ──────────────────────────────────────────

export async function createPilotePlage(formData: FormData) {
  try {
    const { piloteId, db } = await checkPilote();
    const { error } = await db.from("pilote_disponibilites").insert({ ...plageFromForm(formData), pilote_id: piloteId, actif: true });
    if (error) return { error: error.message };
    revalidatePath(PATH);
    return { success: true };
  } catch {
    return { error: "Erreur serveur" };
  }
}

export async function updatePilotePlage(id: string, formData: FormData) {
  try {
    const { piloteId, db } = await checkPilote();
    const { error } = await db.from("pilote_disponibilites").update(plageFromForm(formData)).eq("id", id).eq("pilote_id", piloteId);
    if (error) return { error: error.message };
    revalidatePath(PATH);
    return { success: true };
  } catch {
    return { error: "Erreur serveur" };
  }
}

export async function togglePilotePlageActif(id: string, actif: boolean) {
  try {
    const { piloteId, db } = await checkPilote();
    const { error } = await db.from("pilote_disponibilites").update({ actif }).eq("id", id).eq("pilote_id", piloteId);
    if (error) return { error: error.message };
    revalidatePath(PATH);
    return { success: true };
  } catch {
    return { error: "Erreur serveur" };
  }
}

export async function deletePilotePlage(id: string) {
  try {
    const { piloteId, db } = await checkPilote();
    await db.from("pilote_disponibilites").delete().eq("id", id).eq("pilote_id", piloteId);
    revalidatePath(PATH);
    return { success: true };
  } catch {
    return { error: "Erreur serveur" };
  }
}

// ── Exceptions (un jour précis) ─────────────────────────────────

export async function upsertPiloteJoursBulk(
  dates: string[],
  data: { ferme: boolean; heure_debut: string | null; heure_fin: string | null },
) {
  try {
    const { piloteId, db } = await checkPilote();
    if (!dates.length) return { error: "Aucune date sélectionnée" };
    const rows = dates.map((date) => ({
      pilote_id: piloteId,
      date,
      ferme: data.ferme,
      heure_debut: data.ferme ? null : data.heure_debut,
      heure_fin: data.ferme ? null : data.heure_fin,
    }));
    const { error } = await db.from("pilote_disponibilites_jours").upsert(rows, { onConflict: "pilote_id,date" });
    if (error) return { error: error.message };
    revalidatePath(PATH);
    return { success: true };
  } catch {
    return { error: "Erreur serveur" };
  }
}

export async function deletePiloteJour(id: string) {
  try {
    const { piloteId, db } = await checkPilote();
    await db.from("pilote_disponibilites_jours").delete().eq("id", id).eq("pilote_id", piloteId);
    revalidatePath(PATH);
    return { success: true };
  } catch {
    return { error: "Erreur serveur" };
  }
}
