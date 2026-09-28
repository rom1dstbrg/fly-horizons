"use client";

import { useState, useTransition, Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { login } from "@/lib/actions/auth";
import { ArrowLeft, Eye, EyeOff, Loader2, LogIn } from "lucide-react";

// Nouvelle DA (28/09) : fond blanc, une colonne étroite, mêmes champs et même bouton
// que ContactForm. Page hors du layout public (pas de header ni de footer) : le logo
// et « Retour au site » ramènent à l'accueil.

const FIELD = "w-full h-[52px] rounded-xl border border-border bg-secondary px-4 text-[15px] text-foreground placeholder:text-[#8a94a6] outline-none transition-colors focus:bg-white focus:border-foreground";
const LABEL = "block text-[13px] font-bold text-foreground mb-2";
const LINK = "font-semibold text-[#0b2238] underline decoration-[#0b2238]/25 underline-offset-[3px] hover:decoration-primary transition-colors";

function LoginForm() {
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirectTo") ?? "";
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [showPassword, setShowPassword] = useState(false);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    if (redirectTo) formData.set("redirectTo", redirectTo);

    startTransition(async () => {
      const result = await login(formData);
      if (result?.error) setError(result.error);
    });
  }

  return (
    <form onSubmit={handleSubmit}>
      {error && (
        <p role="alert" className="mb-[18px] rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {error}
        </p>
      )}

      <label className="block mb-[18px]">
        <span className={LABEL}>Email</span>
        <input name="email" type="email" required autoComplete="email" placeholder="vous@exemple.com" className={FIELD} />
      </label>

      <div className="mb-6">
        <div className="flex items-baseline justify-between mb-2">
          <label htmlFor="password" className="text-[13px] font-bold text-foreground">Mot de passe</label>
          <Link href="/mot-de-passe-oublie" className="text-[13px] font-medium text-muted-foreground hover:text-foreground transition-colors">
            Mot de passe oublié ?
          </Link>
        </div>
        <div className="relative">
          <input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            required
            autoComplete="current-password"
            placeholder="••••••••"
            className={`${FIELD} pr-12`}
          />
          <button
            type="button"
            onClick={() => setShowPassword(v => !v)}
            className="absolute right-2 top-1/2 -translate-y-1/2 grid h-9 w-9 place-items-center rounded-lg text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
          >
            {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
          </button>
        </div>
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="w-full inline-flex items-center justify-center gap-2 px-[26px] py-[15px] bg-primary text-[#0b2238] rounded-[10px] text-[15px] font-black hover:bg-[#e6a800] disabled:opacity-50 transition-colors shadow-gold cursor-pointer"
      >
        {isPending
          ? <><Loader2 size={16} className="animate-spin" /> Connexion…</>
          : <><LogIn size={16} /> Se connecter</>}
      </button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-white flex flex-col">
      <div className="max-w-[1400px] w-full mx-auto px-4 sm:px-6 xl:px-10 pt-5 sm:pt-7 flex items-center justify-between">
        <Link href="/" aria-label="Fly Horizons, accueil">
          <Image src="/fly-horizons-logo-navy.svg" alt="Fly Horizons" width={160} height={32} priority className="h-8 w-auto" />
        </Link>
        <Link href="/" className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft size={14} /> Retour au site
        </Link>
      </div>

      <div className="flex-1 flex items-start sm:items-center justify-center px-4 pt-12 pb-16 sm:py-16">
        <div className="w-full max-w-[420px]">
          <p className="text-[11px] font-bold text-primary uppercase tracking-[3px] mb-3">Mon compte</p>
          <h1 className="text-[34px] lg:text-[40px] font-black text-foreground leading-[1.03] tracking-[-0.02em]">
            Connexion.
          </h1>
          <p className="mt-3 mb-7 text-[15px] leading-[1.7] text-foreground/75">
            Retrouvez vos demandes de vol, vos messages et vos paiements.
          </p>

          <Suspense fallback={<div className="h-[260px]" aria-hidden />}>
            <LoginForm />
          </Suspense>

          <div className="mt-8 pt-6 border-t border-border space-y-2 text-sm leading-relaxed text-foreground/70">
            <p>
              Pas encore de compte ? <Link href="/register" className={LINK}>Créer un compte</Link>
            </p>
            <p>
              Vous êtes pilote ? Connectez-vous avec l&apos;email de votre invitation.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
