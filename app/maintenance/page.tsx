import type { Metadata } from "next";
import { Mail } from "lucide-react";
import { FaWhatsapp } from "react-icons/fa6";

export const metadata: Metadata = {
  title: { absolute: "Fly Horizons" },
  description: "Le site de Fly Horizons est en maintenance.",
  robots: { index: false, follow: false },
};

export default function MaintenancePage() {
  return (
    <main className="relative h-dvh w-full overflow-hidden flex flex-col">

      {/* Vidéo de fond — floutée et assombrie */}
      <video
        autoPlay loop muted playsInline
        preload="auto"
        poster="/gallery/10.jpg"
        className="absolute inset-0 w-full h-full object-cover scale-105 blur-md"
      >
        <source src="/Vol-Rev%202.2.mp4" type="video/mp4" />
      </video>
      <div className="absolute inset-0 bg-gradient-to-b from-black/58 via-black/42 to-black/72" />

      {/* Lueur douce derrière l'horizon */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[140vw] h-[55vh] rounded-full bg-[#F2B705]/[0.14] blur-[110px]"
      />

      {/* ═══ Contenu ═══ */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 text-center">
        <p className="animate-fade-in text-[10px] sm:text-xs font-bold tracking-[6px] text-[#F2B705] uppercase mb-4 sm:mb-5">
          Site en maintenance
        </p>
        <h1 className="animate-slide-up text-5xl sm:text-7xl md:text-8xl font-black text-white leading-[0.92] tracking-tight mb-6 sm:mb-8">
          Fly Horizons
        </h1>
        <p className="animate-fade-in text-white/60 text-sm sm:text-[15px] leading-relaxed max-w-xs sm:max-w-sm mb-8">
          On prépare la suite. Pour toute question, écrivez-nous directement,
          on vous répond vite.
        </p>

        <div className="animate-slide-up flex flex-col sm:flex-row gap-3">
          <a
            href="mailto:info@fly-horizons.com"
            className="cursor-pointer inline-flex items-center justify-center gap-2.5 px-6 py-3.5 bg-[#F2B705] text-[#0b2238] rounded-lg text-sm font-black hover:bg-[#e6a800] transition-colors shadow-lg shadow-[#F2B705]/20"
          >
            <Mail size={16} />
            info@fly-horizons.com
          </a>
          <a
            href="https://wa.me/32472324135"
            target="_blank"
            rel="noopener noreferrer"
            className="cursor-pointer inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-[#25D366] text-white rounded-lg text-sm font-bold hover:bg-[#1ebe5d] transition-colors"
          >
            <FaWhatsapp size={16} />
            WhatsApp
          </a>
        </div>
      </div>

      <p className="relative z-10 pb-6 sm:pb-8 text-center font-mono text-[10px] tracking-[3px] text-white/30 uppercase">
        EBCI · Charleroi, Belgique
      </p>
    </main>
  );
}
