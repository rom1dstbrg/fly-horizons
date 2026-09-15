import { getPiloteDisponibilites } from "@/lib/actions/pilote-disponibilites";
import { PiloteDisponibilitesClient } from "@/components/pilote/PiloteDisponibilitesClient";
import { PiloteHeader } from "@/components/pilote/ui";

export const metadata = { title: "Disponibilités — Espace pilote" };

export default async function PiloteDisponibilitesPage() {
  const { plage, exceptions } = await getPiloteDisponibilites();

  return (
    <div className="space-y-6">
      <PiloteHeader
        title="Disponibilités"
        subtitle="Un seul calendrier, valable pour toutes vos annonces : le client ne verra que vos créneaux libres."
      />
      <PiloteDisponibilitesClient initialPlage={plage} initialExceptions={exceptions} />
    </div>
  );
}
