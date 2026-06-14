import { Suspense } from "react";
import { createAdminClient } from "@/lib/supabase/admin";
import { VolsHub } from "@/components/admin/VolsHub";
import { PageHeader } from "@/components/admin/PageHeader";
import Link from "next/link";
import { Plus, Route, WifiOff } from "lucide-react";

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
    db.from("reservations").select("*, clients(*)").eq("type_resa", "standard").order("date_vol", { ascending: true }),
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
        action={activeTab !== "disponibilites" ? (
          <div className="flex items-center gap-2">
            <Link
              href="/admin/reservations/new"
              className={`inline-flex items-center gap-2 px-3 py-2 sm:px-4 rounded-md text-sm font-semibold transition-colors ${
                activeTab === "reservations"
                  ? "bg-primary text-primary-foreground hover:bg-primary/90"
                  : "border border-border text-muted-foreground hover:text-foreground hover:bg-secondary"
              }`}
            >
              <Plus size={15} />
              <span className="hidden sm:inline">Nouvelle réservation</span>
              <span className="sm:hidden">Resa</span>
            </Link>
            <Link
              href="/admin/reservations/new-mesure"
              className={`inline-flex items-center gap-2 px-3 py-2 sm:px-4 rounded-md text-sm font-semibold transition-colors ${
                activeTab === "sur-mesure"
                  ? "bg-primary text-primary-foreground hover:bg-primary/90"
                  : "border border-border text-muted-foreground hover:text-foreground hover:bg-secondary"
              }`}
            >
              <Route size={15} />
              <span className="hidden sm:inline">Nouveau vol sur mesure</span>
              <span className="sm:hidden">Sur mesure</span>
            </Link>
            <Link
              href="/admin/reservations/new-horsite"
              className="inline-flex items-center gap-2 px-3 py-2 sm:px-4 rounded-md text-sm font-semibold border border-border text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
            >
              <WifiOff size={15} />
              <span className="hidden sm:inline">Hors site</span>
              <span className="sm:hidden">Hors site</span>
            </Link>
          </div>
        ) : undefined}
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
