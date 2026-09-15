import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { MassBalanceClient, type ResaContext } from "@/components/admin/mass-balance/MassBalanceClient";
import type { MbSheetRow } from "@/components/admin/mass-balance/SheetsList";
import type { MassBalanceInputs } from "@/lib/mass-balance/da40-calc";
import { PiloteHeader } from "@/components/pilote/ui";

export const metadata = { title: "Masse & centrage — Espace pilote" };

type RawSheet = {
  id: string;
  aircraft_reg: string;
  flight_date: string | null;
  label: string | null;
  updated_at: string;
  created_at: string;
  reservation_id: string | null;
  inputs: MassBalanceInputs;
  reservations: { clients: { prenom: string | null; nom: string | null } | { prenom: string | null; nom: string | null }[] | null } | { clients: unknown }[] | null;
};

function clientLabelOf(row: RawSheet): string | null {
  const resa = Array.isArray(row.reservations) ? row.reservations[0] : row.reservations;
  const cl = resa && "clients" in resa ? (Array.isArray(resa.clients) ? resa.clients[0] : resa.clients) : null;
  if (!cl || typeof cl !== "object") return null;
  const c = cl as { prenom?: string | null; nom?: string | null };
  const s = `${c.prenom ?? ""} ${c.nom ?? ""}`.trim();
  return s || null;
}

export default async function PiloteMassBalancePage({
  searchParams,
}: {
  searchParams: Promise<{ resa?: string; sheet?: string }>;
}) {
  const { resa: resaId, sheet: sheetId } = await searchParams;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const db = createAdminClient();
  const { data: pilote } = await db.from("pilotes").select("id").eq("user_id", user!.id).single();

  // Réservations du pilote — bornent les feuilles et le contexte accessibles.
  const { data: myResas } = pilote
    ? await db.from("reservations").select("id").eq("pilote_id", pilote.id)
    : { data: [] };
  const myResaIds = (myResas ?? []).map((r) => r.id);

  // Feuilles visibles : les calculs libres (sans réservation) + celles liées à un de ses vols.
  let sheetsQuery = db
    .from("mass_balance_sheets")
    .select(
      "id, aircraft_reg, flight_date, label, updated_at, created_at, reservation_id, inputs, reservations(clients(prenom, nom))",
    )
    .order("created_at", { ascending: false })
    .limit(60);
  sheetsQuery = myResaIds.length
    ? sheetsQuery.or(`reservation_id.is.null,reservation_id.in.(${myResaIds.join(",")})`)
    : sheetsQuery.is("reservation_id", null);

  const [{ data: rawSheets }, resaRes] = await Promise.all([
    sheetsQuery,
    resaId && myResaIds.includes(resaId)
      ? db
          .from("reservations")
          .select("id, date_vol, passagers, poids_total, clients(prenom, nom)")
          .eq("id", resaId)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const sheets: MbSheetRow[] = ((rawSheets ?? []) as RawSheet[]).map((r) => ({
    id: r.id,
    aircraft_reg: r.aircraft_reg,
    flight_date: r.flight_date,
    label: r.label,
    updated_at: r.updated_at,
    created_at: r.created_at,
    reservation_id: r.reservation_id,
    clientLabel: clientLabelOf(r),
    inputs: r.inputs,
  }));

  let resa: ResaContext | null = null;
  const rd = resaRes.data as
    | { id: string; date_vol: string | null; passagers: number | null; poids_total: number | null; clients: { prenom: string | null; nom: string | null } | { prenom: string | null; nom: string | null }[] | null }
    | null;
  if (rd) {
    const cl = Array.isArray(rd.clients) ? rd.clients[0] : rd.clients;
    resa = {
      id: rd.id,
      date_vol: rd.date_vol,
      passagers: rd.passagers,
      poids_total: rd.poids_total,
      clientLabel: cl ? `${cl.prenom ?? ""} ${cl.nom ?? ""}`.trim() || null : null,
    };
  }

  return (
    <div className="space-y-5">
      <PiloteHeader
        title="Masse & centrage"
        subtitle="Feuille de masse et centrage DA40 + performances TODR / LDR. Enregistrez et imprimez, ou utilisez le calculateur librement."
      />
      <MassBalanceClient resa={resa} sheets={sheets} initialSheetId={sheetId ?? null} viewerRole="pilote" />
    </div>
  );
}
