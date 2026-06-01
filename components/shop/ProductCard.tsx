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
  const href = `/vols/${product.slug}`;

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
      <div className="bg-white rounded-2xl border border-[#e8ecf0] overflow-hidden transition-all duration-300 hover:border-[#F2B705]/40 hover:shadow-md flex flex-col w-full">

        {/* Image */}
        <div className="relative aspect-square max-xs:aspect-[4/3] bg-[#f5f5f7] overflow-hidden shrink-0">
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
              <span className="text-[#0b2238]/30 text-sm">Aucune image</span>
            </div>
          )}

          {isOutOfStock && (
            <div className="absolute inset-0 bg-[#0b2238]/60 flex items-center justify-center">
              <span className="bg-white text-[#0b2238]/50 text-xs font-medium px-3 py-1 rounded-full border border-[#e8ecf0]">
                Rupture de stock
              </span>
            </div>
          )}

          {product.featured && !isOutOfStock && !isVoucher && (
            <div className="absolute top-2 left-2">
              <span className="bg-[#F2B705] text-[#0b2238] text-xs font-black px-2 py-0.5 rounded-full">
                Populaire
              </span>
            </div>
          )}

          {isVoucher && (
            <div className="absolute top-2 left-2">
              <span className="bg-[#F2B705]/90 text-[#0b2238] text-xs font-black px-2 py-0.5 rounded-full">
                Voucher
              </span>
            </div>
          )}

          {/* Quick add button */}
          {!isOutOfStock && (
            <button
              onClick={handleQuickAdd}
              className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-all duration-200 bg-[#F2B705] hover:bg-[#e6a800] text-[#0b2238] rounded-full w-9 h-9 flex items-center justify-center shadow-lg translate-y-1 group-hover:translate-y-0"
              title={isVoucher ? "Acheter" : "Ajouter au panier"}
            >
              {added ? <Check size={15} /> : <Plus size={15} />}
            </button>
          )}
        </div>

        {/* Infos */}
        <div className="p-4 max-xs:p-3 flex flex-col flex-1">
          <h3 className="font-semibold text-[#0b2238] text-sm leading-snug group-hover:text-[#F2B705] transition-colors line-clamp-2 mb-2">
            {product.title}
          </h3>

          <p className={`text-[#0b2238]/50 text-xs leading-relaxed ${isVoucher ? "line-clamp-2 max-xs:line-clamp-1 min-h-[3.75rem] max-xs:min-h-0" : "line-clamp-2 max-xs:line-clamp-1 min-h-[2.5rem] max-xs:min-h-0"}`}>
            {product.short_description ?? ""}
          </p>

          <div className="flex items-center justify-between mt-auto pt-3">
            <span className="text-[#F2B705] font-bold text-base">
              {formatPrice(product.price)}
            </span>

            {isVoucher ? (
              <span className="text-xs text-[#F2B705]/70 font-medium">
                {formatDuration(product.voucher_duration_minutes ?? 60)}
              </span>
            ) : product.tags.length > 0 ? (
              <span className="text-xs text-[#0b2238]/40 bg-[#f5f5f7] px-2 py-0.5 rounded-full border border-[#e8ecf0]">
                {product.tags[0]}
              </span>
            ) : null}
          </div>
        </div>

      </div>
    </Link>
  );
}
