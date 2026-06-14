"use client";

import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";

type TxType = "purchase" | "flight_payment" | "flight_voucher" | "refund" | "plane_cost";

export type Transaction = {
  id: string;
  date: string;
  client: string;
  label: string;
  type: TxType;
  amount: number;
  reference: string;
};

function formatPrice(n: number) {
  return n.toLocaleString("fr-BE", { style: "currency", currency: "EUR" });
}

const TX_CONFIG: Record<TxType, { badge: string; cls: string }> = {
  purchase:       { badge: "Boutique",    cls: "bg-purple-50  text-purple-700  border-purple-200"  },
  flight_payment: { badge: "Vol",         cls: "bg-blue-50    text-blue-700    border-blue-200"    },
  flight_voucher: { badge: "Voucher",     cls: "bg-gray-100   text-gray-500    border-gray-200"    },
  refund:         { badge: "Remboursé",   cls: "bg-red-50     text-red-700     border-red-200"     },
  plane_cost:     { badge: "Coût avion",  cls: "bg-amber-50   text-amber-700   border-amber-200"   },
};

function amountDisplay(tx: Transaction) {
  if (tx.type === "flight_voucher") return { text: "—", cls: "text-muted-foreground" };
  if (tx.amount >= 0) return { text: `+${formatPrice(tx.amount)}`, cls: "text-emerald-600 font-semibold" };
  return { text: `−${formatPrice(Math.abs(tx.amount))}`, cls: "text-red-600 font-semibold" };
}

export function TransactionsClient({
  transactions,
  totalCA,
  totalRefunds,
  totalPlaneCosts,
  soldeNet,
  periode,
}: {
  transactions: Transaction[];
  totalCA: number;
  totalRefunds: number;
  totalPlaneCosts: number;
  soldeNet: number;
  periode: string;
}) {
  const router = useRouter();
  const [year, month] = periode.split("-").map(Number);
  const isCurrentMonth = (() => {
    const now = new Date();
    return year === now.getFullYear() && month === now.getMonth() + 1;
  })();

  function navigate(delta: number) {
    const d = new Date(year, month - 1 + delta, 1);
    const p = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    router.push(`/admin/transactions?periode=${p}`);
  }

  const periodeLabel = new Date(year, month - 1, 1).toLocaleDateString("fr-BE", {
    month: "long", year: "numeric",
  });

  return (
    <div className="space-y-5">
      {/* Sélecteur de période */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="p-1.5 rounded-lg border border-border hover:bg-secondary transition-colors cursor-pointer text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft size={15} />
        </button>
        <span className="text-sm font-semibold text-foreground capitalize w-40 text-center">
          {periodeLabel}
        </span>
        <button
          onClick={() => navigate(1)}
          disabled={isCurrentMonth}
          className="p-1.5 rounded-lg border border-border hover:bg-secondary transition-colors cursor-pointer text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <ChevronRight size={15} />
        </button>
      </div>

      {/* Totaux */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">CA encaissé</p>
          <p className="text-xl font-black text-emerald-600">{formatPrice(totalCA)}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Coûts avion</p>
          <p className="text-xl font-black text-amber-600">
            {totalPlaneCosts > 0 ? `−${formatPrice(totalPlaneCosts)}` : formatPrice(0)}
          </p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Remboursements</p>
          <p className="text-xl font-black text-red-500">
            {totalRefunds > 0 ? `−${formatPrice(totalRefunds)}` : formatPrice(0)}
          </p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Solde net</p>
          <p className={`text-xl font-black ${soldeNet >= 0 ? "text-navy" : "text-red-600"}`}>
            {soldeNet >= 0 ? "+" : ""}{formatPrice(soldeNet)}
          </p>
        </div>
      </div>

      {/* Liste */}
      {transactions.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground text-sm">
          Aucune transaction pour <span className="capitalize">{periodeLabel}</span>.
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary">
                <th className="text-left px-4 py-2.5 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Date</th>
                <th className="text-left px-4 py-2.5 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Client</th>
                <th className="text-left px-4 py-2.5 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Transaction</th>
                <th className="text-left px-4 py-2.5 text-[10px] font-bold text-muted-foreground uppercase tracking-wider hidden md:table-cell">Réf.</th>
                <th className="text-right px-4 py-2.5 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Montant</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {transactions.map(tx => {
                const cfg = TX_CONFIG[tx.type];
                const amt = amountDisplay(tx);
                const rawDate = tx.date.length === 10 ? tx.date + "T12:00:00Z" : tx.date;
                const dateStr = new Date(rawDate).toLocaleDateString("fr-BE", {
                  day: "numeric", month: "short",
                });
                return (
                  <tr key={tx.id} className="hover:bg-secondary/30 transition-colors">
                    <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">{dateStr}</td>
                    <td className="px-4 py-3 font-medium text-foreground text-sm">{tx.client}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={`shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${cfg.cls}`}>
                          {cfg.badge}
                        </span>
                        <span className="text-xs text-muted-foreground truncate">{tx.label}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className="text-[10px] font-mono text-muted-foreground">#{tx.reference}</span>
                    </td>
                    <td className={`px-4 py-3 text-right tabular-nums text-sm ${amt.cls}`}>
                      {amt.text}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
