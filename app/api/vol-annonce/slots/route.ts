import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { blocsNecessaires, heureVol } from "@/lib/pilote-creneaux";
import { piloteDeparts } from "@/lib/pilote-dispo";

// Blocs de 2 h réservables un jour donné chez le pilote de l'annonce
// (lib/pilote-dispo.ts). `slots` = heures de début ("09:00"), `blocs` = nombre
// de blocs qu'occupe le vol (le client affiche « 9 h – 11 h »).
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const annonceId = searchParams.get("annonce_id");
  const date = searchParams.get("date");

  if (!annonceId || !date) return NextResponse.json({ error: "Paramètres requis" }, { status: 400 });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return NextResponse.json({ error: "Format de date invalide" }, { status: 400 });

  const supabase = createAdminClient();
  const { data: annonce } = await supabase
    .from("annonces_pilote")
    .select("duree, pilote_id, statut, mode_vente")
    .eq("id", annonceId)
    .single();
  if (!annonce || annonce.statut !== "publiee") return NextResponse.json({ slots: [] });

  // Conflits scopés au pilote ; en mode « place », les autres passagers de la
  // même annonce partagent le vol (même règle que submit).
  const departs = await piloteDeparts(supabase, {
    piloteId: annonce.pilote_id,
    duree: annonce.duree,
    excludeAnnonceId: annonce.mode_vente === "place" ? annonceId : null,
  }, date);
  return NextResponse.json({ slots: departs.map(heureVol), blocs: blocsNecessaires(annonce.duree) });
}
