"use client";

import { useState, useTransition } from "react";
import { updateCoupon } from "@/lib/actions/coupons";
import { deleteCoupon } from "@/lib/actions/delete";
import { ToggleCouponActive } from "@/components/admin/ToggleCouponActive";
import { Pencil, Trash2, Check, X, Loader2 } from "lucide-react";
import { formatPrice } from "@/lib/utils";

interface Coupon {
  id: string;
  code: string;
  type: "percentage" | "fixed";
  value: number;
  active: boolean;
  expires_at: string | null;
  usage_count: number;
  max_uses: number | null;
  max_uses_per_user: number | null;
  created_at: string;
}

function EditCouponForm({ coupon, onClose }: { coupon: Coupon; onClose: () => void }) {
  const [isPending, startTransition] = useTransition();
  const [type, setType] = useState<"percentage" | "fixed">(coupon.type);
  const [error, setError] = useState("");

  const expiresDefault = coupon.expires_at
    ? new Date(coupon.expires_at).toISOString().split("T")[0]
    : "";

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const fd = new FormData(e.currentTarget);
    const maxUsesRaw = fd.get("max_uses") as string;
    const maxUsesPerUserRaw = fd.get("max_uses_per_user") as string;
    startTransition(async () => {
      const r = await updateCoupon(coupon.id, {
        code: fd.get("code") as string,
        type,
        value: parseFloat(fd.get("value") as string),
        expires_at: (fd.get("expires_at") as string) || null,
        max_uses: maxUsesRaw ? parseInt(maxUsesRaw) : null,
        max_uses_per_user: maxUsesPerUserRaw ? parseInt(maxUsesPerUserRaw) : null,
      });
      if (r.error) { setError(r.error); return; }
      onClose();
    });
  }

  return (
    <td colSpan={7} className="px-4 py-3 bg-secondary/20">
      <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3">
        {error && <p className="w-full text-xs text-destructive">{error}</p>}
        <div>
          <label className="block text-xs text-muted-foreground mb-1">Code</label>
          <input name="code" required defaultValue={coupon.code}
            className="h-8 px-2 w-32 rounded-lg border border-input bg-background text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:ring-ring" />
        </div>
        <div>
          <label className="block text-xs text-muted-foreground mb-1">Type</label>
          <div className="flex rounded-lg overflow-hidden border border-border h-8">
            <button type="button" onClick={() => setType("percentage")}
              className={`px-3 text-xs font-medium transition-colors ${type === "percentage" ? "bg-primary text-primary-foreground" : "bg-input text-muted-foreground hover:text-foreground"}`}>
              %
            </button>
            <button type="button" onClick={() => setType("fixed")}
              className={`px-3 text-xs font-medium transition-colors ${type === "fixed" ? "bg-primary text-primary-foreground" : "bg-input text-muted-foreground hover:text-foreground"}`}>
              €
            </button>
          </div>
        </div>
        <div>
          <label className="block text-xs text-muted-foreground mb-1">Valeur</label>
          <input name="value" type="number" required step={type === "percentage" ? "1" : "0.01"} min="0"
            max={type === "percentage" ? "100" : undefined} defaultValue={coupon.value}
            className="h-8 px-2 w-24 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
        </div>
        <div>
          <label className="block text-xs text-muted-foreground mb-1">Expiration</label>
          <input name="expires_at" type="date" defaultValue={expiresDefault}
            className="h-8 px-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
        </div>
        <div>
          <label className="block text-xs text-muted-foreground mb-1">Max total</label>
          <input name="max_uses" type="number" min="1" step="1"
            defaultValue={coupon.max_uses ?? ""}
            placeholder="∞"
            className="h-8 px-2 w-20 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
        </div>
        <div>
          <label className="block text-xs text-muted-foreground mb-1">Max/client</label>
          <input name="max_uses_per_user" type="number" min="1" step="1"
            defaultValue={coupon.max_uses_per_user ?? ""}
            placeholder="∞"
            className="h-8 px-2 w-20 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
        </div>
        <div className="flex gap-2">
          <button type="submit" disabled={isPending}
            className="flex items-center gap-1.5 px-3 h-8 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 disabled:opacity-50 transition-colors">
            {isPending ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />} Sauvegarder
          </button>
          <button type="button" onClick={onClose}
            className="px-3 h-8 rounded-lg border border-border text-xs text-muted-foreground hover:bg-secondary transition-colors">
            <X size={12} />
          </button>
        </div>
      </form>
    </td>
  );
}

