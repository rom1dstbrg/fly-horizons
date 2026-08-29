import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { enrichWaypointNames } from "@/lib/geocode";
import { generateBoardingPassPDFBuffer } from "@/lib/pdf/boarding-pass-pdf";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ reservationId: string }> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new NextResponse("Non autorisé", { status: 401 });

  const { reservationId } = await params;
  const adminSupabase = createAdminClient();

  const { data: resa } = await adminSupabase
    .from("reservations")
    .select("id, date_vol, heure_vol, duree, statut, client_id, clients(email)")
    .eq("id", reservationId)
    .single();

  if (!resa) return new NextResponse("Introuvable", { status: 404 });

  const client = resa.clients as unknown as { email: string } | null;
  if (!client?.email || client.email.toLowerCase() !== user.email!.toLowerCase()) {
    return new NextResponse("Introuvable", { status: 404 });
  }

  if (!["heure_confirmee", "vol_effectue"].includes(resa.statut)) {
    return new NextResponse("Pas encore disponible", { status: 404 });
  }

  const { data: proposal } = await adminSupabase
    .from("route_proposals")
    .select("waypoints")
    .eq("reservation_id", reservationId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const rawWaypoints = (proposal?.waypoints ?? []) as Array<{ lat: number; lng: number; nom?: string }>;
  const waypoints = rawWaypoints.length > 0 ? await enrichWaypointNames(rawWaypoints) : [];
  const waypointNames = waypoints.map((wp) => wp.nom).filter((n): n is string => !!n?.trim());

  const buffer = await generateBoardingPassPDFBuffer({
    dateVol: resa.date_vol,
    heureVol: resa.heure_vol ?? "00:00",
    duree: resa.duree,
    waypointNames,
  });

  return new NextResponse(buffer as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="boarding-pass-${reservationId.slice(0, 8)}.pdf"`,
      "Content-Length": String(buffer.length),
    },
  });
}
