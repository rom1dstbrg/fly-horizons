"use client";

import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Copy, Check, ExternalLink, Package } from "lucide-react";

interface BpostSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderRef: string;
  address: {
    full_name?: string;
    email?: string;
    line1?: string;
    line2?: string | null;
    city?: string;
    postal_code?: string;
    country?: string;
  };
  items: Array<{ title: string; quantity: number }>;
}

function CopyField({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);

  function copy() {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="flex items-center justify-between gap-3 py-2.5 border-b border-border last:border-0">
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm text-foreground font-medium">{value || "—"}</p>
      </div>
      {value && (
        <button
          type="button"
          onClick={copy}
          className="shrink-0 p-1 text-muted-foreground hover:text-primary transition-colors"
          title="Copier"
        >
          {copied ? (
            <Check size={14} className="text-green-500" />
          ) : (
            <Copy size={14} />
          )}
        </button>
      )}
    </div>
  );
}

export function BpostSheet({
  open,
  onOpenChange,
  orderRef,
  address,
  items,
}: BpostSheetProps) {
  const [copiedAll, setCopiedAll] = useState(false);

  const fullAddress = [
    address.full_name,
    address.line1,
    address.line2 ?? null,
    [address.postal_code, address.city].filter(Boolean).join(" "),
    address.country,
  ]
    .filter(Boolean)
    .join("\n");

  function copyAll() {
    navigator.clipboard.writeText(fullAddress);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 1500);
  }

  const itemsSummary = items.map((i) => `${i.title} ×${i.quantity}`).join(", ");

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex flex-col gap-0 p-0 overflow-y-auto sm:max-w-md"
      >
        <SheetHeader className="px-5 py-4 border-b border-border shrink-0">
          <div className="flex items-center gap-2">
            <Package size={15} className="text-primary" />
            <SheetTitle>Étiquette bpost</SheetTitle>
          </div>
          <SheetDescription>Commande #{orderRef}</SheetDescription>
        </SheetHeader>

        <div className="p-5 space-y-6 flex-1">
          {/* Destinataire */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Destinataire
            </p>
            <div className="card-premium px-4">
              <CopyField label="Nom complet" value={address.full_name ?? ""} />
              <CopyField label="Adresse" value={address.line1 ?? ""} />
              {address.line2 && (
                <CopyField label="Complément" value={address.line2} />
              )}
              <CopyField label="Code postal" value={address.postal_code ?? ""} />
              <CopyField label="Ville" value={address.city ?? ""} />
              <CopyField label="Pays" value={address.country ?? ""} />
              {address.email && (
                <CopyField label="Email" value={address.email} />
              )}
            </div>
          </div>

          {/* Copier tout */}
          <Button
            variant="outline"
            className="w-full gap-2 border-border"
            onClick={copyAll}
          >
            {copiedAll ? (
              <Check size={14} className="text-green-500" />
            ) : (
              <Copy size={14} />
            )}
            {copiedAll ? "Adresse copiée !" : "Copier l'adresse complète"}
          </Button>

          {/* Contenu */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Contenu du colis
            </p>
            <div className="card-premium p-4">
              <p className="text-sm text-foreground">{itemsSummary || "—"}</p>
            </div>
          </div>

          {/* Lien bpost */}
          <div className="space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Créer l'étiquette
            </p>
            <a
              href="https://www.bpost.be"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-md bg-[#E30613] text-white text-sm font-semibold hover:bg-[#c00510] transition-colors"
            >
              Ouvrir bpost.be
              <ExternalLink size={14} />
            </a>
            <p className="text-xs text-muted-foreground text-center">
              Copiez l'adresse ci-dessus, puis collez-la dans le formulaire bpost.
            </p>
          </div>

          {/* Note API */}
          <div className="card-premium p-4 border-dashed space-y-1">
            <p className="text-xs font-medium text-foreground">API bpost Business</p>
            <p className="text-xs text-muted-foreground">
              Pour créer des étiquettes directement depuis cette page, ajoutez votre
              numéro de compte et phrase de passe bpost dans Paramètres.
            </p>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
