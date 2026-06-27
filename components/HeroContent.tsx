"use client";

import { motion } from "framer-motion";
import { PlaneTakeoff, Route } from "lucide-react";

const ease: [number, number, number, number] = [0.25, 0.46, 0.45, 0.94];

function fadeUp(delay: number) {
  return {
    initial: { opacity: 0, y: 28 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.75, delay, ease },
  };
}

export function HeroContent({
  welcomeCode,
  welcomeDiscountLabel,
}: {
  welcomeCode: string;
  welcomeDiscountLabel: string;
}) {
  return (
    <div className="relative z-10 flex flex-col items-center justify-center h-full text-center px-4 pb-16 pt-[48px] md:pt-[76px]">

      <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-[80px] font-black text-white leading-[1.0] tracking-tight mb-6 drop-shadow-lg">
        <motion.span className="block" {...fadeUp(0)}>
          Volez où vous voulez.
        </motion.span>
        <motion.span className="block text-[#F2B705]" {...fadeUp(0.15)}>
          À votre façon.
        </motion.span>
      </h1>

      <motion.p
        className="text-white/75 text-base sm:text-lg md:text-xl leading-relaxed max-w-xl mb-10 font-light"
        {...fadeUp(0.3)}
      >
        Depuis Charleroi, itinéraire libre, jusqu&apos;à 3 passagers.
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
          Réserver un vol
        </a>
        <a
          href="#vol-sur-mesure"
          className="inline-flex items-center justify-center gap-2 px-7 py-3.5 bg-white/10 text-white border border-white/30 rounded-lg font-semibold text-sm hover:bg-white/20 hover:border-white/50 transition-all backdrop-blur-sm"
        >
          <Route size={16} />
          Vol sur mesure
        </a>
      </motion.div>

      <motion.div
        className="mt-6 flex flex-col items-center gap-1.5"
        {...fadeUp(0.65)}
      >
        <p className="text-sm text-white/80">
          Utilisez le code{" "}
          <span className="font-mono font-black text-[#F2B705] bg-[#F2B705]/10 border border-[#F2B705]/30 rounded px-2 py-0.5">
            {welcomeCode}
          </span>
          {" "}pour {welcomeDiscountLabel}
        </p>
      </motion.div>

    </div>
  );
}
