"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { computeMassBalance, type MassBalanceInputs } from "@/lib/mass-balance/da40-calc";
import { requireAdminOrActivePilote, type ReservationActor } from "./auth-guards";

async function checkAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Non autorisé");
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin") throw new Error("Non autorisé");
}

// Un pilote ne peut lier une feuille qu'à une de ses propres réservations —
// sinon le lien est ignoré (la feuille reste un calcul libre).
async function scopedReservationId(actor: ReservationActor, reservationId: string | null | undefined) {
  const id = reservationId || null;
  if (!id || actor.role === "admin") return id;
  const { data: resa } = await createAdminClient()
    .from("reservations")
    .select("pilote_id")
    .eq("id", id)
    .maybeSingle();
  return resa?.pilote_id === actor.piloteId ? id : null;
}

export interface SaveSheetPayload {
  inputs: MassBalanceInputs;
  reservationId?: string | null;
  label?: string | null;
}

export async function saveMassBalanceSheet(payload: SaveSheetPayload) {
  try {
    const actor = await requireAdminOrActivePilote();
    const { inputs } = payload;
    if (!inputs?.aircraftReg) return { error: "Avion manquant" };

    const computed = computeMassBalance(inputs);
    const db = createAdminClient();
    const { data, error } = await db
      .from("mass_balance_sheets")
      .insert({
        reservation_id: await scopedReservationId(actor, payload.reservationId),
        aircraft_reg: inputs.aircraftReg,
        flight_date: inputs.flightDate || null,
        label: payload.label?.trim() || null,
        inputs,
        computed,
      })
      .select("id")
      .single();

    if (error) return { error: error.message };
    revalidatePath("/admin/mass-balance");
    return { success: true, id: data.id as string };
  } catch {
    return { error: "Erreur serveur" };
  }
}

export async function updateMassBalanceSheet(id: string, payload: SaveSheetPayload) {
  try {
    const actor = await requireAdminOrActivePilote();
    const { inputs } = payload;
    if (!id) return { error: "Feuille inconnue" };
    if (!inputs?.aircraftReg) return { error: "Avion manquant" };

    const computed = computeMassBalance(inputs);
    const db = createAdminClient();
    const { error } = await db
      .from("mass_balance_sheets")
      .update({
        reservation_id: await scopedReservationId(actor, payload.reservationId),
        aircraft_reg: inputs.aircraftReg,
        flight_date: inputs.flightDate || null,
        label: payload.label?.trim() || null,
        inputs,
        computed,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) return { error: error.message };
    revalidatePath("/admin/mass-balance");
    return { success: true, id };
  } catch {
    return { error: "Erreur serveur" };
  }
}

export async function deleteMassBalanceSheet(id: string) {
  try {
    await checkAdmin();
    const db = createAdminClient();
    const { error } = await db.from("mass_balance_sheets").delete().eq("id", id);
    if (error) return { error: error.message };
    revalidatePath("/admin/mass-balance");
    return { success: true };
  } catch {
    return { error: "Erreur serveur" };
  }
}
