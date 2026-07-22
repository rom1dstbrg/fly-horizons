import { getItineraires } from "@/lib/actions/itineraires";
import { ItinerairesManager } from "@/components/admin/ItinerairesManager";
import { PageHeader } from "@/components/admin/PageHeader";

export const metadata = { title: "Itinéraires — Admin" };

export default async function ItinerairesPage() {
  const itineraires = await getItineraires();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Itinéraires"
        subtitle="Vos tracés enregistrés, réutilisables en un clic lors de la création d'un vol sur mesure."
      />
      <ItinerairesManager itineraires={itineraires} />
    </div>
  );
}
