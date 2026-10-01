import { createAdminClient } from "@/lib/supabase/admin";
import { ClientsClient } from "@/components/admin/ClientsClient";
import { PageHeader } from "@/components/pilote/studio";
import { RESA_COLUMNS, type AdminClient, type ClientMessage, type ClientResa } from "@/lib/admin-clients";

export const metadata = { title: "Clients — Admin" };

export default async function ClientsPage() {
  const db = createAdminClient();
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Brussels" }).format(new Date());

  const [{ data: clients }, { data: messages }] = await Promise.all([
    db.from("clients").select(`id, prenom, nom, email, telephone, created_at, reservations(${RESA_COLUMNS})`).order("created_at", { ascending: false }),
    db.from("reservation_messages").select("id, reservation_id, author, author_nom, content, created_at").order("created_at", { ascending: true }),
  ]);

  // Un client par email (des doublons peuvent traîner en base) : on fusionne leurs réservations.
  const byEmail = new Map<string, Omit<AdminClient, "role" | "messages">>();
  for (const c of clients ?? []) {
    const reservations = ((c.reservations ?? []) as unknown as ClientResa[]);
    const key = (c.email ?? c.id).toLowerCase();
    const existing = byEmail.get(key);
    if (existing) existing.reservations.push(...reservations);
    else byEmail.set(key, { id: c.id, prenom: c.prenom, nom: c.nom, email: c.email, telephone: c.telephone, created_at: c.created_at, reservations: [...reservations] });
  }

  const emails = [...byEmail.keys()];
  const roleMap = new Map<string, string>();
  if (emails.length > 0) {
    const { data: profiles } = await db.from("profiles").select("email, role").in("email", emails);
    for (const p of profiles ?? []) if (p.email) roleMap.set(p.email.toLowerCase(), p.role ?? "customer");
  }

  const msgByResa = new Map<string, ClientMessage[]>();
  for (const m of (messages ?? []) as ClientMessage[]) {
    const list = msgByResa.get(m.reservation_id) ?? [];
    list.push(m);
    msgByResa.set(m.reservation_id, list);
  }

  // FH-0001 en premier : ordre de création du client.
  const all: AdminClient[] = [...byEmail.values()]
    .map((c) => ({
      ...c,
      role: roleMap.get((c.email ?? "").toLowerCase()) ?? "customer",
      messages: c.reservations.flatMap((r) => msgByResa.get(r.id) ?? []),
    }))
    .sort((a, b) => a.id.localeCompare(b.id));

  return (
    <div className="pilote-studio space-y-5 font-sans text-st-text">
      <PageHeader title="Clients" />
      <ClientsClient clients={all} today={today} />
    </div>
  );
}
