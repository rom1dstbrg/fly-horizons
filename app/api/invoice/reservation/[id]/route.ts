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
    .select("id, date_vol, heure_vol, duree, passagers, acompte, statut, type_resa, created_at")
    .eq("id", id)
    .eq("client_id", client.id)
    .single();

  if (!resa || !resa.acompte) return new NextResponse("Introuvable", { status: 404 });

  const dateStr = new Date(resa.date_vol + "T12:00:00Z").toLocaleDateString("fr-BE", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });

  const typeLabel = resa.type_resa === "perso" ? "Vol sur mesure" : "Baptême de l'air en avion léger";
  const itemTitle = `${typeLabel} — ${formatDur(resa.duree)} · ${dateStr}`;
  const qty = resa.passagers ?? 1;

  const data: InvoiceData = {
    orderId: resa.id,
    createdAt: new Date(resa.created_at),
    paidAt: null,
    customerName: `${client.prenom} ${client.nom}`.trim(),
    customerEmail: client.email,
    items: [{ title: itemTitle, quantity: qty, unit_price: resa.acompte / qty }],
    subtotal: resa.acompte,
    shippingCost: 0,
    discountAmount: 0,
    couponCode: null,
    total: resa.acompte,
    shippingAddress: null,
  };

  const buffer = await generateInvoicePDFBuffer(data, true);
  const ref = `FH-RES-${resa.id.slice(0, 8).toUpperCase()}`;

  return new NextResponse(buffer as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="facture-${ref}.pdf"`,
      "Content-Length": String(buffer.length),
    },
  });
}
