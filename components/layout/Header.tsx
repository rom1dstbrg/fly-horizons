"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useEffect } from "react";
import { ShoppingBag, User, Menu, X, Home, Route, Store, Mail, Ticket } from "lucide-react";
import { CartCount } from "@/components/shop/CartCount";
import { createClient } from "@/lib/supabase/client";
import type { User as SupabaseUser } from "@supabase/supabase-js";

export function Header() {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

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
    "px-3 py-2 text-sm font-medium text-foreground/70 hover:text-foreground rounded-lg hover:bg-secondary transition-colors";

  const iconLinkClass =
    "p-2 rounded-lg text-foreground/60 hover:text-foreground hover:bg-secondary transition-colors";

  return (
    <header
      className={`fixed top-2 max-xs:top-1.5 md:top-3.5 inset-x-3 max-xs:inset-x-2.5 md:inset-x-4 mx-auto max-w-[1300px] z-50 rounded-2xl bg-card border border-border transition-shadow duration-300 ${
        scrolled ? "shadow-premium-lg" : "shadow-premium"
      }`}
    >
      <div className="px-4 max-xs:px-3 md:px-5 lg:px-6">
        <div className="flex items-center h-14 max-xs:h-12 md:h-[60px]">

          {/* Logo */}
          <Link href="/" className="shrink-0 flex items-center leading-none">
            <Image
              src="/logo-header.png"
              alt="Fly Horizons"
              width={160} height={40}
              className="h-7 max-xs:h-[22px] md:h-8 w-auto object-contain"
              priority unoptimized
            />
          </Link>

          <div className="flex-1" />

          <div className="flex items-center gap-1">

            {/* Nav desktop */}
            <nav className="hidden md:flex items-center gap-1 mr-2">
              <Link href="/" className={navLinkClass}>Accueil</Link>
              <Link href="/nos-offres" className={navLinkClass}>Nos offres</Link>
              <Link href="/shop" className={navLinkClass}>Boutique</Link>
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
                className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#113356] border border-[#dce8ff] bg-[#f5f8ff] rounded-lg hover:bg-[#113356] hover:text-white hover:border-[#113356] transition-all"
              >
                <User size={13} />
                Connexion
              </Link>
            )}

            {/* Panier desktop uniquement */}
            <Link href="/cart" className={`relative hidden md:flex ${iconLinkClass}`} aria-label="Panier">
              <ShoppingBag size={19} />
              <CartCount />
            </Link>

            {/* Burger mobile uniquement */}
            <button
              className={`md:hidden ${iconLinkClass} ml-0.5`}
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label="Menu"
            >
              {menuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </div>

      {/* Menu mobile */}
      {menuOpen && (
        <div className="md:hidden border-t border-border rounded-b-2xl overflow-hidden bg-card">
          <nav className="px-3 py-3 flex flex-col gap-0.5">
            <Link href="/" className="flex items-center gap-2.5 text-sm font-medium text-foreground/80 hover:text-foreground px-3 py-2.5 rounded-lg hover:bg-secondary transition-colors" onClick={() => setMenuOpen(false)}>
              <Home size={16} className="opacity-60 text-[#113356]" />
              Accueil
            </Link>
            <Link href="/nos-offres" className="flex items-center gap-2.5 text-sm font-medium text-foreground/80 hover:text-foreground px-3 py-2.5 rounded-lg hover:bg-secondary transition-colors" onClick={() => setMenuOpen(false)}>
              <Ticket size={16} className="opacity-60 text-[#113356]" />
              Nos offres
            </Link>
            <Link href="/shop" className="flex items-center gap-2.5 text-sm font-medium text-foreground/80 hover:text-foreground px-3 py-2.5 rounded-lg hover:bg-secondary transition-colors" onClick={() => setMenuOpen(false)}>
              <Store size={16} className="opacity-60 text-[#113356]" />
              Boutique
            </Link>
            <Link href="/vol-sur-mesure" className="flex items-center gap-2.5 text-sm font-medium text-foreground/80 hover:text-foreground px-3 py-2.5 rounded-lg hover:bg-secondary transition-colors" onClick={() => setMenuOpen(false)}>
              <Route size={16} className="opacity-60 text-[#113356]" />
              Vol sur mesure
            </Link>
            <Link href="/contact" className="flex items-center gap-2.5 text-sm font-medium text-foreground/80 hover:text-foreground px-3 py-2.5 rounded-lg hover:bg-secondary transition-colors" onClick={() => setMenuOpen(false)}>
              <Mail size={16} className="opacity-60 text-[#113356]" />
              Contact
            </Link>

            <div className="w-full h-px bg-border my-1.5" />

            {/* Panier + compte dans le menu mobile */}
            <Link href="/cart" className="flex items-center gap-2.5 text-sm font-medium text-foreground/80 hover:text-foreground px-3 py-2.5 rounded-lg hover:bg-secondary transition-colors" onClick={() => setMenuOpen(false)}>
              <ShoppingBag size={16} className="opacity-60 text-[#113356]" />
              <span className="flex-1">Panier</span>
              <CartCount />
            </Link>
            <Link href={user ? "/account" : "/login"} className="flex items-center gap-2.5 text-sm font-medium text-foreground/80 hover:text-foreground px-3 py-2.5 rounded-lg hover:bg-secondary transition-colors" onClick={() => setMenuOpen(false)}>
              <User size={16} className="opacity-60 text-[#113356]" />
              {user ? "Mon compte" : "Connexion"}
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
