import Link from "next/link";
import { ProductCard } from "@/components/shop/ProductCard";
import type { Product } from "@/types/database";

interface FeaturedProductsProps {
  products: Product[];
}

export function FeaturedProducts({ products }: FeaturedProductsProps) {
  return (
    <section className="py-20 bg-[#f5f5f7]">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 xl:px-10">

        <div className="flex items-end justify-between mb-10">
          <div>
            <p className="text-xs font-bold text-[#F2B705] uppercase tracking-[3px] mb-2">
              Nos vols
            </p>
            <h2 className="text-4xl sm:text-5xl font-black text-[#0b2238] leading-none tracking-tight">
              Réservez votre expérience
            </h2>
            <p className="text-[#0b2238]/50 text-sm mt-2 max-w-md">
              Du baptême découverte à l&apos;aventure prolongée, choisissez la durée qui vous convient.
            </p>
          </div>
          <Link
            href="/nos-offres"
            className="hidden sm:inline-flex text-sm text-[#F2B705] hover:text-[#e6a800] font-medium transition-colors"
          >
            Voir tout
          </Link>
        </div>

        {products.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <div className="text-center py-16 text-[#0b2238]/50">
            <p className="text-lg mb-2">Aucun vol disponible pour le moment.</p>
            <p className="text-sm">Revenez bientôt.</p>
          </div>
        )}

        <div className="sm:hidden text-center mt-8">
          <Link
            href="/nos-offres"
            className="text-sm text-[#F2B705] hover:text-[#e6a800] font-medium transition-colors"
          >
            Voir toutes les offres
          </Link>
        </div>

      </div>
    </section>
  );
}
