"use client";

import { useState, useTransition } from "react";
import { createCoupon } from "@/lib/actions/coupons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function CouponForm() {
  const [type, setType] = useState<"percentage" | "fixed">("percentage");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    const formData = new FormData(e.currentTarget);
    formData.set("type", type);

    startTransition(async () => {
      const result = await createCoupon(formData);
      if (result?.error) setError(result.error);
      else {
        setSuccess("Coupon cree avec succes.");
        (e.target as HTMLFormElement).reset();
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-lg">
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

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-sm text-muted-foreground">Code *</Label>
          <Input
            name="code"
            required
            placeholder="FLYHORIZ10"
            className="bg-input border-border text-foreground placeholder:text-muted-foreground uppercase"
            onChange={(e) => e.target.value = e.target.value.toUpperCase()}
          />
        </div>

        <div className="space-y-2">
          <Label className="text-sm text-muted-foreground">Type</Label>
          <div className="flex rounded-md overflow-hidden border border-border">
            <button
              type="button"
              onClick={() => setType("percentage")}
              className={`flex-1 py-2 text-xs font-medium transition-colors ${
                type === "percentage"
                  ? "bg-primary text-primary-foreground"
                  : "bg-input text-muted-foreground hover:text-foreground"
              }`}
            >
              Pourcentage
            </button>
            <button
              type="button"
              onClick={() => setType("fixed")}
              className={`flex-1 py-2 text-xs font-medium transition-colors ${
                type === "fixed"
                  ? "bg-primary text-primary-foreground"
                  : "bg-input text-muted-foreground hover:text-foreground"
              }`}
            >
              Montant fixe
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-sm text-muted-foreground">
            Valeur * {type === "percentage" ? "(%)" : "(EUR)"}
          </Label>
          <Input
            name="value"
            type="number"
            step={type === "percentage" ? "1" : "0.01"}
            min="0"
            max={type === "percentage" ? "100" : undefined}
            required
            placeholder={type === "percentage" ? "10" : "5.00"}
            className="bg-input border-border text-foreground placeholder:text-muted-foreground"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-sm text-muted-foreground">
            Expiration (optionnel)
          </Label>
          <Input
            name="expires_at"
            type="date"
            className="bg-input border-border text-foreground"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-sm text-muted-foreground">
            Nb max d&apos;utilisations (optionnel)
          </Label>
          <Input
            name="max_uses"
            type="number"
            min="1"
            step="1"
            placeholder="ex : 10"
            className="bg-input border-border text-foreground placeholder:text-muted-foreground"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-sm text-muted-foreground">
            Max par client (optionnel)
          </Label>
          <Input
            name="max_uses_per_user"
            type="number"
            min="1"
            step="1"
            placeholder="ex : 1"
            className="bg-input border-border text-foreground placeholder:text-muted-foreground"
          />
        </div>
      </div>

      <Button
        type="submit"
        disabled={isPending}
        className="bg-primary text-primary-foreground hover:bg-gold-400 font-semibold"
      >
        {isPending ? "Creation..." : "Creer le coupon"}
      </Button>
    </form>
  );
}
