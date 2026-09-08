import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateInvoicePDFBuffer, type InvoiceData } from "@/lib/pdf/invoice-pdf";

function formatDur(min: number) {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m === 0 ? `${h}h` : `${h}h${String(m).padStart(2, "0")}`;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new NextResponse("Non autorisé", { status: 401 });

  const { id } = await params;
  const admin = createAdminClient();

  const { data: client } = await admin
    .from("clients")
    .select("id, prenom, nom, email")
    .eq("email", user.email!.toLowerCase())
    .maybeSingle();

  if (!client) return new NextResponse("Introuvable", { status: 404 });

  const { data: resa } = await admin
    .from("reservations")
    .select("id, date_vol, heure_vol, duree, passagers, acompte, statut, type_resa, created_at, pilote_id, montant_pilote, pilote_paye, pilote_paye_at, pilotes(nom, iban)")
    .eq("id", id)
    .eq("client_id", client.id)
    .single();

  if (!resa) return new NextResponse("Introuvable", { status: 404 });

  const piloteRow = (Array.isArray(resa.pilotes) ? resa.pilotes[0] : resa.pilotes) as
    | { nom: string; iban: string | null }
    | null;
  const isPiloteVol = !!resa.pilote_id && resa.type_resa === "standard";

  // Vol pilote : le reçu constate le règlement de la participation aux frais au
  // pilote — pas de reçu tant qu'il n'a pas été marqué payé.
  const montant = isPiloteVol
    ? resa.montant_pilote != null ? Number(resa.montant_pilote) : null
    : resa.acompte;
  if (!montant) return new NextResponse("Introuvable", { status: 404 });
  if (isPiloteVol && !resa.pilote_paye) return new NextResponse("Reçu pas encore disponible", { status: 404 });

  const dateStr = new Date(resa.date_vol + "T12:00:00Z").toLocaleDateString("fr-BE", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });

  const typeLabel = isPiloteVol
    ? "Participation aux frais — vol partagé (partage de coûts)"
    : resa.type_resa === "perso"
      ? "Vol sur mesure"
      : "Vol partagé en avion léger";
  const itemTitle = `${typeLabel} — ${formatDur(resa.duree)} · ${dateStr}`;
  const qty = resa.passagers ?? 1;

  const data: InvoiceData = {
    orderId: resa.id,
    createdAt: new Date(resa.created_at),
    paidAt: isPiloteVol && resa.pilote_paye_at ? new Date(resa.pilote_paye_at) : null,
    customerName: `${client.prenom} ${client.nom}`.trim(),
    customerEmail: client.email,
    items: [{ title: itemTitle, quantity: qty, unit_price: montant / qty }],
    subtotal: montant,
    shippingCost: 0,
    discountAmount: 0,
    couponCode: null,
    total: montant,
    shippingAddress: null,
    issuer: isPiloteVol && piloteRow
      ? { name: piloteRow.nom, details: piloteRow.iban ? `IBAN ${piloteRow.iban}` : undefined }
      : null,
  };

  const buffer = await generateInvoicePDFBuffer(data, true);
  const ref = `FH-RES-${resa.id.slice(0, 8).toUpperCase()}`;

  return new NextResponse(buffer as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="recu-${ref}.pdf"`,
      "Content-Length": String(buffer.length),
    },
  });
}
