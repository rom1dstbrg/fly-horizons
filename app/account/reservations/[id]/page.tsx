import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ReservationTracker } from "./ReservationTracker";
import { enrichWaypointNames } from "@/lib/geocode";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Suivi de réservation — Fly Horizons",
};

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ReservationTrackerPage({ params }: PageProps) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/login?redirectTo=/account/reservations/${id}`);

  const adminSupabase = createAdminClient();

  // Fetch reservation
  const { data: resa } = await adminSupabase
    .from("reservations")
    .select("id, date_vol, heure_vol, duree, passagers, statut, type_resa, payment_token, acompte, distance_km, created_at, client_id, route, route_status, route_token, route_feedback, waypoints")
    .eq("id", id)
    .single();

  if (!resa) notFound();

  // Verify this reservation belongs to the logged-in user
  const { data: client } = await adminSupabase
    .from("clients")
    .select("id")
    .eq("id", resa.client_id)
    .eq("email", user.email!.toLowerCase())
    .maybeSingle();

  if (!client) notFound();

  // Fetch pack title for standard reservations (match by duration)
  let packTitle: string | null = null;
  if (resa.type_resa === "standard") {
    const { data: product } = await adminSupabase
      .from("products")
      .select("title")
      .eq("product_type", "voucher")
      .eq("voucher_duration_minutes", resa.duree)
      .maybeSingle();
    packTitle = product?.title ?? null;
  }

  // Fetch latest route proposal for this reservation (with waypoints)
  const { data: latestProposal } = await adminSupabase
    .from("route_proposals")
    .select("token, status, waypoints")
    .eq("reservation_id", id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL?.startsWith("http://localhost") ||
    process.env.NEXT_PUBLIC_SITE_URL?.startsWith("http://127")
      ? process.env.NEXT_PUBLIC_SITE_URL
      : "https://fly-horizons.com";

  return (
    <ReservationTracker
      reservation={{
        id: resa.id,
        date_vol: resa.date_vol,
        heure_vol: resa.heure_vol,
        duree: resa.duree,
        passagers: resa.passagers,
        statut: resa.statut,
        type_resa: resa.type_resa,
        payment_token: resa.payment_token,
        acompte: resa.acompte,
        distance_km: resa.distance_km,
        created_at: resa.created_at,
        route: resa.route ?? null,
        route_status: resa.route_status ?? null,
        route_token: resa.route_token ?? null,
        route_feedback: resa.route_feedback ?? null,
        waypoints: resa.waypoints ?? null,
        latestProposalToken: latestProposal?.token ?? null,
        latestProposalStatus: latestProposal?.status ?? null,
        latestProposalWaypoints: latestProposal?.waypoints
          ? await enrichWaypointNames(latestProposal.waypoints as Array<{ lat: number; lng: number; nom?: string }>)
          : null,
        packTitle: packTitle,
      }}
      siteUrl={siteUrl ?? "https://fly-horizons.com"}
    />
  );
}
