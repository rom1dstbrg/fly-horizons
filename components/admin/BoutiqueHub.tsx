"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  Package, Pencil, Plus,
} from "lucide-react";
import { VouchersClient } from "./VouchersClient";
import { CouponForm } from "./CouponForm";
import { CouponsTableClient } from "./CouponsTableClient";
import { ToggleProductActive } from "./ToggleProductActive";
import { RepublishProductButton } from "./RepublishProductButton";
import { DeleteButton } from "./DeleteButton";
import { StopoversAdmin } from "./StopoversAdmin";
import { deleteProduct } from "@/lib/actions/delete";
import { formatPrice } from "@/lib/utils";
import { formatDuration } from "@/lib/vouchers";

type Product = {
  id: string;
  title: string;
  slug: string;
  price: number;
  active: boolean;
  product_type?: string;
  voucher_duration_minutes?: number | null;
  route_waypoints?: { lat: number; lng: number; nom?: string }[] | null;
  quantity_available?: number | null;
  images?: { url: string }[];
};

function ProductTable({ products, prixHeure60 }: { products: Product[]; prixHeure60?: number | null }) {
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
      <div className="overflow-x-auto">
      <table className="w-full table-fixed">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide w-[30%]">Produit</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden sm:table-cell w-[13%]">Prix</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden md:table-cell w-[13%]">Durée</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden lg:table-cell w-[15%]">Stock</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden lg:table-cell w-[11%]">Statut</th>
            <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide w-[18%]">Actions</th>
          </tr>
        </thead>
        <tbody>
          {products.map((product) => (
            <tr key={product.id} className="border-b border-border last:border-0 hover:bg-secondary transition-colors">
              <td className="px-4 py-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-md bg-muted overflow-hidden shrink-0 border border-border">
                    {product.images?.[0]?.url ? (
                      <Image src={[...(product.images ?? [])].sort((a, b) => ((a as {position?: number}).position ?? 0) - ((b as {position?: number}).position ?? 0))[0].url} alt={product.title} width={40} height={40} className="w-full h-full object-cover" unoptimized />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">—</div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground line-clamp-1">{product.title}</p>
                    <p className="text-xs text-muted-foreground truncate">{product.slug}</p>
                  </div>
                </div>
              </td>
              <td className="px-4 py-3 hidden sm:table-cell">
                <span className="text-sm font-semibold text-primary">{formatPrice(product.price)}</span>
              </td>
              <td className="px-4 py-3 hidden md:table-cell">
                <span className="text-sm text-foreground">{formatDuration(product.voucher_duration_minutes ?? 60)}</span>
              </td>
              <td className="px-4 py-3 hidden lg:table-cell">
                {product.quantity_available == null ? (
                  <span className="text-xs text-muted-foreground">Illimité</span>
                ) : product.quantity_available === 0 ? (
                  <span className="text-xs font-semibold text-destructive">Épuisé</span>
                ) : (
                  <span className="text-xs text-foreground">{product.quantity_available} restante{product.quantity_available > 1 ? "s" : ""}</span>
                )}
              </td>
              <td className="px-4 py-3 hidden lg:table-cell">
                <ToggleProductActive productId={product.id} active={product.active} />
              </td>
              <td className="px-4 py-3 text-right">
                <div className="inline-flex items-center gap-1">
                  {!!product.route_waypoints?.length && product.quantity_available === 0 && (
                    <RepublishProductButton
                      productId={product.id}
                      title={product.title}
                      price={product.price}
                      voucherDurationMinutes={product.voucher_duration_minutes ?? 60}
                      prixHeure={prixHeure60}
                    />
                  )}
                  <Link
                    href={`/admin/products/${product.id}`}
                    className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors px-2 py-1 rounded hover:bg-secondary"
                  >
                    <Pencil size={13} />
                    Modifier
                  </Link>
                  <DeleteButton onDelete={() => deleteProduct(product.id)} label="Supprimer" confirmMessage="Confirmer ?" />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </div>
  );
}

export function BoutiqueHub({
  voucherProducts,
  vouchers,
  clients,
  coupons,
  prixHeure60,
}: {
  voucherProducts: Product[];
  vouchers: unknown[];
  clients: unknown[];
  coupons: unknown[];
  prixHeure60?: number | null;
}) {
  const tab = useSearchParams().get("tab") ?? "produits";

  return (
    <div className="space-y-5">
      {/* Tab content */}
      <div>
        {tab === "vouchers" && (
          <VouchersClient vouchers={vouchers as never} clients={clients as never} prixHeure60={prixHeure60} />
        )}

        {tab === "produits" && (() => {
          const dureeLibre = voucherProducts.filter(p => !p.route_waypoints || p.route_waypoints.length === 0);
          const itineraires = voucherProducts.filter(p => p.route_waypoints && p.route_waypoints.length > 0);
          return (
            <div className="space-y-6">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <Package size={15} className="text-navy" />
                  <h3 className="text-sm font-semibold text-foreground">Les vols</h3>
                  <span className="text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">{voucherProducts.length}</span>
                </div>
                <Link
                  href="/admin/products/new"
                  className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md bg-primary text-primary-foreground hover:brightness-105 transition-all font-medium shrink-0"
                >
                  <Plus size={13} />
                  Nouveau vol
                </Link>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Durée libre</h4>
                  <span className="text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">{dureeLibre.length}</span>
                </div>
                <ProductTable products={dureeLibre} prixHeure60={prixHeure60} />
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Itinéraires &amp; destinations</h4>
                  <span className="text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">{itineraires.length}</span>
                </div>
                <ProductTable products={itineraires} prixHeure60={prixHeure60} />
              </div>

              <StopoversAdmin />
            </div>
          );
        })()}

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
