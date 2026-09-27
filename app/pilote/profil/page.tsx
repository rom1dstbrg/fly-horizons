import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { PiloteProfilForm } from "@/components/pilote/PiloteProfilForm";
import { PiloteDocuments } from "@/components/pilote/PiloteDocuments";
import type { PiloteDocument } from "@/lib/actions/pilote-documents";
import { PageHeader } from "@/components/pilote/studio";
import type { Pilote } from "@/types/database";

export const metadata = { title: "Mon profil — Espace pilote" };

export default async function PiloteProfilPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const admin = createAdminClient();
  const { data: pilote } = await admin
    .from("pilotes")
    .select("*")
    .eq("user_id", user!.id)
    .single();
  const { data: documents } = pilote
    ? await admin.from("pilote_documents").select("id, type, file_name, created_at").eq("pilote_id", pilote.id).order("created_at")
    : { data: [] };

  return (
    <div className="mx-auto w-full max-w-lg space-y-5">
      <PageHeader title="Mon profil" />

      {pilote ? (
        <PiloteProfilForm
          pilote={pilote as Pilote}
          documentsSlot={
            <PiloteDocuments
              status={(pilote as Pilote).docs_status}
              verifiedAt={(pilote as Pilote).docs_verified_at}
              note={(pilote as Pilote).docs_note}
              documents={(documents ?? []) as PiloteDocument[]}
            />
          }
        />
      ) : (
        <p className="rounded-[12px] bg-st-bad-soft px-3.5 py-2.5 text-[13px] text-st-bad">Fiche pilote introuvable, contactez Romain.</p>
      )}
    </div>
  );
}
