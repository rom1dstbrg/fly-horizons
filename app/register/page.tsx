"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { register } from "@/lib/actions/auth";
import { Check, Loader2, UserPlus, ArrowLeft } from "lucide-react";
import { AuthShell, AuthHeading, AuthError, PasswordInput, AUTH_FIELD, AUTH_LABEL, AUTH_LINK, AUTH_SUBMIT } from "@/components/auth/AuthShell";

// Nouvelle DA (28/09) : même cadre que /login (components/auth/AuthShell.tsx) et
// confirmation sur place après l'envoi, même schéma que ContactForm.

export default function RegisterPage() {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

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
    const confirm = formData.get("confirm_password") as string;
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

  if (success) {
    return (
      <AuthShell>
        <div role="status">
          <div className="w-12 h-12 rounded-full bg-primary text-[#0b2238] grid place-items-center mb-[18px]">
            <Check size={22} strokeWidth={2.5} />
          </div>
          <h1 className="text-[26px] font-black text-foreground mb-2.5">Vérifiez vos emails.</h1>
          <p className="text-[15px] leading-[1.7] text-foreground/75 mb-2">
            Nous vous avons envoyé un lien de confirmation. Cliquez dessus pour activer votre compte.
          </p>
          <p className="text-[15px] leading-[1.7] text-foreground/75">Pensez à vérifier vos spams si rien n&apos;arrive.</p>
          <div className="flex flex-wrap gap-2.5 mt-[22px]">
            <Link href="/login" className="inline-flex items-center gap-2 px-5 py-3 bg-white border border-border text-foreground rounded-[10px] text-sm font-bold hover:border-foreground transition-colors">
              Se connecter
            </Link>
            <Link href="/" className="inline-flex items-center gap-2 px-5 py-3 bg-white border border-border text-foreground rounded-[10px] text-sm font-bold hover:border-foreground transition-colors">
              <ArrowLeft size={15} /> Retour à l&apos;accueil
            </Link>
          </div>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <AuthHeading title="Créer un compte." lead="Pour suivre vos demandes de vol, échanger avec le pilote et retrouver vos paiements." />

      <form onSubmit={handleSubmit}>
        {/* Honeypot — caché des humains, rempli par les bots */}
        <input type="text" name="_hp" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" />

        {error && <AuthError message={error} />}

        <label className="block mb-[18px]">
          <span className={AUTH_LABEL}>Nom complet</span>
          <input name="full_name" type="text" required autoComplete="name" placeholder="Jean Dupont" className={AUTH_FIELD} />
        </label>

        <label className="block mb-[18px]">
          <span className={AUTH_LABEL}>Email</span>
          <input name="email" type="email" required autoComplete="email" placeholder="vous@exemple.com" className={AUTH_FIELD} />
        </label>

        <div className="mb-[18px]">
          <label htmlFor="password" className={AUTH_LABEL}>
            Mot de passe <span className="font-medium text-muted-foreground">(8 caractères minimum)</span>
          </label>
          <PasswordInput
            id="password" name="password" autoComplete="new-password"
            shown={showPassword} onToggle={() => setShowPassword(v => !v)}
            labelShow="Afficher le mot de passe" labelHide="Masquer le mot de passe"
          />
        </div>

        <div className="mb-6">
          <label htmlFor="confirm_password" className={AUTH_LABEL}>Confirmer le mot de passe</label>
          <PasswordInput
            id="confirm_password" name="confirm_password" autoComplete="new-password"
            shown={showConfirm} onToggle={() => setShowConfirm(v => !v)}
            labelShow="Afficher la confirmation" labelHide="Masquer la confirmation"
          />
        </div>

        <button type="submit" disabled={isPending} className={AUTH_SUBMIT}>
          {isPending
            ? <><Loader2 size={16} className="animate-spin" /> Création…</>
            : <><UserPlus size={16} /> Créer mon compte</>}
        </button>
      </form>

      <div className="mt-8 pt-6 border-t border-border text-sm leading-relaxed text-foreground/70">
        <p>
          Déjà un compte ? <Link href="/login" className={AUTH_LINK}>Se connecter</Link>
        </p>
      </div>
    </AuthShell>
  );
}
