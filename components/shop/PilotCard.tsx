import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export default function PilotCard() {
  return (
    <section className="bg-white py-20 sm:py-28 border-t border-[#e0e5ef]">
      <div className="max-w-6xl mx-auto px-4 sm:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 lg:gap-20 items-center">

          {/* Texte — colonne gauche */}
          <div className="flex flex-col gap-7">
            <p className="text-[#F2B705] text-xs font-bold tracking-[3px] uppercase">
              Votre pilote
            </p>
            <div>
              <h2 className="text-[#0b2238] text-4xl sm:text-5xl font-black leading-[1.05] tracking-tight">
                Romain<br />DESTANBERG
              </h2>
              <p className="text-[#0b2238]/50 text-sm mt-3">
                Fondateur &amp; Pilote, Fly Horizons
              </p>
            </div>
            <p className="text-[#0b2238]/60 text-base leading-relaxed">
              Depuis que j&apos;ai découvert ce que c&apos;était de voir le sol s&apos;éloigner
              à sept ans, je n&apos;ai jamais vraiment atterri. Ce projet est né d&apos;une envie
              simple : partager cette sensation avec ceux qui n&apos;ont jamais eu l&apos;occasion
              d&apos;y accéder. Ici, c&apos;est vous qui choisissez où on va.
            </p>
            <Link
              href="/about"
              className="group inline-flex items-center gap-1.5 text-sm font-semibold text-[#0b2238] hover:text-[#F2B705] transition-colors w-fit"
            >
              En savoir plus sur Romain et Fly Horizons
              <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform duration-200" />
            </Link>
          </div>

          {/* Photo — colonne droite, hauteur fixe */}
          <div className="relative h-72 sm:h-96 rounded-2xl overflow-hidden
            shadow-[0_8px_32px_rgba(11,34,56,0.12)]">
            <Image
              src="/photo-pilote.jpg"
              alt="Romain DESTANBERG, Fondateur & Pilote Fly Horizons"
              fill
              className="object-cover object-top"
              sizes="(max-width: 768px) 100vw, 50vw"
            />
          </div>

        </div>
      </div>
    </section>
  );
}
