"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

async function checkAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");
  const { data: profile } = await supabase
    .from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") throw new Error("Accès refusé");
}

export async function createStopover(data: {
  icao: string;
  nom: string;
  taxe: number;
  lat?: number | null;
  lng?: number | null;
}) {
  await checkAdmin();
  const supabase = createAdminClient();
  const { error } = await supabase.from("stopovers").insert({
    icao: data.icao.toUpperCase().trim(),
    nom:  data.nom.trim(),
    taxe: Math.max(0, Math.round(data.taxe)),
    actif: true,
    lat: data.lat ?? null,
    lng: data.lng ?? null,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/admin");
}

export async function updateStopover(id: string, data: {
  icao?: string;
  nom?: string;
  taxe?: number;
  actif?: boolean;
  lat?: number | null;
  lng?: number | null;
}) {
  await checkAdmin();
  const supabase = createAdminClient();
  const payload: Record<string, unknown> = {};
  if (data.icao  !== undefined) payload.icao  = data.icao.toUpperCase().trim();
  if (data.nom   !== undefined) payload.nom   = data.nom.trim();
  if (data.taxe  !== undefined) payload.taxe  = Math.max(0, Math.round(data.taxe));
  if (data.actif !== undefined) payload.actif = data.actif;
  if (data.lat   !== undefined) payload.lat   = data.lat;
  if (data.lng   !== undefined) payload.lng   = data.lng;
  const { error } = await supabase.from("stopovers").update(payload).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin");
}

export async function deleteStopover(id: string) {
  await checkAdmin();
  const supabase = createAdminClient();
  const { error } = await supabase.from("stopovers").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin");
}
