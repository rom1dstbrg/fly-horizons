"use client";

import { useState, useTransition } from "react";
import { updateShippingSettings } from "@/lib/actions/settings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface ShippingRate {
  id: string;
  country_code: string;
  country_name: string;
  rate_standard: number;
  active: boolean;
}

interface ShippingSettingsFormProps {
  rates: ShippingRate[];
  freeShippingThreshold: number;
}

export function ShippingSettingsForm({ rates, freeShippingThreshold }: ShippingSettingsFormProps) {
  const [rateValues, setRateValues] = useState<Record<string, string>>(
    Object.fromEntries(rates.map((r) => [r.id, String(r.rate_standard)]))
  );
  const [threshold, setThreshold] = useState(String(freeShippingThreshold));
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    startTransition(async () => {
      const result = await updateShippingSettings(rateValues, threshold);
      if (result?.error) setError(result.error);
      else setSuccess("Parametres sauvegardes.");
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
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

      {/* Frais livraison gratuite */}
      <div className="card-premium p-6 space-y-3">
        <h2 className="font-semibold text-foreground">Livraison gratuite</h2>
        <div className="space-y-2">
          <Label className="text-sm text-muted-foreground">
            Seuil de livraison gratuite (EUR)
          </Label>
          <Input
            type="number"
            step="0.01"
            min="0"
            value={threshold}
            onChange={(e) => setThreshold(e.target.value)}
            className="bg-input border-border text-foreground max-w-xs"
          />
          <p className="text-xs text-muted-foreground">
            Mettre 0 pour desactiver la livraison gratuite.
          </p>
        </div>
      </div>

      {/* Frais par pays */}
      <div className="card-premium p-6 space-y-4">
        <h2 className="font-semibold text-foreground">Frais de livraison par pays</h2>
        <div className="space-y-3">
          {rates.map((rate) => (
            <div key={rate.id} className="flex items-center gap-4">
              <span className="text-sm text-foreground w-32">{rate.country_name}</span>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={rateValues[rate.id] ?? ""}
                  onChange={(e) =>
                    setRateValues((prev) => ({ ...prev, [rate.id]: e.target.value }))
                  }
                  className="bg-input border-border text-foreground w-24"
                />
                <span className="text-sm text-muted-foreground">EUR</span>
              </div>
            </div>
          ))}
        </div>
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