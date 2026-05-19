import { createAdminClient } from "@/lib/supabase/admin";
import { ClientFiche } from "@/components/admin/ClientFiche";
import { notFound } from "next/navigation";

interface Props {
  params: Promise<{ id: string }>;
}

export const metadata = { title: "Fiche Client — Admin" };

export default async function ClientFichePage({ params }: Props) {
  const { id } = await params;
  const db = createAdminClient();

  const { data: client } = await db.from("clients").select("*").eq("id", id).single();
  if (!client) notFound();

  const [{ data: reservations }, { data: vouchers }] = await Promise.all([
    db.from("reservations")
      .select("id, date_vol, heure_vol, duree, statut, type_resa, acompte, passagers, created_at")
      .eq("client_id", client.id)
      .order("created_at", { ascending: false }),
    db.from("voucher_codes")
      .select("id, code, duration_minutes, prix, product_title, status, used_at, expires_at, created_at")
      .eq("recipient_email", client.email)
      .order("created_at", { ascending: false }),
  ]);

  // Orders via profile email → user_id
  const { data: profile } = await db
    .from("profiles")
    .select("id")
    .eq("email", client.email)
    .maybeSingle();

  const { data: orders } = profile
    ? await db
        .from("orders")
        .select("id, created_at, status, subtotal, total, items:order_items(id, title, quantity, unit_price)")
        .eq("user_id", profile.id)
        .order("created_at", { ascending: false })
    : { data: [] };

  return (
    <ClientFiche
      client={client}
      reservations={reservations ?? []}
      vouchers={vouchers ?? []}
      orders={(orders ?? []) as never}
    />
  );
}
