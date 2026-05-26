import Image from "next/image";
import Link from "next/link";
import { Plane, ShieldCheck, ArrowRight } from "lucide-react";

export default function PilotCard() {
  return (
    <section className="bg-[#0b2238] py-16 sm:py-20 border-t border-white/10">
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-16 items-center">

          {/* ── Texte — colonne gauche ── */}
          <div className="order-2 md:order-1 flex flex-col gap-7">

            <div>
              <p className="text-[#F2B705] text-[10px] font-bold tracking-[3px] uppercase mb-3">
                Votre pilote
              </p>
              <h2 className="text-white text-3xl sm:text-4xl font-extrabold leading-tight">
                Romain<br />DESTANBERG
              </h2>
              <p className="text-white/40 text-sm mt-1">
                Fondateur &amp; Pilote — Fly Horizons
              </p>
            </div>

            {/* Citation */}
            <blockquote className="border-l-2 border-[#F2B705] pl-5">
              <p className="text-white/70 text-base sm:text-[17px] leading-relaxed">
                &ldquo;Depuis que j&apos;ai découvert ce que c&apos;était de voir le sol s&apos;éloigner
                à sept ans, je n&apos;ai jamais vraiment atterri. Ce projet est né d&apos;une envie
                simple&nbsp;: partager cette sensation avec ceux qui n&apos;ont jamais eu l&apos;occasion
                d&apos;y accéder. Ici, c&apos;est vous qui choisissez où on va.&rdquo;
              </p>
            </blockquote>

            {/* Badges */}
            <div className="flex flex-wrap gap-2">
              <div className="inline-flex items-center gap-1.5 bg-white/6 border border-white/12 rounded-lg px-3 py-1.5">
                <Plane size={13} className="text-[#F2B705] shrink-0" />
                <span className="text-white/75 text-[11px] font-semibold">Diamond DA40 · Charleroi EBCI</span>
              </div>
              <div className="inline-flex items-center gap-1.5 bg-white/6 border border-white/12 rounded-lg px-3 py-1.5">
                <ShieldCheck size={13} className="text-[#F2B705] shrink-0" />
                <span className="text-white/75 text-[11px] font-semibold">Assuré Air Academy New CAG</span>
              </div>
            </div>

            <Link
              href="/about"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#F2B705] hover:text-white transition-colors w-fit"
            >
              En savoir plus sur Romain et Fly Horizons
              <ArrowRight size={14} />
            </Link>
          </div>

          {/* ── Photo — colonne droite ── */}
          <div className="order-1 md:order-2 relative flex justify-center md:justify-end">
            <div className="relative w-72 sm:w-80 md:w-full max-w-sm aspect-[3/4] rounded-2xl overflow-hidden shadow-2xl">
              <Image
                src="/photo-pilote.jpg"
                alt="Romain DESTANBERG — Fondateur & Pilote Fly Horizons"
                fill
                className="object-cover object-top"
                sizes="(max-width: 768px) 320px, 420px"
              />
              {/* Subtile vignette basse */}
              <div className="absolute inset-0 bg-gradient-to-t from-[#0b2238]/50 via-transparent to-transparent" />
              {/* Cadre doré */}
              <div className="absolute inset-0 ring-1 ring-inset ring-[#F2B705]/20 rounded-2xl" />
            </div>
            {/* Accent angulaire or */}
            <div className="absolute -bottom-4 -right-4 w-20 h-20 border-b-2 border-r-2 border-[#F2B705]/25 rounded-br-2xl hidden md:block pointer-events-none" />
          </div>

        </div>
      </div>
    </section>
  );
}
