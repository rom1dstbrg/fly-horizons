"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Plus, Check } from "lucide-react";
import { formatPrice } from "@/lib/utils";
import { formatDuration } from "@/lib/vouchers";
import { useCartStore } from "@/store/cart";
import type { Product } from "@/types/database";

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const [added, setAdded] = useState(false);
  const addItem = useCartStore((s) => s.addItem);

  const mainImage = product.images?.[0]?.url ?? null;
  const isVoucher = product.product_type === "voucher" ||
    (product.voucher_duration_minutes != null && product.voucher_duration_minutes > 0);
  const isOutOfStock = !isVoucher && product.stock === 0;
  const href = isVoucher ? `/vols/${product.slug}` : `/product/${product.slug}`;

  function handleQuickAdd(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (isOutOfStock) return;
    addItem({
      id: product.id,
      title: product.title,
      price: product.price,
      quantity: 1,
      image_url: mainImage,
      slug: product.slug,
      product_type: isVoucher ? "voucher" : "physical",
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  }

  return (
    <Link href={href} className="group flex h-full">
      <div className="card-premium overflow-hidden transition-all duration-300 hover:border-primary/40 hover:shadow-premium-lg flex flex-col w-full">

        {/* Image */}
        <div className="relative aspect-square bg-muted overflow-hidden shrink-0">
          {mainImage ? (
            <Image
              src={mainImage}
              alt={product.title}
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-105"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            />
          ) : isVoucher ? (
            <div className="absolute inset-0 bg-gradient-to-br from-[#0b2238] to-[#0e2d4a] flex flex-col items-center justify-center gap-3">
              <p className="text-white text-3xl font-black leading-none">
                {formatDuration(product.voucher_duration_minutes ?? 60)}
              </p>
              <span className="text-[#F2B705] text-xs font-semibold tracking-wider uppercase opacity-70">
                Voucher
              </span>
            </div>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-muted-foreground text-sm">Aucune image</span>
            </div>
          )}

          {isOutOfStock && (
            <div className="absolute inset-0 bg-foreground/60 flex items-center justify-center">
              <span className="bg-card text-muted-foreground text-xs font-medium px-3 py-1 rounded-full border border-border">
                Rupture de stock
              </span>
            </div>
          )}

          {product.featured && !isOutOfStock && !isVoucher && (
            <div className="absolute top-2 left-2">
              <span className="bg-primary text-primary-foreground text-xs font-semibold px-2 py-0.5 rounded-full">
                Populaire
              </span>
            </div>
          )}

          {isVoucher && (
            <div className="absolute top-2 left-2">
              <span className="bg-[#F2B705]/90 text-[#113356] text-xs font-semibold px-2 py-0.5 rounded-full">
                Voucher
              </span>
            </div>
          )}

          {/* Quick add button */}
          {!isOutOfStock && (
            <button
              onClick={handleQuickAdd}
              className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-all duration-200 bg-primary hover:bg-[#e6a800] text-primary-foreground rounded-full w-9 h-9 flex items-center justify-center shadow-lg translate-y-1 group-hover:translate-y-0"
              title={isVoucher ? "Acheter" : "Ajouter au panier"}
            >
              {added
                ? <Check size={15} />
                : <Plus size={15} />}
            </button>
          )}
        </div>

        {/* Infos */}
        <div className="p-4 flex flex-col flex-1">
          <h3 className="font-semibold text-foreground text-sm leading-snug group-hover:text-primary transition-colors line-clamp-2 mb-2">
            {product.title}
          </h3>

          <p className={`text-muted-foreground text-xs leading-relaxed ${isVoucher ? "line-clamp-3 min-h-[3.75rem]" : "line-clamp-2 min-h-[2.5rem]"}`}>
            {product.short_description ?? ""}
          </p>

          <div className="flex items-center justify-between mt-auto pt-3">
            <span className="text-primary font-bold text-base">
              {formatPrice(product.price)}
            </span>

            {isVoucher ? (
              <span className="text-xs text-[#F2B705]/70 font-medium">
                {formatDuration(product.voucher_duration_minutes ?? 60)}
              </span>
            ) : product.tags.length > 0 ? (
              <span className="text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">
                {product.tags[0]}
              </span>
            ) : null}
          </div>
        </div>

      </div>
    </Link>
  );
}
