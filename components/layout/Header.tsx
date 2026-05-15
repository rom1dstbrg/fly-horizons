"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useEffect, useRef } from "react";
import { ShoppingBag, User, Menu, X, ChevronDown, Gift, Route, Ticket, Store, Mail } from "lucide-react";
import { CartCount } from "@/components/shop/CartCount";
import { createClient } from "@/lib/supabase/client";
import type { User as SupabaseUser } from "@supabase/supabase-js";

const BOOKING_ITEMS = [
  {
    href: "/packs",
    icon: <Ticket size={17} className="text-[#113356]" />,
    label: "Nos vols",
    desc: "Forfaits 30 min à 2 h au départ de Charleroi",
  },
  {
    href: "/vol-sur-mesure",
    icon: <Route size={17} className="text-[#113356]" />,
    label: "Vol sur mesure",
    desc: "Tracez votre propre itinéraire sur la carte",
  },
];

export function Header() {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [bookingOpen, setBookingOpen] = useState(false);
  const bookingRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => setUser(data.user));

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_, session) => setUser(session?.user ?? null)
    );

    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);

    function onClickOutside(e: MouseEvent) {
      if (bookingRef.current && !bookingRef.current.contains(e.target as Node)) {
        setBookingOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);

    return () => {
      subscription.unsubscribe();
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("mousedown", onClickOutside);
    };
  }, []);

  const navLinkClass =
    "px-3 py-2 text-sm font-medium text-foreground/70 hover:text-foreground rounded-lg hover:bg-secondary transition-colors";

  const iconLinkClass =
    "p-2 rounded-lg text-foreground/60 hover:text-foreground hover:bg-secondary transition-colors";

  return (
    <header
      className={`fixed top-3.5 inset-x-4 mx-auto max-w-[1300px] z-50 rounded-2xl bg-card border border-border transition-shadow duration-300 ${
        scrolled ? "shadow-premium-lg" : "shadow-premium"
      }`}
    >
      <div className="px-5 sm:px-6">
        <div className="flex items-center h-[60px]">

          {/* Logo */}
          <Link href="/" className="shrink-0 flex items-center leading-none">
            <Image
              src="/logo-header-mobile.png"
              alt="Fly Horizons Shop"
              width={40} height={40}
              className="block md:hidden h-8 w-auto object-contain"
              priority unoptimized
            />
            <Image
              src="/header-shop.png"
              alt="Fly Horizons Shop"
              width={160} height={36}
              className="hidden md:block h-8 w-auto object-contain"
              priority unoptimized
            />
          </Link>

          <div className="flex-1" />

          <div className="flex items-center gap-1">

            {/* Nav desktop */}
            <nav className="hidden md:flex items-center gap-1 mr-2">
              <Link href="/" className={navLinkClass}>Accueil</Link>
              <Link href="/vouchers" className={navLinkClass}>Cadeau</Link>
              <Link href="/contact" className={navLinkClass}>Contact</Link>

              {/* Dropdown Réserver */}
              <div ref={bookingRef} className="relative">
                <button
                  onClick={() => setBookingOpen(o => !o)}
                  className={`inline-flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground rounded-[10px] text-sm font-semibold transition-all hover:bg-[#e6a800] hover:-translate-y-px shadow-gold-sm ${
                    bookingOpen ? "bg-[#e6a800]" : ""
                  }`}
                >
                  Réserver
                  <ChevronDown size={14} className={`transition-transform duration-200 ${bookingOpen ? "rotate-180" : ""}`} />
                </button>

                {bookingOpen && (
                  <div className="absolute top-full right-0 mt-2 w-72 bg-card border border-border rounded-2xl shadow-premium-lg overflow-hidden z-50">
                    {BOOKING_ITEMS.map(({ href, icon, label, desc }) => (
                      <Link
                        key={href}
                        href={href}
                        onClick={() => setBookingOpen(false)}
                        className="flex items-start gap-3.5 px-4 py-3.5 hover:bg-secondary transition-colors group"
                      >
                        <div className="w-9 h-9 rounded-xl bg-[#f5f8ff] border border-[#dce8ff] flex items-center justify-center shrink-0 mt-0.5 group-hover:border-[#113356]/30 transition-colors">
                          {icon}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-foreground group-hover:text-[#113356] transition-colors">{label}</p>
                          <p className="text-xs text-muted-foreground leading-snug mt-0.5">{desc}</p>
                        </div>
                      </Link>
                    ))}
                    <div className="border-t border-border">
                      <Link
                        href="/shop"
                        onClick={() => setBookingOpen(false)}
                        className="flex items-start gap-3.5 px-4 py-3.5 hover:bg-secondary transition-colors group"
                      >
                        <div className="w-9 h-9 rounded-xl bg-[#f5f8ff] border border-[#dce8ff] flex items-center justify-center shrink-0 mt-0.5 group-hover:border-[#113356]/30 transition-colors">
                          <Store size={17} className="text-[#113356]" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-foreground group-hover:text-[#113356] transition-colors">Boutique</p>
                          <p className="text-xs text-muted-foreground leading-snug mt-0.5">Accessoires & produits dérivés</p>
                        </div>
                      </Link>
                    </div>
                  </div>
                )}
              </div>

            </nav>

            {/* Séparateur */}
            <div className="hidden md:block w-px h-5 bg-border mx-1" />

            {/* Compte */}
            <Link href={user ? "/account" : "/login"} className={iconLinkClass} aria-label="Mon compte">
              <User size={19} />
            </Link>

            {/* Panier */}
            <Link href="/cart" className={`relative ${iconLinkClass}`} aria-label="Panier">
              <ShoppingBag size={19} />
              <CartCount />
            </Link>

            {/* Burger mobile */}
            <button
              className={`md:hidden ${iconLinkClass}`}
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label="Menu"
            >
              {menuOpen ? <X size={19} /> : <Menu size={19} />}
            </button>
          </div>
        </div>
      </div>

      {/* Menu mobile */}
      {menuOpen && (
        <div className="md:hidden border-t border-border rounded-b-2xl overflow-hidden bg-card">
          <nav className="px-4 py-4 flex flex-col gap-0.5">
            <Link href="/" className="text-sm font-medium text-foreground/80 hover:text-foreground px-3 py-2.5 rounded-lg hover:bg-secondary transition-colors" onClick={() => setMenuOpen(false)}>
              Accueil
            </Link>
            <Link href="/vouchers"
              className="flex items-center gap-2.5 text-sm font-medium text-foreground/80 hover:text-foreground px-3 py-2.5 rounded-lg hover:bg-secondary transition-colors"
              onClick={() => setMenuOpen(false)}>
              <Gift size={17} className="opacity-60 text-[#113356]" />
              Cadeau
            </Link>
            <Link href="/contact"
              className="flex items-center gap-2.5 text-sm font-medium text-foreground/80 hover:text-foreground px-3 py-2.5 rounded-lg hover:bg-secondary transition-colors"
              onClick={() => setMenuOpen(false)}>
              <Mail size={17} className="opacity-60 text-[#113356]" />
              Contact
            </Link>

            <div className="w-full h-px bg-border my-1" />

            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[2px] px-3 pt-1 pb-1">Réserver</p>

            {BOOKING_ITEMS.map(({ href, icon, label }) => (
              <Link key={href} href={href}
                className="flex items-center gap-2.5 text-sm font-medium text-foreground/80 hover:text-foreground px-3 py-2.5 rounded-lg hover:bg-secondary transition-colors"
                onClick={() => setMenuOpen(false)}>
                <span className="opacity-60">{icon}</span>
                {label}
              </Link>
            ))}
            <Link href="/shop"
              className="flex items-center gap-2.5 text-sm font-medium text-foreground/80 hover:text-foreground px-3 py-2.5 rounded-lg hover:bg-secondary transition-colors"
              onClick={() => setMenuOpen(false)}>
              <Store size={17} className="opacity-60 text-[#113356]" />
              Boutique
            </Link>

            <div className="w-full h-px bg-border my-1" />

            <Link href={user ? "/account" : "/login"} className="text-sm font-medium text-foreground/80 hover:text-foreground px-3 py-2.5 rounded-lg hover:bg-secondary transition-colors" onClick={() => setMenuOpen(false)}>
              {user ? "Mon compte" : "Connexion"}
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
