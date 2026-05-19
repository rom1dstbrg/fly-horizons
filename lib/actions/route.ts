"use server";

import { createAdminClient } from "@/lib/supabase/admin";

export async function submitRouteResponse(
  token: string,
  type: "validated" | "modification_requested",
  feedback?: string
) {
  const supabase = createAdminClient();

  const { data: resa } = await supabase
    .from("reservations")
    .select("id, date_vol, heure_vol, route_responded_at")
    .eq("route_token", token)
    .single();

  if (!resa) return { error: "Lien invalide ou expiré" };

  if (resa.route_responded_at) return { error: "Vous avez déjà répondu à cet itinéraire" };

  // 48h deadline check
  const timeStr = resa.heure_vol ? resa.heure_vol.slice(0, 5) : "23:59";
  const flightDateTime = new Date(`${resa.date_vol}T${timeStr}:00`);
  const deadline = new Date(flightDateTime.getTime() - 48 * 60 * 60 * 1000);
  if (new Date() > deadline) return { error: "Le délai de réponse est dépassé (48 h avant le vol)" };

  await supabase
    .from("reservations")
    .update({
      route_status: type,
      route_feedback: feedback?.trim() || null,
      route_responded_at: new Date().toISOString(),
    })
    .eq("id", resa.id);

  return { success: true };
}
