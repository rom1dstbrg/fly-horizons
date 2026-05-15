"use client";

import Link from "next/link";
import { Calendar, Gift, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";

export function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">

      {/* Background image aviation */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat scale-105"
        style={{
          backgroundImage: "url('https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=1920&q=80')",
          filter: "blur(3px)",
        }}
      />

      {/* Dark overlay */}
      <div className="absolute inset-0 bg-black/55" />

      {/* Contenu */}
      <div className="relative z-10 container-shop text-center px-4">

        {/* Badge */}
        <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/30 rounded-full px-4 py-1.5 mb-6">
          <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
          <span className="text-primary text-xs font-semibold tracking-widest uppercase">
            Boutique officielle
          </span>
        </div>

        {/* Titre */}
        <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-white mb-4 leading-tight">
          Fly{" "}
          <span className="text-gold-gradient">Horizons</span>
        </h1>

        <p className="text-lg sm:text-xl text-white/70 max-w-xl mx-auto mb-10 leading-relaxed">
          Vivez l&apos;expérience du vol en avion léger au-dessus de la Belgique.
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button
            asChild
            size="lg"
            className="bg-primary text-primary-foreground hover:bg-gold-400 font-semibold px-8 shadow-gold"
          >
            <Link href="/reservation">
              <Calendar size={18} className="mr-2" />
              Réserver une date
            </Link>
          </Button>

          <Button
            asChild
            size="lg"
            variant="outline"
            className="border-white/30 text-white hover:bg-white/10 hover:border-white/50 font-medium px-8"
          >
            <Link href="/vouchers">
              <Gift size={18} className="mr-2" />
              Offrir un vol
            </Link>
          </Button>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-2 text-white/40">
        <span className="text-xs tracking-widest uppercase">Decouvrir</span>
        <ChevronDown size={16} className="animate-bounce" />
      </div>

    </section>
  );
}
