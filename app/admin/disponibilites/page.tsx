import { createAdminClient } from "@/lib/supabase/admin";
import { DispoClient } from "@/components/admin/DispoClient";
import { PageHeader } from "@/components/admin/PageHeader";

export const metadata = { title: "Disponibilités — Admin" };

export default async function AdminDisponibilitesPage() {
  const db = createAdminClient();

  const [{ data: plages }, { data: joursIndiv }] = await Promise.all([
    db.from("disponibilites").select("*").order("date_debut", { ascending: true }),
    db.from("disponibilites_jours").select("*").order("date", { ascending: true }),
  ]);

  return (
    <div className="space-y-6">

      <PageHeader
        domain="vols"
        title="Disponibilités"
        subtitle="Gérez les créneaux visibles sur le calendrier de réservation."
      />

      <DispoClient
        plages={plages ?? []}
        joursIndiv={joursIndiv ?? []}
      />

    </div>
  );
}
