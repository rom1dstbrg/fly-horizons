import { redirect } from "next/navigation";

// Les itinéraires appartiennent au pilote qui les crée (27/09) : la gestion
// vit dans l'espace pilote.
export default function AdminItinerairesPage() {
  redirect("/pilote/itineraires");
}
