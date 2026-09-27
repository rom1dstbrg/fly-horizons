"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { changePassword } from "@/lib/actions/auth";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// Arrivée depuis le lien « mot de passe oublié » : /auth/callback a déjà ouvert
// la session. Après enregistrement, /login renvoie vers l'espace du rôle
// (middleware : admin, pilote ou compte client).
export default function ReinitialiserMotDePassePage() {
  const [error, setError] = useState<string | null>(null);
  const [expired, setExpired] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const result = await changePassword(formData);
      if (result?.error === "Non authentifié") setExpired(true);
      else if (result?.error) setError(result.error);
      else window.location.href = "/login";
    });
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-navy px-4 py-16">
      <div className="w-full max-w-md">
        <h1 className="text-4xl font-black text-foreground text-center leading-none tracking-tight mb-8">
          Nouveau mot de passe
        </h1>

        <div className="card-premium p-8">
          {expired ? (
            <p className="text-sm text-foreground leading-relaxed">
              Ce lien n&apos;est plus valable.{" "}
              <Link href="/mot-de-passe-oublie" className="font-semibold underline hover:text-primary cursor-pointer">
                Demander un nouveau lien
              </Link>
            </p>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
                  {error}
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-sm font-semibold text-foreground">Nouveau mot de passe</Label>
                <Input id="password" name="password" type="password" placeholder="••••••••" required minLength={8}
                  autoComplete="new-password" className="bg-input border-border text-foreground focus:border-foreground focus:bg-card transition-colors" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="confirm" className="text-sm font-semibold text-foreground">Confirmer le mot de passe</Label>
                <Input id="confirm" name="confirm" type="password" placeholder="••••••••" required minLength={8}
                  autoComplete="new-password" className="bg-input border-border text-foreground focus:border-foreground focus:bg-card transition-colors" />
              </div>

              <button
                type="submit"
                disabled={isPending}
                className="w-full py-3.5 bg-primary text-primary-foreground font-black text-sm rounded-lg hover:bg-[#e6a800] transition-colors shadow-gold disabled:opacity-60 cursor-pointer"
              >
                {isPending ? "Enregistrement..." : "Enregistrer le mot de passe"}
              </button>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}
