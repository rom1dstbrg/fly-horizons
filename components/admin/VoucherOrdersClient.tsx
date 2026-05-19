"use client";

import { useState } from "react";
import { formatPrice } from "@/lib/utils";
import { OrderStatusSelect } from "@/components/admin/OrderStatusSelect";
import { DeleteOrderButton } from "@/components/admin/DeleteOrderButton";
import { EmailPreviewSheet } from "@/components/admin/EmailPreviewSheet";
import { Mail, Ticket, Copy, Check } from "lucide-react";

interface VoucherCode {
  id: string;
  code: string;
  product_title: string;
  duration_minutes: number;
  status: string;
}

interface OrderItem {
  id: string;
  title: string;
  quantity: number;
  unit_price: number;
}

interface VoucherOrder {
  id: string;
  created_at: string;
  status: string;
  subtotal: number;
  shipping_cost: number;
  total: number;
  discount_amount: number;
  coupon_code: string | null;
  items: OrderItem[];
  voucher_codes: VoucherCode[];
  customer_name?: string | null;
  customer_email?: string | null;
}

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  pending:    { label: "En attente", className: "bg-yellow-500/10 text-yellow-500 border-yellow-500/30" },
  paid:       { label: "Payée",      className: "bg-blue-500/10 text-blue-500 border-blue-500/30" },
  processing: { label: "En cours",   className: "bg-indigo-500/10 text-indigo-400 border-indigo-500/30" },
  shipped:    { label: "Expédiée",   className: "bg-purple-500/10 text-purple-400 border-purple-500/30" },
  delivered:  { label: "Livrée",     className: "bg-green-500/10 text-green-500 border-green-500/30" },
  cancelled:  { label: "Annulée",    className: "bg-red-500/10 text-red-400 border-red-500/30" },
  refunded:   { label: "Remboursée", className: "bg-muted text-muted-foreground border-border" },
};

const SCODE_STATUS: Record<string, { label: string; className: string }> = {
  unused:  { label: "Disponible", className: "bg-green-500/10 text-green-600 border-green-500/30" },
  used:    { label: "Utilisé",    className: "bg-muted text-muted-foreground border-border" },
  expired: { label: "Expiré",     className: "bg-red-500/10 text-red-400 border-red-500/30" },
};

function CopyCode({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  function handleCopy() {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }
  return (
    <button
      onClick={handleCopy}
      className="inline-flex items-center gap-1.5 font-mono text-xs bg-secondary border border-border rounded px-2 py-1 hover:border-primary/50 transition-colors"
      title="Copier le code"
    >
      <span className="text-foreground tracking-wider">{code}</span>
      {copied
        ? <Check size={11} className="text-green-500 shrink-0" />
        : <Copy size={11} className="text-muted-foreground shrink-0" />}
    </button>
  );
}

export function VoucherOrdersClient({ orders }: { orders: VoucherOrder[] }) {
  const [previewOrder, setPreviewOrder] = useState<VoucherOrder | null>(null);

  if (orders.length === 0) {
    return (
      <div className="card-premium p-12 text-center">
        <p className="text-muted-foreground">Aucune commande de vols pour le moment.</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {orders.map((order) => {
          const date = new Date(order.created_at).toLocaleDateString("fr-BE", {
            day: "numeric", month: "short", year: "numeric",
            hour: "2-digit", minute: "2-digit",
          });
          const statusCfg = STATUS_CONFIG[order.status] ?? STATUS_CONFIG.pending;
          const shortId = order.id.slice(0, 8).toUpperCase();

          return (
            <div key={order.id} className="card-premium overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between gap-3 px-3 sm:px-5 py-3 border-b border-border bg-secondary/30">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="font-mono text-sm font-semibold text-foreground shrink-0">
                    #{shortId}
                  </span>
                  <span className="text-xs text-muted-foreground hidden sm:block">{date}</span>
                  {(order.customer_name || order.customer_email) && (
                    <span className="hidden sm:flex items-center gap-1.5 min-w-0">
                      {order.customer_name && (
                        <span className="text-xs font-medium text-foreground truncate">
                          {order.customer_name}
                        </span>
                      )}
                      {order.customer_email && (
                        <span className="text-xs text-muted-foreground truncate">
                          {order.customer_name ? `(${order.customer_email})` : order.customer_email}
                        </span>
                      )}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2.5 shrink-0">
                  <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${statusCfg.className}`}>
                    {statusCfg.label}
                  </span>
                  <span className="font-bold text-primary text-sm">{formatPrice(order.total)}</span>
                </div>
              </div>
              <span className="text-xs text-muted-foreground sm:hidden block px-3 pt-2.5">{date}</span>

              {/* Body */}
              <div className="p-3 sm:p-5 grid sm:grid-cols-2 gap-4 sm:gap-5">
                {/* Left — voucher codes */}
                <div className="space-y-4">
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1">
                      <Ticket size={10} className="text-primary" />
                      Vols achetés
                    </p>
                    <div className="space-y-2">
                      {order.items?.map((item) => (
                        <p key={item.id} className="text-sm text-muted-foreground">
                          {item.title} ×{item.quantity}
                          <span className="ml-2 text-foreground tabular-nums">{formatPrice(item.unit_price * item.quantity)}</span>
                        </p>
                      ))}
                    </div>
                  </div>

                  {order.voucher_codes?.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                        Codes émis
                      </p>
                      <div className="space-y-2">
                        {order.voucher_codes.map((vc) => {
                          const sc = SCODE_STATUS[vc.status] ?? SCODE_STATUS.unused;
                          const dur = vc.duration_minutes < 60
                            ? `${vc.duration_minutes} min`
                            : `${Math.floor(vc.duration_minutes / 60)}h${vc.duration_minutes % 60 > 0 ? (vc.duration_minutes % 60).toString().padStart(2, "0") : ""}`;
                          return (
                            <div key={vc.id} className="flex items-center gap-2 flex-wrap">
                              <CopyCode code={vc.code} />
                              <span className="text-xs text-muted-foreground">{dur}</span>
                              <span className={`text-xs px-1.5 py-0.5 rounded-full border font-medium ${sc.className}`}>
                                {sc.label}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* Right — totals + actions */}
                <div className="flex flex-col justify-between gap-4">
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Sous-total</span>
                      <span className="text-foreground tabular-nums">{formatPrice(order.subtotal)}</span>
                    </div>
                    {order.discount_amount > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">
                          Remise
                          {order.coupon_code && (
                            <span className="ml-1 font-mono text-xs">({order.coupon_code})</span>
                          )}
                        </span>
                        <span className="text-green-500 tabular-nums">−{formatPrice(order.discount_amount)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm font-semibold pt-1.5 border-t border-border">
                      <span className="text-foreground">Total</span>
                      <span className="text-primary tabular-nums">{formatPrice(order.total)}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <OrderStatusSelect orderId={order.id} currentStatus={order.status} />
                    <button
                      type="button"
                      onClick={() => setPreviewOrder(order)}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md border border-border text-foreground hover:border-primary hover:text-primary transition-colors"
                      title="Aperçu des emails"
                    >
                      <Mail size={13} />
                      Emails
                    </button>
                    <DeleteOrderButton orderId={order.id} />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {previewOrder && (
        <EmailPreviewSheet
          open={!!previewOrder}
          onOpenChange={(open) => { if (!open) setPreviewOrder(null); }}
          orderId={previewOrder.id}
          orderRef={previewOrder.id.slice(0, 8).toUpperCase()}
          customerEmail={previewOrder.customer_email ?? undefined}
        />
      )}
    </>
  );
}
