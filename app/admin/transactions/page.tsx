import { PageHeader } from "@/components/admin/PageHeader";
import { TransactionsClient, LigneVol, LigneVoucher, Depense, SoldeStats } from "@/components/admin/TransactionsClient";
import { createAdminClient } from "@/lib/supabase/admin";

export const metadata = { title: "Transactions — Admin" };

type TarifAvion = { prix_heure: number; actif_depuis: string };

function tarifPourDate(tarifs: TarifAvion[], dateVol: string): number {
  const sorted = [...tarifs].sort(
    (a, b) => new Date(b.actif_depuis).getTime() - new Date(a.actif_depuis).getTime()
  );
  const applicable = sorted.find(t => t.actif_depuis <= dateVol);
  return (applicable ?? sorted[sorted.length - 1])?.prix_heure ?? 0;
}

async function getData() {
  const supabase = createAdminClient();

  const [
    { data: tarifAvions },
    { data: resas },
    { data: vouchersShop },
    { data: vouchersCash },
    { data: rawDepenses },
  ] = await Promise.all([
    supabase.from("avion_tarifs").select("prix_heure, actif_depuis"),
    supabase
      .from("reservations")
      .select("id, date_vol, type_resa, acompte, paye, remboursement, duree, duree_reelle, voucher_code, statut, clients(prenom, nom)")
      .neq("statut", "annulee")
      .order("date_vol", { ascending: false }),
    supabase
      .from("voucher_codes")
      .select("id, code, created_at, duration_minutes, recipient_name, recipient_email, orders(total, status)")
      .not("order_id", "is", null)
      .order("created_at", { ascending: false }),
    supabase
      .from("voucher_codes")
      .select("id, code, created_at, duration_minutes, recipient_name, recipient_email, prix")
      .is("order_id", null)
      .eq("payment_method", "cash")
      .not("prix", "is", null)
      .order("created_at", { ascending: false }),
    supabase
      .from("depenses")
      .select("id, montant, description, date")
      .order("date", { ascending: false }),
  ]);

  // Montants des vouchers utilisés dans des réservations (pour affichage sur la ligne vol)
  const voucherCodes = (resas ?? []).map(r => r.voucher_code).filter(Boolean) as string[];
  const voucherMontantMap = new Map<string, number>();
  if (voucherCodes.length > 0) {
    const { data: usedVouchers } = await supabase
      .from("voucher_codes")
      .select("code, prix, order_id, orders(total, status)")
      .in("code", voucherCodes);
    for (const v of usedVouchers ?? []) {
      const orderRaw = v.orders as unknown;
      const order = Array.isArray(orderRaw)
        ? (orderRaw[0] as { total: number; status: string } | undefined) ?? null
        : orderRaw as { total: number; status: string } | null;
      const montant = order?.status === "paid" ? order.total : (v.prix ?? null);
      if (montant != null) voucherMontantMap.set(v.code, montant);
    }
  }

  const tarifs: TarifAvion[] = tarifAvions ?? [];

  // ── Lignes vols ───────────────────────────────────────────────────────────
  const vols: LigneVol[] = (resas ?? []).map(r => {
    const clientRaw = r.clients as unknown;
    const client = Array.isArray(clientRaw)
      ? (clientRaw[0] as { prenom: string; nom: string } | undefined) ?? null
      : clientRaw as { prenom: string; nom: string } | null;
    const paye = r.paye ?? 0;
    const remb = r.remboursement ?? 0;
    const net = paye - remb;
    const prixH = tarifs.length > 0 ? tarifPourDate(tarifs, r.date_vol) : 0;
    const coutAvion = r.duree_reelle != null && prixH > 0
      ? Math.round((r.duree_reelle / 60) * prixH * 100) / 100
      : null;
    return {
      id: r.id,
      date: r.date_vol,
      client: client ? `${client.prenom} ${client.nom}` : "—",
      type_resa: r.type_resa ?? "standard",
      acompte: r.acompte ?? null,
      paye,
      remboursement: remb,
      net_client: net,
      duree: r.duree ?? null,
      duree_reelle: r.duree_reelle ?? null,
      cout_avion: coutAvion,
      resultat: coutAvion != null ? Math.round((net - coutAvion) * 100) / 100 : null,
      voucher_code: r.voucher_code ?? null,
      voucher_montant: r.voucher_code ? (voucherMontantMap.get(r.voucher_code) ?? null) : null,
    };
  });

  // ── Lignes vouchers ───────────────────────────────────────────────────────
  const vouchers: LigneVoucher[] = [];

  for (const v of vouchersShop ?? []) {
    const orderRaw = v.orders as unknown;
    const order = Array.isArray(orderRaw)
      ? (orderRaw[0] as { total: number; status: string } | undefined) ?? null
      : orderRaw as { total: number; status: string } | null;
    if (!order || order.status !== "paid") continue;
    vouchers.push({
      id: v.id,
      date: v.created_at.slice(0, 10),
      destinataire: v.recipient_name ?? v.recipient_email ?? "—",
      type: "boutique",
      minutes: v.duration_minutes,
      montant: order.total,
      code: v.code,
    });
  }

  for (const v of vouchersCash ?? []) {
    vouchers.push({
      id: v.id,
      date: v.created_at.slice(0, 10),
      destinataire: v.recipient_name ?? v.recipient_email ?? "—",
      type: "cash",
      minutes: v.duration_minutes,
      montant: v.prix ?? null,
      code: v.code,
    });
  }

  // ── Dépenses ──────────────────────────────────────────────────────────────
  const depenses: Depense[] = (rawDepenses ?? []).map(d => ({
    id: d.id,
    montant: d.montant,
    description: d.description,
    date: d.date,
  }));

  // ── Solde global ──────────────────────────────────────────────────────────
  let globalEncaisse = 0;
  let globalRembourse = 0;
  let globalCoutAvion = 0;

  for (const v of vols) {
    globalEncaisse += v.paye;
    globalRembourse += v.remboursement;
    if (v.cout_avion != null) globalCoutAvion += v.cout_avion;
  }
  for (const v of vouchers) {
    globalEncaisse += v.montant ?? 0;
  }

  const globalDepenses = depenses.reduce((s, d) => s + d.montant, 0);

  const soldeGlobal: SoldeStats = {
    encaisse: Math.round(globalEncaisse * 100) / 100,
    rembourse: Math.round(globalRembourse * 100) / 100,
    cout_avion: Math.round(globalCoutAvion * 100) / 100,
    depenses: Math.round(globalDepenses * 100) / 100,
    solde_net: Math.round((globalEncaisse - globalRembourse - globalCoutAvion - globalDepenses) * 100) / 100,
  };

  return { vols, vouchers, depenses, soldeGlobal };
}

export default async function TransactionsPage() {
  const { vols, vouchers, depenses, soldeGlobal } = await getData();

  return (
    <div className="space-y-5">
      <PageHeader
        title="Transactions"
        subtitle="Suivi financier — vols, vouchers et solde des caisses"
      />
      <TransactionsClient
        vols={vols}
        vouchers={vouchers}
        depenses={depenses}
        soldeGlobal={soldeGlobal}
      />
    </div>
  );
}
