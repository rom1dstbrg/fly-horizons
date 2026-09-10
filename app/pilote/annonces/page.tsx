import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { PiloteAnnoncesClient } from "@/components/pilote/PiloteAnnoncesClient";
import { PiloteHeader } from "@/components/pilote/ui";
import { piloteLegalStatus } from "@/lib/pilote/legal";

export const metadata = { title: "Mes annonces — Espace pilote" };

function isProbablyIban(v: string | null | undefined): boolean {
  if (!v) return false;
  return /^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(v.replace(/\s+/g, "").toUpperCase());
}

export default async function PiloteAnnoncesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const admin = createAdminClient();
  const { data: pilote } = await admin
    .from("pilotes")
    .select(
      "id, iban, licence_numero, licence_expiration, medical_expiration, conditions_accepted_at",
    )
    .eq("user_id", user!.id)
    .single();

  const { data: annonces } = pilote
    ? await admin
        .from("annonces_pilote")
        .select(
          "id, duree, places, prix_total, part_pilote, mode_vente, places_reservees, description, images, statut, legal_ok",
        )
        .eq("pilote_id", pilote.id)
        .order("created_at", { ascending: false })
    : { data: [] };

  // Garde-fous publication : légal à jour (décision 2026-09-06) + IBAN valide
  // (règlement par virement direct au pilote).
  let publishGate: string | null = null;
  if (!pilote) {
    publishGate = "Fiche pilote introuvable.";
  } else if (!piloteLegalStatus(pilote).ok) {
    publishGate =
      "Complétez vos informations légales (numéro de licence, expirations, charte) dans votre profil pour publier une annonce.";
  } else if (!isProbablyIban(pilote.iban)) {
    publishGate =
      "Ajoutez un IBAN valide dans votre profil : c'est là que le client vous réglera par virement.";
  }

  return (
    <div className="space-y-6">
      <PiloteHeader
        title="Mes annonces"
        subtitle="Publiez vos offres de vol : durée, prix, photos. Le client choisit sa date."
      />
      <PiloteAnnoncesClient annonces={annonces ?? []} publishGate={publishGate} />
    </div>
  );
}
