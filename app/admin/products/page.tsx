import { createAdminClient } from "@/lib/supabase/admin";
import Link from "next/link";
import { Plus, Pencil, Eye, EyeOff } from "lucide-react";
import { formatPrice } from "@/lib/utils";
import { ToggleProductActive } from "@/components/admin/ToggleProductActive";

export const metadata = { title: "Produits — Admin" };

export default async function AdminProductsPage() {
  const adminSupabase = createAdminClient();

  const { data: products } = await adminSupabase
    .from("products")
    .select("*, images:product_images(*)")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Produits</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {products?.length ?? 0} produit{(products?.length ?? 0) !== 1 ? "s" : ""}
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

      {!products || products.length === 0 ? (
        <div className="card-premium p-12 text-center">
          <p className="text-muted-foreground mb-4">Aucun produit pour le moment.</p>
          <Link
            href="/admin/products/new"
            className="inline-flex items-center gap-2 bg-primary text-primary-foreground hover:bg-gold-400 transition-colors px-4 py-2 rounded-md text-sm font-semibold"
          >
            <Plus size={16} />
            Creer le premier produit
          </Link>
        </div>
      ) : (
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
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden md:table-cell">
                  Stock
                </th>
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
                      <div className="w-10 h-10 rounded-md bg-navy-800 overflow-hidden shrink-0 border border-border">
                        {product.images?.[0]?.url ? (
                          <img
                            src={product.images[0].url}
                            alt={product.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
                            -
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
      )}
    </div>
  );
}