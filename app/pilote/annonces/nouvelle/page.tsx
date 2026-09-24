import { redirect } from "next/navigation";
import { AnnonceForm } from "@/components/pilote/AnnonceForm";
import { PageHeader } from "@/components/pilote/studio";
import { loadPiloteForAnnonces } from "@/lib/pilote/annonces-page";

export const metadata = { title: "Nouvelle annonce — Espace pilote" };

export default async function NouvelleAnnoncePage() {
  const { publishGate } = await loadPiloteForAnnonces();
  // La liste explique ce qui manque (bande sous le titre).
  if (publishGate) redirect("/pilote/annonces");

  return (
    <div className="mx-auto w-full max-w-lg space-y-5">
      <PageHeader title="Nouvelle annonce" back={{ href: "/pilote/annonces", label: "Mes annonces" }} />
      <AnnonceForm />
    </div>
  );
}
