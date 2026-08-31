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

  return (
    <div className="space-y-6">
      <PageHeader
        domain="clients"
        title="Messages"
        subtitle="Formulaire de contact : répondez directement depuis cette page"
      />

      <ContactsClient contacts={all} />
    </div>
  );
}
