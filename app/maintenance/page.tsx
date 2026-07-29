import type { Metadata } from "next";
import Image from "next/image";
import { Mail, Wrench, CalendarClock } from "lucide-react";
import { FaWhatsapp } from "react-icons/fa6";
import { createAdminClient } from "@/lib/supabase/admin";

export const metadata: Metadata = {
  title: { absolute: "Fly Horizons" },
  description: "Le site de Fly Horizons est en maintenance.",
  robots: { index: false, follow: false },
};

const DEFAULT_MESSAGE =
  "Les réservations restent possibles par mail ou WhatsApp, on vous répond vite.";

function formatReopenDate(value: string) {
  const date = new Date(`${value}T00:00:00`);
  if (isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("fr-BE", { dateStyle: "long" }).format(date);
}

export default async function MaintenancePage() {
  const db = createAdminClient();
  const { data: settings } = await db
    .from("crm_settings")
    .select("key, value")
    .in("key", ["maintenance_message", "maintenance_reopen_date"]);

  const get = (key: string) => settings?.find(s => s.key === key)?.value?.trim();

  const message = get("maintenance_message") || DEFAULT_MESSAGE;
  const reopenDateRaw = get("maintenance_reopen_date");
  const reopenDate = reopenDateRaw ? formatReopenDate(reopenDateRaw) : null;

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
        <div className="animate-fade-in inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#F2B705]/10 border border-[#F2B705]/25 mb-5 sm:mb-6">
          <Wrench size={11} className="text-[#F2B705]" />
          <span className="text-[10px] sm:text-xs font-bold tracking-[3px] text-[#F2B705] uppercase">
            Site en maintenance
          </span>
        </div>

        <h1 className="animate-slide-up text-5xl sm:text-7xl md:text-8xl font-black text-white leading-[0.92] tracking-tight mb-6 sm:mb-8">
          Fly Horizons
        </h1>

        <p className="animate-fade-in text-white/60 text-sm sm:text-[15px] leading-relaxed max-w-xs sm:max-w-sm mb-5">
          {message}
        </p>

        {reopenDate && (
          <div className="animate-fade-in inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.06] border border-white/10 mb-8">
            <CalendarClock size={14} className="text-[#F2B705] shrink-0" />
            <span className="text-white/70 text-xs sm:text-sm">
              Réouverture prévue le <span className="text-white font-semibold">{reopenDate}</span>
            </span>
          </div>
        )}

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

      <div className="relative z-10 pb-6 sm:pb-8 flex justify-center">
        <Image
          src="/fly-horizons-logo-white.svg"
          alt="Fly Horizons"
          width={1206}
          height={182}
          unoptimized
          className="h-7 sm:h-8 w-auto object-contain opacity-40"
          style={{ width: "auto" }}
        />
      </div>
    </main>
  );
}
