import { createAdminClient } from "@/lib/supabase/admin";
import { ContactsClient } from "@/components/admin/ContactsClient";
import { PageHeader } from "@/components/pilote/studio";

export const metadata = { title: "Contacts — Admin" };

export default async function AdminContactsPage() {
  const db = createAdminClient();

  const [{ data: contacts }, { data: clients }] = await Promise.all([
    db.from("contacts").select("id, nom, email, sujet, message, statut, reponse, created_at").order("created_at", { ascending: false }),
    db.from("clients").select("id, email").order("id", { ascending: true }),
  ]);

  // Email (minuscules) → identifiant client, pour le lien vers la fiche.
  const clientIds: Record<string, string> = {};
  for (const c of clients ?? []) {
    const key = (c.email ?? "").toLowerCase();
    if (key && !clientIds[key]) clientIds[key] = c.id;
  }

  return (
    <div className="pilote-studio space-y-5 font-sans text-st-text">
      <PageHeader title="Contacts" />
      <ContactsClient contacts={contacts ?? []} clientIds={clientIds} />
    </div>
  );
}
