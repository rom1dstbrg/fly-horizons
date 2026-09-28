import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { piloteMonth } from "@/lib/pilote-dispo";

// Jours du mois où au moins un bloc est réservable chez le pilote de l'annonce
// (lib/pilote-dispo.ts). Rien de coché = fermé.
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const annonceId = searchParams.get("annonce_id");
  const year = searchParams.get("year");
  const month = searchParams.get("month");

  if (!annonceId || !year || !month) {
    return NextResponse.json({ error: "Paramètres requis" }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { data: annonce } = await supabase
    .from("annonces_pilote")
    .select("duree, pilote_id, statut, mode_vente")
    .eq("id", annonceId)
    .single();
  if (!annonce || annonce.statut !== "publiee") return NextResponse.json({ available: [], unavailable: [] });

  // Dispos et conflits scopés au PILOTE (un seul calendrier, partagé par toutes
  // ses annonces). En mode « place », les autres passagers de la même annonce
  // partagent le vol.
  return NextResponse.json(await piloteMonth(supabase, {
    piloteId: annonce.pilote_id,
    duree: annonce.duree,
    excludeAnnonceId: annonce.mode_vente === "place" ? annonceId : null,
  }, parseInt(year), parseInt(month)));
}
