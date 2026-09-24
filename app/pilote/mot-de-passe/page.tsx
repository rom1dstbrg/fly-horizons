"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { changePassword } from "@/lib/actions/auth";
import { Button, FormField, Input, PageHeader } from "@/components/pilote/studio";

// Arrivée depuis l'invitation pilote (premier mot de passe) ou depuis « Mon
// profil » (changement) : même formulaire, retour à l'accueil pilote ensuite.
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
    <div className="mx-auto w-full max-w-lg space-y-5">
      <PageHeader title="Mot de passe" back={{ href: "/pilote/profil", label: "Mon profil" }} />

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <p className="rounded-[12px] bg-st-bad-soft px-3.5 py-2.5 text-[13px] text-st-bad">{error}</p>}

        <FormField id="password" label="Nouveau mot de passe">
          <Input id="password" name="password" type="password" placeholder="••••••••" required autoComplete="new-password" />
        </FormField>
        <FormField id="confirm" label="Confirmer le mot de passe">
          <Input id="confirm" name="confirm" type="password" placeholder="••••••••" required autoComplete="new-password" />
        </FormField>

        <Button type="submit" size="lg" fullWidth loading={isPending} className="sm:h-[38px] sm:text-[13px]">
          {isPending ? "Enregistrement…" : "Enregistrer le mot de passe"}
        </Button>
      </form>
    </div>
  );
}
