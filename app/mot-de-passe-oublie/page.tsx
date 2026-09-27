"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { requestPasswordReset } from "@/lib/actions/auth";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// Même habillage que /login. Message de confirmation identique que l'adresse
// ait un compte ou non (voir requestPasswordReset).
export default function MotDePasseOubliePage() {
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const result = await requestPasswordReset(formData);
      if (result?.error) setError(result.error);
      else setSent(true);
    });
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-navy px-4 py-16">
      <div className="w-full max-w-md">
        <h1 className="text-4xl font-black text-foreground text-center leading-none tracking-tight mb-8">
          Mot de passe oublié
        </h1>

        <div className="card-premium p-8">
          {sent ? (
            <p className="text-sm text-foreground leading-relaxed">
              Si un compte existe avec cette adresse, vous allez recevoir un email avec un lien pour choisir
              un nouveau mot de passe. Pensez à regarder dans vos spams.
            </p>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
                  {error}
                </div>
              )}

              <p className="text-sm text-muted-foreground leading-relaxed">
                Indiquez l&apos;email de votre compte : nous vous envoyons un lien pour choisir un nouveau mot de passe.
              </p>

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

              <button
                type="submit"
                disabled={isPending}
                className="w-full py-3.5 bg-primary text-primary-foreground font-black text-sm rounded-lg hover:bg-[#e6a800] transition-colors shadow-gold disabled:opacity-60 cursor-pointer"
              >
                {isPending ? "Envoi..." : "Recevoir le lien"}
              </button>
            </form>
          )}

          <p className="text-center text-sm text-muted-foreground mt-6">
            <Link href="/login" className="text-foreground font-semibold hover:text-primary transition-colors">
              Retour à la connexion
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
