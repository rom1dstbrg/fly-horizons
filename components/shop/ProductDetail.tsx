"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ShoppingBag, ChevronLeft, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCartStore } from "@/store/cart";
import { formatPrice } from "@/lib/utils";
import type { Product } from "@/types/database";

interface ProductDetailProps {
  product: Product;
}

export function ProductDetail({ product }: ProductDetailProps) {
  const [activeImage, setActiveImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const addItem = useCartStore((s) => s.addItem);

  const images = product.images ?? [];
  const mainImage = images[activeImage]?.url ?? null;
  const isOutOfStock = product.stock === 0;

  function handleAddToCart() {
    if (isOutOfStock) return;
    addItem({
      id: product.id,
      title: product.title,
      price: product.price,
      quantity,
      image_url: images[0]?.url ?? null,
      slug: product.slug,
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  }

  return (
    <main className="min-h-screen bg-gradient-navy pt-24 pb-16">
      <div className="container-shop">

        {/* Breadcrumb */}
        <div className="mb-8">
          <Link
            href="/shop"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors"
          >
            <ChevronLeft size={16} />
            Retour a la boutique
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">

          {/* Images */}
          <div className="space-y-4">
            {/* Image principale */}
            <div className="relative aspect-square bg-navy-800 rounded-lg overflow-hidden border border-border">
              {mainImage ? (
                <Image
                  src={mainImage}
                  alt={product.title}
                  fill
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  priority
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                  <Package size={48} />
                </div>
              )}

              {isOutOfStock && (
                <div className="absolute inset-0 bg-navy-950/70 flex items-center justify-center">
                  <span className="bg-navy-800 text-muted-foreground text-sm font-medium px-4 py-2 rounded-full border border-border">
                    Rupture de stock
                  </span>
                </div>
              )}
            </div>

            {/* Miniatures */}
            {images.length > 1 && (
              <div className="flex gap-3 overflow-x-auto pb-1">
                {images.map((img, i) => (
                  <button
                    key={img.id}
                    onClick={() => setActiveImage(i)}
                    className={`relative w-16 h-16 rounded-md overflow-hidden border-2 shrink-0 transition-colors ${
                      i === activeImage
                        ? "border-primary"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <Image
                      src={img.url}
                      alt={`${product.title} ${i + 1}`}
                      fill
                      className="object-cover"
                      sizes="64px"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Infos produit */}
          <div className="space-y-6">

            {/* Tags */}
            {product.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {product.tags.map((tag) => (
                  <span
                    key={tag}
                    className="text-xs font-medium text-primary bg-primary/10 border border-primary/20 px-2.5 py-1 rounded-full"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}

            {/* Titre */}
            <div>
              <h1 className="text-3xl font-bold text-foreground leading-tight">
                {product.title}
              </h1>
              {product.short_description && (
                <p className="text-muted-foreground mt-3 leading-relaxed">
                  {product.short_description}
                </p>
              )}
            </div>

            {/* Prix */}
            <div className="flex items-baseline gap-3">
              <span className="text-4xl font-bold text-primary">
                {formatPrice(product.price)}
              </span>
            </div>

            {/* Stock */}
            <div className="flex items-center gap-2">
              <span
                className={`w-2 h-2 rounded-full ${
                  isOutOfStock ? "bg-destructive" : "bg-green-500"
                }`}
              />
              <span className="text-sm text-muted-foreground">
                {isOutOfStock ? "Rupture de stock" : "En stock"}
              </span>
            </div>

            {/* Quantite + ajout panier */}
            {!isOutOfStock && (
              <div className="space-y-4">
                {/* Selecteur quantite */}
                <div className="flex items-center gap-4">
                  <span className="text-sm text-muted-foreground">Quantite</span>
                  <div className="flex items-center border border-border rounded-md overflow-hidden">
                    <button
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      className="w-9 h-9 flex items-center justify-center text-foreground hover:bg-secondary transition-colors"
                    >
                      -
                    </button>
                    <span className="w-10 text-center text-sm font-medium text-foreground">
                      {quantity}
                    </span>
                    <button
                      onClick={() => setQuantity(quantity + 1)}
                      className="w-9 h-9 flex items-center justify-center text-foreground hover:bg-secondary transition-colors"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Bouton ajout panier */}
                <Button
                  onClick={handleAddToCart}
                  size="lg"
                  className="w-full bg-primary text-primary-foreground hover:bg-gold-400 font-semibold shadow-gold"
                >
                  <ShoppingBag size={18} className="mr-2" />
                  {added ? "Ajoute au panier !" : "Ajouter au panier"}
                </Button>
              </div>
            )}

            {/* Infos livraison */}
            <div className="border-t border-border pt-6 space-y-2">
              <p className="text-xs text-muted-foreground">
                Livraison disponible en Belgique, France, Pays-Bas et Allemagne.
              </p>
              <p className="text-xs text-muted-foreground">
                Paiement securise via Stripe.
              </p>
            </div>

          </div>
        </div>
      </div>
    </main>
  );
}
