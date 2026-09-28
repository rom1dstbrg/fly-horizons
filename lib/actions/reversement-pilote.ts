"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "./auth-guards";
import { isRegleFlyHorizons } from "@/lib/pilote/payment";

// Décision 18 (28/09) : un vol déjà réglé à Fly Horizons et confié à un pilote
// donne lieu à un virement de Romain au pilote, après le vol. L'argent part hors
// de l'app ; on ne trace que « viré, combien, quand ». `montant = null` annule.

export async function setReversementPilote(reservationId: string, montant: number | null) {
  try {
    await requireAdmin();
    const db = createAdminClient();

    const { data: resa } = await db
      .from("reservations")
      .select("id, type_resa, paye, voucher_code, pilote_id, reversement_pilote, pilotes(nom)")
      .eq("id", reservationId)
      .single();
    if (!resa) return { error: "Réservation introuvable" };
    if (!resa.pilote_id || !isRegleFlyHorizons(resa)) {
      return { error: "Ce vol n'est pas un vol réglé à Fly Horizons et confié à un pilote" };
    }

    let arrondi: number | null = null;
    if (montant !== null) {
      if (!Number.isFinite(montant) || montant <= 0 || montant > 100000) return { error: "Montant invalide" };
      arrondi = Math.round(montant * 100) / 100;
    }

    const { error } = await db
      .from("reservations")
      .update({
        reversement_pilote: arrondi,
        reversement_pilote_at: arrondi !== null ? new Date().toISOString() : null,
      })
      .eq("id", reservationId);
    if (error) return { error: error.message };

    const piloteRaw = resa.pilotes as unknown;
    const pilote = (Array.isArray(piloteRaw) ? piloteRaw[0] : piloteRaw) as { nom: string } | null;
    await db.from("reservation_history").insert({
      reservation_id: reservationId,
      action: "field_changed",
      field: "reversement_pilote",
      old_value: resa.reversement_pilote != null ? String(resa.reversement_pilote) : null,
      new_value: arrondi !== null ? String(arrondi) : null,
      author: "admin",
      note: arrondi !== null
        ? `Virement de ${arrondi} € fait à ${pilote?.nom ?? "le pilote"}`
        : "Virement au pilote annulé",
    });

    revalidatePath("/admin/transactions");
    return { success: true, montant: arrondi, le: arrondi !== null ? new Date().toISOString() : null };
  } catch {
    return { error: "Erreur serveur" };
  }
}
