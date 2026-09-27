"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireSelfActivePilote } from "./auth-guards";

// Itinéraires enregistrés (27/09) : chacun appartient au pilote qui l'a créé,
// et lui seul le voit, le modifie ou le supprime. Pas d'itinéraire partagé.
// Charger un itinéraire dans une réservation ou une annonce en copie les
// points : la copie reste en place même si l'itinéraire change ou si le vol
// passe à un autre pilote.

export interface ItineraireWaypoint {
  lat: number;
  lng: number;
  nom: string;
}

export interface Itineraire {
  id: string;
  nom: string;
  waypoints: ItineraireWaypoint[];
  stopovers: { icao: string; nom: string; taxe: number }[];
  duree_estimee: number | null;
  notes: string | null;
  utilisations: number;
  created_at: string;
}

export type ItineraireInput = {
  nom: string;
  waypoints: ItineraireWaypoint[];
  stopovers?: { icao: string; nom: string; taxe: number }[];
  duree_estimee?: number | null;
  notes?: string | null;
};

function clean(data: ItineraireInput) {
  const duree = data.duree_estimee != null && Number.isFinite(data.duree_estimee) && data.duree_estimee > 0
    ? Math.round(data.duree_estimee)
    : null;
  return {
    nom: data.nom.trim(),
    waypoints: data.waypoints,
    stopovers: data.stopovers ?? [],
    duree_estimee: duree,
    notes: data.notes?.trim() || null,
  };
}

function revalidate() {
  revalidatePath("/pilote/itineraires");
}

/** Itinéraires du pilote connecté. Un compte sans fiche pilote active n'en a pas. */
export async function getItineraires(): Promise<Itineraire[]> {
  let piloteId: string;
  try {
    ({ piloteId } = await requireSelfActivePilote());
  } catch {
    return [];
  }
  const { data, error } = await createAdminClient()
    .from("itineraires")
    .select("*")
    .eq("pilote_id", piloteId)
    .order("duree_estimee", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as Itineraire[];
}

export async function createItineraire(data: ItineraireInput): Promise<{ success: true; id: string } | { error: string }> {
  const { piloteId } = await requireSelfActivePilote();
  const row = clean(data);
  if (!row.nom) return { error: "Donnez un nom à l'itinéraire." };
  if (row.waypoints.length === 0) return { error: "Ajoutez au moins un point sur la carte." };
  const { data: created, error } = await createAdminClient()
    .from("itineraires")
    .insert({ ...row, pilote_id: piloteId })
    .select("id")
    .single();
  if (error) return { error: error.message };
  revalidate();
  return { success: true, id: created.id };
}

export async function updateItineraire(id: string, data: ItineraireInput): Promise<{ success: true } | { error: string }> {
  const { piloteId } = await requireSelfActivePilote();
  const row = clean(data);
  if (!row.nom) return { error: "Donnez un nom à l'itinéraire." };
  if (row.waypoints.length === 0) return { error: "Ajoutez au moins un point sur la carte." };
  const { error } = await createAdminClient()
    .from("itineraires")
    .update(row)
    .eq("id", id)
    .eq("pilote_id", piloteId);
  if (error) return { error: error.message };
  revalidate();
  return { success: true };
}

export async function incrementItineraireUsage(id: string) {
  const { piloteId } = await requireSelfActivePilote();
  const supabase = createAdminClient();
  const { data } = await supabase.from("itineraires").select("utilisations").eq("id", id).eq("pilote_id", piloteId).single();
  if (data) {
    await supabase.from("itineraires").update({ utilisations: data.utilisations + 1 }).eq("id", id).eq("pilote_id", piloteId);
  }
}

export async function deleteItineraire(id: string): Promise<{ success: true } | { error: string }> {
  const { piloteId } = await requireSelfActivePilote();
  const { error } = await createAdminClient().from("itineraires").delete().eq("id", id).eq("pilote_id", piloteId);
  if (error) return { error: error.message };
  revalidate();
  return { success: true };
}
