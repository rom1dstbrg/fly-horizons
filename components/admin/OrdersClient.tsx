"use client";

import { useState } from "react";
import { formatPrice } from "@/lib/utils";
import { OrderStatusSelect } from "@/components/admin/OrderStatusSelect";
import { BpostSheet } from "@/components/admin/BpostSheet";
import { EmailPreviewSheet } from "@/components/admin/EmailPreviewSheet";
import { deleteOrder } from "@/lib/actions/delete";
import { AdminBadge, STATUT_ORDER, STATUT_VOUCHER } from "@/components/admin/ui/AdminBadge";
import { AdminRowActions } from "@/components/admin/ui/AdminRowActions";
import { MapPin, Package, Mail, Ticket, Copy, Check } from "lucide-react";

interface OrderItem {
  id: string;
  title: string;
  quantity: number;
  unit_price: number;
}

interface ShippingAddress {
  full_name?: string;
  email?: string;
  line1?: string;
  line2?: string | null;
  city?: string;
  postal_code?: string;
  country?: string;
}

interface VoucherCode {
  id: string;
  code: string;
  product_title: string;
  duration_minutes: number;
  status: string;
}

interface Order {
  id: string;
  created_at: string;
  status: string;
  subtotal: number;
  shipping_cost: number;
  total: number;
  discount_amount: number;
  coupon_code: string | null;
  shipping_address: ShippingAddress;
  items: OrderItem[];
  voucher_codes: VoucherCode[];
  customer_name?: string | null;
  customer_email?: string | null;
}

const TABS = [
  { key: "all",         label: "Toutes",    statuses: null },
  { key: "to_process",  label: "À traiter", statuses: ["paid", "pending"] },
  { key: "in_progress", label: "En cours",  statuses: ["processing", "shipped"] },
  { key: "done",        label: "Livrées",   statuses: ["delivered"] },
  { key: "cancelled",   label: "Annulées",  statuses: ["cancelled", "refunded"] },
];

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

