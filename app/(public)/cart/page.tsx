"use client";

import Link from "next/link";
import Image from "next/image";
import { Trash2, ShoppingBag, ChevronLeft, Package, Lock, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCartStore } from "@/store/cart";
import { formatPrice } from "@/lib/utils";

export default function CartPage() {
  const { items, removeItem, updateQuantity, totalPrice } = useCartStore();
  const total = totalPrice();
  const isVoucherOnly = items.length > 0 && items.every((i) => i.product_type === "voucher");

  if (items.length === 0) {
    return (
      <main className="min-h-screen bg-gradient-navy pt-24 pb-16">
        <div className="container-shop max-w-2xl">
          <div className="text-center py-20 space-y-6">
            <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mx-auto">
              <ShoppingBag size={28} className="text-muted-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground mb-2">
                Votre panier est vide
              </h1>
              <p className="text-muted-foreground">
                Decouvrez nos produits et ajoutez-en a votre panier.
              </p>
            </div>
            <Button asChild className="bg-primary text-primary-foreground hover:bg-gold-400 font-semibold">
              <Link href="/nos-offres">
                <ShoppingBag size={16} className="mr-2" />
                Voir la boutique
              </Link>
            </Button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-navy pt-24 pb-16">
      <div className="container-shop">

        {/* Header */}
        <div className="mb-8">
          <Link
            href="/nos-offres"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors mb-4"
          >
            <ChevronLeft size={16} />
            Continuer mes achats
          </Link>
          <h1 className="text-3xl font-bold text-foreground">
            Mon panier
          </h1>
          <p className="text-muted-foreground mt-1">
            {items.length} article{items.length !== 1 ? "s" : ""}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Liste articles */}
          <div className="lg:col-span-2 space-y-4">
            {items.map((item) => (
              <div key={item.id} className="card-premium p-4 flex gap-4">

                {/* Image */}
                <div className="relative w-20 h-20 rounded-md overflow-hidden bg-muted shrink-0 border border-border">
                  {item.image_url ? (
                    <Image
                      src={item.image_url}
                      alt={item.title}
                      fill
                      className="object-cover"
                      sizes="80px"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Package size={20} className="text-muted-foreground" />
                    </div>
                  )}
                </div>

                {/* Infos */}
                <div className="flex-1 min-w-0">
                  <Link
                    href={item.product_type === "voucher" ? `/vols/${item.slug}` : `/shop/${item.slug}`}
                    className="font-semibold text-foreground text-sm hover:text-primary transition-colors line-clamp-2"
                  >
                    {item.title}
                  </Link>
                  {item.product_type === "voucher" && (
                    <span className="inline-block text-[10px] font-semibold text-[#F2B705] bg-[#F2B705]/10 border border-[#F2B705]/20 rounded-full px-2 py-0.5 mt-1">
                      Voucher — livraison par email
                    </span>
                  )}
                  <p className="text-primary font-bold mt-1">
                    {formatPrice(item.price)}
                  </p>

                  {/* Quantite + supprimer */}
                  <div className="flex items-center justify-between mt-3">
                    <div className="flex items-center border border-border rounded-md overflow-hidden">
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        className="w-8 h-8 flex items-center justify-center text-foreground hover:bg-secondary transition-colors text-sm"
                      >
                        -
                      </button>
                      <span className="w-8 text-center text-sm font-medium text-foreground">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        className="w-8 h-8 flex items-center justify-center text-foreground hover:bg-secondary transition-colors text-sm"
                      >
                        +
                      </button>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-sm font-semibold text-foreground">
                        {formatPrice(item.price * item.quantity)}
                      </span>
                      <button
                        onClick={() => removeItem(item.id)}
                        className="text-muted-foreground hover:text-destructive transition-colors"
                        aria-label="Supprimer"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                </div>

              </div>
            ))}
          </div>

          {/* Recapitulatif */}
          <div className="lg:col-span-1">
            <div className="card-premium p-6 space-y-4 sticky top-24">
              <h2 className="font-bold text-foreground text-lg">
                Recapitulatif
              </h2>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-muted-foreground">
                  <span>Sous-total</span>
                  <span>{formatPrice(total)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Livraison</span>
                  {isVoucherOnly ? (
                    <span className="text-green-500 font-medium">Gratuite</span>
                  ) : (
                    <span className="text-foreground">Calcule au checkout</span>
                  )}
                </div>
              </div>

              <div className="border-t border-border pt-4 flex justify-between font-bold text-foreground">
                <span>Total</span>
                <span className="text-primary text-lg">{formatPrice(total)}</span>
              </div>

              <Button
                asChild
                size="lg"
                className="w-full bg-primary text-primary-foreground hover:bg-gold-400 font-semibold shadow-gold text-base h-12"
              >
                <Link href="/checkout" className="flex items-center justify-center gap-2">
                  <Lock size={15} />
                  Passer la commande
                </Link>
              </Button>

              <div className="flex items-center justify-center gap-1.5 text-muted-foreground">
                <ShieldCheck size={13} />
                <p className="text-xs">Paiement 100 % sécurisé via Stripe</p>
              </div>
            </div>
          </div>

        </div>
      </div>
    </main>
  );
}
