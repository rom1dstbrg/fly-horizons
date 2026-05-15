"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { register } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff } from "lucide-react";

export default function RegisterPage() {
  const [error, setError]            = useState<string | null>(null);
  const [success, setSuccess]        = useState(false);
  const [isPending, startTransition] = useTransition();
  const [showPassword, setShowPassword] = useState(false);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const result = await register(formData);
      if (result?.error) setError(result.error);
      else setSuccess(true);
    });
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-navy px-4">
      <div className="w-full max-w-md">

        <div className="text-center mb-8">
          <Link href="/">
            <span className="text-2xl font-semibold text-gold-gradient">
              Fly Horizons Shop
            </span>
          </Link>
          <p className="text-muted-foreground text-sm mt-2">
            Créez votre compte
          </p>
        </div>

        <div className="card-premium p-8">
          {success ? (
            <div className="text-center space-y-4">
              <div className="text-4xl">✉️</div>
              <h2 className="text-lg font-semibold text-foreground">
                Vérifiez vos emails
              </h2>
              <p className="text-sm text-muted-foreground">
                Un lien de confirmation a été envoyé à votre adresse email.
                Cliquez dessus pour activer votre compte.
              </p>
              <p className="text-xs text-muted-foreground">
                Pensez à vérifier vos spams si vous ne le trouvez pas.
              </p>
            </div>
          ) : (
          <>
          <form onSubmit={handleSubmit} className="space-y-5">

            {error && (
              <div className="bg-destructive/10 border border-destructive/30 text-destructive text-sm rounded-md px-4 py-3">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="full_name" className="text-foreground">
                Nom complet
              </Label>
              <Input
                id="full_name"
                name="full_name"
                type="text"
                placeholder="Jean Dupont"
                required
                autoComplete="name"
                className="bg-input border-border text-foreground placeholder:text-muted-foreground"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-foreground">
                Email
              </Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="vous@exemple.com"
                required
                autoComplete="email"
                className="bg-input border-border text-foreground placeholder:text-muted-foreground"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-foreground">
                Mot de passe
                <span className="text-muted-foreground font-normal ml-1 text-xs">
                  (8 caractères minimum)
                </span>
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  required
                  autoComplete="new-password"
                  className="bg-input border-border text-foreground pr-10"
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

            <Button
              type="submit"
              disabled={isPending}
              className="w-full bg-primary text-primary-foreground hover:bg-gold-400 font-semibold"
            >
              {isPending ? "Création..." : "Créer mon compte"}
            </Button>

          </form>

          <p className="text-center text-sm text-muted-foreground mt-6">
            Déjà un compte ?{" "}
            <Link
              href="/login"
              className="text-primary hover:text-gold-400 font-medium transition-colors"
            >
              Se connecter
            </Link>
          </p>
          </>
          )}
        </div>

      </div>
    </main>
  );
}