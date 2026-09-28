import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { piloteMonth, rescheduleScope } from "@/lib/pilote-dispo";

// Report d'un vol attribué à un pilote : jours où ce pilote a un bloc ouvert
// et libre (lib/pilote-dispo.ts). Le lien de report sert de clé.
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const token = searchParams.get("token");
  const year = searchParams.get("year");
  const month = searchParams.get("month");
  if (!token || !year || !month) return NextResponse.json({ error: "Paramètres requis" }, { status: 400 });

  const supabase = createAdminClient();
  const scope = await rescheduleScope(supabase, token);
  if (!scope) return NextResponse.json({ available: [], unavailable: [] });
  return NextResponse.json(await piloteMonth(supabase, scope, parseInt(year), parseInt(month)));
}
