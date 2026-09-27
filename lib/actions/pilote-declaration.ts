"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdminOrOwningPilote } from "./auth-guards";

// Déclaration du pilote avant un vol (décision 27/09) : expérience récente
// (3 décollages et atterrissages en 90 jours, FCL.060), SEP et médical valides
// à la date du vol, avion autorisé et assuré passagers. Horodatée sur la
// réservation et tracée dans l'historique. Refusée si la SEP ou le médical du
// profil ne couvrent pas le jour du vol. L'expérience récente n'est pas une
// date du profil : seule la déclaration du pilote en fait foi.

export async function declarePreflight(reservationId: string) {
  try {
    const actor = await requireAdminOrOwningPilote(reservationId);
    if (actor.role !== "pilote") return { error: "Seul le pilote du vol peut faire cette déclaration" };

    const db = createAdminClient();
    const { data: resa } = await db.from("reservations").select("date_vol, pilote_declaration_at").eq("id", reservationId).single();
    if (!resa) return { error: "Vol introuvable" };
    if (resa.pilote_declaration_at) return { success: true, at: resa.pilote_declaration_at as string };

    const { data: p } = await db
      .from("pilotes")
      .select("licence_expiration, medical_expiration")
      .eq("id", actor.piloteId)
      .single();
    const date = resa.date_vol as string;
    if (!p?.licence_expiration || p.licence_expiration < date) return { error: "Votre qualification SEP n'est plus valable le jour du vol. Mettez votre profil à jour." };
    if (!p?.medical_expiration || p.medical_expiration < date) return { error: "Votre certificat médical n'est plus valable le jour du vol. Mettez votre profil à jour." };

    const at = new Date().toISOString();
    const { error } = await db.from("reservations").update({ pilote_declaration_at: at }).eq("id", reservationId);
    if (error) return { error: error.message };
    await db.from("reservation_history").insert({
      reservation_id: reservationId,
      action: "pilote_declaration",
      field: null,
      author: `pilote:${actor.piloteNom}`,
      note: "Déclaration avant vol : 3 décollages et atterrissages en 90 jours, SEP et médical valides, avion autorisé et assuré passagers.",
    });

    revalidatePath("/pilote/vols");
    revalidatePath("/admin/vols");
    return { success: true, at };
  } catch {
    return { error: "Erreur serveur" };
  }
}
