import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * POST /api/cron/purge-analytics
 *
 * Appelé une fois par mois (Vercel Cron + service externe de secours, cron-job.org…).
 * Auth : header "Authorization: Bearer <CRON_SECRET>"
 *
 * Supprime les vues de page (page_views) de plus de 13 mois, conformément
 * à la durée de conservation annoncée dans la politique de confidentialité
 * (recommandation CNIL pour les outils de mesure d'audience).
 */
export async function POST(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - 13);

  const { error, count } = await supabase
    .from("page_views")
    .delete({ count: "exact" })
    .lt("created_at", cutoff.toISOString());

  if (error) {
    console.error("[/api/cron/purge-analytics] error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, deleted: count ?? 0 });
}
