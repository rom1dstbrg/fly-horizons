import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPiloteDocumentsForReview } from "@/lib/actions/pilote-documents";
import { PiloteDocsReview } from "@/components/admin/PiloteDocsReview";
import type { Pilote } from "@/types/database";

export const metadata = { title: "Vérification des documents — Admin" };

// Vérification pas à pas des documents d'un pilote (27/09) : le document à
// gauche, les points à contrôler à droite. Liens de lecture valables 1 h.
export default async function PiloteVerificationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { data: pilote } = await createAdminClient().from("pilotes").select("*").eq("id", id).maybeSingle();
  if (!pilote) notFound();

  const res = await getPiloteDocumentsForReview(id, 3600);
  const documents = "documents" in res && res.documents ? res.documents : [];

  return <PiloteDocsReview pilote={pilote as Pilote} documents={documents} />;
}
