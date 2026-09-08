import { NextRequest, NextResponse } from "next/server";
import { computeMassBalance, type MassBalanceInputs } from "@/lib/mass-balance/da40-calc";
import { generateMassBalancePDFBuffer } from "@/lib/pdf/mass-balance-pdf";
import { requireAdminOrActivePilote } from "@/lib/actions/auth-guards";

/**
 * Aperçu PDF à la volée depuis l'état courant du formulaire, sans enregistrer.
 * Ouvert à l'admin et aux pilotes actifs (le M&B fait partie de leur préparation de vol).
 */
export async function POST(req: NextRequest) {
  try {
    await requireAdminOrActivePilote();
  } catch {
    return new NextResponse("Non autorisé", { status: 401 });
  }

  let body: { inputs?: MassBalanceInputs; clientLabel?: string | null };
  try {
    body = await req.json();
  } catch {
    return new NextResponse("Corps invalide", { status: 400 });
  }

  const inputs = body.inputs;
  if (!inputs?.aircraftReg) return new NextResponse("Données manquantes", { status: 400 });

  const computed = computeMassBalance(inputs);
  const buffer = await generateMassBalancePDFBuffer({
    aircraftReg: inputs.aircraftReg,
    flightDate: inputs.flightDate || null,
    clientLabel: body.clientLabel?.trim() || null,
    inputs,
    computed,
  });

  return new NextResponse(buffer as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="apercu-masse-centrage.pdf"`,
      "Content-Length": String(buffer.length),
    },
  });
}
