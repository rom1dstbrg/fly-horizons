"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ShoppingBag, ChevronLeft, Package, Mail, Ticket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProductCard } from "@/components/shop/ProductCard";
import { useCartStore } from "@/store/cart";
import { formatPrice } from "@/lib/utils";
import { formatDuration } from "@/lib/vouchers";
import type { Product } from "@/types/database";

interface ProductDetailProps {
  product: Product;
  relatedProducts?: Product[];
  backHref?: string;
  backLabel?: string;
}

export function ProductDetail({ product, relatedProducts = [], backHref, backLabel }: ProductDetailProps) {
  const [activeImage, setActiveImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const addItem = useCartStore((s) => s.addItem);

  const images = product.images ?? [];
  const mainImage = images[activeImage]?.url ?? null;
  const isVoucher = product.product_type === "voucher" ||
    (product.voucher_duration_minutes != null && product.voucher_duration_minutes > 0);
  const isOutOfStock = !isVoucher && product.stock === 0;

  function handleAddToCart() {
    if (isOutOfStock) return;
    addItem({
      id: product.id,
      title: product.title,
      price: product.price,
      quantity,
      image_url: images[0]?.url ?? null,
      slug: product.slug,
      product_type: isVoucher ? "voucher" : "physical",
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
            href={backHref ?? "/shop"}
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors"
          >
            <ChevronLeft size={16} />
            {backLabel ?? "Retour a la boutique"}
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">

          {/* Images */}
          <div className="space-y-4">
            <div className="relative aspect-square rounded-lg overflow-hidden border border-border">
              {mainImage ? (
                <Image
                  src={mainImage}
                  alt={product.title}
                  fill
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  priority
                />
              ) : isVoucher ? (
                /* Fallback visuel pour voucher sans image */
                <div className="absolute inset-0 bg-gradient-to-br from-[#0b2238] to-[#0e2d4a] flex flex-col items-center justify-center gap-6 p-10">
                  <div className="inline-flex items-center gap-1.5 bg-[#F2B705]/10 border border-[#F2B705]/30 rounded-full px-4 py-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#F2B705]" />
                    <span className="text-[#F2B705] text-xs font-semibold tracking-wider uppercase">Voucher</span>
                  </div>
                  <div className="text-center">
                    <p className="text-white text-6xl font-black leading-none">
                      {formatDuration(product.voucher_duration_minutes ?? 60)}
                    </p>
                    <p className="text-white/50 text-sm mt-3">de vol avec Fly Horizons</p>
                  </div>
                  <Ticket size={40} className="text-[#F2B705]/30" />
                </div>
              ) : (
                <div className="absolute inset-0 bg-muted flex items-center justify-center text-muted-foreground">
                  <Package size={48} />
                </div>
              )}

              {isOutOfStock && (
                <div className="absolute inset-0 bg-foreground/60 flex items-center justify-center">
                  <span className="bg-card text-muted-foreground text-sm font-medium px-4 py-2 rounded-full border border-border">
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

            {/* Badge voucher */}
            {isVoucher && (
              <div className="inline-flex items-center gap-1.5 bg-[#F2B705]/10 border border-[#F2B705]/30 rounded-full px-3 py-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#F2B705]" />
                <span className="text-[#F2B705] text-xs font-semibold tracking-wider uppercase">
                  Voucher — {formatDuration(product.voucher_duration_minutes ?? 60)}
                </span>
              </div>
            )}

            {/* Tags (produits physiques) */}
            {!isVoucher && product.tags.length > 0 && (
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

            {/* Disponibilité */}
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${isOutOfStock ? "bg-destructive" : "bg-green-500"}`} />
              <span className="text-sm text-muted-foreground">
                {isVoucher
                  ? "Disponible — livraison par email"
                  : isOutOfStock
                  ? "Rupture de stock"
                  : "En stock"}
              </span>
            </div>

            {/* Quantite + ajout panier */}
            {!isOutOfStock && (
              <div className="space-y-4">
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

                <Button
                  onClick={handleAddToCart}
                  size="lg"
                  className="w-full bg-primary text-primary-foreground hover:bg-gold-400 font-semibold shadow-gold"
                >
                  {isVoucher ? (
                    <>
                      <Ticket size={18} className="mr-2" />
                      {added ? "Ajoute au panier !" : "Acheter ce voucher"}
                    </>
                  ) : (
                    <>
                      <ShoppingBag size={18} className="mr-2" />
                      {added ? "Ajoute au panier !" : "Ajouter au panier"}
                    </>
                  )}
                </Button>
              </div>
            )}

            {/* Infos livraison */}
            <div className="border-t border-border pt-6 space-y-2">
              {isVoucher ? (
                <>
                  <div className="flex items-start gap-2">
                    <Mail size={14} className="text-primary mt-0.5 shrink-0" />
                    <p className="text-xs text-muted-foreground">
                      Votre code vous est envoyé par email immédiatement après le paiement.
                    </p>
                  </div>
                  <div className="flex items-start gap-2">
                    <Ticket size={14} className="text-primary mt-0.5 shrink-0" />
                    <p className="text-xs text-muted-foreground">
                      Entrez votre code à l&apos;étape « Détails » sur fly-horizons.com/reservation pour réserver votre vol.
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-xs text-muted-foreground">
                    Livraison disponible en Belgique, France, Pays-Bas et Allemagne.
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Paiement securise via Stripe.
                  </p>
                </>
              )}
            </div>

          </div>
        </div>

        {/* Produits suggérés */}
        {relatedProducts.length > 0 && (
          <section className="mt-20 pt-12 border-t border-border">
            <div className="flex items-end justify-between mb-8">
              <div>
                <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-2">
                  {isVoucher ? "Autres durées disponibles" : "Vous aimerez aussi"}
                </p>
                <h2 className="text-2xl font-bold text-foreground">
                  {isVoucher ? "Autres vouchers" : "Autres produits"}
                </h2>
              </div>
              <Link
                href={isVoucher ? "/nos-offres" : "/shop"}
                className="hidden sm:inline-flex text-sm text-primary hover:text-[#e6a800] font-medium transition-colors"
              >
                Voir tout
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {relatedProducts.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </section>
        )}

      </div>
    </main>
  );
}
