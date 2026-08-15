import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { PiloteAnnoncesClient } from "@/components/pilote/PiloteAnnoncesClient";

export const metadata = { title: "Mes annonces — Espace pilote" };

export default async function PiloteAnnoncesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const admin = createAdminClient();
  const { data: pilote } = await admin.from("pilotes").select("id").eq("user_id", user!.id).single();

  const { data: annonces } = pilote
    ? await admin
        .from("annonces_pilote")
        .select("id, duree, places, prix_total, part_pilote, description, images, statut")
        .eq("pilote_id", pilote.id)
        .order("created_at", { ascending: false })
    : { data: [] };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-foreground">Mes annonces</h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          Publiez vos offres de vol : durée, prix, photos — le client choisit sa date.
        </p>
      </div>

      <PiloteAnnoncesClient annonces={annonces ?? []} />
    </div>
  );
}
