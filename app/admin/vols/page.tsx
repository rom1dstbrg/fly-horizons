import { Suspense } from "react";
import { createAdminClient } from "@/lib/supabase/admin";
import { VolsHub } from "@/components/admin/VolsHub";
import { PageHeader } from "@/components/admin/PageHeader";
import { VolsPageActions } from "@/components/admin/VolsPageActions";

export const metadata = { title: "Activité Vols — Admin" };

export default async function VolsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await searchParams;
  const activeTab = tab ?? "reservations";
  const db = createAdminClient();

  const [
    { data: rawStd },
    { data: rawPerso },
    { data: plages },
    { data: joursIndiv },
  ] = await Promise.all([
    db.from("reservations").select("*, clients(*), route_proposals(status, created_at)").eq("type_resa", "standard").order("date_vol", { ascending: true }),
    db.from("reservations").select("*, clients(*), route_proposals(status, created_at)").eq("type_resa", "perso").order("date_vol", { ascending: true }),
    db.from("disponibilites").select("*").order("date_debut", { ascending: true }),
    db.from("disponibilites_jours").select("*").order("date", { ascending: true }),
  ]);

  const resaStd   = rawStd   ?? [];
  const resaPerso = rawPerso ?? [];
  const allResas  = [...resaStd, ...resaPerso];

  function countStatuses(resas: typeof resaStd) {
    return {
      payment_pending: resas.filter(r => r.statut === "payment_pending").length,
      en_attente:      resas.filter(r => r.statut === "en_attente").length,
      acompte_recu:    resas.filter(r => r.statut === "acompte_recu").length,
      date_confirmee:  resas.filter(r => r.statut === "date_confirmee").length,
      heure_confirmee: resas.filter(r => r.statut === "heure_confirmee").length,
      vol_effectue:    resas.filter(r => r.statut === "vol_effectue").length,
      annulee:         resas.filter(r => r.statut === "annulee").length,
    };
  }

  return (
    <div className="space-y-5">
      <PageHeader
        domain="vols"
        title="Activité Vols"
        subtitle="Pipeline, calendrier et gestion de toutes les réservations"
        action={activeTab !== "disponibilites" ? <VolsPageActions activeTab={activeTab} /> : undefined}
      />

      <Suspense fallback={null}>
        <VolsHub
          allResas={allResas as never}
          resaStd={resaStd as never}
          resaPerso={resaPerso as never}
          plages={plages ?? []}
          joursIndiv={joursIndiv ?? []}
          statsStd={countStatuses(resaStd)}
          statsPerso={countStatuses(resaPerso)}
        />
      </Suspense>
    </div>
  );
}
