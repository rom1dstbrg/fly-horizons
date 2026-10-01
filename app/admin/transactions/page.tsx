import { TransactionsClient } from "@/components/admin/TransactionsClient";
import { getTransactionsData } from "@/lib/transactions";

export const metadata = { title: "Transactions — Admin" };

export default async function TransactionsPage() {
  const { vols, piloteVols, reversements, reversementsDisponibles, vouchers, depenses } = await getTransactionsData();
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Brussels" }).format(new Date());

  return (
    <TransactionsClient
      vols={vols}
      piloteVols={piloteVols}
      reversements={reversements}
      reversementsDisponibles={reversementsDisponibles}
      vouchers={vouchers}
      depenses={depenses}
      today={today}
    />
  );
}
