import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { blocsNecessaires, heureVol } from "@/lib/pilote-creneaux";
import { piloteDeparts, rescheduleScope } from "@/lib/pilote-dispo";

// Report d'un vol attribué à un pilote : blocs de 2 h réservables ce jour-là
// chez ce pilote. Même format que /api/vol-annonce/slots.
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const token = searchParams.get("token");
  const date = searchParams.get("date");
  if (!token || !date) return NextResponse.json({ error: "Paramètres requis" }, { status: 400 });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return NextResponse.json({ error: "Format de date invalide" }, { status: 400 });

  const supabase = createAdminClient();
  const scope = await rescheduleScope(supabase, token);
  if (!scope) return NextResponse.json({ slots: [] });
  const departs = await piloteDeparts(supabase, scope, date);
  return NextResponse.json({ slots: departs.map(heureVol), blocs: blocsNecessaires(scope.duree) });
}
