"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { ShoppingBag, User, Menu, X } from "lucide-react";
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

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-navy-950/95 backdrop-blur-md border-b border-border shadow-premium"
          : "bg-transparent"
      }`}
    >
      <div className="container-shop">
        <div className="flex items-center justify-between h-16 lg:h-18">

          <Link href="/" className="flex items-center gap-2 shrink-0">
            <span className="text-xl font-bold text-gold-gradient tracking-wide">
              FLY HORIZONS
            </span>
            <span className="hidden sm:block text-xs text-muted-foreground font-medium tracking-widest uppercase mt-0.5">
              Shop
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-8">
            <Link
              href="/shop"
              className="text-sm font-medium text-foreground/80 hover:text-primary transition-colors"
            >
              Boutique
            </Link>
            <Link
              href="https://fly-horizons.com"
              target="_blank"
              className="text-sm font-medium text-foreground/80 hover:text-primary transition-colors"
            >
              Fly Horizons
            </Link>
          </nav>

          <div className="flex items-center gap-1">
            <Link
              href={user ? "/account" : "/login"}
              className="p-2 rounded-md text-foreground/70 hover:text-primary hover:bg-secondary transition-colors"
              aria-label="Mon compte"
            >
              <User size={20} />
            </Link>

            <Link
              href="/cart"
              className="relative p-2 rounded-md text-foreground/70 hover:text-primary hover:bg-secondary transition-colors"
              aria-label="Panier"
            >
              <ShoppingBag size={20} />
              <CartCount />
            </Link>

            <button
              className="md:hidden p-2 rounded-md text-foreground/70 hover:text-primary hover:bg-secondary transition-colors ml-1"
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label="Menu"
            >
              {menuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </div>

      {menuOpen && (
        <div className="md:hidden bg-navy-950/98 backdrop-blur-md border-t border-border">
          <nav className="container-shop py-4 flex flex-col gap-4">
            <Link
              href="/shop"
              className="text-sm font-medium text-foreground/80 hover:text-primary transition-colors py-2"
              onClick={() => setMenuOpen(false)}
            >
              Boutique
            </Link>
            <Link
              href={user ? "/account" : "/login"}
              className="text-sm font-medium text-foreground/80 hover:text-primary transition-colors py-2"
              onClick={() => setMenuOpen(false)}
            >
              {user ? "Mon compte" : "Connexion"}
            </Link>
            <Link
              href="https://fly-horizons.com"
              target="_blank"
              className="text-sm font-medium text-foreground/80 hover:text-primary transition-colors py-2"
              onClick={() => setMenuOpen(false)}
            >
              Fly Horizons
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}