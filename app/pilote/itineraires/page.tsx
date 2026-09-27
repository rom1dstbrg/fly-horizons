import { getItineraires } from "@/lib/actions/itineraires";
import { PiloteItinerairesClient } from "@/components/pilote/itineraires/PiloteItinerairesClient";

export const metadata = { title: "Itinéraires — Espace pilote" };

export default async function PiloteItinerairesPage() {
  const items = await getItineraires();
  return <PiloteItinerairesClient items={items} />;
}
