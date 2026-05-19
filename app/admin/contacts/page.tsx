import { createAdminClient } from "@/lib/supabase/admin";
import { ContactsClient } from "@/components/admin/ContactsClient";
import { PageHeader } from "@/components/admin/PageHeader";

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
        subtitle="Formulaire de contact — répondez directement depuis cette page"
      />

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Nouveaux",  value: stats.nouveau,  color: "text-yellow-600" },
          { label: "Lus",       value: stats.lu,       color: "text-blue-600" },
          { label: "Répondus",  value: stats.repondu,  color: "text-emerald-600" },
          { label: "Archivés",  value: stats.archive,  color: "text-gray-500" },
        ].map(({ label, value, color }) => (
          <div key={label} className="card-premium p-3 text-center">
            <p className={`text-xl font-bold ${color}`}>{value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      <ContactsClient contacts={all} />
    </div>
  );
}
