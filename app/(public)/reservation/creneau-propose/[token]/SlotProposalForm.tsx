"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, CheckCircle2, Loader2, AlertCircle, Calendar } from "lucide-react";
import { respondToSlotProposal } from "@/lib/actions/reservations";
import { formatDuration } from "@/lib/vouchers";

interface Props {
  token: string;
  prenom: string;
  requestedDateStr: string;
  proposedDateStr: string;
  proposedHeure: string;
  duree: number;
}

export function SlotProposalForm({ token, prenom, requestedDateStr, proposedDateStr, proposedHeure, duree }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [decliningPending, startDecliningTransition] = useTransition();
  const [done, setDone] = useState<"accepted" | null>(null);
  const [error, setError] = useState("");

  function handleAccept() {
    setError("");
    startTransition(async () => {
      const r = await respondToSlotProposal(token, "accept");
      if (r.error) { setError(r.error); return; }
      setDone("accepted");
    });
  }

  function handleDecline() {
    setError("");
    startDecliningTransition(async () => {
      const r = await respondToSlotProposal(token, "decline");
      if (r.error) { setError(r.error); return; }
      if (r.redirectUrl) router.push(r.redirectUrl);
    });
  }

  return (
    <div className="flex-1 flex items-center justify-center bg-gradient-navy px-4 pt-[98px] pb-16">
      <div className="max-w-xl w-full py-6">

        <p className="text-[10px] font-black text-primary uppercase tracking-[3px] mb-1">
          Nouveau créneau proposé
        </p>
        <h1 className="text-xl font-black text-foreground mb-1">
          {prenom ? `Bonjour ${prenom}` : "Bonjour"}
        </h1>
        <p className="text-sm text-muted-foreground mb-6">
          Le créneau du <span className="capitalize font-semibold text-foreground">{requestedDateStr}</span> ne peut malheureusement pas être organisé. Voici ce que je peux vous proposer à la place.
        </p>

        <div className="card-premium overflow-hidden mb-5">
          <div className="bg-navy px-6 py-5 flex items-start justify-between gap-4">
            <div>
              <h2 className="text-white text-base font-black leading-snug">Créneau proposé</h2>
              <div className="mt-2 space-y-0.5">
                <p className="text-white/40 text-xs line-through capitalize">{requestedDateStr}</p>
                <p className="text-primary text-sm font-bold capitalize">{proposedDateStr} à {proposedHeure}</p>
              </div>
            </div>
            <div className="shrink-0">
              <div className="inline-flex items-center gap-1.5 bg-black/40 border border-white/15 rounded-lg px-3 py-1.5">
                <span className="text-primary font-black text-[13px] leading-none">{formatDuration(duree)}</span>
              </div>
            </div>
          </div>
        </div>

        {done === "accepted" ? (
          <div className="flex items-start gap-3 px-4 py-3.5 rounded-xl bg-green-50 border border-green-200">
            <CheckCircle2 size={16} className="text-green-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-green-800 text-sm">Créneau accepté !</p>
              <p className="text-xs text-green-700 mt-0.5">Je reviens vers vous très vite pour confirmer les détails.</p>
            </div>
          </div>
        ) : (
          <>
            {error && (
              <div className="flex items-center gap-2.5 text-sm text-red-600 bg-red-50 border border-red-200 px-4 py-3 rounded-lg mb-4">
                <AlertCircle size={14} className="shrink-0" /> {error}
              </div>
            )}
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={handleAccept}
                disabled={isPending || decliningPending}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-primary text-primary-foreground rounded-lg text-sm font-black hover:brightness-105 active:scale-[0.98] transition-all disabled:opacity-30 shadow-gold cursor-pointer"
              >
                {isPending ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={15} />}
                J&apos;accepte ce créneau
              </button>
              <button
                type="button"
                onClick={handleDecline}
                disabled={isPending || decliningPending}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border border-border text-sm font-semibold text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors disabled:opacity-50 cursor-pointer"
              >
                {decliningPending ? <Loader2 size={14} className="animate-spin" /> : <Calendar size={15} />}
                Je choisis une autre date
              </button>
            </div>
            <p className="text-xs text-muted-foreground text-center mt-4 flex items-center justify-center gap-1.5">
              <CalendarDays size={12} className="shrink-0" />
              Une question ? <a href="mailto:info@fly-horizons.com" className="text-primary hover:brightness-90 transition-all font-semibold">info@fly-horizons.com</a>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
