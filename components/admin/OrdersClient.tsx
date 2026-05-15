"use client";

import { useState } from "react";
import { formatPrice } from "@/lib/utils";
import { OrderStatusSelect } from "@/components/admin/OrderStatusSelect";
import { DeleteOrderButton } from "@/components/admin/DeleteOrderButton";
import { BpostSheet } from "@/components/admin/BpostSheet";
import { EmailPreviewSheet } from "@/components/admin/EmailPreviewSheet";
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

export function OrdersClient({ orders }: { orders: Order[] }) {
  const [activeTab, setActiveTab] = useState("all");
  const [bpostOrder, setBpostOrder] = useState<Order | null>(null);
  const [previewOrder, setPreviewOrder] = useState<Order | null>(null);

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

      {/* Filter tabs */}
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

      {/* List */}
      {filtered.length === 0 ? (
        <div className="card-premium p-12 text-center">
          <p className="text-muted-foreground">Aucune commande dans cette catégorie.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((order) => {
            const date = new Date(order.created_at).toLocaleDateString("fr-BE", {
              day: "numeric",
              month: "short",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            });
            const address = order.shipping_address;
            const hasAddress = !!(address?.line1 || address?.city);
            const statusCfg =
              STATUS_CONFIG[order.status] ?? STATUS_CONFIG.pending;
            const shortId = order.id.slice(0, 8).toUpperCase();

            return (
              <div key={order.id} className="card-premium overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between gap-3 px-5 py-3 border-b border-border bg-secondary/30">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="font-mono text-sm font-semibold text-foreground shrink-0">
                      #{shortId}
                    </span>
                    <span className="text-xs text-muted-foreground hidden sm:block">
                      {date}
                    </span>
                  </div>
                  <div className="flex items-center gap-2.5 shrink-0">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full border font-medium ${statusCfg.className}`}
                    >
                      {statusCfg.label}
                    </span>
                    <span className="font-bold text-primary text-sm">
                      {formatPrice(order.total)}
                    </span>
                  </div>
                </div>
                <span className="text-xs text-muted-foreground sm:hidden block px-5 pt-2.5">
                  {date}
                </span>

                {/* Body */}
                <div className="p-5 grid sm:grid-cols-2 gap-5">
                  {/* Left */}
                  <div className="space-y-4">
                    {/* Address */}
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 flex items-center gap-1">
                        <MapPin size={10} />
                        Expédition
                      </p>
                      {hasAddress ? (
                        <div className="text-sm space-y-0.5">
                          {address.full_name && (
                            <p className="font-medium text-foreground">
                              {address.full_name}
                            </p>
                          )}
                          {address.email && (
                            <p className="text-primary text-xs">{address.email}</p>
                          )}
                          {address.line1 && (
                            <p className="text-muted-foreground">{address.line1}</p>
                          )}
                          {address.line2 && (
                            <p className="text-muted-foreground">{address.line2}</p>
                          )}
                          <p className="text-muted-foreground">
                            {[address.postal_code, address.city]
                              .filter(Boolean)
                              .join(" ")}
                            {address.country && `, ${address.country}`}
                          </p>
                        </div>
                      ) : (
                        <p className="text-sm text-destructive">
                          Adresse non renseignée
                        </p>
                      )}
                    </div>

                    {/* Items */}
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

                    {/* Voucher codes */}
                    {order.voucher_codes?.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 flex items-center gap-1">
                          <Ticket size={10} className="text-primary" />
                          Vouchers
                        </p>
                        <div className="space-y-1.5">
                          {order.voucher_codes.map((vc) => {
                            const statusLabel = vc.status === "used" ? "Utilisé" : vc.status === "expired" ? "Expiré" : "Disponible";
                            const statusClass = vc.status === "used"
                              ? "bg-muted text-muted-foreground border-border"
                              : vc.status === "expired"
                              ? "bg-red-500/10 text-red-400 border-red-500/30"
                              : "bg-green-500/10 text-green-500 border-green-500/30";
                            return (
                              <div key={vc.id} className="flex items-center gap-2 flex-wrap">
                                <CopyCode code={vc.code} />
                                <span className="text-xs text-muted-foreground">
                                  {vc.duration_minutes < 60
                                    ? `${vc.duration_minutes} min`
                                    : `${Math.floor(vc.duration_minutes / 60)}h${vc.duration_minutes % 60 > 0 ? (vc.duration_minutes % 60).toString().padStart(2, "0") : ""}`}
                                </span>
                                <span className={`text-xs px-1.5 py-0.5 rounded-full border font-medium ${statusClass}`}>
                                  {statusLabel}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Right */}
                  <div className="flex flex-col justify-between gap-4">
                    {/* Totals */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Sous-total</span>
                        <span className="text-foreground tabular-nums">
                          {formatPrice(order.subtotal)}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Livraison</span>
                        <span className="text-foreground tabular-nums">
                          {formatPrice(order.shipping_cost)}
                        </span>
                      </div>
                      {order.discount_amount > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">
                            Remise
                            {order.coupon_code && (
                              <span className="ml-1 font-mono text-xs">
                                ({order.coupon_code})
                              </span>
                            )}
                          </span>
                          <span className="text-green-500 tabular-nums">
                            −{formatPrice(order.discount_amount)}
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between text-sm font-semibold pt-1.5 border-t border-border">
                        <span className="text-foreground">Total</span>
                        <span className="text-primary tabular-nums">
                          {formatPrice(order.total)}
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <OrderStatusSelect
                        orderId={order.id}
                        currentStatus={order.status}
                      />
                      <button
                        type="button"
                        onClick={() => setBpostOrder(order)}
                        disabled={!hasAddress}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md border border-border text-foreground hover:border-primary hover:text-primary transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                        title="Préparer étiquette bpost"
                      >
                        <Package size={13} />
                        bpost
                      </button>
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
      )}

      {/* Email preview panel */}
      {previewOrder && (
        <EmailPreviewSheet
          open={!!previewOrder}
          onOpenChange={(open) => { if (!open) setPreviewOrder(null); }}
          orderId={previewOrder.id}
          orderRef={previewOrder.id.slice(0, 8).toUpperCase()}
          customerEmail={previewOrder.shipping_address?.email}
        />
      )}

      {/* bpost panel */}
      {bpostOrder && (
        <BpostSheet
          open={!!bpostOrder}
          onOpenChange={(open) => {
            if (!open) setBpostOrder(null);
          }}
          orderRef={bpostOrder.id.slice(0, 8).toUpperCase()}
          address={bpostOrder.shipping_address}
          items={bpostOrder.items ?? []}
        />
      )}
    </>
  );
}
