"use client";

import { useState, useTransition } from "react";
import { updateProfile } from "@/lib/actions/account";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Profile } from "@/types/database";

export function AccountForm({ profile }: { profile: Profile | null }) {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const result = await updateProfile(formData);
      if (result?.error) setError(result.error);
      else setSuccess("Profil mis a jour.");
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
      {error && (
        <div className="bg-destructive/10 border border-destructive/30 text-destructive text-sm rounded-md px-4 py-3">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-500/10 border border-green-500/30 text-green-500 text-sm rounded-md px-4 py-3">
          {success}
        </div>
      )}

      <div className="space-y-2">
        <Label className="text-sm text-muted-foreground">Nom complet</Label>
        <Input
          name="full_name"
          defaultValue={profile?.full_name ?? ""}
          placeholder="Jean Dupont"
          className="bg-input border-border text-foreground placeholder:text-muted-foreground"
        />
      </div>

      <div className="space-y-2">
        <Label className="text-sm text-muted-foreground">Telephone</Label>
        <Input
          name="phone"
          defaultValue={profile?.phone ?? ""}
          placeholder="+32 470 00 00 00"
          className="bg-input border-border text-foreground placeholder:text-muted-foreground"
        />
      </div>

      <Button
        type="submit"
        disabled={isPending}
        className="bg-primary text-primary-foreground hover:bg-gold-400 font-semibold"
      >
        {isPending ? "Sauvegarde..." : "Sauvegarder"}
      </Button>
    </form>
  );
}