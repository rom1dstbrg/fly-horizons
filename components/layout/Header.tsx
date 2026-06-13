"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useEffect, useRef } from "react";
import { ShoppingBag, User, Menu, X, Home, Route, Mail, Ticket, HelpCircle, Info, Images } from "lucide-react";
import { CartCount } from "@/components/shop/CartCount";
import { createClient } from "@/lib/supabase/client";
import { useCartStore } from "@/store/cart";
import type { User as SupabaseUser } from "@supabase/supabase-js";

export function Header() {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const cartTotal = useCartStore((s) => s.totalItems());
  const [cartBump, setCartBump] = useState(false);
  const prevCartTotal = useRef(cartTotal);

  useEffect(() => {
    if (cartTotal > prevCartTotal.current) {
      setCartBump(true);
      const t = setTimeout(() => setCartBump(false), 700);
      prevCartTotal.current = cartTotal;
      return () => clearTimeout(t);
    }
    prevCartTotal.current = cartTotal;
  }, [cartTotal]);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => setUser(data.user));

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_, session) => setUser(session?.user ?? null)
    );

    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);

    return () => {
      subscription.unsubscribe();
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  const navLinkClass =
    "px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground rounded-lg hover:bg-secondary transition-colors";

  const iconLinkClass =
    "p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors";

  return (
    <>
    {menuOpen && (
      <div
        className="fixed inset-0 z-[799] md:hidden"
        onClick={() => setMenuOpen(false)}
        aria-hidden="true"
      />
    )}
    <header
      className={`fixed top-2 max-xs:top-1.5 md:top-3.5 inset-x-3 max-xs:inset-x-2.5 md:inset-x-4 mx-auto max-w-[1400px] z-[800] rounded-2xl bg-card border border-border transition-shadow duration-300 ${
        scrolled ? "shadow-premium-lg" : "shadow-premium"
      }`}
    >
      <div className="px-4 max-xs:px-3 md:px-5 lg:px-6">
        <div className="flex items-center h-16 max-xs:h-14 md:h-[60px]">

          {/* Logo */}
          <Link href="/" className="shrink-0 flex items-center leading-none">
            <Image
              src="/fly-horizons-logo-navy.svg"
              alt="Fly Horizons"
              width={160} height={40}
              className="h-8 max-xs:h-7 md:h-8 w-auto object-contain"
              style={{ width: "auto" }}
              priority unoptimized
            />
          </Link>

          <div className="flex-1" />

          <div className="flex items-center gap-1">

            {/* Nav desktop */}
            <nav className="hidden md:flex items-center gap-1 mr-2">
              <Link href="/nos-offres" className={navLinkClass}>Nos offres</Link>
              <Link href="/vol-sur-mesure" className={navLinkClass}>Vol sur mesure</Link>
              <Link href="/about" className={navLinkClass}>À propos</Link>
              <Link href="/faq" className={navLinkClass}>FAQ</Link>
              <Link href="/contact" className={navLinkClass}>Contact</Link>
            </nav>

            {/* Séparateur desktop */}
            <div className="hidden md:block w-px h-5 bg-border mx-1" />

            {/* Compte desktop */}
            {user ? (
              <Link href="/account" className={`hidden md:flex ${iconLinkClass}`} aria-label="Mon compte">
                <User size={19} />
              </Link>
            ) : (
              <Link
                href="/login"
                className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-foreground border border-border bg-secondary rounded-lg hover:bg-navy hover:text-white hover:border-navy transition-all"
              >
                <User size={13} />
                Connexion
              </Link>
            )}

            {/* Panier — caché seulement sur très petit écran (≤390px) */}
            <Link href="/cart" className={`relative max-xs:hidden flex ${iconLinkClass}`} aria-label="Panier">
              <span className={`inline-flex${cartBump ? " animate-cart-bump" : ""}`}>
                <ShoppingBag size={19} />
              </span>
              <CartCount />
            </Link>

            {/* Burger mobile uniquement */}
            <button
              className={`md:hidden ${iconLinkClass} ml-0.5 cursor-pointer`}
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label="Menu"
            >
              {menuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </div>

      {/* Menu mobile */}
      <div
        className={`md:hidden rounded-b-2xl overflow-hidden bg-card transition-[max-height,opacity] duration-300 ease-out ${
          menuOpen ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <div className="border-t border-border">
          <nav className="px-3 py-3 flex flex-col gap-0.5">
            <Link href="/" className="flex items-center gap-2.5 text-sm font-medium text-muted-foreground hover:text-foreground px-3 py-2.5 rounded-lg hover:bg-secondary transition-colors" onClick={() => setMenuOpen(false)}>
              <Home size={16} className="text-muted-foreground" />
              Accueil
            </Link>
            <Link href="/nos-offres" className="flex items-center gap-2.5 text-sm font-medium text-muted-foreground hover:text-foreground px-3 py-2.5 rounded-lg hover:bg-secondary transition-colors" onClick={() => setMenuOpen(false)}>
              <Ticket size={16} className="text-muted-foreground" />
              Nos offres
            </Link>
            <Link href="/vol-sur-mesure" className="flex items-center gap-2.5 text-sm font-medium text-muted-foreground hover:text-foreground px-3 py-2.5 rounded-lg hover:bg-secondary transition-colors" onClick={() => setMenuOpen(false)}>
              <Route size={16} className="text-muted-foreground" />
              Vol sur mesure
            </Link>
            <Link href="/galerie" className="flex items-center gap-2.5 text-sm font-medium text-muted-foreground hover:text-foreground px-3 py-2.5 rounded-lg hover:bg-secondary transition-colors" onClick={() => setMenuOpen(false)}>
              <Images size={16} className="text-muted-foreground" />
              Galerie
            </Link>
            <Link href="/about" className="flex items-center gap-2.5 text-sm font-medium text-muted-foreground hover:text-foreground px-3 py-2.5 rounded-lg hover:bg-secondary transition-colors" onClick={() => setMenuOpen(false)}>
              <Info size={16} className="text-muted-foreground" />
              À propos
            </Link>
            <Link href="/faq" className="flex items-center gap-2.5 text-sm font-medium text-muted-foreground hover:text-foreground px-3 py-2.5 rounded-lg hover:bg-secondary transition-colors" onClick={() => setMenuOpen(false)}>
              <HelpCircle size={16} className="text-muted-foreground" />
              FAQ
            </Link>
            <Link href="/contact" className="flex items-center gap-2.5 text-sm font-medium text-muted-foreground hover:text-foreground px-3 py-2.5 rounded-lg hover:bg-secondary transition-colors" onClick={() => setMenuOpen(false)}>
              <Mail size={16} className="text-muted-foreground" />
              Contact
            </Link>

            <div className="w-full h-px bg-border my-1.5" />

            {/* Panier + compte dans le menu mobile */}
            <Link href="/cart" className="flex items-center gap-2.5 text-sm font-medium text-muted-foreground hover:text-foreground px-3 py-2.5 rounded-lg hover:bg-secondary transition-colors" onClick={() => setMenuOpen(false)}>
              <ShoppingBag size={16} className="text-muted-foreground" />
              Panier
            </Link>
            <Link href={user ? "/account" : "/login"} className="flex items-center gap-2.5 text-sm font-medium text-muted-foreground hover:text-foreground px-3 py-2.5 rounded-lg hover:bg-secondary transition-colors" onClick={() => setMenuOpen(false)}>
              <User size={16} className="text-muted-foreground" />
              {user ? "Mon compte" : "Connexion"}
            </Link>
          </nav>
        </div>
      </div>
    </header>
    </>
  );
}
