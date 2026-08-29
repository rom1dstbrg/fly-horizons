import { createAdminClient } from "@/lib/supabase/admin";
import { enrichWaypointNames } from "@/lib/geocode";
import { generateBoardingPassPDFBuffer } from "@/lib/pdf/boarding-pass-pdf";

// Construit la pièce jointe boarding pass à partir de la dernière proposition de
// route de la réservation. Ne lève jamais — un échec (géocodage, rendu PDF) ne doit
// jamais empêcher l'envoi de l'email auquel cette pièce jointe devait s'ajouter.
export async function buildBoardingPassAttachment(
  supabase: ReturnType<typeof createAdminClient>,
  reservationId: string,
  dateVol: string,
  heureVol: string,
  duree: number
): Promise<{ filename: string; content: Buffer } | null> {
  try {
    const { data: proposal } = await supabase
      .from("route_proposals")
      .select("waypoints")
      .eq("reservation_id", reservationId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const rawWaypoints = (proposal?.waypoints ?? []) as Array<{ lat: number; lng: number; nom?: string }>;
    const waypoints = rawWaypoints.length > 0 ? await enrichWaypointNames(rawWaypoints) : [];
    const waypointNames = waypoints.map((wp) => wp.nom).filter((n): n is string => !!n?.trim());

    const content = await generateBoardingPassPDFBuffer({
      dateVol,
      heureVol,
      duree,
      waypointNames,
    });

    return { filename: `boarding-pass-${reservationId.slice(0, 8)}.pdf`, content };
  } catch (e) {
    console.error("[buildBoardingPassAttachment] Erreur:", e);
    return null;
  }
}
