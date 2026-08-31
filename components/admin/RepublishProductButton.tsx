"use client";

import { useState, useTransition } from "react";
import { RefreshCw, X, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { republishProduct } from "@/lib/actions/products";
import { useRouter } from "next/navigation";

interface Props {
  productId: string;
  title: string;
  price: number;
  voucherDurationMinutes: number;
  prixHeure?: number | null;
}

export function RepublishProductButton({ productId, title, price, voucherDurationMinutes, prixHeure }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [priceInput, setPriceInput] = useState(String(price));
  const [dureeInput, setDureeInput] = useState(String(voucherDurationMinutes));
  const [quantityInput, setQuantityInput] = useState("1");

  function handleConfirm() {
    setError(null);
    startTransition(async () => {
      const result = await republishProduct(productId, {
        price: parseFloat(priceInput),
        voucher_duration_minutes: parseInt(dureeInput, 10),
        quantity_available: quantityInput.trim() ? parseInt(quantityInput, 10) : null,
      });
      if (result?.error) { setError(result.error); return; }
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors px-2 py-1 rounded hover:bg-primary/5 cursor-pointer"
      >
        <RefreshCw size={13} />
        Republier
      </button>

      {open && (
        <div className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center p-4" onClick={() => setOpen(false)}>
          <div className="bg-card rounded-2xl w-full max-w-sm p-5 space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold text-foreground">Republier &quot;{title}&quot;</p>
              <button onClick={() => setOpen(false)} className="p-1 rounded-full hover:bg-secondary cursor-pointer">
                <X size={16} />
              </button>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Durée (minutes)</Label>
              <Input type="number" min={1} step={1} value={dureeInput} onChange={e => setDureeInput(e.target.value)} />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Prix (EUR)</Label>
              <Input type="number" min={0} step={0.01} value={priceInput} onChange={e => setPriceInput(e.target.value)} />
              {!!prixHeure && prixHeure > 0 && parseInt(dureeInput, 10) > 0 && (
                <p className="text-[11px] text-primary bg-primary/5 border border-primary/20 rounded-md px-2.5 py-1.5">
                  Prix indicatif au tarif actuel : <strong>{Math.round((prixHeure / 60) * parseInt(dureeInput, 10))} €</strong> (informatif)
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Places disponibles</Label>
              <Input type="number" min={0} step={1} value={quantityInput} onChange={e => setQuantityInput(e.target.value)} />
            </div>

            {error && <p className="text-xs text-destructive">{error}</p>}

            <div className="flex gap-2 pt-1">
              <button
                onClick={handleConfirm}
                disabled={isPending}
                className="flex-1 h-10 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                {isPending ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                Republier
              </button>
              <button
                onClick={() => setOpen(false)}
                className="h-10 px-4 rounded-lg border border-border text-muted-foreground text-sm font-semibold hover:bg-secondary transition-colors cursor-pointer"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
