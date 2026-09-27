import { createAdminClient } from "@/lib/supabase/admin";
import { PilotesClient } from "@/components/admin/PilotesClient";
import { getPilotesReliabilityStats } from "@/lib/pilote-stats";
import type { Pilote } from "@/types/database";

export const metadata = { title: "Pilotes — Admin" };

// En-tête, chiffres clés et tableau : tout en style Studio dans PilotesClient.
export default async function PilotesPage() {
  const supabase = createAdminClient();

  const { data: pilotes } = await supabase
    .from("pilotes")
    .select("*")
    .order("created_at", { ascending: false });

  const all = (pilotes ?? []) as Pilote[];
  const reliability = await getPilotesReliabilityStats(all.map(p => ({ id: p.id, nom: p.nom })));

  return <PilotesClient pilotes={all} reliability={reliability} />;
}
