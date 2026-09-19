import { createAdminClient } from "@/lib/supabase/admin";

// Côté serveur uniquement (utilise le client admin) — séparé de
// lib/annonces-pilote.ts qui est aussi importé par des composants client
// (AnnonceForm) et ne doit jamais tirer la clé service_role dans leur bundle.

/**
 * Mode « à la place » : fige le prix de chaque réservation active sur
 * l'annonce en fonction du nombre RÉEL d'occupants (pas de la capacité max
 * déclarée à la publication) — part égale entre le pilote (1 part) et chaque
 * passager effectivement inscrit à ce moment. Ex. 256 € annoncés, un seul
 * client au final : 256 / 2 = 128 € chacun (pas un montant pilote figé à la
 * publication, sinon le seul client paierait le solde en entier). Appelé à
 * la clôture du groupe (complet ou clôturé manuellement par le pilote). Les
 * réservations annulées ne comptent pas dans le partage.
 */
export async function finalizeAnnonceGroupPricing(
  db: ReturnType<typeof createAdminClient>,
  annonceId: string,
  prixTotal: number,
) {
  // Exclut aussi vol_effectue : une annonce republiée (même ligne réactivée,
  // cf. republishAnnonce) peut porter des réservations d'un cycle de vente
  // précédent déjà volées — elles ne doivent jamais entrer dans le calcul du
  // nouveau groupe qui se forme.
  const { data: resas } = await db
    .from("reservations")
    .select("id, passagers")
    .eq("annonce_id", annonceId)
    .not("statut", "in", "(annulee,vol_effectue)");

  const totalPax = (resas ?? []).reduce((sum, r) => sum + (r.passagers ?? 1), 0);
  if (totalPax <= 0) return;

  const sharePerPerson = Math.round((prixTotal / (totalPax + 1)) * 100) / 100;
  for (const r of resas ?? []) {
    const acompte = Math.round(sharePerPerson * (r.passagers ?? 1) * 100) / 100;
    await db.from("reservations").update({ acompte }).eq("id", r.id);
  }

  // Le pilote porte 1 part comme les autres occupants — jusqu'ici seul le
  // montant des clients (acompte) était figé à la clôture, part_pilote
  // restait à sa valeur de publication (calculée sur la capacité max
  // déclarée, pas sur le groupe réel qui se ferme). Bug trouvé le 19/09 :
  // la part pilote affichée/enregistrée ne correspondait plus au partage
  // réel dès que le groupe se clôturait avec moins d'occupants que prévu.
  await db.from("annonces_pilote").update({ part_pilote: sharePerPerson }).eq("id", annonceId);
}

/**
 * Libère une annonce pilote quand une réservation qui la tenait (annonce_id)
 * est annulée — quel que soit le code qui l'annule. Extrait le 19/09 de
 * updateStatutReservation() car le cron demande-deadline annule aussi des
 * demandes reçues (72h sans réponse de Romain) par un update direct qui
 * contournait cette fonction : une annonce prise par une demande jamais
 * confirmée restait coincée à "reservee" pour toujours après l'auto-annulation,
 * invisible au public et au pilote (cf. audit edge cases du 19/09). CAS
 * (compare-and-swap) pour ne jamais réouvrir une annonce que le pilote a
 * annulée ou republiée lui-même entretemps.
 */
export async function releaseAnnoncePilote(
  db: ReturnType<typeof createAdminClient>,
  annonceId: string,
  passagers: number | null | undefined,
) {
  const { data: annonce } = await db
    .from("annonces_pilote")
    .select("statut, mode_vente, places_reservees")
    .eq("id", annonceId)
    .single();
  if (annonce?.mode_vente === "place") {
    const prev = annonce.places_reservees ?? 0;
    const next = Math.max(0, prev - (passagers ?? 1));
    await db
      .from("annonces_pilote")
      .update({ places_reservees: next, statut: "publiee" })
      .eq("id", annonceId)
      .eq("places_reservees", prev)
      .in("statut", ["publiee", "reservee"]);
  } else if (annonce?.statut === "reservee") {
    await db
      .from("annonces_pilote")
      .update({ statut: "publiee" })
      .eq("id", annonceId)
      .eq("statut", "reservee");
  }
}
