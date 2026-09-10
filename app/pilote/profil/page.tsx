import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { PiloteProfilForm } from "@/components/pilote/PiloteProfilForm";
import { PiloteHeader } from "@/components/pilote/ui";
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
      <PiloteHeader
        title="Mon profil"
        subtitle="Vous gérez ces informations vous-même. Elles conditionnent votre éligibilité aux vols."
      />

      {pilote ? (
        <PiloteProfilForm pilote={pilote as Pilote} />
      ) : (
        <p className="text-sm text-destructive">Fiche pilote introuvable, contactez Romain.</p>
      )}
    </div>
  );
}
