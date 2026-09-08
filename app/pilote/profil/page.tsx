import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { PiloteProfilForm } from "@/components/pilote/PiloteProfilForm";
import type { Pilote } from "@/types/database";

export const metadata = { title: "Mon profil — Espace pilote" };

export default async function PiloteProfilPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: pilote } = await createAdminClient()
    .from("pilotes")
    .select("*")
    .eq("user_id", user!.id)
    .single();

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-foreground">Mon profil</h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          Vous gérez ces informations vous-même. Elles conditionnent votre éligibilité aux vols.
        </p>
      </div>

      {pilote ? (
        <PiloteProfilForm pilote={pilote as Pilote} />
      ) : (
        <p className="text-sm text-destructive">Fiche pilote introuvable, contactez Romain.</p>
      )}
    </div>
  );
}
