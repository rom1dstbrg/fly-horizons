"use client";

import Link from "next/link";
import { Calendar, Gift, ChevronDown } from "lucide-react";

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
      <div className="relative z-10 max-w-[80rem] mx-auto px-4 sm:px-6 lg:px-8 text-center">

        {/* Badge */}
        <div className="inline-flex items-center gap-2 bg-[#F2B705]/10 border border-[#F2B705]/30 rounded-full px-4 py-1.5 mb-6">
          <span className="w-1.5 h-1.5 rounded-full bg-[#F2B705] animate-pulse" />
          <span className="text-[#F2B705] text-xs font-semibold tracking-widest uppercase">
            Boutique officielle
          </span>
        </div>

        {/* Titre */}
        <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-white mb-4 leading-tight">
          Fly{" "}
          <span className="text-[#F2B705]">Horizons</span>
        </h1>

        <p className="text-lg sm:text-xl text-white/70 max-w-xl mx-auto mb-10 leading-relaxed">
          Vivez l&apos;expérience du vol en avion léger au-dessus de la Belgique.
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/reservation"
            className="inline-flex items-center justify-center gap-2 h-12 px-8 bg-[#F2B705] text-[#0b2238] rounded-xl font-semibold text-sm hover:bg-[#e6a800] transition-colors shadow-[0_6px_24px_rgba(242,183,5,.35)]"
          >
            <Calendar size={18} />
            Réserver une date
          </Link>

          <Link
            href="/nos-offres"
            className="inline-flex items-center justify-center gap-2 h-12 px-8 border border-white/30 text-white rounded-xl font-medium text-sm hover:bg-white/10 hover:border-white/50 transition-colors"
          >
            <Gift size={18} />
            Offrir un vol
          </Link>
        </div>

        {/* Code promo bienvenue */}
        <p className="mt-6 text-xs italic text-white/40">
          Première commande ? Utilisez le code{" "}
          <span className="font-mono not-italic text-white/55">WELCOME2026</span>
          {" "}pour −10%, valable une seule fois par compte.
        </p>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-2 text-white/40">
        <span className="text-xs tracking-widest uppercase">Decouvrir</span>
        <ChevronDown size={16} className="animate-bounce" />
      </div>

    </section>
  );
}
