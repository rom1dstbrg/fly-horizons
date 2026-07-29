import { PageHeader } from "@/components/admin/PageHeader";
import { TransactionsClient } from "@/components/admin/TransactionsClient";
import { getTransactionsData } from "@/lib/transactions";

export const metadata = { title: "Transactions — Admin" };

export default async function TransactionsPage() {
  const { vols, vouchers, depenses, soldeGlobal } = await getTransactionsData();

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
