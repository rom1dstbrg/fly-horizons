import Link from "next/link";
import Image from "next/image";
import { formatPrice } from "@/lib/utils";
import type { Product } from "@/types/database";

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const mainImage = product.images?.[0]?.url ?? null;
  const isOutOfStock = product.stock === 0;

  return (
    <Link href={`/product/${product.slug}`} className="group block">
      <div className="card-premium overflow-hidden transition-all duration-300 hover:border-primary/40 hover:shadow-premium-lg hover:-translate-y-1">

        {/* Image */}
        <div className="relative aspect-square bg-navy-800 overflow-hidden">
          {mainImage ? (
            <Image
              src={mainImage}
              alt={product.title}
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-105"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-muted-foreground text-sm">Aucune image</span>
            </div>
          )}

          {/* Badge stock */}
          {isOutOfStock && (
            <div className="absolute inset-0 bg-navy-950/70 flex items-center justify-center">
              <span className="bg-navy-800 text-muted-foreground text-xs font-medium px-3 py-1 rounded-full border border-border">
                Rupture de stock
              </span>
            </div>
          )}

          {/* Badge featured */}
          {product.featured && !isOutOfStock && (
            <div className="absolute top-2 left-2">
              <span className="bg-primary text-primary-foreground text-xs font-semibold px-2 py-0.5 rounded-full">
                Populaire
              </span>
            </div>
          )}
        </div>

        {/* Infos */}
        <div className="p-4 space-y-2">
          <h3 className="font-semibold text-foreground text-sm leading-snug group-hover:text-primary transition-colors line-clamp-2">
            {product.title}
          </h3>

          {product.short_description && (
            <p className="text-muted-foreground text-xs leading-relaxed line-clamp-2">
              {product.short_description}
            </p>
          )}

          <div className="flex items-center justify-between pt-1">
            <span className="text-primary font-bold text-base">
              {formatPrice(product.price)}
            </span>

            {product.tags.length > 0 && (
              <span className="text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">
                {product.tags[0]}
              </span>
            )}
          </div>
        </div>

      </div>
    </Link>
  );
}
