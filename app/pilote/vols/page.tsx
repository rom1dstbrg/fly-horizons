import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { PiloteVolsClient } from "@/components/pilote/PiloteVolsClient";
import { PiloteVolsActions } from "@/components/pilote/PiloteVolsActions";
import { PageHeader } from "@/components/pilote/studio";

export const metadata = { title: "Mes vols — Espace pilote" };

export default async function PiloteVolsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const admin = createAdminClient();
  const { data: pilote } = await admin.from("pilotes").select("id").eq("user_id", user!.id).single();

  const { data: reservations } = pilote
    ? await admin
        .from("reservations")
        .select("*, clients(*), pilotes(nom), route_proposals(status, created_at)")
        .eq("pilote_id", pilote.id)
        .neq("type_resa", "perso")
        .order("date_vol", { ascending: true })
    : { data: [] };

  return (
    <div className="space-y-5">
      <PageHeader title="Mes vols" actions={<PiloteVolsActions />} />
      <PiloteVolsClient reservations={(reservations ?? []) as never} />
    </div>
  );
}
