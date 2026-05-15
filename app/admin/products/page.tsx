import { createAdminClient } from "@/lib/supabase/admin";
import Link from "next/link";
import { Plus, Pencil, Ticket } from "lucide-react";
import { formatPrice } from "@/lib/utils";
import { formatDuration } from "@/lib/vouchers";
import { ToggleProductActive } from "@/components/admin/ToggleProductActive";

export const metadata = { title: "Produits — Admin" };

function ProductTable({ products, showStock = true }: {
  products: { id: string; title: string; slug: string; price: number; stock: number; active: boolean; product_type?: string; voucher_duration_minutes?: number | null; images?: { url: string }[] }[];
  showStock?: boolean;
}) {
  return (
    <div className="card-premium overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Produit
            </th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden sm:table-cell">
              Prix
            </th>
            {showStock ? (
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden md:table-cell">
                Stock
              </th>
            ) : (
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden md:table-cell">
                Durée
              </th>
            )}
            <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden lg:table-cell">
              Statut
            </th>
            <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          {products.map((product) => (
            <tr key={product.id} className="border-b border-border last:border-0 hover:bg-secondary/30 transition-colors">
              <td className="px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-md bg-muted overflow-hidden shrink-0 border border-border">
                    {product.images?.[0]?.url ? (
                      <img
                        src={product.images[0].url}
                        alt={product.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
                        —
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground line-clamp-1">
                      {product.title}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {product.slug}
                    </p>
                  </div>
                </div>
              </td>
              <td className="px-4 py-3 hidden sm:table-cell">
                <span className="text-sm font-semibold text-primary">
                  {formatPrice(product.price)}
                </span>
              </td>
              {showStock ? (
                <td className="px-4 py-3 hidden md:table-cell">
                  <span className={`text-sm font-medium ${
                    product.stock === 0
                      ? "text-destructive"
                      : product.stock <= 5
                      ? "text-yellow-500"
                      : "text-foreground"
                  }`}>
                    {product.stock}
                  </span>
                </td>
              ) : (
                <td className="px-4 py-3 hidden md:table-cell">
                  <span className="text-sm text-foreground">
                    {formatDuration(product.voucher_duration_minutes ?? 60)}
                  </span>
                </td>
              )}
              <td className="px-4 py-3 hidden lg:table-cell">
                <ToggleProductActive
                  productId={product.id}
                  active={product.active}
                />
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

export default async function AdminProductsPage() {
  const adminSupabase = createAdminClient();

  const { data: allProducts } = await adminSupabase
    .from("products")
    .select("*, images:product_images(*)")
    .order("created_at", { ascending: false });

  const physicalProducts = (allProducts ?? []).filter(
    (p) => p.product_type !== "voucher" && !p.voucher_duration_minutes
  );
  const voucherProducts = (allProducts ?? []).filter(
    (p) => p.product_type === "voucher" || (p.voucher_duration_minutes != null && p.voucher_duration_minutes > 0)
  );

  return (
    <div className="space-y-8">

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Produits</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {physicalProducts.length} accessoire{physicalProducts.length !== 1 ? "s" : ""} · {voucherProducts.length} service{voucherProducts.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Link
          href="/admin/products/new"
          className="inline-flex items-center gap-2 bg-primary text-primary-foreground hover:bg-gold-400 transition-colors px-4 py-2 rounded-md text-sm font-semibold"
        >
          <Plus size={16} />
          Nouveau produit
        </Link>
      </div>

      {/* Services / Vols */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Ticket size={16} className="text-primary" />
          <h2 className="text-base font-semibold text-foreground">
            Services / Vols
          </h2>
          <span className="text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">
            {voucherProducts.length}
          </span>
        </div>

        {voucherProducts.length === 0 ? (
          <div className="card-premium p-8 text-center">
            <p className="text-muted-foreground text-sm">Aucun service créé.</p>
            <Link
              href="/admin/products/new"
              className="inline-flex items-center gap-1.5 text-xs text-primary hover:text-gold-400 transition-colors mt-3"
            >
              <Plus size={13} />
              Créer un service
            </Link>
          </div>
        ) : (
          <ProductTable products={voucherProducts} showStock={false} />
        )}
      </div>

      {/* Accessoires physiques */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-semibold text-foreground">
            Accessoires
          </h2>
          <span className="text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">
            {physicalProducts.length}
          </span>
        </div>

        {physicalProducts.length === 0 ? (
          <div className="card-premium p-8 text-center">
            <p className="text-muted-foreground text-sm">Aucun accessoire créé.</p>
            <Link
              href="/admin/products/new"
              className="inline-flex items-center gap-1.5 text-xs text-primary hover:text-gold-400 transition-colors mt-3"
            >
              <Plus size={13} />
              Créer un accessoire
            </Link>
          </div>
        ) : (
          <ProductTable products={physicalProducts} showStock={true} />
        )}
      </div>

    </div>
  );
}
