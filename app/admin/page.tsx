import { createAdminClient } from "@/lib/supabase/admin";
import Link from "next/link";
import {
  ShoppingBag, Package, Users, TrendingUp,
  AlertTriangle, Plus, Settings, Tag, ArrowRight,
} from "lucide-react";
import { formatPrice } from "@/lib/utils";

export const metadata = { title: "Dashboard — Admin" };

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending:    { label: "En attente",  color: "text-yellow-600 bg-yellow-50 border-yellow-200" },
  paid:       { label: "Payée",       color: "text-blue-600 bg-blue-50 border-blue-200" },
  processing: { label: "En cours",    color: "text-blue-600 bg-blue-50 border-blue-200" },
  shipped:    { label: "Expédiée",    color: "text-purple-600 bg-purple-50 border-purple-200" },
  delivered:  { label: "Livrée",      color: "text-green-600 bg-green-50 border-green-200" },
  cancelled:  { label: "Annulée",     color: "text-red-600 bg-red-50 border-red-200" },
  refunded:   { label: "Remboursée",  color: "text-muted-foreground bg-muted border-border" },
};

export default async function AdminDashboardPage() {
  const supabase = createAdminClient();

  const [
    { data: orders },
    { data: products },
    { count: customerCount },
  ] = await Promise.all([
    supabase.from("orders").select("id, total, status, created_at, shipping_address").order("created_at", { ascending: false }),
    supabase.from("products").select("id, title, stock, active, price, product_type, voucher_duration_minutes").order("stock", { ascending: true }),
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "customer"),
  ]);

  const totalRevenue = orders
    ?.filter(o => o.status !== "cancelled" && o.status !== "refunded")
    .reduce((sum, o) => sum + (o.total ?? 0), 0) ?? 0;

  const pendingOrders = orders?.filter(o => o.status === "pending" || o.status === "paid").length ?? 0;
  const activeProducts = products?.filter(p => p.active).length ?? 0;
  const lowStockProducts = products?.filter(p =>
    p.stock <= 5 && p.product_type !== "voucher" && !p.voucher_duration_minutes
  ) ?? [];
  const recentOrders = orders?.slice(0, 6) ?? [];

  return (
    <div className="space-y-8">

      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">Vue d'ensemble de votre boutique</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card-premium p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Chiffre d'affaires</span>
            <TrendingUp size={16} className="text-primary" />
          </div>
          <p className="text-2xl font-bold text-foreground">{formatPrice(totalRevenue)}</p>
          <p className="text-xs text-muted-foreground mt-1">hors annulées / remboursées</p>
        </div>

        <div className="card-premium p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Commandes</span>
            <ShoppingBag size={16} className="text-primary" />
          </div>
          <p className="text-2xl font-bold text-foreground">{orders?.length ?? 0}</p>
          {pendingOrders > 0 && (
            <p className="text-xs text-yellow-600 mt-1 font-medium">{pendingOrders} en attente</p>
          )}
        </div>

        <div className="card-premium p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Produits actifs</span>
            <Package size={16} className="text-primary" />
          </div>
          <p className="text-2xl font-bold text-foreground">{activeProducts}</p>
          <p className="text-xs text-muted-foreground mt-1">sur {products?.length ?? 0} au total</p>
        </div>

        <div className="card-premium p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Clients</span>
            <Users size={16} className="text-primary" />
          </div>
          <p className="text-2xl font-bold text-foreground">{customerCount ?? 0}</p>
          <p className="text-xs text-muted-foreground mt-1">comptes inscrits</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">

        {/* Commandes récentes */}
        <div className="lg:col-span-2 card-premium overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <h2 className="font-semibold text-foreground text-sm">Commandes récentes</h2>
            <Link href="/admin/orders" className="text-xs text-primary hover:text-gold-400 flex items-center gap-1 transition-colors">
              Voir tout <ArrowRight size={12} />
            </Link>
          </div>

          {recentOrders.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-sm">Aucune commande pour le moment.</div>
          ) : (
            <div className="divide-y divide-border">
              {recentOrders.map((order) => {
                const status = STATUS_LABELS[order.status] ?? { label: order.status, color: "text-muted-foreground bg-muted border-border" };
                const date = new Date(order.created_at).toLocaleDateString("fr-BE", { day: "numeric", month: "short" });
                const name = order.shipping_address?.full_name ?? "—";
                return (
                  <div key={order.id} className="flex items-center justify-between px-5 py-3 hover:bg-secondary/30 transition-colors">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{name}</p>
                      <p className="text-xs text-muted-foreground font-mono">#{order.id.slice(0, 8).toUpperCase()} · {date}</p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0 ml-4">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${status.color}`}>
                        {status.label}
                      </span>
                      <span className="text-sm font-bold text-primary">{formatPrice(order.total)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Colonne droite */}
        <div className="space-y-6">

          {/* Alertes stock */}
          <div className="card-premium overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h2 className="font-semibold text-foreground text-sm flex items-center gap-2">
                {lowStockProducts.length > 0 && <AlertTriangle size={14} className="text-yellow-500" />}
                Stock faible
              </h2>
              <Link href="/admin/products" className="text-xs text-primary hover:text-gold-400 flex items-center gap-1 transition-colors">
                Gérer <ArrowRight size={12} />
              </Link>
            </div>

            {lowStockProducts.length === 0 ? (
              <div className="px-5 py-6 text-center text-sm text-muted-foreground">Tous les stocks sont OK.</div>
            ) : (
              <div className="divide-y divide-border">
                {lowStockProducts.slice(0, 6).map((p) => (
                  <div key={p.id} className="flex items-center justify-between px-5 py-3">
                    <p className="text-sm text-foreground truncate">{p.title}</p>
                    <span className={`text-sm font-bold ml-4 shrink-0 ${p.stock === 0 ? "text-destructive" : "text-yellow-500"}`}>
                      {p.stock === 0 ? "Épuisé" : `${p.stock} restant${p.stock > 1 ? "s" : ""}`}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Raccourcis */}
          <div className="card-premium overflow-hidden">
            <div className="px-5 py-4 border-b border-border">
              <h2 className="font-semibold text-foreground text-sm">Actions rapides</h2>
            </div>
            <div className="divide-y divide-border">
              {[
                { href: "/admin/products/new", icon: Plus,     label: "Nouveau produit" },
                { href: "/admin/orders",       icon: ShoppingBag, label: "Voir les commandes" },
                { href: "/admin/coupons",      icon: Tag,      label: "Gérer les coupons" },
                { href: "/admin/settings",     icon: Settings, label: "Paramètres" },
              ].map(({ href, icon: Icon, label }) => (
                <Link
                  key={href}
                  href={href}
                  className="flex items-center gap-3 px-5 py-3 hover:bg-secondary/30 transition-colors text-sm text-foreground hover:text-primary"
                >
                  <Icon size={15} className="text-muted-foreground" />
                  {label}
                </Link>
              ))}
            </div>
          </div>

        </div>
      </div>

    </div>
  );
}
