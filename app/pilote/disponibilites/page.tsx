import { getPiloteDisponibilites } from "@/lib/actions/pilote-disponibilites";
import { PiloteDisponibilitesClient } from "@/components/pilote/PiloteDisponibilitesClient";
import { PiloteHeader, PiloteAlert } from "@/components/pilote/ui";

export const metadata = { title: "Disponibilités — Espace pilote" };

export default async function PiloteDisponibilitesPage() {
  const { plage, exceptions } = await getPiloteDisponibilites();
  const rienConfigure = !plage && exceptions.length === 0;

  return (
    <div className="space-y-6">
      <PiloteHeader
        title="Disponibilités"
        subtitle="Un seul calendrier, valable pour toutes vos annonces : le client ne verra que vos créneaux libres."
      />
      <PiloteAlert tone="info">
        <p className="font-semibold">À quoi ça sert : ça conditionne les réservations clients.</p>
        <p className="mt-1">
          Quand un client réserve un vol sur une de vos annonces, il ne peut choisir une date/heure
          que dans les créneaux que vous ouvrez ici. {rienConfigure
            ? "Rien n'est configuré pour l'instant : vos annonces restent ouvertes à n'importe quelle date, sans restriction."
            : "Ce que vous voyez ci-dessous est donc directement ce que vos clients pourront réserver."}
        </p>
      </PiloteAlert>
      <PiloteDisponibilitesClient initialPlage={plage} initialExceptions={exceptions} />
    </div>
  );
}
