import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  // Vérification admin via session cookie
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  // Récupère toutes les données (90 derniers jours)
  const since = new Date();
  since.setDate(since.getDate() - 90);

  const adminClient = createAdminClient();
  const { data: views, error } = await adminClient
    .from("page_views")
    .select("created_at, pathname, referrer, device, visitor_id")
    .gte("created_at", since.toISOString())
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: "Erreur base de données" }, { status: 500 });
  }

  // Génération CSV
  const header = "date,heure,page,referrer,appareil,visiteur_id\n";
  const rows = (views ?? []).map(v => {
    const d = new Date(v.created_at);
    const date     = d.toLocaleDateString("fr-BE");
    const heure    = d.toLocaleTimeString("fr-BE", { hour: "2-digit", minute: "2-digit" });
    const page     = `"${v.pathname}"`;
    const referrer = `"${(v as Record<string, unknown>).referrer ?? ""}"`;
    const device   = (v as Record<string, unknown>).device ?? "";
    const vid      = ((v as Record<string, unknown>).visitor_id as string ?? "").slice(0, 8);
    return `${date},${heure},${page},${referrer},${device},${vid}`;
  }).join("\n");

  const csv = "﻿" + header + rows; // BOM pour Excel

  const filename = `analytics-fly-horizons-${new Date().toISOString().slice(0, 10)}.csv`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
