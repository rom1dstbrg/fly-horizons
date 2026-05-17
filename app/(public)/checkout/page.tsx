"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ChevronLeft, Lock, MapPin, Package, ShieldCheck, Tag, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCartStore } from "@/store/cart";
import { formatPrice } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

interface ShippingRateRow {
  country_code: string;
  country_name: string;
  rate_standard: number;
}

interface SavedAddress {
  id: string;
  full_name: string;
  line1: string;
  line2: string | null;
  city: string;
  postal_code: string;
  country: string;
  is_default: boolean;
}

interface CouponInfo {
  code: string;
  type: "percentage" | "fixed";
  value: number;
  applies_to: "voucher" | "physical" | null;
}

export default function CheckoutPage() {
  const router = useRouter();
  const { items, totalPrice } = useCartStore();
  const [country, setCountry] = useState("BE");
  const [couponInput, setCouponInput] = useState("");
  const [coupon, setCoupon] = useState<CouponInfo | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [shippingRates, setShippingRates] = useState<ShippingRateRow[]>([]);
  const [isVoucherOnlyDB, setIsVoucherOnlyDB] = useState<boolean | null>(null);

  const isVoucherOnlyCart = items.length > 0 && items.every((i) => i.product_type === "voucher");
  const isVoucherOnly = isVoucherOnlyDB ?? isVoucherOnlyCart;
  const hasVoucher = items.some((i) => i.product_type === "voucher");

  useEffect(() => {
    if (items.length === 0) {
      router.replace("/cart");
      return;
    }

    const supabase = createClient();

    supabase
      .from("products")
      .select("id, product_type, voucher_duration_minutes")
      .in("id", items.map((i) => i.id))
      .then(({ data }) => {
        if (data) {
          const allVouchers = data.every(
            (p) => p.product_type === "voucher" ||
              (p.voucher_duration_minutes != null && p.voucher_duration_minutes > 0)
          );
          setIsVoucherOnlyDB(allVouchers);
        }
      });

    supabase
      .from("shipping_rates")
      .select("country_code, country_name, rate_standard")
      .eq("active", true)
      .order("country_name")
      .then(({ data }) => {
        if (data && data.length > 0) setShippingRates(data);
      });

    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      const { data } = await supabase
        .from("addresses")
        .select("*")
        .eq("user_id", user.id)
        .order("is_default", { ascending: false });

      if (data && data.length > 0) {
        setSavedAddresses(data);
        const defaultAddr = data.find((a) => a.is_default) ?? data[0];
        setSelectedAddressId(defaultAddr.id);
        setCountry(defaultAddr.country);
      }
    });
  }, [items.length, router]);

  const subtotal = totalPrice();
  const shippingRate = isVoucherOnly ? null : shippingRates.find(r => r.country_code === country);
  const shipping = isVoucherOnly ? 0 : (shippingRate?.rate_standard ?? 4.95);

  const voucherSubtotal = items.filter(i => i.product_type === "voucher").reduce((s, i) => s + i.price * i.quantity, 0);
  const physicalSubtotal = items.filter(i => i.product_type !== "voucher").reduce((s, i) => s + i.price * i.quantity, 0);
  const applicableSubtotal = coupon?.applies_to === "voucher" ? voucherSubtotal
    : coupon?.applies_to === "physical" ? physicalSubtotal
    : subtotal;

  const couponDiscount = coupon
    ? coupon.type === "percentage"
      ? Math.round(applicableSubtotal * coupon.value) / 100
      : Math.min(coupon.value, applicableSubtotal)
    : 0;

  const total = Math.max(0, subtotal + shipping - couponDiscount);
  const selectedAddress = savedAddresses.find((a) => a.id === selectedAddressId);

  async function applyCoupon() {
    const raw = couponInput.trim().toUpperCase();
    if (!raw) return;
    setCouponLoading(true);
    setCouponError(null);
    try {
      const r = await fetch(`/api/promo/validate?code=${encodeURIComponent(raw)}`);
      const d = await r.json();
      if (d.valid) {
        setCoupon({ code: d.code, type: d.type, value: d.value, applies_to: d.applies_to ?? null });
        setCouponInput("");
      } else {
        setCouponError(d.error ?? "Code invalide.");
      }
    } catch {
      setCouponError("Erreur de connexion.");
    } finally {
      setCouponLoading(false);
    }
  }

  async function handleCheckout() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map((i) => ({
            id: i.id,
            title: i.title,
            price: i.price,
            quantity: i.quantity,
            image_url: i.image_url,
          })),
          shippingCountry: isVoucherOnly ? null : country,
          couponCode: coupon?.code ?? null,
          shippingAddress: selectedAddress ? {
            full_name: selectedAddress.full_name,
            line1: selectedAddress.line1,
            line2: selectedAddress.line2 ?? "",
            city: selectedAddress.city,
            postal_code: selectedAddress.postal_code,
            country: selectedAddress.country,
          } : null,
        }),
      });

      const data = await response.json();
      if (!response.ok || data.error) {
        setError(data.error ?? "Erreur lors du checkout.");
        return;
      }
      if (data.url) window.location.href = data.url;
    } catch {
      setError("Erreur réseau. Veuillez réessayer.");
    } finally {
      setLoading(false);
    }
  }

  if (items.length === 0) return null;

  return (
    <main className="min-h-screen bg-gradient-navy pt-24 pb-16">
      <div className="container-shop">

        {/* Header */}
        <div className="mb-8">
          <Link
            href="/cart"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors mb-4"
          >
            <ChevronLeft size={16} />
            Retour au panier
          </Link>
          <h1 className="text-3xl font-bold text-foreground">Finaliser la commande</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">

          {/* ── Colonne gauche : livraison ── */}
          <div className="lg:col-span-2 space-y-6">

            {/* Produits physiques : adresse de livraison */}
            {!isVoucherOnly && (
              savedAddresses.length > 0 ? (
                <div className="card-premium p-6">
                  <h2 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                    <MapPin size={16} className="text-primary" />
                    Adresse de livraison
                  </h2>
                  <div className="space-y-3">
                    {savedAddresses.map((addr) => (
                      <label
                        key={addr.id}
                        className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                          selectedAddressId === addr.id
                            ? "border-primary/40 bg-primary/5"
                            : "border-border hover:border-primary/20"
                        }`}
                      >
                        <input
                          type="radio"
                          name="address"
                          value={addr.id}
                          checked={selectedAddressId === addr.id}
                          onChange={() => { setSelectedAddressId(addr.id); setCountry(addr.country); }}
                          className="mt-0.5 accent-primary"
                        />
                        <div className="text-sm flex-1">
                          <p className="font-medium text-foreground">{addr.full_name}</p>
                          <p className="text-muted-foreground">{addr.line1}</p>
                          {addr.line2 && <p className="text-muted-foreground">{addr.line2}</p>}
                          <p className="text-muted-foreground">{addr.postal_code} {addr.city}, {addr.country}</p>
                        </div>
                        {addr.is_default && (
                          <span className="text-xs text-primary bg-primary/10 border border-primary/20 px-1.5 py-0.5 rounded-full shrink-0">
                            Par défaut
                          </span>
                        )}
                      </label>
                    ))}
                    <Link href="/account" className="text-xs text-primary hover:text-[#e6a800] transition-colors">
                      Gérer mes adresses →
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="card-premium p-6">
                  <h2 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                    <MapPin size={16} className="text-primary" />
                    Pays de livraison
                  </h2>
                  <div className="space-y-2">
                    <Label className="text-muted-foreground text-sm">Pays</Label>
                    <select
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                      className="w-full bg-input border border-border text-foreground rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      {shippingRates.map((rate) => (
                        <option key={rate.country_code} value={rate.country_code}>
                          {rate.country_name} — {formatPrice(rate.rate_standard)}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-muted-foreground">
                      <Link href="/account" className="text-primary hover:text-[#e6a800]">
                        Connectez-vous
                      </Link>{" "}
                      pour sauvegarder vos adresses.
                    </p>
                  </div>
                </div>
              )
            )}

            {/* Livraison par email — dès qu'il y a au moins un voucher */}
            {hasVoucher && (
              <div className="card-premium p-6">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-full bg-[#F2B705]/10 border border-[#F2B705]/20 flex items-center justify-center shrink-0">
                    <Tag size={15} className="text-[#F2B705]" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground text-sm">Livraison par email</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Votre code de vol sera envoyé à votre adresse email immédiatement après le paiement. Aucune livraison physique requise.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="hidden lg:flex items-center gap-2 text-muted-foreground px-1">
              <ShieldCheck size={14} />
              <p className="text-xs">Paiement 100 % sécurisé — vos données sont chiffrées par Stripe</p>
            </div>
          </div>

          {/* ── Colonne droite : récapitulatif commande ── */}
          <div className="lg:col-span-1">
            <div className="card-premium p-5 space-y-5 sticky top-24">

              {/* Liste articles */}
              <div className="space-y-3">
                {items.map((item) => (
                  <div key={item.id} className="flex items-center gap-3">
                    <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-secondary shrink-0 border border-border">
                      {item.image_url ? (
                        <Image src={item.image_url} alt={item.title} fill className="object-cover" sizes="48px" />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Package size={14} className="text-muted-foreground" />
                        </div>
                      )}
                      {item.quantity > 1 && (
                        <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-primary text-[9px] font-bold text-black flex items-center justify-center leading-none">
                          {item.quantity}
                        </span>
                      )}
                    </div>
                    <p className="flex-1 text-sm text-foreground line-clamp-2 leading-snug">{item.title}</p>
                    <p className="text-sm font-semibold text-foreground shrink-0">
                      {formatPrice(item.price * item.quantity)}
                    </p>
                  </div>
                ))}
              </div>

              <div className="border-t border-border" />

              {/* Code promo */}
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5 mb-2">
                  <Tag size={11} /> Code promo
                </label>
                {coupon ? (
                  <div className="flex items-center justify-between bg-green-500/10 border border-green-500/20 rounded-lg px-3 py-2">
                    <div>
                      <p className="text-xs font-bold text-green-500">{coupon.code}</p>
                      <p className="text-xs text-muted-foreground">
                        {coupon.type === "percentage" ? `−${coupon.value} %` : `−${formatPrice(coupon.value)}`}
                        {coupon.applies_to === "voucher" ? " · sur les vols" : coupon.applies_to === "physical" ? " · sur les accessoires" : ""}
                      </p>
                    </div>
                    <button onClick={() => setCoupon(null)} className="text-muted-foreground hover:text-destructive transition-colors ml-2">
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Input
                      value={couponInput}
                      onChange={(e) => { setCouponInput(e.target.value.toUpperCase()); setCouponError(null); }}
                      onKeyDown={(e) => e.key === "Enter" && applyCoupon()}
                      className="bg-input border-border text-foreground text-sm h-9"
                    />
                    <Button
                      onClick={applyCoupon}
                      disabled={couponLoading || !couponInput.trim()}
                      variant="outline"
                      size="sm"
                      className="h-9 shrink-0 border-border text-foreground hover:bg-secondary"
                    >
                      {couponLoading ? "..." : "Appliquer"}
                    </Button>
                  </div>
                )}
                {couponError && <p className="text-xs text-destructive mt-1">{couponError}</p>}
              </div>

              <div className="border-t border-border" />

              {/* Récap financier */}
              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-muted-foreground">
                  <span>Sous-total</span>
                  <span>{formatPrice(subtotal)}</span>
                </div>
                {isVoucherOnly ? (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Livraison</span>
                    <span className="text-green-500 font-medium">Gratuite</span>
                  </div>
                ) : (
                  <div className="flex justify-between text-muted-foreground">
                    <span>Livraison <span className="text-xs">(produits physiques)</span></span>
                    <span>{formatPrice(shipping)}</span>
                  </div>
                )}
                {couponDiscount > 0 && (
                  <div className="flex justify-between text-green-500">
                    <span>Réduction ({coupon!.code})</span>
                    <span>−{formatPrice(couponDiscount)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-foreground pt-2 border-t border-border">
                  <span>Total</span>
                  <span className="text-primary text-lg">{formatPrice(total)}</span>
                </div>
              </div>

              {error && (
                <div className="bg-destructive/10 border border-destructive/30 text-destructive text-xs rounded-lg px-3 py-2">
                  {error}
                </div>
              )}

              <Button
                onClick={handleCheckout}
                disabled={loading}
                size="lg"
                className="w-full bg-primary text-primary-foreground hover:bg-gold-400 font-semibold shadow-gold h-12 text-base"
              >
                <Lock size={15} className="mr-2" />
                {loading ? "Redirection..." : "Payer en toute sécurité"}
              </Button>

              <div className="flex items-center justify-center gap-1.5 text-muted-foreground">
                <ShieldCheck size={12} />
                <p className="text-[11px]">Paiement sécurisé via Stripe</p>
              </div>

            </div>
          </div>

        </div>
      </div>
    </main>
  );
}
