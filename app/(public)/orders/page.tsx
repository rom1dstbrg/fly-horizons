import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Package, ChevronRight, ShoppingBag } from "lucide-react";
import { formatPrice } from "@/lib/utils";
import { formatDuration } from "@/lib/vouchers";

export const metadata = {
  title: "Mes commandes · Fly Horizons",
};

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending:    { label: "En attente",  color: "text-yellow-600 bg-yellow-50 border-yellow-200" },
  paid:       { label: "Payée",       color: "text-[#b38500] bg-primary/10 border-primary/30" },
  processing: { label: "En cours",    color: "text-foreground bg-secondary border-border" },
  shipped:    { label: "Expédiée",    color: "text-purple-600 bg-purple-50 border-purple-200" },
  delivered:  { label: "Livrée",      color: "text-green-600 bg-green-50 border-green-200" },
  cancelled:  { label: "Annulée",     color: "text-red-600 bg-red-50 border-red-200" },
  refunded:   { label: "Remboursée",  color: "text-muted-foreground bg-secondary border-border" },
};

interface VoucherCodeRow {
  id: string;
  code: string;
  duration_minutes: number;
  status: string;
  order_id: string;
}

export default async function OrdersPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login?redirectTo=/orders");

  const { data: orders } = await supabase
    .from("orders")
    .select("*, items:order_items(*)")
    .eq("user_id", user.id)
    .neq("status", "pending")
    .order("created_at", { ascending: false });

  const orderIds = orders?.map((o) => o.id) ?? [];
  let vouchersByOrder: Record<string, VoucherCodeRow[]> = {};

  if (orderIds.length > 0) {
    const adminSupabase = createAdminClient();
    const { data: voucherCodes } = await adminSupabase
      .from("voucher_codes")
      .select("id, code, duration_minutes, status, order_id")
      .in("order_id", orderIds);

    vouchersByOrder = (voucherCodes ?? []).reduce((acc, v) => {
      if (!acc[v.order_id]) acc[v.order_id] = [];
      acc[v.order_id].push(v as VoucherCodeRow);
      return acc;
    }, {} as Record<string, VoucherCodeRow[]>);
  }

  return (
    <main className="min-h-screen bg-gradient-navy pt-24 pb-16">
      <div className="container-shop max-w-3xl">

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Mes commandes</h1>
          <p className="text-muted-foreground mt-1">
            {orders?.length ?? 0} commande{(orders?.length ?? 0) !== 1 ? "s" : ""}
          </p>
        </div>

        {!orders || orders.length === 0 ? (
          <div className="card-premium p-12 text-center">
            <div className="w-14 h-14 rounded-full bg-secondary border border-border flex items-center justify-center mx-auto mb-4">
              <Package size={26} className="text-muted-foreground" />
            </div>
            <p className="font-semibold text-foreground mb-1">Aucune commande</p>
            <p className="text-sm text-muted-foreground mb-6">
              Vos commandes apparaîtront ici après paiement.
            </p>
            <Link
              href="/nos-offres"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-black hover:brightness-105 transition-all shadow-gold"
            >
              <ShoppingBag size={14} />
              Découvrir nos offres
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => {
              const status = STATUS_LABELS[order.status] ?? STATUS_LABELS.pending;
              const date = new Date(order.created_at).toLocaleDateString("fr-BE", {
                day: "numeric",
                month: "long",
                year: "numeric",
              });
              const vouchers = vouchersByOrder[order.id] ?? [];

              return (
                <div key={order.id} className="card-premium p-5">
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div>
                      <p className="text-xs text-muted-foreground">{date}</p>
                      <p className="text-[11px] font-mono text-muted-foreground/60 mt-0.5">
                        #{order.id.slice(0, 8).toUpperCase()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${status.color}`}>
                        {status.label}
                      </span>
                      <span className="text-sm font-bold text-foreground">
                        {formatPrice(order.total)}
                      </span>
                    </div>
                  </div>

                  {/* Articles */}
                  <div className="space-y-1 mb-2">
                    {order.items?.slice(0, 3).map((item: {
                      id: string;
                      title: string;
                      quantity: number;
                      unit_price: number;
                    }) => (
                      <p key={item.id} className="text-xs text-muted-foreground">
                        {item.title} ×{item.quantity},{" "}
                        {formatPrice(item.unit_price * item.quantity)}
                      </p>
                    ))}
                    {(order.items?.length ?? 0) > 3 && (
                      <p className="text-xs text-muted-foreground/70 italic">
                        +{order.items.length - 3} autre{order.items.length - 3 > 1 ? "s" : ""}
                      </p>
                    )}
                  </div>

                  {/* Codes de vol */}
                  {vouchers.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-border">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-primary mb-2">
                        Code{vouchers.length > 1 ? "s" : ""} de vol inclus
                      </p>
                      <div className="space-y-1.5">
                        {vouchers.map((v) => (
                          <div
                            key={v.id}
                            className="flex items-center justify-between gap-2 bg-primary/5 border border-primary/20 rounded-lg px-3 py-2"
                          >
                            <div>
                              <p className="font-mono text-xs font-bold tracking-widest text-foreground">
                                {v.code}
                              </p>
                              <p className="text-[10px] text-muted-foreground">
                                {formatDuration(v.duration_minutes)} de vol
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className={`text-[10px] px-1.5 py-0.5 rounded-full border font-medium ${
                                v.status === "unused"
                                  ? "bg-green-50 text-green-600 border-green-200"
                                  : v.status === "reserved"
                                  ? "bg-yellow-50 text-yellow-600 border-yellow-200"
                                  : "bg-secondary text-muted-foreground border-border"
                              }`}>
                                {v.status === "unused" ? "Disponible" : v.status === "used" ? "Utilisé" : v.status === "reserved" ? "En cours" : "Expiré"}
                              </span>
                              {v.status === "unused" && (
                                <Link
                                  href={`/reservation?duree=${v.duration_minutes}&code=${encodeURIComponent(v.code)}`}
                                  className="text-[10px] font-semibold text-foreground hover:text-primary transition-colors whitespace-nowrap"
                                >
                                  Réserver →
                                </Link>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Adresse livraison */}
                  {order.shipping_address?.city && vouchers.length === 0 && (
                    <p className="text-xs text-muted-foreground border-t border-border pt-3 mt-2">
                      Livraison : {order.shipping_address.line1}, {order.shipping_address.postal_code} {order.shipping_address.city}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}

      </div>
    </main>
  );
}
