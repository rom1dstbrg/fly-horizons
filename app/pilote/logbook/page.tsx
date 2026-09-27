import { PageHeader, UnderConstruction } from "@/components/pilote/studio";

export const metadata = { title: "Logbook — Espace pilote" };

// Page réservée (27/09) : l'onglet existe, le carnet de vol n'est pas encore construit.
export default function PiloteLogbookPage() {
  return (
    <div className="space-y-5">
      <PageHeader title="Logbook" />
      <UnderConstruction title="Votre carnet de vol arrive bientôt">
        Vous pourrez y retrouver vos vols et vos heures, directement depuis votre espace pilote.
      </UnderConstruction>
    </div>
  );
}
