import Link from "next/link";
import { ProductCard } from "@/components/shop/ProductCard";
import type { Product } from "@/types/database";

interface FeaturedProductsProps {
  products: Product[];
}

export function FeaturedProducts({ products }: FeaturedProductsProps) {
  return (
    <section className="py-20 bg-background">
      <div className="container-shop">

        {/* Header section */}
        <div className="flex items-end justify-between mb-10">
          <div>
            <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-2">
              Collection officielle
            </p>
            <h2 className="text-3xl font-bold text-foreground">
              Portez les couleurs Fly Horizons
            </h2>
            <p className="text-muted-foreground text-sm mt-2 max-w-md">
              Produits dérivés et accessoires aviation, pour les passionnés du ciel.
            </p>
          </div>
          <Link
            href="/shop"
            className="hidden sm:inline-flex text-sm text-primary hover:text-gold-400 font-medium transition-colors"
          >
            Voir tout
          </Link>
        </div>

        {/* Grille produits */}
        {products.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <div className="text-center py-16 text-muted-foreground">
            <p className="text-lg mb-2">Aucun produit mis en avant pour le moment.</p>
            <p className="text-sm">Revenez bientot.</p>
          </div>
        )}

        {/* CTA mobile */}
        <div className="sm:hidden text-center mt-8">
          <Link
            href="/shop"
            className="text-sm text-primary hover:text-gold-400 font-medium transition-colors"
          >
            Voir tous les produits
          </Link>
        </div>

      </div>
    </section>
  );
}
