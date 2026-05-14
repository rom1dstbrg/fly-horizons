import { createAdminClient } from "@/lib/supabase/admin";
import { formatPrice } from "@/lib/utils";
import { OrderStatusSelect } from "@/components/admin/OrderStatusSelect";
import { DeleteOrderButton } from "@/components/admin/DeleteOrderButton";

export const metadata = { title: "Commandes — Admin" };

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending:    { label: "En attente",  color: "text-yellow-500 bg-yellow-500/10 border-yellow-500/20" },
  paid:       { label: "Payee",       color: "text-blue-400 bg-blue-400/10 border-blue-400/20" },
  processing: { label: "En cours",    color: "text-blue-400 bg-blue-400/10 border-blue-400/20" },
  shipped:    { label: "Expediee",    color: "text-purple-400 bg-purple-400/10 border-purple-400/20" },
  delivered:  { label: "Livree",      color: "text-green-500 bg-green-500/10 border-green-500/20" },
  cancelled:  { label: "Annulee",     color: "text-destructive bg-destructive/10 border-destructive/20" },
  refunded:   { label: "Remboursee",  color: "text-muted-foreground bg-muted/10 border-border" },
};

export default async function AdminOrdersPage() {
  const adminSupabase = createAdminClient();

  const { data: orders } = await adminSupabase
    .from("orders")
    .select("*, items:order_items(id, title, quantity, unit_price)")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Commandes</h1>
        <p className="text-muted-foreground text-sm mt-1">
          {orders?.length ?? 0} commande{(orders?.length ?? 0) !== 1 ? "s" : ""}
        </p>
      </div>

      {!orders || orders.length === 0 ? (
        <div className="card-premium p-12 text-center">
          <p className="text-muted-foreground">Aucune commande pour le moment.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => {
            const date = new Date(order.created_at).toLocaleDateString("fr-BE", {
              day: "numeric", month: "long", year: "numeric",
              hour: "2-digit", minute: "2-digit",
            });
            const address = order.shipping_address;

            return (
              <div key={order.id} className="card-premium p-6">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-4">
                  <div>
                    <p className="font-mono text-sm text-foreground/70 mb-1">
                      #{order.id.slice(0, 8).toUpperCase()}
                    </p>
                    <p className="text-xs text-muted-foreground">{date}</p>
                    {order.coupon_code && (
                      <p className="text-xs text-primary mt-1">Coupon : {order.coupon_code}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-3 flex-wrap">
                    <OrderStatusSelect orderId={order.id} currentStatus={order.status} />
                    <span className="text-primary font-bold text-lg">
                      {formatPrice(order.total)}
                    </span>
                    <DeleteOrderButton orderId={order.id} />
                  </div>
                </div>

                <div className="space-y-1 mb-4 pb-4 border-b border-border">
                  {order.items?.map((item: { id: string; title: string; quantity: number; unit_price: number }) => (
                    <div key={item.id} className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{item.title} x{item.quantity}</span>
                      <span className="text-foreground">{formatPrice(item.unit_price * item.quantity)}</span>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-4 text-sm">
                  <div>
                    <p className="text-muted-foreground text-xs">Sous-total</p>
                    <p className="text-foreground font-medium">{formatPrice(order.subtotal)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Livraison</p>
                    <p className="text-foreground font-medium">{formatPrice(order.shipping_cost)}</p>
                  </div>
                  {order.discount_amount > 0 && (
                    <div>
                      <p className="text-muted-foreground text-xs">Remise</p>
                      <p className="text-green-500 font-medium">-{formatPrice(order.discount_amount)}</p>
                    </div>
                  )}
                </div>

                {address?.city ? (
                  <div className="text-xs text-muted-foreground bg-secondary/50 rounded-md px-3 py-2">
                    <span className="font-medium text-foreground/70">Adresse : </span>
                    {address.full_name && `${address.full_name}, `}
                    {address.line1}{address.line2 ? `, ${address.line2}` : ""},{" "}
                    {address.postal_code} {address.city}, {address.country}
                  </div>
                ) : (
                  <div className="text-xs text-muted-foreground bg-secondary/50 rounded-md px-3 py-2">
                    Adresse non renseignee
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}