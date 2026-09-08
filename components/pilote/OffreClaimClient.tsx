"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Check, X, Loader2, CheckCircle2 } from "lucide-react";
import { claimOffer, refuseOffer } from "@/lib/actions/flight-offers";
import { ConfirmActionDialog, type PendingAction } from "@/components/admin/reservation-drawer/ConfirmActionDialog";

export function OffreClaimClient({ token, dateStr }: { token: string; dateStr: string }) {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<{ kind: "claimed" | "refused"; msg: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<PendingAction | null>(null);

  function doClaim() {
    setError(null);
    startTransition(async () => {
      const res = await claimOffer(token);
      if (res.error) return setError(res.error);
      setResult({ kind: "claimed", msg: `Le vol du ${res.dateStr ?? dateStr} est à vous.` });
    });
  }

  function doRefuse() {
    setError(null);
    startTransition(async () => {
      const res = await refuseOffer(token);
      if (res.error) return setError(res.error);
      setResult({ kind: "refused", msg: "Offre déclinée, elle ne s'affichera plus dans votre liste." });
    });
  }

  if (result) {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 space-y-3">
        <p className="flex items-center gap-2 text-sm font-semibold text-emerald-800">
          <CheckCircle2 size={16} />
          {result.msg}
        </p>
        <Link
          href={result.kind === "claimed" ? "/pilote/vols" : "/pilote/offres"}
          className="inline-block text-sm font-semibold text-emerald-800 underline"
        >
          {result.kind === "claimed" ? "Voir mes vols" : "Voir les autres offres"}
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2.5">
        <button
          type="button"
          onClick={() =>
            setPending({
              title: "Prendre ce vol ?",
              description: "Vous devenez le pilote de ce vol. Le client sera prévenu tout de suite et vous devrez le contacter pour convenir des détails.",
              confirmLabel: "Je le prends",
              run: doClaim,
            })
          }
          disabled={isPending}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-navy text-white text-sm font-semibold hover:brightness-90 transition-colors disabled:opacity-50 cursor-pointer"
        >
          {isPending ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
          Je le prends
        </button>
        <button
          type="button"
          onClick={doRefuse}
          disabled={isPending}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-border text-sm font-semibold text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors disabled:opacity-50 cursor-pointer"
        >
          <X size={14} />
          Pas pour moi
        </button>
      </div>

      {error && <p className="text-sm font-medium text-red-600">{error}</p>}

      <ConfirmActionDialog
        action={pending}
        isPending={isPending}
        onCancel={() => setPending(null)}
        onConfirm={() => {
          pending?.run();
          setPending(null);
        }}
      />
    </div>
  );
}
