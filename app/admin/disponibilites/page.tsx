import { createAdminClient } from "@/lib/supabase/admin";
import { CalendarDays } from "lucide-react";
import { DispoClient } from "@/components/admin/DispoClient";

export const metadata = { title: "Disponibilités — Admin" };

export default async function AdminDisponibilitesPage() {
  const db = createAdminClient();

  const [{ data: plages }, { data: joursIndiv }] = await Promise.all([
    db.from("disponibilites").select("*").order("date_debut", { ascending: true }),
    db.from("disponibilites_jours").select("*").order("date", { ascending: true }),
  ]);

  return (
    <div className="space-y-8">

      <div className="flex items-start gap-3">
        <CalendarDays size={24} className="text-primary mt-0.5 shrink-0" />
        <div>
          <h1 className="text-2xl font-bold text-foreground">Disponibilités</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Gérez les créneaux visibles sur le calendrier de réservation.
          </p>
        </div>
      </div>

      <DispoClient
        plages={plages ?? []}
        joursIndiv={joursIndiv ?? []}
      />

    </div>
  );
}
