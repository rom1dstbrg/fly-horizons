"use client";

import { useState, useEffect, useTransition } from "react";
import { updateShippingSettings, addShippingCountry, deleteShippingCountry } from "@/lib/actions/settings";
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
  const [activeValues, setActiveValues] = useState<Record<string, boolean>>(
    Object.fromEntries(rates.map((r) => [r.id, r.active]))
  );
  const [threshold, setThreshold] = useState(String(freeShippingThreshold));
  const [newCode, setNewCode] = useState("");
  const [newName, setNewName] = useState("");
  const [newRate, setNewRate] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isPendingAdd, startTransitionAdd] = useTransition();
  const [isPendingDelete, startTransitionDelete] = useTransition();

  useEffect(() => {
    setRateValues(Object.fromEntries(rates.map((r) => [r.id, String(r.rate_standard)])));
    setActiveValues(Object.fromEntries(rates.map((r) => [r.id, r.active])));
  }, [rates]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      const result = await updateShippingSettings(rateValues, activeValues, threshold);
      if (result?.error) setError(result.error);
      else setSuccess("Parametres sauvegardes.");
    });
  }

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const rate = parseFloat(newRate);
    if (!newCode || !newName || isNaN(rate)) return;
    setError(null);
    setSuccess(null);
    startTransitionAdd(async () => {
      const result = await addShippingCountry(newCode, newName, rate);
      if (result?.error) setError(result.error);
      else {
        setNewCode("");
        setNewName("");
        setNewRate("");
        setSuccess("Pays ajoute.");
      }
    });
  }

  function handleDelete(id: string) {
    setError(null);
    setSuccess(null);
    startTransitionDelete(async () => {
      const result = await deleteShippingCountry(id);
      if (result?.error) setError(result.error);
      else setSuccess("Pays supprime.");
    });
  }

  return (
    <div className="space-y-6">
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

      <form onSubmit={handleSubmit} className="space-y-6">
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
              <div key={rate.id} className="flex items-center gap-3 flex-wrap">
                <span className="text-xs text-muted-foreground w-8 shrink-0 font-mono uppercase">
                  {rate.country_code}
                </span>
                <span className="text-sm text-foreground w-28 shrink-0">{rate.country_name}</span>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={rateValues[rate.id] ?? ""}
                    onChange={(e) =>
                      setRateValues((prev) => ({ ...prev, [rate.id]: e.target.value }))
                    }
                    disabled={!activeValues[rate.id]}
                    className="bg-input border-border text-foreground w-24"
                  />
                  <span className="text-sm text-muted-foreground">EUR</span>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setActiveValues((prev) => ({ ...prev, [rate.id]: !prev[rate.id] }))
                  }
                  className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                    activeValues[rate.id]
                      ? "bg-green-500/10 border-green-500/30 text-green-500 hover:bg-green-500/20"
                      : "bg-muted border-border text-muted-foreground hover:border-primary/30"
                  }`}
                >
                  {activeValues[rate.id] ? "Actif" : "Inactif"}
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(rate.id)}
                  disabled={isPendingDelete}
                  className="text-xs text-destructive hover:text-destructive/70 transition-colors ml-auto"
                >
                  Supprimer
                </button>
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

      {/* Ajouter un pays */}
      <div className="card-premium p-6 space-y-4">
        <h2 className="font-semibold text-foreground">Ajouter un pays</h2>
        <form onSubmit={handleAdd} className="flex items-end gap-3 flex-wrap">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Code (2 lettres)</Label>
            <Input
              value={newCode}
              onChange={(e) => setNewCode(e.target.value.toUpperCase())}
              maxLength={2}
              placeholder="ES"
              className="bg-input border-border text-foreground w-20"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Nom du pays</Label>
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Espagne"
              className="bg-input border-border text-foreground w-36"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Tarif (EUR)</Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={newRate}
              onChange={(e) => setNewRate(e.target.value)}
              placeholder="7.95"
              className="bg-input border-border text-foreground w-24"
              required
            />
          </div>
          <Button
            type="submit"
            disabled={isPendingAdd}
            variant="outline"
            className="border-border text-foreground hover:border-primary"
          >
            {isPendingAdd ? "Ajout..." : "Ajouter"}
          </Button>
        </form>
      </div>
    </div>
  );
}
