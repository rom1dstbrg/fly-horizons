import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { PiloteProfilForm } from "@/components/pilote/PiloteProfilForm";
import { PageHeader } from "@/components/pilote/studio";
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
    <div className="mx-auto w-full max-w-lg space-y-5">
      <PageHeader title="Mon profil" />

      {pilote ? (
        <PiloteProfilForm pilote={pilote as Pilote} />
      ) : (
        <p className="rounded-[12px] bg-st-bad-soft px-3.5 py-2.5 text-[13px] text-st-bad">Fiche pilote introuvable, contactez Romain.</p>
      )}
    </div>
  );
}
