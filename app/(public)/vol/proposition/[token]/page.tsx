import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { PropositionForm } from "./PropositionForm";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Proposition d'itinéraire · Fly Horizons",
};

interface PageProps {
  params: Promise<{ token: string }>;
}

export default async function PropositionPage({ params }: PageProps) {
  const { token } = await params;
  const supabase = createAdminClient();

  const { data: proposal } = await supabase
    .from("route_proposals")
    .select("*, reservations(id, date_vol, heure_vol, duree, type_resa, statut, payment_status, clients(prenom, nom))")
    .eq("token", token)
    .single();

  if (!proposal) notFound();

  const resa = proposal.reservations as {
    id: string;
    date_vol: string;
    heure_vol: string | null;
    duree: number;
    type_resa: string;
    statut: string;
    payment_status: string | null;
    clients: { prenom: string; nom: string } | null;
  } | null;

  if (!resa) notFound();

  const client = resa.clients;
  const dateStr = new Date(resa.date_vol + "T12:00:00Z").toLocaleDateString("fr-BE", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });

  const alreadyPaid = resa.statut === "acompte_recu" || resa.payment_status === "paid";

  const proposalDuree = (proposal as { duree?: number | null }).duree ?? resa.duree;

  return (
    <PropositionForm
      token={token}
      prenom={client?.prenom ?? ""}
      dateStr={dateStr}
      duree={proposalDuree}
      waypoints={(proposal.waypoints as Array<{ lat: number; lng: number; nom?: string }> | null) ?? []}
      adminComment={proposal.admin_comment ?? ""}
      alreadyResponded={proposal.status !== "pending"}
      existingStatus={proposal.status}
      typeResa={resa.type_resa}
      alreadyPaid={alreadyPaid}
    />
  );
}
