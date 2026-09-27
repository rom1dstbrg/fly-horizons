"use client";

import { useState, useTransition } from "react";
import { changePassword } from "@/lib/actions/auth";
import { Button, FormField, Input, PageHeader } from "@/components/pilote/studio";

export function SetPasswordForm({ first }: { first: boolean }) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const result = await changePassword(formData);
      if (result?.error) setError(result.error);
      // Rechargement complet : la navigation réapparaît (layout recalculé).
      else window.location.href = "/pilote";
    });
  }

  return (
    <div className="mx-auto w-full max-w-lg space-y-5">
      {first ? (
        <PageHeader
          title="Choisissez votre mot de passe"
          description="Dernière étape avant d'entrer dans l'espace pilote. Vous l'utiliserez pour vous reconnecter."
        />
      ) : (
        <PageHeader title="Mot de passe" back={{ href: "/pilote/profil", label: "Mon profil" }} />
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <p className="rounded-[12px] bg-st-bad-soft px-3.5 py-2.5 text-[13px] text-st-bad">{error}</p>}

        <FormField id="password" label="Nouveau mot de passe" hint="8 caractères minimum">
          <Input id="password" name="password" type="password" placeholder="••••••••" required minLength={8} autoComplete="new-password" />
        </FormField>
        <FormField id="confirm" label="Confirmer le mot de passe">
          <Input id="confirm" name="confirm" type="password" placeholder="••••••••" required minLength={8} autoComplete="new-password" />
        </FormField>

        <Button type="submit" size="lg" fullWidth loading={isPending} className="sm:h-[38px] sm:text-[13px]">
          {isPending ? "Enregistrement…" : first ? "Entrer dans l'espace pilote" : "Enregistrer le mot de passe"}
        </Button>
      </form>
    </div>
  );
}
