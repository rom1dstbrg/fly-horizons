import { createAdminClient } from "@/lib/supabase/admin";
import { piloteEncaisse } from "@/lib/pilote/payment";
import { etatPaiement, todayBrussels, type PiloteTransaction } from "./transactions-shared";

// Onglet « Transactions » de l'espace pilote (maquette validée le 27/09,
// option B : https://claude.ai/artifact/67pnpPA1J47WdJnoPQb57d).
// Une ligne = un paiement de passager, c'est-à-dire une réservation d'un vol
// géré par le pilote (ses annonces). Le client règle le pilote par virement :
// rien ne passe par Fly Horizons, l'app ne fait que tracer « reçu / pas reçu ».
// Les vols Fly Horizons payés par Stripe restent dans /admin/transactions.

function pick<T>(v: T | T[] | null | undefined): T | null {
  return Array.isArray(v) ? v[0] ?? null : v ?? null;
}

export async function getPiloteTransactions(piloteId: string): Promise<PiloteTransaction[]> {
  const db = createAdminClient();
  const { data } = await db
    .from("reservations")
    .select(
      "id, type_resa, pilote_id, annonce_id, statut, paye, voucher_code, date_vol, heure_vol, duree, duree_reelle, passagers, acompte, pilote_paye, pilote_paye_at, clients(prenom, nom), annonces_pilote(titre, prix_total, part_pilote, mode_vente)",
    )
    .eq("pilote_id", piloteId)
    .neq("statut", "annulee")
    .order("date_vol", { ascending: false });

  const today = todayBrussels();
  return (data ?? []).filter(piloteEncaisse).map((r) => {
    const c = pick(r.clients as unknown as { prenom: string; nom: string } | null);
    const a = pick(r.annonces_pilote as unknown as { titre: string | null; prix_total: number; part_pilote: number; mode_vente: "avion" | "place" } | null);
    const client = c ? `${c.prenom} ${c.nom}`.trim() : "—";
    const d = new Date(r.date_vol + "T12:00:00Z").toLocaleDateString("fr-BE", { day: "2-digit", month: "2-digit", year: "numeric" });
    return {
      id: r.id,
      date: r.date_vol,
      heure: r.heure_vol ? String(r.heure_vol).slice(0, 5) : null,
      client,
      titre: a?.titre?.trim() || (r.duree ? `Vol de ${r.duree} min` : "Vol"),
      annonceId: r.annonce_id ?? null,
      duree: r.duree ?? null,
      dureeReelle: r.duree_reelle ?? null,
      passagers: r.passagers ?? null,
      montant: r.acompte ?? null,
      cout: a ? Number(a.prix_total) : null,
      part: a ? Number(a.part_pilote) : null,
      modeVente: a?.mode_vente ?? null,
      effectue: r.statut === "vol_effectue",
      etat: etatPaiement(r, today),
      payeLe: r.pilote_paye_at ?? null,
      communication: `Vol Fly Horizons ${d} ${client}`.trim(),
    };
  });
}

