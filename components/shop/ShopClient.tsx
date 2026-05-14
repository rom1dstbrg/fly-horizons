"use client";

import { useState, useMemo } from "react";
import { ProductCard } from "@/components/shop/ProductCard";
import type { Product } from "@/types/database";

interface ShopClientProps {
  products: Product[];
  tags: string[];
}

type SortOption = "newest" | "price_asc" | "price_desc";

export function ShopClient({ products, tags }: ShopClientProps) {
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [sort, setSort] = useState<SortOption>("newest");

  const filtered = useMemo(() => {
    let list = [...products];

    if (activeTag) {
      list = list.filter((p) => p.tags?.includes(activeTag));
    }

    switch (sort) {
      case "price_asc":
        list.sort((a, b) => a.price - b.price);
        break;
      case "price_desc":
        list.sort((a, b) => b.price - a.price);
        break;
      case "newest":
      default:
        list.sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
    }

    return list;
  }, [products, activeTag, sort]);

  return (
    <div>
      {/* Barre filtres + tri */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center mb-8">

        {/* Tags */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setActiveTag(null)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors border ${
              activeTag === null
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-transparent text-muted-foreground border-border hover:border-primary/50 hover:text-foreground"
            }`}
          >
            Tous
          </button>
          {tags.map((tag) => (
            <button
              key={tag}
              onClick={() => setActiveTag(tag === activeTag ? null : tag)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors border ${
                activeTag === tag
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-transparent text-muted-foreground border-border hover:border-primary/50 hover:text-foreground"
              }`}
            >
              {tag}
            </button>
          ))}
        </div>

        {/* Tri */}
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortOption)}
          className="bg-secondary border border-border text-foreground text-xs rounded-md px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
        >
          <option value="newest">Plus recents</option>
          <option value="price_asc">Prix croissant</option>
          <option value="price_desc">Prix decroissant</option>
        </select>
      </div>

      {/* Grille */}
      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filtered.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      ) : (
        <div className="text-center py-20 text-muted-foreground">
          <p className="text-lg mb-2">Aucun produit dans cette categorie.</p>
          <button
            onClick={() => setActiveTag(null)}
            className="text-sm text-primary hover:text-gold-400 transition-colors"
          >
            Voir tous les produits
          </button>
        </div>
      )}
    </div>
  );
}
