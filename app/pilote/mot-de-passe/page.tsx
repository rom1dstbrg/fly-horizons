"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { changePassword } from "@/lib/actions/auth";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function PiloteSetPasswordPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const result = await changePassword(formData);
      if (result?.error) setError(result.error);
      else router.push("/pilote");
    });
  }

  return (
    <div className="max-w-sm mx-auto space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-foreground">Choisissez votre mot de passe</h1>
        <p className="text-muted-foreground text-sm mt-0.5">Dernière étape avant d&apos;accéder à votre espace pilote.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
            {error}
          </div>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="password" className="text-sm font-semibold text-foreground">Mot de passe</Label>
          <Input
            id="password"
            name="password"
            type="password"
            placeholder="••••••••"
            required
            autoComplete="new-password"
            className="bg-input border-border text-foreground placeholder:text-muted-foreground/40"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="confirm" className="text-sm font-semibold text-foreground">Confirmer le mot de passe</Label>
          <Input
            id="confirm"
            name="confirm"
            type="password"
            placeholder="••••••••"
            required
            autoComplete="new-password"
            className="bg-input border-border text-foreground placeholder:text-muted-foreground/40"
          />
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="w-full py-3.5 bg-primary text-primary-foreground font-black text-sm rounded-lg hover:bg-[#e6a800] transition-colors disabled:opacity-60 cursor-pointer"
        >
          {isPending ? "Enregistrement..." : "Valider et accéder à mon espace"}
        </button>
      </form>
    </div>
  );
}
