import { Suspense } from "react";
import { createAdminClient } from "@/lib/supabase/admin";
import { VolsHub } from "@/components/admin/VolsHub";
import { PageHeader } from "@/components/admin/PageHeader";

export const metadata = { title: "Activité Vols — Admin" };

export default async function VolsPage() {
  const db = createAdminClient();

  const [
    { data: rawStd },
    { data: rawPerso },
    { data: plages },
    { data: joursIndiv },
  ] = await Promise.all([
    db.from("reservations").select("*, clients(*), pilotes(nom), route_proposals(status, created_at), products(route_waypoints)").neq("type_resa", "perso").order("date_vol", { ascending: true }),
    db.from("reservations").select("*, clients(*), route_proposals(status, created_at), products(route_waypoints)").eq("type_resa", "perso").order("date_vol", { ascending: true }),
    db.from("disponibilites").select("*").order("date_debut", { ascending: true }),
    db.from("disponibilites_jours").select("*").order("date", { ascending: true }),
  ]);

  const resaStd   = rawStd   ?? [];
  const resaPerso = rawPerso ?? [];
  const allResas  = [...resaStd, ...resaPerso];

  return (
    <div className="space-y-5">
      <PageHeader
        domain="vols"
        title="Activité Vols"
        subtitle="Pipeline, calendrier et gestion de toutes les réservations"
      />

      <Suspense fallback={null}>
        <VolsHub
          allResas={allResas as never}
          resaStd={resaStd as never}
          resaPerso={resaPerso as never}
          plages={plages ?? []}
          joursIndiv={joursIndiv ?? []}
        />
      </Suspense>
    </div>
  );
}
