"use client";

import { useState, useTransition } from "react";
import { Plus, Pencil, Trash2, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  createAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress,
} from "@/lib/actions/account";

interface Address {
  id: string;
  full_name: string;
  line1: string;
  line2: string | null;
  city: string;
  postal_code: string;
  country: string;
  is_default: boolean;
}

interface AddressBookProps {
  addresses: Address[];
}

const COUNTRIES = [
  { code: "BE", name: "Belgique" },
  { code: "FR", name: "France" },
  { code: "NL", name: "Pays-Bas" },
  { code: "DE", name: "Allemagne" },
];

function AddressForm({
  address,
  onClose,
}: {
  address?: Address;
  onClose: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const isEdit = !!address;

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const result = isEdit
        ? await updateAddress(address.id, formData)
        : await createAddress(formData);
      if (result?.error) setError(result.error);
      else onClose();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 mt-4 p-4 bg-secondary/30 rounded-lg border border-border">
      {error && (
        <div className="bg-destructive/10 border border-destructive/30 text-destructive text-sm rounded-md px-3 py-2">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2 space-y-1.5">
          <Label className="text-xs text-muted-foreground">Nom complet *</Label>
          <Input
            name="full_name"
            required
            defaultValue={address?.full_name}
            placeholder="Jean Dupont"
            className="bg-input border-border text-foreground placeholder:text-muted-foreground"
          />
        </div>

        <div className="sm:col-span-2 space-y-1.5">
          <Label className="text-xs text-muted-foreground">Adresse *</Label>
          <Input
            name="line1"
            required
            defaultValue={address?.line1}
            placeholder="Rue de la Paix 10"
            className="bg-input border-border text-foreground placeholder:text-muted-foreground"
          />
        </div>

        <div className="sm:col-span-2 space-y-1.5">
          <Label className="text-xs text-muted-foreground">Complement (optionnel)</Label>
          <Input
            name="line2"
            defaultValue={address?.line2 ?? ""}
            placeholder="Appartement, etage..."
            className="bg-input border-border text-foreground placeholder:text-muted-foreground"
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Code postal *</Label>
          <Input
            name="postal_code"
            required
            defaultValue={address?.postal_code}
            placeholder="1000"
            className="bg-input border-border text-foreground placeholder:text-muted-foreground"
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Ville *</Label>
          <Input
            name="city"
            required
            defaultValue={address?.city}
            placeholder="Bruxelles"
            className="bg-input border-border text-foreground placeholder:text-muted-foreground"
          />
        </div>

        <div className="sm:col-span-2 space-y-1.5">
          <Label className="text-xs text-muted-foreground">Pays *</Label>
          <select
            name="country"
            defaultValue={address?.country ?? "BE"}
            className="w-full bg-input border border-border text-foreground rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
          >
            {COUNTRIES.map((c) => (
              <option key={c.code} value={c.code}>{c.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex gap-3">
        <Button
          type="submit"
          disabled={isPending}
          size="sm"
          className="bg-primary text-primary-foreground hover:bg-gold-400 font-semibold"
        >
          {isPending ? "..." : isEdit ? "Modifier" : "Ajouter"}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onClose}
          className="border-border text-foreground hover:bg-secondary"
        >
          Annuler
        </Button>
      </div>
    </form>
  );
}

export function AddressBook({ addresses }: AddressBookProps) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleDelete(id: string) {
    startTransition(async () => {
      await deleteAddress(id);
    });
  }

  function handleSetDefault(id: string) {
    startTransition(async () => {
      await setDefaultAddress(id);
    });
  }

  return (
    <div className="space-y-4">
      {addresses.length === 0 && !showForm && (
        <p className="text-muted-foreground text-sm">
          Aucune adresse enregistree. Ajoutez-en une pour faciliter vos commandes.
        </p>
      )}

      {addresses.map((address) => (
        <div key={address.id}>
          <div className={`p-4 rounded-lg border transition-colors ${
            address.is_default
              ? "border-primary/40 bg-primary/5"
              : "border-border bg-secondary/20"
          }`}>
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-foreground">
                    {address.full_name}
                  </p>
                  {address.is_default && (
                    <span className="text-xs text-primary bg-primary/10 border border-primary/20 px-1.5 py-0.5 rounded-full">
                      Par defaut
                    </span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">{address.line1}</p>
                {address.line2 && (
                  <p className="text-sm text-muted-foreground">{address.line2}</p>
                )}
                <p className="text-sm text-muted-foreground">
                  {address.postal_code} {address.city}, {address.country}
                </p>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                {!address.is_default && (
                  <button
                    onClick={() => handleSetDefault(address.id)}
                    disabled={isPending}
                    className="p-1.5 text-muted-foreground hover:text-primary transition-colors rounded"
                    title="Definir par defaut"
                  >
                    <Star size={14} />
                  </button>
                )}
                <button
                  onClick={() => setEditingId(editingId === address.id ? null : address.id)}
                  className="p-1.5 text-muted-foreground hover:text-primary transition-colors rounded"
                >
                  <Pencil size={14} />
                </button>
                <button
                  onClick={() => handleDelete(address.id)}
                  disabled={isPending}
                  className="p-1.5 text-muted-foreground hover:text-destructive transition-colors rounded"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          </div>

          {editingId === address.id && (
            <AddressForm
              address={address}
              onClose={() => setEditingId(null)}
            />
          )}
        </div>
      ))}

      {showForm && (
        <AddressForm onClose={() => setShowForm(false)} />
      )}

      {!showForm && (
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 text-sm text-primary hover:text-gold-400 transition-colors font-medium"
        >
          <Plus size={16} />
          Ajouter une adresse
        </button>
      )}
    </div>
  );
}