export function OrdersClient({ orders: initial }: { orders: Order[] }) {
  const [orders, setOrders] = useState<Order[]>(initial);
  const [activeTab, setActiveTab] = useState("all");
  const [bpostOrder, setBpostOrder] = useState<Order | null>(null);
  const [previewOrder, setPreviewOrder] = useState<Order | null>(null);

  async function handleDelete(id: string) {
    const result = await deleteOrder(id);
    if (!result?.error) setOrders(prev => prev.filter(o => o.id !== id));
    return result;
  }

  const filtered = activeTab === "all"
    ? orders
    : orders.filter((o) => {
        const tab = TABS.find((t) => t.key === activeTab);
        return tab?.statuses?.includes(o.status) ?? true;
      });

  const toProcess  = orders.filter((o) => ["paid", "pending"].includes(o.status)).length;
  const inProgress = orders.filter((o) => ["processing", "shipped"].includes(o.status)).length;
  const delivered  = orders.filter((o) => o.status === "delivered").length;

  return (
    <>
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <button
          onClick={() => setActiveTab("to_process")}
          className="card-premium p-4 text-center hover:border-primary/40 transition-colors"
        >
          <p className="text-2xl font-bold text-primary">{toProcess}</p>
          <p className="text-xs text-muted-foreground mt-0.5">À traiter</p>
        </button>
        <button
          onClick={() => setActiveTab("in_progress")}
          className="card-premium p-4 text-center hover:border-primary/40 transition-colors"
        >
          <p className="text-2xl font-bold text-purple-400">{inProgress}</p>
          <p className="text-xs text-muted-foreground mt-0.5">En cours</p>
        </button>
        <button
          onClick={() => setActiveTab("done")}
          className="card-premium p-4 text-center hover:border-primary/40 transition-colors"
        >
          <p className="text-2xl font-bold text-green-500">{delivered}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Livrées</p>
        </button>
      </div>

      {/* Onglets */}
      <div className="flex gap-1 flex-wrap">
        {TABS.map((tab) => {
          const count =
            tab.statuses === null
              ? orders.length
              : orders.filter((o) => tab.statuses!.includes(o.status)).length;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary"
              }`}
            >
              {tab.label}
              <span className={`ml-1.5 text-xs ${isActive ? "opacity-60" : "opacity-40"}`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Liste */}
      {filtered.length === 0 ? (
        <div className="card-premium p-12 text-center">
          <p className="text-muted-foreground">Aucune commande dans cette catégorie.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((order) => {
            const date = new Date(order.created_at).toLocaleDateString("fr-BE", {
              day: "numeric", month: "short", year: "numeric",
              hour: "2-digit", minute: "2-digit",
            });
            const address = order.shipping_address;
            const hasAddress = !!(address?.line1 || address?.city);
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
                  {/* Colonne gauche */}
                  <div className="space-y-4">
                    {/* Adresse */}
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 flex items-center gap-1">
                        <MapPin size={10} />
                        Expédition
                      </p>
                      {hasAddress ? (
                        <div className="text-sm space-y-0.5">
                          {address.full_name && (
                            <p className="font-medium text-foreground">{address.full_name}</p>
                          )}
                          {address.email && (
                            <p className="text-primary text-xs">{address.email}</p>
                          )}
                          {address.line1 && <p className="text-muted-foreground">{address.line1}</p>}
                          {address.line2 && <p className="text-muted-foreground">{address.line2}</p>}
                          <p className="text-muted-foreground">
                            {[address.postal_code, address.city].filter(Boolean).join(" ")}
                            {address.country && `, ${address.country}`}
                          </p>
                        </div>
                      ) : (
                        <div className="text-sm space-y-0.5">
                          {order.customer_name && (
                            <p className="font-medium text-foreground">{order.customer_name}</p>
                          )}
                          {order.customer_email && (
                            <p className="text-primary text-xs">{order.customer_email}</p>
                          )}
                          {!order.customer_name && !order.customer_email && (
                            <p className="text-destructive">Adresse non renseignée</p>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Articles */}
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                        Articles
                      </p>
                      <div className="space-y-1">
                        {order.items?.map((item) => (
                          <div key={item.id} className="flex justify-between text-sm">
                            <span className="text-muted-foreground">
                              {item.title} ×{item.quantity}
                            </span>
                            <span className="text-foreground tabular-nums">
                              {formatPrice(item.unit_price * item.quantity)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Vouchers */}
                    {order.voucher_codes?.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 flex items-center gap-1">
                          <Ticket size={10} className="text-primary" />
                          Vouchers
                        </p>
                        <div className="space-y-1.5">
                          {order.voucher_codes.map((vc) => {
                            const vCfg = STATUT_VOUCHER[vc.status] ?? { label: vc.status, variant: "secondary" as const };
                            const dureH = Math.floor(vc.duration_minutes / 60);
                            const dureM = vc.duration_minutes % 60;
                            const dureStr = dureH > 0
                              ? `${dureH}h${dureM > 0 ? dureM.toString().padStart(2, "0") : ""}`
                              : `${dureM} min`;
                            return (
                              <div key={vc.id} className="flex items-center gap-2 flex-wrap">
                                <CopyCode code={vc.code} />
                                <span className="text-xs text-muted-foreground">{dureStr}</span>
                                <AdminBadge variant={vCfg.variant} label={vCfg.label} />
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Colonne droite */}
                  <div className="flex flex-col justify-between gap-4">
                    {/* Totaux */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Sous-total</span>
                        <span className="text-foreground tabular-nums">{formatPrice(order.subtotal)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Livraison</span>
                        <span className="text-foreground tabular-nums">{formatPrice(order.shipping_cost)}</span>
                      </div>
                      {order.discount_amount > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">
                            Remise{order.coupon_code && (
                              <span className="ml-1 font-mono text-xs">({order.coupon_code})</span>
                            )}
                          </span>
                          <span className="text-green-500 tabular-nums">
                            −{formatPrice(order.discount_amount)}
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between text-sm font-semibold pt-1.5 border-t border-border">
                        <span className="text-foreground">Total</span>
                        <span className="text-primary tabular-nums">{formatPrice(order.total)}</span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <OrderStatusSelect
                        orderId={order.id}
                        currentStatus={order.status}
                      />
                      <AdminRowActions
                        extra={[
                          {
                            icon: Package,
                            label: "bpost",
                            onClick: () => setBpostOrder(order),
                            disabled: !hasAddress,
                            title: "Préparer étiquette bpost",
                          },
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
      )}

      {/* Panneau email */}
      {previewOrder && (
        <EmailPreviewSheet
          open={!!previewOrder}
          onOpenChange={(open) => { if (!open) setPreviewOrder(null); }}
          orderId={previewOrder.id}
          orderRef={previewOrder.id.slice(0, 8).toUpperCase()}
          customerEmail={previewOrder.shipping_address?.email}
        />
      )}

      {/* Panneau bpost */}
      {bpostOrder && (
        <BpostSheet
          open={!!bpostOrder}
          onOpenChange={(open) => { if (!open) setBpostOrder(null); }}
          orderRef={bpostOrder.id.slice(0, 8).toUpperCase()}
          address={bpostOrder.shipping_address}
          items={bpostOrder.items ?? []}
        />
      )}
    </>
  );
}
