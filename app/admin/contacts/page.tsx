import { createAdminClient } from "@/lib/supabase/admin";
import { ContactsClient } from "@/components/admin/ContactsClient";
import { PageHeader } from "@/components/admin/PageHeader";
import { StatCard, StatGrid } from "@/components/admin/ui";

export const metadata = { title: "Messages — Admin" };

export default async function AdminContactsPage() {
  const supabase = createAdminClient();

  const { data: contacts } = await supabase
    .from("contacts")
    .select("*")
    .order("created_at", { ascending: false });

  const all = contacts ?? [];
  const stats = {
    nouveau:  all.filter(c => c.statut === "nouveau").length,
    lu:       all.filter(c => c.statut === "lu").length,
    repondu:  all.filter(c => c.statut === "repondu").length,
    archive:  all.filter(c => c.statut === "archive").length,
  };

  return (
    <div className="space-y-6">
      <PageHeader
        domain="clients"
        title="Messages"
        subtitle="Formulaire de contact : répondez directement depuis cette page"
      />

      <StatGrid cols={4}>
        <StatCard label="Nouveaux"  value={stats.nouveau}  variant="warning" />
        <StatCard label="Lus"       value={stats.lu}       variant="info"    />
        <StatCard label="Répondus"  value={stats.repondu}  variant="emerald" />
        <StatCard label="Archivés"  value={stats.archive}  variant="neutral" />
      </StatGrid>

      <ContactsClient contacts={all} />
    </div>
  );
}
