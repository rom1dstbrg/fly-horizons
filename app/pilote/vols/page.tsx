import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { PiloteVolsClient } from "@/components/pilote/PiloteVolsClient";
import { PlaneTakeoff } from "lucide-react";
import { ButtonLabel, LinkButton, PageHeader } from "@/components/pilote/studio";

export const metadata = { title: "Mes vols — Espace pilote" };

export default async function PiloteVolsPage({ searchParams }: { searchParams: Promise<{ ouvrir?: string }> }) {
  const { ouvrir } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const admin = createAdminClient();
  const { data: pilote } = await admin.from("pilotes").select("id").eq("user_id", user!.id).single();

  const { data: reservations } = pilote
    ? await admin
        .from("reservations")
        .select("*, clients(*), pilotes(nom), route_proposals(status, created_at), annonces_pilote(prix_total, part_pilote, mode_vente)")
        .eq("pilote_id", pilote.id)
        .neq("type_resa", "perso")
        .order("date_vol", { ascending: true })
    : { data: [] };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Mes vols"
        actions={
          // Un vol naît d'une annonce publiée, que le passager réserve (décision du 27/09) :
          // pas de réservation créée à la main.
          <LinkButton href="/pilote/annonces/nouvelle">
            <PlaneTakeoff />
            <ButtonLabel full="Publier un vol" short="Publier" />
          </LinkButton>
        }
      />
      <PiloteVolsClient reservations={(reservations ?? []) as never} openId={ouvrir} />
    </div>
  );
}
