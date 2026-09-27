import { getPiloteCreneaux } from "@/lib/actions/pilote-creneaux";
import { addDaysIso } from "@/lib/pilote-creneaux";
import { DispoGrid } from "@/components/pilote/dispo/DispoGrid";

export const metadata = { title: "Disponibilités — Espace pilote" };

export default async function PiloteDisponibilitesPage() {
  // Aujourd'hui et le lundi de la semaine, à l'heure de Bruxelles.
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Brussels" }).format(new Date());
  const dow = (new Date(`${today}T00:00:00Z`).getUTCDay() + 6) % 7; // lundi = 0
  const monday = addDaysIso(today, -dow);
  const { ouverts, reservations, visiteVue } = await getPiloteCreneaux(monday);

  return <DispoGrid monday={monday} today={today} ouverts={ouverts} reservations={reservations} visiteVue={visiteVue} />;
}
