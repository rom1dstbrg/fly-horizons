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

export async function getItineraires(): Promise<Itineraire[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("itineraires")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as Itineraire[];
}

export async function createItineraire(data: {
  nom: string;
  waypoints: ItineraireWaypoint[];
  stopovers?: { icao: string; nom: string; taxe: number }[];
  duree_estimee?: number | null;
  notes?: string | null;
}) {
  await checkAdmin();
  const supabase = createAdminClient();
  const { error } = await supabase.from("itineraires").insert({
    nom: data.nom,
    waypoints: data.waypoints,
    stopovers: data.stopovers ?? [],
    duree_estimee: data.duree_estimee ?? null,
    notes: data.notes ?? null,
  });
  if (error) return { error: error.message };
  revalidatePath("/admin/itineraires");
  return { success: true };
}

export async function updateItineraire(id: string, data: {
  nom: string;
  waypoints: ItineraireWaypoint[];
  stopovers?: { icao: string; nom: string; taxe: number }[];
  duree_estimee?: number | null;
  notes?: string | null;
}) {
  await checkAdmin();
  const supabase = createAdminClient();
  const { error } = await supabase.from("itineraires").update({
    nom: data.nom,
    waypoints: data.waypoints,
    stopovers: data.stopovers ?? [],
    duree_estimee: data.duree_estimee ?? null,
    notes: data.notes ?? null,
  }).eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/admin/itineraires");
  return { success: true };
}

export async function incrementItineraireUsage(id: string) {
  const supabase = createAdminClient();
  const { data } = await supabase.from("itineraires").select("utilisations").eq("id", id).single();
  if (data) {
    await supabase.from("itineraires").update({ utilisations: data.utilisations + 1 }).eq("id", id);
  }
}

export async function deleteItineraire(id: string) {
  await checkAdmin();
  const supabase = createAdminClient();
  const { error } = await supabase.from("itineraires").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/admin/itineraires");
  return { success: true };
}
