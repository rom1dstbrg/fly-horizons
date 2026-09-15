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
  const { data: resas } = await db
    .from("reservations")
    .select("id, passagers")
    .eq("annonce_id", annonceId)
    .neq("statut", "annulee");

  const totalPax = (resas ?? []).reduce((sum, r) => sum + (r.passagers ?? 1), 0);
  if (totalPax <= 0) return;

  const sharePerPerson = Math.round((prixTotal / (totalPax + 1)) * 100) / 100;
  for (const r of resas ?? []) {
    const acompte = Math.round(sharePerPerson * (r.passagers ?? 1) * 100) / 100;
    await db.from("reservations").update({ acompte }).eq("id", r.id);
  }
}
