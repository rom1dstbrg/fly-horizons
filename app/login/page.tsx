"use client";

import { useState, useTransition, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { login } from "@/lib/actions/auth";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, ShieldCheck } from "lucide-react";

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
    <div className="card-premium p-8">
      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
            {error}
          </div>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="email" className="text-sm font-semibold text-foreground">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            placeholder="vous@exemple.com"
            required
            autoComplete="email"
            className="bg-input border-border text-foreground placeholder:text-muted-foreground/40 focus:border-foreground focus:bg-card transition-colors"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="password" className="text-sm font-semibold text-foreground">Mot de passe</Label>
          <div className="relative">
            <Input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              required
              autoComplete="current-password"
              className="bg-input border-border text-foreground pr-10 focus:border-foreground focus:bg-card transition-colors"
            />
            <button
              type="button"
              onClick={() => setShowPassword(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              tabIndex={-1}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="w-full py-3.5 bg-primary text-primary-foreground font-black text-sm rounded-lg hover:bg-[#e6a800] transition-colors shadow-gold disabled:opacity-60 cursor-pointer"
        >
          {isPending ? "Connexion..." : "Se connecter"}
        </button>
      </form>

      <p className="text-center text-sm text-muted-foreground mt-6">
        Pas encore de compte ?{" "}
        <Link href="/register" className="text-foreground font-semibold hover:text-primary transition-colors">
          Créer un compte
        </Link>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-navy px-4 py-16">
      <div className="w-full max-w-md">

        <h1 className="text-4xl font-black text-foreground text-center leading-none tracking-tight mb-8">
          Connexion
        </h1>

        <Suspense fallback={
          <div className="card-premium p-8 text-center text-muted-foreground text-sm">
            Chargement...
          </div>
        }>
          <LoginForm />
        </Suspense>

        <div className="flex items-center justify-center gap-1.5 mt-6 text-[11px] text-muted-foreground/70">
          <ShieldCheck size={12} />
          <span>Connexion sécurisée · Données chiffrées</span>
        </div>

      </div>
    </main>
  );
}
