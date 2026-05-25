"use client";

import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  ShoppingCart, Package, Ticket, Tag, Pencil, Plus,
} from "lucide-react";
import { OrdersClient } from "./OrdersClient";
import { VoucherOrdersClient } from "./VoucherOrdersClient";
import { VouchersClient } from "./VouchersClient";
import { CouponForm } from "./CouponForm";
import { CouponsTableClient } from "./CouponsTableClient";
import { ToggleProductActive } from "./ToggleProductActive";
import { formatPrice } from "@/lib/utils";
import { formatDuration } from "@/lib/vouchers";

type Product = {
  id: string;
  title: string;
  slug: string;
  price: number;
  stock: number;
  active: boolean;
  product_type?: string;
  voucher_duration_minutes?: number | null;
  images?: { url: string }[];
};

const TABS = [
  { key: "commandes", label: "Commandes", icon: ShoppingCart },
  { key: "produits",  label: "Produits",  icon: Package },
  { key: "vouchers",  label: "Vouchers",  icon: Ticket },
  { key: "coupons",   label: "Coupons",   icon: Tag },
];

function ProductTable({ products, showStock }: { products: Product[]; showStock: boolean }) {
  if (products.length === 0) {
    return (
      <div className="bg-card rounded-xl border border-border p-8 text-center">
        <p className="text-muted-foreground text-sm">Aucun produit.</p>
        <Link
          href="/admin/products/new"
          className="inline-flex items-center gap-1.5 text-xs text-primary hover:opacity-80 transition-opacity mt-3"
        >
          <Plus size={13} />
          Créer un produit
        </Link>
      </div>
    );
  }
  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Produit</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden sm:table-cell">Prix</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden md:table-cell">
              {showStock ? "Stock" : "Durée"}
            </th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden lg:table-cell">Statut</th>
            <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Actions</th>
          </tr>
        </thead>
        <tbody>
          {products.map((product) => (
            <tr key={product.id} className="border-b border-border last:border-0 hover:bg-secondary/30 transition-colors">
              <td className="px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-md bg-muted overflow-hidden shrink-0 border border-border">
                    {product.images?.[0]?.url ? (
                      <Image src={product.images[0].url} alt={product.title} width={40} height={40} className="w-full h-full object-cover" unoptimized />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">—</div>
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground line-clamp-1">{product.title}</p>
                    <p className="text-xs text-muted-foreground">{product.slug}</p>
                  </div>
                </div>
              </td>
              <td className="px-4 py-3 hidden sm:table-cell">
                <span className="text-sm font-semibold text-primary">{formatPrice(product.price)}</span>
              </td>
              <td className="px-4 py-3 hidden md:table-cell">
                {showStock ? (
                  <span className={`text-sm font-medium ${product.stock === 0 ? "text-destructive" : product.stock <= 5 ? "text-yellow-500" : "text-foreground"}`}>
                    {product.stock}
                  </span>
                ) : (
                  <span className="text-sm text-foreground">{formatDuration(product.voucher_duration_minutes ?? 60)}</span>
                )}
              </td>
              <td className="px-4 py-3 hidden lg:table-cell">
                <ToggleProductActive productId={product.id} active={product.active} />
              </td>
              <td className="px-4 py-3 text-right">
                <Link
                  href={`/admin/products/${product.id}`}
                  className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors px-2 py-1 rounded hover:bg-secondary"
                >
                  <Pencil size={13} />
                  Modifier
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function BoutiqueHub({
  physicalOrders,
  voucherOrders,
  physicalProducts,
  voucherProducts,
  vouchers,
  clients,
  coupons,
  stats,
  prixHeure60,
}: {
  physicalOrders: unknown[];
  voucherOrders: unknown[];
  physicalProducts: Product[];
  voucherProducts: Product[];
  vouchers: unknown[];
  clients: unknown[];
  coupons: unknown[];
  stats: {
    commandes: number;
    volsAchetes: number;
    produitsActifs: number;
    vouchersDispos: number;
    coupons: number;
  };
  prixHeure60?: number | null;
}) {
  const router = useRouter();
  const tab = useSearchParams().get("tab") ?? "commandes";

  function changeTab(key: string) {
    const url = key === "commandes" ? "/admin/boutique" : `/admin/boutique?tab=${key}`;
    router.replace(url, { scroll: false });
  }

  return (
    <div className="space-y-5">
      {/* Stats bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Commandes",       value: stats.commandes,       color: "text-blue-600" },
          { label: "Produits actifs", value: stats.produitsActifs,  color: "text-green-600" },
          { label: "Vouchers dispos", value: stats.vouchersDispos,  color: "text-emerald-600" },
          { label: "Coupons",         value: stats.coupons,         color: "text-purple-600" },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-card rounded-xl border border-border p-4 text-center">
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Tab bar */}
      <div className="flex items-center gap-1 bg-secondary/50 p-1 rounded-xl border border-border w-fit overflow-x-auto">
        {TABS.map(t => {
          const Icon = t.icon;
          const isActive = tab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => changeTab(t.key)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                isActive
                  ? "bg-card text-foreground shadow-sm border border-border"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon size={14} className={isActive ? "text-navy" : ""} />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <div>
        {tab === "commandes" && (
          physicalOrders.length === 0 ? (
            <div className="bg-card rounded-xl border border-border p-12 text-center">
              <p className="text-muted-foreground">Aucune commande pour le moment.</p>
            </div>
          ) : (
            <OrdersClient orders={physicalOrders as never} />
          )
        )}

        {tab === "produits" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Ticket size={15} className="text-navy" />
                <h3 className="text-sm font-semibold text-foreground">Services / Vols</h3>
                <span className="text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">{voucherProducts.length}</span>
              </div>
              <Link
                href="/admin/products/new"
                className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors font-medium"
              >
                <Plus size={13} />
                Nouveau produit
              </Link>
            </div>
            <ProductTable products={voucherProducts} showStock={false} />

            <div className="flex items-center gap-2 pt-2">
              <Package size={15} className="text-muted-foreground" />
              <h3 className="text-sm font-semibold text-foreground">Accessoires</h3>
              <span className="text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">{physicalProducts.length}</span>
            </div>
            <ProductTable products={physicalProducts} showStock={true} />
          </div>
        )}

        {tab === "vouchers" && (
          <VouchersClient vouchers={vouchers as never} clients={clients as never} prixHeure60={prixHeure60} />
        )}

        {tab === "coupons" && (
          <div className="space-y-6">
            <div className="bg-card rounded-xl border border-border p-6">
              <h3 className="font-semibold text-foreground mb-4">Nouveau coupon</h3>
              <CouponForm />
            </div>
            {(coupons as unknown[]).length > 0 && (
              <CouponsTableClient coupons={coupons as never} />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
