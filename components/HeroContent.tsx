"use client";

import { motion } from "framer-motion";
import { PlaneTakeoff, CircleHelp } from "lucide-react";

const ease: [number, number, number, number] = [0.25, 0.46, 0.45, 0.94];

function fadeUp(delay: number) {
  return {
    initial: { opacity: 0, y: 28 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.75, delay, ease },
  };
}

export function HeroContent() {
  return (
    <div className="relative z-10 flex flex-col items-center justify-center h-full text-center px-4 pb-16 pt-[48px] md:pt-[76px]">

      <motion.p
        className="text-xs sm:text-sm font-bold text-[#F2B705] uppercase tracking-[3px] mb-5 drop-shadow"
        {...fadeUp(0)}
      >
        Vol partagé en Belgique
      </motion.p>

      <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-[80px] font-black text-white leading-[1.0] tracking-tight mb-6 drop-shadow-lg">
        {/* 28/09 : « Volez où vous voulez. À votre façon. » laissait croire que le passager
            choisit sa route ; en partage de frais, c'est le pilote qui publie son vol. */}
        <motion.span className="block" {...fadeUp(0.1)}>
          Prenez place à&nbsp;bord.
        </motion.span>
        <motion.span className="block text-[#F2B705]" {...fadeUp(0.25)}>
          Partagez le ciel.
        </motion.span>
      </h1>

      <motion.p
        className="text-white/75 text-base sm:text-lg md:text-xl leading-relaxed max-w-xl mb-10 font-light"
        {...fadeUp(0.4)}
      >
        Des pilotes privés partagent leurs vols au départ de Charleroi. Vous ne payez que votre part des frais.
      </motion.p>

      <motion.div
        className="flex flex-col sm:flex-row gap-3 justify-center"
        {...fadeUp(0.5)}
      >
        <a
          href="#nos-vols"
          className="inline-flex items-center justify-center gap-2 px-7 py-3.5 bg-[#F2B705] text-[#0b2238] rounded-lg font-bold text-sm hover:bg-[#e6a800] transition-all shadow-[0_8px_30px_rgba(242,183,5,.35)] hover:-translate-y-0.5 active:translate-y-0"
        >
          <PlaneTakeoff size={16} />
          Voir les vols
        </a>
        <a
          href="#principe"
          className="inline-flex items-center justify-center gap-2 px-7 py-3.5 bg-white/10 text-white border border-white/30 rounded-lg font-semibold text-sm hover:bg-white/20 hover:border-white/50 transition-all backdrop-blur-sm"
        >
          <CircleHelp size={16} />
          Comment ça marche
        </a>
      </motion.div>

    </div>
  );
}
