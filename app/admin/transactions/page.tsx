import { PageHeader } from "@/components/admin/PageHeader";
import { Construction } from "lucide-react";

export const metadata = { title: "Transactions — Admin" };

export default function TransactionsPage() {
  return (
    <div className="space-y-5">
      <PageHeader
        title="Transactions"
        subtitle="Historique financier — paiements, vouchers et remboursements"
      />
      <div className="flex flex-col items-center justify-center py-24 gap-4 text-muted-foreground">
        <Construction size={36} className="text-muted-foreground/40" />
        <p className="text-sm font-medium">En construction</p>
      </div>
    </div>
  );
}
