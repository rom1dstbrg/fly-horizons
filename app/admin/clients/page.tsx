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
      reservations(id, date_vol, heure_vol, duree, statut, type_resa, created_at)
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
    const key = client.email.toLowerCase();
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

  const all = Array.from(emailMap.values()).map(c => ({
    ...c,
    reservations: c.reservations.sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    ),
    vouchers: c.vouchers.sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    ),
  }));

  const avecVols = all.filter(c => c.reservations.length > 0).length;
  const totalVols = all.reduce((sum, c) => sum + c.reservations.length, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        domain="clients"
        title="Clients"
        subtitle="Clients ayant effectué une réservation de vol (standard ou sur mesure)"
      />

      <div className="grid grid-cols-3 gap-3">
        <div className="card-premium p-4 text-center">
          <p className="text-2xl font-bold text-primary">{all.length}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Clients total</p>
        </div>
        <div className="card-premium p-4 text-center">
          <p className="text-2xl font-bold text-blue-600">{avecVols}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Avec réservations</p>
        </div>
        <div className="card-premium p-4 text-center">
          <p className="text-2xl font-bold text-purple-600">{totalVols}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Vols au total</p>
        </div>
      </div>

      <ClientsClient clients={all} />
    </div>
  );
}
