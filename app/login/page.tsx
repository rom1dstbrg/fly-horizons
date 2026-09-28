"use client";

import { useState, useTransition, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { login } from "@/lib/actions/auth";
import { Loader2, LogIn } from "lucide-react";
import { AuthShell, AuthHeading, AuthError, PasswordInput, AUTH_FIELD, AUTH_LABEL, AUTH_LINK, AUTH_SUBMIT } from "@/components/auth/AuthShell";

// Nouvelle DA (28/09), validée : voir components/auth/AuthShell.tsx.

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
      {error && <AuthError message={error} />}

      <label className="block mb-[18px]">
        <span className={AUTH_LABEL}>Email</span>
        <input name="email" type="email" required autoComplete="email" placeholder="vous@exemple.com" className={AUTH_FIELD} />
      </label>

      <div className="mb-6">
        <div className="flex items-baseline justify-between mb-2">
          <label htmlFor="password" className="text-[13px] font-bold text-foreground">Mot de passe</label>
          <Link href="/mot-de-passe-oublie" className="text-[13px] font-medium text-muted-foreground hover:text-foreground transition-colors">
            Mot de passe oublié ?
          </Link>
        </div>
        <PasswordInput
          id="password" name="password" autoComplete="current-password"
          shown={showPassword} onToggle={() => setShowPassword(v => !v)}
          labelShow="Afficher le mot de passe" labelHide="Masquer le mot de passe"
        />
      </div>

      <button type="submit" disabled={isPending} className={AUTH_SUBMIT}>
        {isPending
          ? <><Loader2 size={16} className="animate-spin" /> Connexion…</>
          : <><LogIn size={16} /> Se connecter</>}
      </button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <AuthShell>
      <AuthHeading title="Connexion." lead="Retrouvez vos demandes de vol, vos messages et vos paiements." />

      <Suspense fallback={<div className="h-[260px]" aria-hidden />}>
        <LoginForm />
      </Suspense>

      <div className="mt-8 pt-6 border-t border-border space-y-2 text-sm leading-relaxed text-foreground/70">
        <p>
          Pas encore de compte ? <Link href="/register" className={AUTH_LINK}>Créer un compte</Link>
        </p>
        <p>Vous êtes pilote ? Connectez-vous avec l&apos;email de votre invitation.</p>
      </div>
    </AuthShell>
  );
}
