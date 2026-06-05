"use client";

import Link from "next/link";
import { Header } from "@/components/layout/Header";

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <>
      <Header />
      <main className="min-h-screen bg-white flex flex-col items-center justify-center px-4 text-center pt-[86px]">
        <div className="w-16 h-16 rounded-2xl bg-[#f5f5f7] flex items-center justify-center mb-6">
          <span className="text-3xl select-none">✈️</span>
        </div>
        <h1 className="text-2xl font-black text-[#0b2238] mb-2">Une erreur est survenue</h1>
        <p className="text-[#0b2238]/50 text-sm mb-8 max-w-xs">
          Quelque chose s&apos;est mal passé. Réessayez ou revenez à l&apos;accueil.
        </p>
        <div className="flex items-center gap-3">
          <button
            onClick={reset}
            className="inline-flex items-center gap-2 px-6 py-3.5 bg-[#F2B705] text-[#0b2238] rounded-xl text-sm font-black hover:bg-[#e6a800] active:scale-[0.98] transition-all shadow-sm shadow-[#F2B705]/20 cursor-pointer"
          >
            Réessayer
          </button>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3.5 bg-[#f5f5f7] text-[#0b2238] rounded-xl text-sm font-semibold hover:bg-[#edf0f7] active:scale-[0.98] transition-all"
          >
            Retour à l&apos;accueil
          </Link>
        </div>
      </main>
    </>
  );
}
