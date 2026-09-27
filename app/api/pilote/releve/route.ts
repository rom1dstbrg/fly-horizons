import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPiloteTransactions } from "@/lib/pilote/transactions";
import { generateReleveBuffer } from "@/lib/pdf/pilote-releve-pdf";

// Relevé annuel du pilote connecté (onglet Transactions). Uniquement ses
// propres vols : la fiche pilote est retrouvée par l'utilisateur de la session.
export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const admin = createAdminClient();
  const { data: pilote } = await admin
    .from("pilotes")
    .select("id, nom, statut, licence_numero")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!pilote || pilote.statut !== "actif") return NextResponse.json({ error: "Non autorisé" }, { status: 403 });

  const param = req.nextUrl.searchParams.get("annee") ?? "";
  const annee = /^\d{4}$/.test(param) ? param : String(new Date().getFullYear());
  const rows = (await getPiloteTransactions(pilote.id)).filter((r) => r.date.startsWith(annee));

  const buffer = await generateReleveBuffer({ annee, piloteNom: pilote.nom, licence: pilote.licence_numero, rows });
  const slug = pilote.nom.normalize("NFD").replace(/[^\w]+/g, "-").replace(/^-|-$/g, "").toLowerCase();

  return new NextResponse(buffer as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="releve-${annee}-${slug}.pdf"`,
      "Content-Length": String(buffer.length),
    },
  });
}
