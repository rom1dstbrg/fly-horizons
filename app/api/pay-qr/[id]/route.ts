import { NextRequest, NextResponse } from "next/server";
import QRCode from "qrcode";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildEpcPayload, isPiloteVol, piloteVirementCommunication } from "@/lib/pilote/payment";

/**
 * GET /api/pay-qr/[id]
 *
 * Bloc D · QR SEPA (EPC) pour un vol pilote : le client le scanne avec son appli
 * bancaire → virement pré-rempli vers l'IBAN du pilote. Public (embarqué en
 * <img> dans un email), ne renvoie qu'une image, jamais l'IBAN en clair.
 *
 * ⚠️ Chantier gelé (pivot 08/09) : `montant_pilote` n'existe pas en base
 * (migration 20260909_pilote_paiement non exécutée). Route inerte —
 * `isPiloteVol` renvoie false partout tant que l'assignation (Bloc B) est gelée.
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const admin = createAdminClient();

  const { data: resa } = await admin
    .from("reservations")
    .select("id, date_vol, type_resa, pilote_id, clients(nom), pilotes(nom, iban)")
    .eq("id", id)
    .maybeSingle();

  if (!resa || !isPiloteVol(resa)) return new NextResponse("Not found", { status: 404 });

  const pilote = (Array.isArray(resa.pilotes) ? resa.pilotes[0] : resa.pilotes) as
    | { nom: string; iban: string | null }
    | null;
  const client = (Array.isArray(resa.clients) ? resa.clients[0] : resa.clients) as { nom: string } | null;
  const montant = NaN; // montant_pilote non disponible (chantier gelé) — la route 404 avant d'arriver ici

  if (!pilote?.iban || !montant || montant <= 0) return new NextResponse("Not ready", { status: 404 });

  const payload = buildEpcPayload({
    name: pilote.nom,
    iban: pilote.iban,
    amount: montant,
    remittance: piloteVirementCommunication(resa.date_vol, client?.nom ?? ""),
  });

  const png = await QRCode.toBuffer(payload, {
    errorCorrectionLevel: "M",
    width: 512,
    margin: 1,
    color: { dark: "#0b2238", light: "#ffffff" },
  });

  return new NextResponse(new Uint8Array(png), {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=1800",
    },
  });
}
