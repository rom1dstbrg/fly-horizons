import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { PiloteVolsClient } from "@/components/pilote/PiloteVolsClient";

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
        .eq("type_resa", "annonce_pilote")
        .order("created_at", { ascending: false })
    : { data: [] };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-foreground">Mes vols</h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          Les demandes de vos annonces : confirmez le créneau, tracez la route, envoyez le lien de paiement.
        </p>
      </div>

      <PiloteVolsClient reservations={(reservations ?? []) as never} />
    </div>
  );
}
