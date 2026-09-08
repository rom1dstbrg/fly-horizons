import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { computeMassBalance, type MassBalanceInputs } from "@/lib/mass-balance/da40-calc";
import { generateMassBalancePDFBuffer } from "@/lib/pdf/mass-balance-pdf";
import { requireAdminOrActivePilote, type ReservationActor } from "@/lib/actions/auth-guards";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  let actor: ReservationActor;
  try {
    actor = await requireAdminOrActivePilote();
  } catch {
    return new NextResponse("Non autorisé", { status: 401 });
  }

  const { id } = await params;
  const db = createAdminClient();

  const { data: sheet } = await db
    .from("mass_balance_sheets")
    .select("id, aircraft_reg, flight_date, label, inputs, computed, reservation_id, reservations(clients(prenom, nom), date_vol, pilote_id)")
    .eq("id", id)
    .maybeSingle();

  if (!sheet) return new NextResponse("Introuvable", { status: 404 });

  // Un pilote n'accède qu'aux feuilles libres (sans réservation) ou liées à ses propres vols.
  if (actor.role === "pilote") {
    const linked = Array.isArray(sheet.reservations) ? sheet.reservations[0] : sheet.reservations;
    const linkedPiloteId = (linked as { pilote_id?: string | null } | null)?.pilote_id ?? null;
    if (sheet.reservation_id && linkedPiloteId !== actor.piloteId) {
      return new NextResponse("Non autorisé", { status: 403 });
    }
  }

  const inputs = sheet.inputs as MassBalanceInputs;
  // Recalcule à la volée pour garder le PDF cohérent avec le moteur courant.
  const computed = computeMassBalance(inputs);

  const resa = Array.isArray(sheet.reservations) ? sheet.reservations[0] : sheet.reservations;
  const cl = resa?.clients ? (Array.isArray(resa.clients) ? resa.clients[0] : resa.clients) : null;
  const clientLabel = sheet.label
    ? sheet.label
    : cl
      ? `${cl.prenom ?? ""} ${cl.nom ?? ""}`.trim() || null
      : null;

  const buffer = await generateMassBalancePDFBuffer({
    aircraftReg: sheet.aircraft_reg,
    flightDate: sheet.flight_date ?? inputs.flightDate ?? null,
    clientLabel,
    inputs,
    computed,
  });

  const ref = `${sheet.aircraft_reg}-${(sheet.flight_date ?? "").replace(/-/g, "") || "MB"}`;

  return new NextResponse(buffer as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="masse-centrage-${ref}.pdf"`,
      "Content-Length": String(buffer.length),
    },
  });
}
