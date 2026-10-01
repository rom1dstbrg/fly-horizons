import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { ClientFiche } from "@/components/admin/ClientFiche";
import { RESA_COLUMNS, type AdminClient, type ClientMessage, type ClientResa } from "@/lib/admin-clients";

interface Props {
  params: Promise<{ id: string }>;
}

export const metadata = { title: "Fiche client — Admin" };

export default async function ClientFichePage({ params }: Props) {
  const { id } = await params;
  const db = createAdminClient();

  const { data: client } = await db.from("clients").select("id, prenom, nom, email, telephone, created_at").eq("id", id).single();
  if (!client) notFound();

  const { data: reservations } = await db
    .from("reservations")
    .select(RESA_COLUMNS)
    .eq("client_id", client.id)
    .order("date_vol", { ascending: false });
  const resas = (reservations ?? []) as unknown as ClientResa[];

  const [{ data: messages }, { data: profile }, { data: satisfaction }] = await Promise.all([
    resas.length
      ? db.from("reservation_messages").select("id, reservation_id, author, author_nom, content, created_at").in("reservation_id", resas.map((r) => r.id)).order("created_at", { ascending: true })
      : Promise.resolve({ data: [] }),
    db.from("profiles").select("role").eq("email", client.email).maybeSingle(),
    resas.length
      ? db.from("satisfaction_surveys").select("note_vol").in("reservation_id", resas.map((r) => r.id))
      : Promise.resolve({ data: [] }),
  ]);

  const notes = ((satisfaction ?? []) as { note_vol: number | null }[]).map((s) => s.note_vol).filter((n): n is number => typeof n === "number");
  const moyenne = notes.length ? notes.reduce((a, b) => a + b, 0) / notes.length : null;

  const full: AdminClient = {
    ...client,
    role: profile?.role ?? "customer",
    reservations: resas,
    messages: (messages ?? []) as ClientMessage[],
  };
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Brussels" }).format(new Date());

  return (
    <div className="pilote-studio space-y-5 font-sans text-st-text">
      <ClientFiche client={full} today={today} satisfaction={moyenne} />
    </div>
  );
}
