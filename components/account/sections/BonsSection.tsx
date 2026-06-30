"use client";

import Link from "next/link";
import { Ticket, Download, ChevronRight, Package } from "lucide-react";
import { formatDuration } from "@/lib/vouchers";

const STATUS_STYLE: Record<string, { label: string; color: string }> = {
  unused:   { label: "Disponible", color: "bg-green-50 text-green-600 border-green-200" },
  reserved: { label: "Réservé",    color: "bg-yellow-50 text-yellow-600 border-yellow-200" },
  used:     { label: "Utilisé",    color: "bg-secondary text-muted-foreground border-border" },
  expired:  { label: "Expiré",     color: "bg-red-50 text-red-600 border-red-200" },
};

export interface VoucherCode {
  id: string;
  code: string;
  duration_minutes: number;
  status: string;
  order_id: string | null;
  product_title?: string | null;
  expires_at?: string | null;
}

export interface OrderSummary {
  id: string;
  created_at: string;
  status: string;
  total: number;
}

export function BonsSection({ vouchers, orders }: { vouchers: VoucherCode[]; orders: OrderSummary[] }) {
  if (vouchers.length === 0) {
    return (
      <div className="card-premium p-10 text-center">
        <div className="w-12 h-12 rounded-full bg-secondary border border-border flex items-center justify-center mx-auto mb-3">
          <Ticket size={20} className="text-muted-foreground" />
        </div>
        <p className="text-sm font-medium text-foreground">Aucun bon de vol</p>
        <p className="text-xs text-muted-foreground mt-1">Achetez une offre pour recevoir votre bon.</p>
        <Link href="/nos-offres" className="inline-flex items-center gap-1 mt-4 text-xs text-foreground font-semibold hover:text-primary transition-colors">
          Voir les offres <ChevronRight size={12} />
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="card-premium overflow-hidden">
        <div className="divide-y divide-border">
          {vouchers.map((v) => {
            const st = STATUS_STYLE[v.status] ?? STATUS_STYLE.expired;
            return (
              <div key={v.id} className={`p-5 ${v.status !== "unused" ? "opacity-60" : ""}`}>
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div>
                    <p className="font-mono text-sm font-bold tracking-widest text-foreground">{v.code}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDuration(v.duration_minutes)} de vol
                      {v.product_title ? ` · ${v.product_title}` : ""}
                    </p>
                    {v.expires_at && v.status === "unused" && (
                      <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                        Expire le {new Date(v.expires_at).toLocaleDateString("fr-BE")}
                      </p>
                    )}
                  </div>
                  <span className={`text-[11px] px-2 py-0.5 rounded-full border font-semibold shrink-0 ${st.color}`}>
                    {st.label}
                  </span>
                </div>
                <div className="flex flex-col gap-2">
                  {v.status === "unused" && (
                    <Link
                      href={`/reservation?duree=${v.duration_minutes}&code=${encodeURIComponent(v.code)}`}
                      className="flex items-center justify-center gap-1.5 w-full py-2 px-4 rounded-lg bg-primary text-primary-foreground text-xs font-black hover:bg-[#e6a800] transition-colors"
                    >
                      Utiliser ce bon →
                    </Link>
                  )}
                  <a
                    href={`/api/voucher/pdf?code=${encodeURIComponent(v.code)}`}
                    download
                    className="flex items-center justify-center gap-1.5 w-full py-2 px-4 rounded-lg border border-border bg-secondary text-foreground hover:border-foreground text-xs font-semibold transition-colors cursor-pointer"
                  >
                    <Download size={13} />
                    Imprimer le bon cadeau
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {orders.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Mes commandes
          </p>
          <div className="card-premium overflow-hidden">
            <div className="divide-y divide-border">
              {orders.map((order) => {
                const dateStr = new Date(order.created_at).toLocaleDateString("fr-BE", {
                  day: "numeric", month: "long", year: "numeric",
                });
                const ref = `FH-${order.id.slice(0, 8).toUpperCase()}`;
                return (
                  <div key={order.id} className="p-5">
                    <div className="flex items-start justify-between gap-3 mb-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <Package size={13} className="text-muted-foreground" />
                          <p className="text-sm font-semibold text-foreground">{ref}</p>
                        </div>
                        <p className="text-xs text-muted-foreground">{dateStr}</p>
                      </div>
                      <p className="text-sm font-bold text-foreground shrink-0">
                        {order.total.toLocaleString("fr-BE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                      </p>
                    </div>
                    <div className="flex flex-col gap-2">
                      <a
                        href={`/api/invoice/${order.id}`}
                        download
                        className="flex items-center justify-center gap-1.5 w-full py-2 px-4 rounded-lg border border-border bg-secondary text-foreground hover:border-foreground text-xs font-semibold transition-colors cursor-pointer"
                      >
                        <Download size={13} />
                        Facture simple
                      </a>
                      <a
                        href={`/api/invoice/${order.id}?type=detaillee`}
                        download
                        className="flex items-center justify-center gap-1.5 w-full py-2 px-4 rounded-lg border border-border bg-secondary text-foreground hover:border-foreground text-xs font-semibold transition-colors cursor-pointer"
                      >
                        <Download size={13} />
                        Facture détaillée
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
