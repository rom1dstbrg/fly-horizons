import { Info } from "lucide-react";
import { getPiloteDisponibilites } from "@/lib/actions/pilote-disponibilites";
import { DispoPlanner } from "@/components/dispo/DispoPlanner";
import { PageHeader } from "@/components/pilote/studio";

export const metadata = { title: "Disponibilités — Espace pilote" };

export default async function PiloteDisponibilitesPage() {
  const { plages, exceptions } = await getPiloteDisponibilites();
  const rienConfigure = !plages.some((p) => p.actif) && exceptions.length === 0;

  return (
    <div className="mx-auto w-full max-w-5xl space-y-5">
      <PageHeader title="Disponibilités" />
      <div className="flex gap-2.5 rounded-[14px] bg-st-info-soft px-4 py-3 text-[13px] leading-snug text-st-info">
        <Info size={16} className="mt-px shrink-0" />
        <p>
          Un seul calendrier pour toutes vos annonces : un client ne peut réserver que dans les créneaux ouverts ici.{" "}
          {rienConfigure
            ? "Rien n'est configuré : vos annonces sont réservables à n'importe quelle date."
            : "Ce que vous voyez ci-dessous est ce que vos clients peuvent réserver."}
        </p>
      </div>
      <DispoPlanner scope="pilote" plages={plages} joursIndiv={exceptions} />
    </div>
  );
}
