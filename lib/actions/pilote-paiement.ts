"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdminOrOwningPilote } from "./auth-guards";
import { isPiloteVol } from "@/lib/pilote/payment";

// Bloc D · modèle A — le pilote fixe le montant de la participation aux frais et
// marque quand le client l'a réglé. Aucun flux d'argent réel : trace informative.

async function loadPiloteVol(reservationId: string) {
  const db = createAdminClient();
  const { data } = await db
    .from("reservations")
    .select("id, type_resa, pilote_id, statut, montant_pilote, part_pilote_pct, pilote_paye")
    .eq("id", reservationId)
    .single();
  return { db, resa: data };
}

export async function setPiloteMontant(
  reservationId: string,
  montant: number,
  partPilotePct: number | null,
) {
  try {
    const actor = await requireAdminOrOwningPilote(reservationId);
    const { db, resa } = await loadPiloteVol(reservationId);
    if (!resa) return { error: "Réservation introuvable" };
    if (!isPiloteVol(resa)) return { error: "Ce vol n'est pas géré par un pilote" };
    if (!(montant > 0)) return { error: "Montant invalide" };

    const { error } = await db
      .from("reservations")
      .update({
        montant_pilote: Math.round(montant * 100) / 100,
        part_pilote_pct: partPilotePct != null ? Math.round(partPilotePct * 10) / 10 : null,
      })
      .eq("id", reservationId);
    if (error) return { error: error.message };

    await db.from("reservation_history").insert({
      reservation_id: reservationId,
      action: "field_changed",
      field: "montant_pilote",
      old_value: resa.montant_pilote != null ? String(resa.montant_pilote) : null,
      new_value: `${montant} €`,
      author: actor.role === "pilote" ? `pilote:${actor.piloteNom}` : "admin",
      note: partPilotePct != null ? `Participation fixée à ${montant} € (part client ${partPilotePct} %)` : `Participation fixée à ${montant} €`,
    });

    revalidatePath("/admin/vols");
    revalidatePath("/admin/transactions");
    revalidatePath("/pilote/vols");
    return { success: true };
  } catch {
    return { error: "Erreur serveur" };
  }
}

export async function setPilotePaye(reservationId: string, paye: boolean) {
  try {
    const actor = await requireAdminOrOwningPilote(reservationId);
    const { db, resa } = await loadPiloteVol(reservationId);
    if (!resa) return { error: "Réservation introuvable" };
    if (!isPiloteVol(resa)) return { error: "Ce vol n'est pas géré par un pilote" };

    const { error } = await db
      .from("reservations")
      .update({ pilote_paye: paye, pilote_paye_at: paye ? new Date().toISOString() : null })
      .eq("id", reservationId);
    if (error) return { error: error.message };

    await db.from("reservation_history").insert({
      reservation_id: reservationId,
      action: "field_changed",
      field: "pilote_paye",
      old_value: resa.pilote_paye ? "payé" : "non payé",
      new_value: paye ? "payé" : "non payé",
      author: actor.role === "pilote" ? `pilote:${actor.piloteNom}` : "admin",
      note: paye ? "Le client a réglé le pilote" : "Paiement pilote remis en attente",
    });

    revalidatePath("/admin/vols");
    revalidatePath("/admin/transactions");
    revalidatePath("/pilote/vols");
    return { success: true };
  } catch {
    return { error: "Erreur serveur" };
  }
}
