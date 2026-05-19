import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { RouteForm } from "./RouteForm";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Itinéraire de vol — Fly Horizons",
};

interface PageProps {
  params: Promise<{ token: string }>;
}

export default async function ItinerairePublicPage({ params }: PageProps) {
  const { token } = await params;

  const supabase = createAdminClient();
  const { data: resa } = await supabase
    .from("reservations")
    .select("id, date_vol, heure_vol, duree, route, route_status, route_responded_at, clients(prenom, nom)")
    .eq("route_token", token)
    .single();

  if (!resa || !resa.route) notFound();

  const client = resa.clients as unknown as { prenom: string; nom: string } | null;

  // 48h deadline check
  const timeStr = resa.heure_vol ? resa.heure_vol.slice(0, 5) : "23:59";
  const flightDateTime = new Date(`${resa.date_vol}T${timeStr}:00`);
  const deadline = new Date(flightDateTime.getTime() - 48 * 60 * 60 * 1000);
  const isPastDeadline = new Date() > deadline;

  const dateStr = new Date(resa.date_vol + "T12:00:00Z").toLocaleDateString("fr-BE", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });

  return (
    <RouteForm
      token={token}
      prenom={client?.prenom ?? ""}
      dateStr={dateStr}
      duree={resa.duree}
      route={resa.route}
      alreadyResponded={!!resa.route_responded_at}
      existingStatus={resa.route_status ?? null}
      isPastDeadline={isPastDeadline}
    />
  );
}
