import Image from "next/image";
import Link from "next/link";
import { Header } from "@/components/layout/Header";

export const metadata = { title: "Page introuvable — Fly Horizons" };

export default function NotFound() {
  return (
    <>
      <Header />
      <main className="min-h-screen bg-white flex flex-col items-center justify-center px-4 text-center pt-[86px]">
        <Image
          src="/404.png"
          alt="Page introuvable"
          width={420}
          height={420}
          className="w-full max-w-xs sm:max-w-sm md:max-w-md mb-8 select-none"
          priority
        />
        <h1 className="text-2xl font-black text-[#0b2238] mb-2">Page introuvable</h1>
        <p className="text-[#0b2238]/50 text-sm mb-8 max-w-xs">
          Cette page n&apos;existe pas ou a été déplacée.
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-6 py-3.5 bg-[#F2B705] text-[#0b2238] rounded-xl text-sm font-black hover:bg-[#e6a800] active:scale-[0.98] transition-all shadow-sm shadow-[#F2B705]/20"
        >
          Retour à l&apos;accueil
        </Link>
      </main>
    </>
  );
}
