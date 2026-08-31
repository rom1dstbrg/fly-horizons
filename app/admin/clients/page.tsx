import { createAdminClient } from "@/lib/supabase/admin";
import { ClientsClient } from "@/components/admin/ClientsClient";
import { PageHeader } from "@/components/admin/PageHeader";

export const metadata = { title: "Clients — Admin" };

export default async function ClientsPage() {
  const supabase = createAdminClient();

  const { data: clients } = await supabase
    .from("clients")
    .select(`
      id, prenom, nom, email, telephone, created_at,
      reservations(id, date_vol, heure_vol, duree, statut, type_resa, payment_status, created_at)
    `)
    .order("created_at", { ascending: false });

  // Deduplicate by email, merging reservations for existing duplicates in DB
  const emailMap = new Map<string, {
    id: string; prenom: string; nom: string; email: string;
    telephone: string | null; created_at: string;
    reservations: NonNullable<NonNullable<typeof clients>[0]["reservations"]>;
    vouchers: {
      id: string; code: string; duration_minutes: number; prix: number | null;
      product_title: string; status: string; used_at: string | null;
      expires_at: string | null; created_at: string;
    }[];
  }>();

  for (const client of clients ?? []) {
    const key = (client.email ?? client.id).toLowerCase();
    const existing = emailMap.get(key);
    if (existing) {
      existing.reservations.push(...(client.reservations ?? []));
    } else {
      emailMap.set(key, { ...client, reservations: [...(client.reservations ?? [])], vouchers: [] });
    }
  }

  // Fetch vouchers linked by recipient_email
  const emails = Array.from(emailMap.keys());
  if (emails.length > 0) {
    const { data: vouchers } = await supabase
      .from("voucher_codes")
      .select("id, code, duration_minutes, prix, product_title, status, used_at, expires_at, created_at, recipient_email")
      .in("recipient_email", emails);

    for (const v of vouchers ?? []) {
      if (!v.recipient_email) continue;
      const entry = emailMap.get(v.recipient_email.toLowerCase());
      if (entry) entry.vouchers.push(v);
    }
  }

  // Rôle (client/pilote/admin) — lié par email au compte auth (profiles), quand il existe.
  const roleMap = new Map<string, string>();
  if (emails.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("email, role")
      .in("email", emails);
    for (const p of profiles ?? []) {
      if (p.email) roleMap.set(p.email.toLowerCase(), p.role ?? "customer");
    }
  }

  const all = Array.from(emailMap.values())
    .map(c => ({
      ...c,
      role: roleMap.get((c.email ?? "").toLowerCase()) ?? "customer",
      reservations: c.reservations.sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      ),
      vouchers: c.vouchers.sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      ),
    }))
    // FH-0001 en premier — ordre numérique de création du client
    .sort((a, b) => a.id.localeCompare(b.id));

  return (
    <div className="space-y-6">
      <PageHeader
        domain="clients"
        title="Clients"
        subtitle="Clients ayant effectué une réservation de vol (standard ou sur mesure)"
      />

      <ClientsClient clients={all} />
    </div>
  );
}
