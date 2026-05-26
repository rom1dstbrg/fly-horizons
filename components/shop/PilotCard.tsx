import Image from "next/image";
import Link from "next/link";
import { Plane, ShieldCheck, ArrowRight } from "lucide-react";

export default function PilotCard() {
  return (
    <section className="bg-[#f5f5f7] py-14">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">

        <div className="bg-white rounded-3xl border border-border overflow-hidden shadow-sm">
          <div className="flex flex-col md:flex-row">

            {/* Photo */}
            <div className="relative md:w-56 md:shrink-0 h-64 md:h-auto bg-[#0b2238]">
              <Image
                src="/photo-pilote.jpg"
                alt="Romain DESTANBERG — Fondateur & Pilote Fly Horizons"
                fill
                className="object-cover object-top"
                sizes="(max-width: 768px) 100vw, 224px"
              />
              {/* Overlay dégradé bas sur mobile */}
              <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-black/40 to-transparent md:hidden" />
            </div>

            {/* Contenu */}
            <div className="flex-1 p-7 md:p-9 flex flex-col justify-center gap-5">

              <div>
                <p className="text-[#F2B705] text-[10px] font-bold tracking-[3px] uppercase mb-1">
                  Votre pilote
                </p>
                <h2 className="text-[#0b2238] text-xl font-extrabold leading-tight">
                  Romain DESTANBERG
                </h2>
                <p className="text-muted-foreground text-sm mt-0.5">
                  Fondateur &amp; Pilote — Fly Horizons
                </p>
              </div>

              <p className="text-foreground/70 text-sm leading-relaxed">
                Depuis que j&apos;ai découvert ce que c&apos;était de voir le sol s&apos;éloigner à sept ans,
                je n&apos;ai jamais vraiment atterri. Ce projet est né d&apos;une envie simple :
                partager cette sensation avec ceux qui n&apos;ont jamais eu l&apos;occasion d&apos;y accéder.
                Ici, c&apos;est vous qui choisissez où on va.
              </p>

              {/* Badges */}
              <div className="flex flex-wrap gap-2">
                <div className="inline-flex items-center gap-1.5 bg-[#f5f5f7] border border-border rounded-lg px-3 py-1.5">
                  <Plane size={13} className="text-[#0b2238] shrink-0" />
                  <span className="text-[#0b2238] text-[11px] font-semibold">Diamond DA40 · Charleroi EBCI</span>
                </div>
                <div className="inline-flex items-center gap-1.5 bg-[#f5f5f7] border border-border rounded-lg px-3 py-1.5">
                  <ShieldCheck size={13} className="text-[#0b2238] shrink-0" />
                  <span className="text-[#0b2238] text-[11px] font-semibold">Assuré Air Academy New CAG</span>
                </div>
              </div>

              <Link
                href="/about"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#113356] hover:text-[#F2B705] transition-colors"
              >
                En savoir plus sur Romain et Fly Horizons
                <ArrowRight size={12} />
              </Link>

            </div>
          </div>
        </div>

      </div>
    </section>
  );
}
