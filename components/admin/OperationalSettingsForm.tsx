"use client";

import { useState, useTransition } from "react";
import { updateOperationalSettings } from "@/lib/actions/settings";
import { Check, Loader2 } from "lucide-react";

interface Props {
  welcomeCode: string;
  welcomeDiscountType: "percentage" | "fixed";
  welcomeDiscountValue: number;
}

export function OperationalSettingsForm({ welcomeCode, welcomeDiscountType, welcomeDiscountValue }: Props) {
  const [promoCode,      setPromoCode]      = useState(welcomeCode);
  const [discountType,   setDiscountType]   = useState<"percentage" | "fixed">(welcomeDiscountType);
  const [discountValue,  setDiscountValue]  = useState(String(welcomeDiscountValue));
  const [saved,          setSaved]          = useState(false);
  const [error,          setError]          = useState("");
  const [isPending, startTransition] = useTransition();

  function handleSave() {
    setError(""); setSaved(false);
    const val = parseFloat(discountValue);
    if (isNaN(val) || val <= 0) { setError("Remise invalide"); return; }
    startTransition(async () => {
      const result = await updateOperationalSettings({
        welcome_code: promoCode,
        welcome_discount_type: discountType,
        welcome_discount_value: val,
      });
      if (result.error) setError(result.error);
      else { setSaved(true); setTimeout(() => setSaved(false), 2500); }
    });
  }

  return (
    <div className="card-premium p-6 space-y-5">
      <div>
        <h2 className="text-base font-semibold text-foreground">Code promo de bienvenue</h2>
        <p className="text-xs text-muted-foreground mt-1">
          Affiché sur la landing page. Valable une seule fois par compte. Le coupon est synchronisé automatiquement.
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="flex-1 min-w-[140px] max-w-xs">
          <label className="block text-xs font-medium text-muted-foreground mb-1.5">Code</label>
          <input
            type="text"
            value={promoCode}
            onChange={e => { setPromoCode(e.target.value.toUpperCase()); setSaved(false); }}
            className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring"
            placeholder="WELCOME2026"
          />
        </div>

        <div className="w-28">
          <label className="block text-xs font-medium text-muted-foreground mb-1.5">Remise</label>
          <div className="flex h-10 rounded-lg border border-input bg-background overflow-hidden focus-within:ring-2 focus-within:ring-ring">
            <input
              type="number"
              min="1"
              max={discountType === "percentage" ? 100 : undefined}
              value={discountValue}
              onChange={e => { setDiscountValue(e.target.value); setSaved(false); }}
              className="w-full px-3 text-sm bg-transparent focus:outline-none"
            />
            <button
              type="button"
              onClick={() => { setDiscountType(t => t === "percentage" ? "fixed" : "percentage"); setSaved(false); }}
              className="px-2.5 text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted transition-colors border-l border-input cursor-pointer shrink-0"
            >
              {discountType === "percentage" ? "%" : "€"}
            </button>
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={isPending || !promoCode.trim()}
          className="h-10 px-5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors flex items-center gap-2 cursor-pointer"
        >
          {isPending ? <Loader2 size={14} className="animate-spin" /> : saved ? <Check size={14} /> : null}
          {saved ? "Enregistré" : "Enregistrer"}
        </button>
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
