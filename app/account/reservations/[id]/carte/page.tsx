import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { RouteMapView } from "./RouteMapView";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Itinéraire — Fly Horizons",
};

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function CarteItineraireePage({ params }: PageProps) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?redirectTo=/account/reservations/${id}/carte`);

  const adminSupabase = createAdminClient();

  const { data: resa } = await adminSupabase
    .from("reservations")
    .select("id, date_vol, heure_vol, duree, distance_km, waypoints, client_id, type_resa")
    .eq("id", id)
    .single();

  // Only valid for perso reservations with waypoints
  if (!resa || resa.type_resa !== "perso") notFound();

  const waypoints: Array<{ lat: number; lng: number; nom: string }> =
    resa.waypoints ?? [];
  if (!waypoints.length) notFound();

  // Verify ownership
  const { data: client } = await adminSupabase
    .from("clients")
    .select("id")
    .eq("id", resa.client_id)
    .eq("email", user.email!.toLowerCase())
    .maybeSingle();

  if (!client) notFound();

  return (
    <RouteMapView
      waypoints={waypoints}
      dateVol={resa.date_vol}
      heureVol={resa.heure_vol ?? null}
      duree={resa.duree}
      distKm={resa.distance_km ?? null}
      reservationId={id}
    />
  );
}
