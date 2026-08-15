import { createAdminClient } from "@/lib/supabase/admin";
import { PilotesClient } from "@/components/admin/PilotesClient";
import { PageHeader } from "@/components/admin/PageHeader";
import { StatCard, StatGrid } from "@/components/admin/ui";

export const metadata = { title: "Pilotes — Admin" };

export default async function PilotesPage() {
  const supabase = createAdminClient();

  const { data: pilotes } = await supabase
    .from("pilotes")
    .select("*")
    .order("created_at", { ascending: false });

  const all = pilotes ?? [];
  const actifs = all.filter(p => p.statut === "actif").length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pilotes"
        subtitle="Gérez les comptes pilotes et leur accès à l'espace pilote"
      />

      <StatGrid cols={2}>
        <StatCard label="Pilotes total" value={all.length} variant="primary" />
        <StatCard label="Actifs"        value={actifs}     variant="info" />
      </StatGrid>

      <PilotesClient pilotes={all} />
    </div>
  );
}
