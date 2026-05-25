import Image from "next/image";
import { BadgeCheck, Plane, ShieldCheck } from "lucide-react";

export default function PilotCard() {
  return (
    <section className="py-16 bg-[#07192b]">
      <div className="container-shop max-w-4xl">

        {/* Eyebrow */}
        <p className="text-[#F2B705] text-[11px] font-bold tracking-[3px] uppercase mb-8 text-center">
          Votre pilote
        </p>

        <div className="flex flex-col md:flex-row items-center md:items-start gap-10">

          {/* Photo */}
          <div className="shrink-0">
            <div className="relative w-40 h-40 md:w-48 md:h-48 rounded-2xl overflow-hidden border border-white/10">
              <Image
                src="/photo-pilote.jpg"
                alt="Romain DESTANBERG — Fondateur & Pilote Fly Horizons"
                fill
                className="object-cover object-top"
                sizes="(max-width: 768px) 160px, 192px"
              />
            </div>
          </div>

          {/* Bio */}
          <div className="flex-1 text-center md:text-left">
            <h2 className="text-white text-2xl font-extrabold leading-tight mb-1">
              Romain DESTANBERG
            </h2>
            <p className="text-[#F2B705] text-sm font-semibold mb-5">
              Fondateur &amp; Pilote — Fly Horizons
            </p>

            <p className="text-white/75 text-sm leading-relaxed mb-5">
              Depuis que j&apos;ai découvert ce que c&apos;était de voir le sol s&apos;éloigner à sept ans,
              je n&apos;ai jamais vraiment atterri. Ce projet est né d&apos;une envie simple :
              partager cette sensation avec ceux qui n&apos;ont jamais eu l&apos;occasion d&apos;y accéder.
              Pas en spectateur — en copilote. Ici, c&apos;est vous qui choisissez où on va.
              La sécurité reste ma priorité absolue ; le reste, on le construit ensemble.
            </p>

            {/* Badges */}
            <div className="flex flex-wrap justify-center md:justify-start gap-3">
              <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3.5 py-2">
                <BadgeCheck size={14} className="text-[#F2B705] shrink-0" />
                <span className="text-white text-[12px] font-semibold">Licence CPL(A)</span>
              </div>
              <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3.5 py-2">
                <Plane size={14} className="text-[#F2B705] shrink-0" />
                <span className="text-white text-[12px] font-semibold">DA40 TDI · Charleroi EBCI</span>
              </div>
              <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3.5 py-2">
                <ShieldCheck size={14} className="text-[#F2B705] shrink-0" />
                <span className="text-white text-[12px] font-semibold">Assuré Air Academy New CAG</span>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
