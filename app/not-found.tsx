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
        <h1 className="text-2xl font-bold text-foreground mb-2">Page introuvable</h1>
        <p className="text-muted-foreground text-sm mb-8 max-w-xs">
          Cette page n&apos;existe pas ou a été déplacée.
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors"
        >
          Retour à l&apos;accueil
        </Link>
      </main>
    </>
  );
}
