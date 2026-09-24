import { notFound } from "next/navigation";
import { AnnonceForm } from "@/components/pilote/AnnonceForm";
import type { AnnonceRow } from "@/components/pilote/AnnoncesList";
import { PageHeader } from "@/components/pilote/studio";
import { ANNONCE_COLUMNS, loadPiloteForAnnonces } from "@/lib/pilote/annonces-page";

export const metadata = { title: "Modifier l'annonce — Espace pilote" };

export default async function ModifierAnnoncePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { admin, pilote } = await loadPiloteForAnnonces();
  if (!pilote) notFound();

  const { data: annonce } = await admin
    .from("annonces_pilote")
    .select(ANNONCE_COLUMNS)
    .eq("id", id)
    .eq("pilote_id", pilote.id)
    .maybeSingle();
  if (!annonce) notFound();

  return (
    <div className="mx-auto w-full max-w-lg space-y-5">
      <PageHeader title="Modifier l'annonce" back={{ href: "/pilote/annonces", label: "Mes annonces" }} />
      <AnnonceForm editing={annonce as unknown as AnnonceRow} />
    </div>
  );
}
