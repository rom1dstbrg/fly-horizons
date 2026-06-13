import { getItineraires } from "@/lib/actions/itineraires";
import { ItinerairesManager } from "@/components/admin/ItinerairesManager";

export const metadata = { title: "Itinéraires — Admin" };

export default async function ItinerairesPage() {
  const itineraires = await getItineraires();

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-black text-foreground">Itinéraires</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Vos tracés enregistrés, réutilisables en un clic lors de la création d&apos;un vol sur mesure.
        </p>
      </div>

      <ItinerairesManager itineraires={itineraires} />
    </div>
  );
}