function CouponRow({ coupon }: { coupon: Coupon }) {
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    startTransition(async () => {
      await deleteCoupon(coupon.id);
    });
  }

  const usageLabel = coupon.max_uses
    ? `${coupon.usage_count}/${coupon.max_uses}`
    : `${coupon.usage_count}`;

  const isExhausted = coupon.max_uses !== null && coupon.usage_count >= coupon.max_uses;

  return (
    <>
      <tr className="border-b border-border last:border-0 hover:bg-secondary/20 transition-colors">
        <td className="px-4 py-3">
          <span className="font-mono text-sm font-bold text-primary">{coupon.code}</span>
        </td>
        <td className="px-4 py-3 hidden sm:table-cell">
          <span className="text-sm text-foreground">
            {coupon.type === "percentage" ? `${coupon.value}%` : formatPrice(coupon.value)}
          </span>
        </td>
        <td className="px-4 py-3 hidden md:table-cell">
          <span className={`text-sm ${isExhausted ? "text-destructive font-medium" : "text-muted-foreground"}`}>
            {usageLabel} fois
          </span>
        </td>
        <td className="px-4 py-3 hidden lg:table-cell">
          <span className="text-sm text-muted-foreground">
            {coupon.max_uses_per_user ? `${coupon.max_uses_per_user}×` : "Illimité"}
          </span>
        </td>
        <td className="px-4 py-3 hidden lg:table-cell">
          <span className="text-sm text-muted-foreground">
            {coupon.expires_at ? new Date(coupon.expires_at).toLocaleDateString("fr-BE") : "Aucune"}
          </span>
        </td>
        <td className="px-4 py-3 text-center">
          <ToggleCouponActive couponId={coupon.id} active={coupon.active} />
        </td>
        <td className="px-4 py-3">
          <div className="flex items-center justify-end gap-1">
            <button onClick={() => { setEditing(e => !e); setConfirmDelete(false); }} title="Modifier"
              className={`p-1.5 rounded-md border transition-colors ${editing ? "border-primary text-primary bg-primary/5" : "border-border text-muted-foreground hover:text-foreground hover:border-primary/40"}`}>
              <Pencil size={13} />
            </button>
            {confirmDelete ? (
              <>
                <button onClick={handleDelete} disabled={isPending}
                  className="px-2 py-1 rounded bg-destructive text-destructive-foreground text-xs font-medium hover:bg-destructive/90 disabled:opacity-50">
                  {isPending ? <Loader2 size={11} className="animate-spin" /> : "Oui"}
                </button>
                <button onClick={() => setConfirmDelete(false)}
                  className="px-2 py-1 rounded border border-border text-xs text-muted-foreground hover:bg-secondary">
                  Non
                </button>
              </>
            ) : (
              <button onClick={() => { setConfirmDelete(true); setEditing(false); }} title="Supprimer"
                className="p-1.5 rounded-md border border-border text-muted-foreground hover:text-destructive hover:border-destructive/40 transition-colors">
                <Trash2 size={13} />
              </button>
            )}
          </div>
        </td>
      </tr>
      {editing && (
        <tr className="border-b border-border">
          <EditCouponForm coupon={coupon} onClose={() => setEditing(false)} />
        </tr>
      )}
    </>
  );
}

export function CouponsTableClient({ coupons }: { coupons: Coupon[] }) {
  return (
    <div className="card-premium overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Code</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden sm:table-cell">Remise</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden md:table-cell">Utilisations</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden lg:table-cell">Par client</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden lg:table-cell">Expiration</th>
            <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Actif</th>
            <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Actions</th>
          </tr>
        </thead>
        <tbody>
          {coupons.map((coupon) => <CouponRow key={coupon.id} coupon={coupon} />)}
        </tbody>
      </table>
    </div>
  );
}
