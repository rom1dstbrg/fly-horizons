"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { DispoPlage, DispoJourIndiv } from "@/lib/dispo-utils";

// Dispos du pilote — un seul calendrier, partagé par toutes ses annonces.
// Même modèle que le calendrier admin (disponibilites / disponibilites_jours),
// scopé par pilote_id. Une seule plage récurrente + des exceptions ponctuelles.

async function checkPilote() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Non autorisé");
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "pilote" && profile?.role !== "admin") throw new Error("Non autorisé");

  const admin = createAdminClient();
  const { data: pilote } = await admin.from("pilotes").select("id").eq("user_id", user.id).single();
  if (!pilote) throw new Error("Fiche pilote introuvable");
  return { pilote, admin };
}

export interface PiloteDispoState {
  plage: DispoPlage | null;
  exceptions: DispoJourIndiv[];
}

export async function getPiloteDisponibilites(): Promise<PiloteDispoState> {
  const { pilote, admin } = await checkPilote();
  const [{ data: plages }, { data: exceptions }] = await Promise.all([
    admin.from("pilote_disponibilites").select("*").eq("pilote_id", pilote.id).eq("actif", true).limit(1),
    admin.from("pilote_disponibilites_jours").select("*").eq("pilote_id", pilote.id).order("date"),
  ]);
  return { plage: plages?.[0] ?? null, exceptions: exceptions ?? [] };
}

export async function savePiloteDisponibilites(data: {
  plage: { date_debut: string; date_fin: string; heure_debut: string; heure_fin: string; jours: number[] } | null;
  exceptions: { date: string; ferme: boolean; heure_debut: string | null; heure_fin: string | null }[];
}) {
  try {
    const { pilote, admin } = await checkPilote();

    // Remplace-tout : simple et suffisant (le pilote édite son propre calendrier).
    await admin.from("pilote_disponibilites").delete().eq("pilote_id", pilote.id);
    if (data.plage) {
      const { error } = await admin.from("pilote_disponibilites").insert({
        pilote_id: pilote.id,
        date_debut: data.plage.date_debut,
        date_fin: data.plage.date_fin,
        heure_debut: data.plage.heure_debut,
        heure_fin: data.plage.heure_fin,
        jours: data.plage.jours.length ? data.plage.jours : [0, 1, 2, 3, 4, 5, 6],
        actif: true,
      });
      if (error) return { error: error.message };
    }

    await admin.from("pilote_disponibilites_jours").delete().eq("pilote_id", pilote.id);
    if (data.exceptions.length) {
      const rows = data.exceptions.map((e) => ({
        pilote_id: pilote.id,
        date: e.date,
        ferme: e.ferme,
        heure_debut: e.ferme ? null : e.heure_debut,
        heure_fin: e.ferme ? null : e.heure_fin,
      }));
      const { error } = await admin.from("pilote_disponibilites_jours").insert(rows);
      if (error) return { error: error.message };
    }

    revalidatePath("/pilote/disponibilites");
    return { success: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Erreur serveur" };
  }
}
