import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Package, ChevronRight } from "lucide-react";
import { formatPrice } from "@/lib/utils";

export const metadata = {
  title: "Mes commandes",
};

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending:    { label: "En attente",   color: "text-yellow-500 bg-yellow-500/10 border-yellow-500/20" },
  paid:       { label: "Payee",        color: "text-blue-400 bg-blue-400/10 border-blue-400/20" },
  processing: { label: "En cours",     color: "text-blue-400 bg-blue-400/10 border-blue-400/20" },
  shipped:    { label: "Expediee",     color: "text-purple-400 bg-purple-400/10 border-purple-400/20" },
  delivered:  { label: "Livree",       color: "text-green-500 bg-green-500/10 border-green-500/20" },
  cancelled:  { label: "Annulee",      color: "text-destructive bg-destructive/10 border-destructive/20" },
  refunded:   { label: "Remboursee",   color: "text-muted-foreground bg-muted/10 border-border" },
};

export default async function OrdersPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login?redirectTo=/orders");

  const { data: orders } = await supabase
    .from("orders")
    .select("*, items:order_items(*, product:products(title, slug))")
    .eq("user_id", user.id)
    .neq("status", "pending")
    .order("created_at", { ascending: false });

  return (
    <main className="min-h-screen bg-gradient-navy pt-24 pb-16">
      <div className="container-shop max-w-3xl">

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">
            Mes commandes
          </h1>
          <p className="text-muted-foreground mt-1">
            {orders?.length ?? 0} commande{(orders?.length ?? 0) !== 1 ? "s" : ""}
          </p>
        </div>

        {!orders || orders.length === 0 ? (
          <div className="text-center py-20 space-y-4">
            <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mx-auto">
              <Package size={28} className="text-muted-foreground" />
            </div>
            <div>
              <p className="text-foreground font-semibold">Aucune commande</p>
              <p className="text-muted-foreground text-sm mt-1">
                Vos commandes apparaitront ici apres paiement.
              </p>
            </div>
            <Link
              href="/shop"
              className="inline-flex items-center gap-1 text-sm text-primary hover:text-gold-400 transition-colors"
            >
              Decouvrir la boutique
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

              return (
                <div key={order.id} className="card-premium p-6">
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">{date}</p>
                      <p className="text-sm font-mono text-foreground/60">
                        #{order.id.slice(0, 8).toUpperCase()}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${status.color}`}>
                        {status.label}
                      </span>
                      <span className="text-primary font-bold">
                        {formatPrice(order.total)}
                      </span>
                    </div>
                  </div>

                  {/* Articles */}
                  <div className="space-y-1 mb-4">
                    {order.items?.slice(0, 3).map((item: {
                      id: string;
                      title: string;
                      quantity: number;
                      unit_price: number;
                    }) => (
                      <p key={item.id} className="text-sm text-muted-foreground">
                        {item.title} x{item.quantity} — {formatPrice(item.unit_price * item.quantity)}
                      </p>
                    ))}
                    {(order.items?.length ?? 0) > 3 && (
                      <p className="text-xs text-muted-foreground">
                        +{order.items.length - 3} autre{order.items.length - 3 > 1 ? "s" : ""} article{order.items.length - 3 > 1 ? "s" : ""}
                      </p>
                    )}
                  </div>

                  {/* Adresse livraison */}
                  {order.shipping_address?.city && (
                    <p className="text-xs text-muted-foreground border-t border-border pt-3">
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