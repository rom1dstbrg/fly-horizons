"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { register } from "@/lib/actions/auth";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, Mail, ShieldCheck } from "lucide-react";

export default function RegisterPage() {
  const [error, setError]            = useState<string | null>(null);
  const [success, setSuccess]        = useState(false);
  const [isPending, startTransition] = useTransition();
  const [showPassword, setShowPassword]  = useState(false);
  const [showConfirm, setShowConfirm]    = useState(false);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const formData = new FormData(e.currentTarget);

    // Honeypot — si rempli, c'est un bot
    if (formData.get("_hp")) {
      setSuccess(true);
      return;
    }

    const password = formData.get("password") as string;
    const confirm  = formData.get("confirm_password") as string;

    if (password !== confirm) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }

    startTransition(async () => {
      const result = await register(formData);
      if (result?.error) setError(result.error);
      else setSuccess(true);
    });
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-navy px-4 py-16">
      <div className="w-full max-w-md">

        <h1 className="text-4xl font-black text-foreground text-center leading-none tracking-tight mb-8">
          Créer un compte
        </h1>

        <div className="card-premium p-8">
          {success ? (
            <div className="text-center space-y-4 py-4">
              <div className="w-14 h-14 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto">
                <Mail size={24} className="text-primary" />
              </div>
              <h2 className="text-lg font-black text-foreground">Vérifiez vos emails</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Un lien de confirmation a été envoyé à votre adresse email.
                Cliquez dessus pour activer votre compte.
              </p>
              <p className="text-xs text-muted-foreground/70">
                Pensez à vérifier vos spams si vous ne le trouvez pas.
              </p>
            </div>
          ) : (
            <>
              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Honeypot — caché des humains, rempli par les bots */}
                <input
                  type="text"
                  name="_hp"
                  tabIndex={-1}
                  autoComplete="off"
                  aria-hidden="true"
                  className="hidden"
                />

                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
                    {error}
                  </div>
                )}

                <div className="space-y-1.5">
                  <Label htmlFor="full_name" className="text-sm font-semibold text-foreground">Nom complet</Label>
                  <Input
                    id="full_name"
                    name="full_name"
                    type="text"
                    placeholder="Jean Dupont"
                    required
                    autoComplete="name"
                    className="bg-input border-border text-foreground placeholder:text-muted-foreground/40 focus:border-foreground focus:bg-card transition-colors"
                  />
                </div>

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
                  <Label htmlFor="password" className="text-sm font-semibold text-foreground">
                    Mot de passe
                    <span className="text-muted-foreground font-normal ml-1 text-xs">(8 caractères minimum)</span>
                  </Label>
                  <div className="relative">
                    <Input
                      id="password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      required
                      autoComplete="new-password"
                      className="bg-input border-border text-foreground pr-10 focus:border-foreground focus:bg-card transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      tabIndex={-1}
                      aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="confirm_password" className="text-sm font-semibold text-foreground">
                    Confirmer le mot de passe
                  </Label>
                  <div className="relative">
                    <Input
                      id="confirm_password"
                      name="confirm_password"
                      type={showConfirm ? "text" : "password"}
                      placeholder="••••••••"
                      required
                      autoComplete="new-password"
                      className="bg-input border-border text-foreground pr-10 focus:border-foreground focus:bg-card transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      tabIndex={-1}
                      aria-label={showConfirm ? "Masquer la confirmation" : "Afficher la confirmation"}
                    >
                      {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isPending}
                  className="w-full py-3.5 bg-primary text-primary-foreground font-black text-sm rounded-lg hover:bg-[#e6a800] transition-colors shadow-gold disabled:opacity-60 cursor-pointer"
                >
                  {isPending ? "Création..." : "Créer mon compte"}
                </button>
              </form>

              <p className="text-center text-sm text-muted-foreground mt-6">
                Déjà un compte ?{" "}
                <Link href="/login" className="text-foreground font-semibold hover:text-primary transition-colors">
                  Se connecter
                </Link>
              </p>
            </>
          )}
        </div>

        <div className="flex items-center justify-center gap-1.5 mt-6 text-[11px] text-muted-foreground/70">
          <ShieldCheck size={12} />
          <span>Compte sécurisé · Données chiffrées</span>
        </div>

      </div>
    </main>
  );
}
