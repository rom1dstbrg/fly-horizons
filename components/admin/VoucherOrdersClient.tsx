"use client";

import { useState } from "react";
import { formatPrice } from "@/lib/utils";
import { OrderStatusSelect } from "@/components/admin/OrderStatusSelect";
import { EmailPreviewSheet } from "@/components/admin/EmailPreviewSheet";
import { deleteOrder } from "@/lib/actions/delete";
import { AdminBadge, STATUT_ORDER, STATUT_VOUCHER } from "@/components/admin/ui/AdminBadge";
import { AdminRowActions } from "@/components/admin/ui/AdminRowActions";
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

export function VoucherOrdersClient({ orders: initial }: { orders: VoucherOrder[] }) {
  const [orders, setOrders] = useState<VoucherOrder[]>(initial);
  const [previewOrder, setPreviewOrder] = useState<VoucherOrder | null>(null);

  async function handleDelete(id: string) {
    const result = await deleteOrder(id);
    if (!result?.error) setOrders(prev => prev.filter(o => o.id !== id));
    return result;
  }

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
          const statusCfg = STATUT_ORDER[order.status] ?? { label: order.status, variant: "secondary" as const };
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
                  <AdminBadge variant={statusCfg.variant} label={statusCfg.label} />
                  <span className="font-bold text-primary text-sm">{formatPrice(order.total)}</span>
                </div>
              </div>
              <span className="text-xs text-muted-foreground sm:hidden block px-3 pt-2.5">{date}</span>

              {/* Body */}
              <div className="p-3 sm:p-5 grid sm:grid-cols-2 gap-4 sm:gap-5">
                {/* Gauche — codes */}
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
                          const vCfg = STATUT_VOUCHER[vc.status] ?? { label: vc.status, variant: "secondary" as const };
                          const dur = vc.duration_minutes < 60
                            ? `${vc.duration_minutes} min`
                            : `${Math.floor(vc.duration_minutes / 60)}h${vc.duration_minutes % 60 > 0 ? (vc.duration_minutes % 60).toString().padStart(2, "0") : ""}`;
                          return (
                            <div key={vc.id} className="flex items-center gap-2 flex-wrap">
                              <CopyCode code={vc.code} />
                              <span className="text-xs text-muted-foreground">{dur}</span>
                              <AdminBadge variant={vCfg.variant} label={vCfg.label} />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* Droite — totaux + actions */}
                <div className="flex flex-col justify-between gap-4">
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Sous-total</span>
                      <span className="text-foreground tabular-nums">{formatPrice(order.subtotal)}</span>
                    </div>
                    {order.discount_amount > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">
                          Remise{order.coupon_code && (
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
                    <AdminRowActions
                      extra={[
                        {
                          icon: Mail,
                          label: "Emails",
                          onClick: () => setPreviewOrder(order),
                          title: "Aperçu des emails",
                        },
                      ]}
                      onDelete={() => handleDelete(order.id)}
                    />
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
