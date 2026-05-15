"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Tag, MapPin } from "lucide-react";
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

export default function CheckoutPage() {
  const router = useRouter();
  const { items, totalPrice } = useCartStore();
  const [country, setCountry] = useState("BE");
  const [couponCode, setCouponCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [shippingRates, setShippingRates] = useState<ShippingRateRow[]>([]);
  // null = loading, true/false = resolved from DB
  const [isVoucherOnlyDB, setIsVoucherOnlyDB] = useState<boolean | null>(null);

  // Fallback from cart store while DB resolves
  const isVoucherOnlyCart = items.length > 0 && items.every((i) => i.product_type === "voucher");
  const isVoucherOnly = isVoucherOnlyDB ?? isVoucherOnlyCart;

  useEffect(() => {
    if (items.length === 0) {
      router.replace("/cart");
      return;
    }

    const supabase = createClient();

    // Verify product types from DB — cart store may have stale/missing product_type
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
  const total = subtotal + shipping;

  const selectedAddress = savedAddresses.find((a) => a.id === selectedAddressId);

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
          couponCode: couponCode || null,
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

      if (data.url) {
        window.location.href = data.url;
      }
    } catch {
      setError("Erreur reseau. Veuillez reessayer.");
    } finally {
      setLoading(false);
    }
  }

  if (items.length === 0) return null;

  return (
    <main className="min-h-screen bg-gradient-navy pt-24 pb-16">
      <div className="container-shop max-w-2xl">

        <div className="mb-8">
          <Link
            href="/cart"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors mb-4"
          >
            <ChevronLeft size={16} />
            Retour au panier
          </Link>
          <h1 className="text-3xl font-bold text-foreground">
            Finaliser la commande
          </h1>
        </div>

        <div className="space-y-6">

          {/* Articles */}
          <div className="card-premium p-6">
            <h2 className="font-semibold text-foreground mb-4">
              Articles ({items.length})
            </h2>
            <div className="space-y-3">
              {items.map((item) => (
                <div key={item.id} className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    {item.title} x{item.quantity}
                  </span>
                  <span className="text-foreground font-medium">
                    {formatPrice(item.price * item.quantity)}
                  </span>
                </div>
              ))}
            </div>
            {isVoucherOnly && (
              <p className="text-xs text-[#F2B705]/80 bg-[#F2B705]/5 border border-[#F2B705]/20 rounded-md px-3 py-2 mt-4">
                Voucher(s) — votre code sera envoyé par email immédiatement après le paiement.
              </p>
            )}
          </div>

          {/* Livraison — masqué pour les vouchers */}
          {!isVoucherOnly && (
            <>
              {savedAddresses.length > 0 && (
                <div className="card-premium p-6">
                  <h2 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                    <MapPin size={16} className="text-primary" />
                    Adresse de livraison
                  </h2>
                  <div className="space-y-3">
                    {savedAddresses.map((addr) => (
                      <label
                        key={addr.id}
                        className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
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
                          onChange={() => {
                            setSelectedAddressId(addr.id);
                            setCountry(addr.country);
                          }}
                          className="mt-0.5 accent-primary"
                        />
                        <div className="text-sm">
                          <p className="font-medium text-foreground">{addr.full_name}</p>
                          <p className="text-muted-foreground">{addr.line1}</p>
                          {addr.line2 && <p className="text-muted-foreground">{addr.line2}</p>}
                          <p className="text-muted-foreground">
                            {addr.postal_code} {addr.city}, {addr.country}
                          </p>
                        </div>
                        {addr.is_default && (
                          <span className="ml-auto text-xs text-primary bg-primary/10 border border-primary/20 px-1.5 py-0.5 rounded-full shrink-0">
                            Par defaut
                          </span>
                        )}
                      </label>
                    ))}
                    <Link
                      href="/account"
                      className="text-xs text-primary hover:text-gold-400 transition-colors"
                    >
                      Gerer mes adresses
                    </Link>
                  </div>
                </div>
              )}

              {savedAddresses.length === 0 && (
                <div className="card-premium p-6">
                  <h2 className="font-semibold text-foreground mb-4">
                    Pays de livraison
                  </h2>
                  <div className="space-y-2">
                    <Label className="text-muted-foreground text-sm">Pays</Label>
                    <select
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                      className="w-full bg-input border border-border text-foreground rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      {shippingRates.map((rate) => (
                        <option key={rate.country_code} value={rate.country_code}>
                          {rate.country_name} — {formatPrice(rate.rate_standard)}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-muted-foreground">
                      <Link href="/account" className="text-primary hover:text-gold-400">
                        Connectez-vous
                      </Link>{" "}
                      pour sauvegarder vos adresses.
                    </p>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Code promo */}
          <div className="card-premium p-6">
            <h2 className="font-semibold text-foreground mb-4 flex items-center gap-2">
              <Tag size={16} className="text-primary" />
              Code promo
            </h2>
            <Input
              value={couponCode}
              onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
              placeholder="FLYHORIZ10"
              className="bg-input border-border text-foreground placeholder:text-muted-foreground"
            />
            <p className="text-xs text-muted-foreground mt-2">
              Le code sera verifie lors du paiement.
            </p>
          </div>

          {/* Total */}
          <div className="card-premium p-6 space-y-3">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Sous-total</span>
              <span>{formatPrice(subtotal)}</span>
            </div>
            {isVoucherOnly ? (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Livraison</span>
                <span className="text-green-500 font-medium">Gratuite</span>
              </div>
            ) : (
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Livraison ({shippingRate?.country_name ?? country})</span>
                <span>{formatPrice(shipping)}</span>
              </div>
            )}
            <div className="border-t border-border pt-3 flex justify-between font-bold text-foreground">
              <span>Total</span>
              <span className="text-primary text-lg">{formatPrice(total)}</span>
            </div>
          </div>

          {error && (
            <div className="bg-destructive/10 border border-destructive/30 text-destructive text-sm rounded-md px-4 py-3">
              {error}
            </div>
          )}

          <Button
            onClick={handleCheckout}
            disabled={loading}
            size="lg"
            className="w-full bg-primary text-primary-foreground hover:bg-gold-400 font-semibold shadow-gold"
          >
            {loading ? "Redirection vers Stripe..." : "Payer en toute securite"}
          </Button>

          <p className="text-xs text-muted-foreground text-center">
            {isVoucherOnly
              ? "Votre code de vol sera envoyé par email après le paiement."
              : "L'adresse definitive sera confirmee sur la page Stripe."}
          </p>

        </div>
      </div>
    </main>
  );
}
