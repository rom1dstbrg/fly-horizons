"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Calendar, CheckCircle2, Loader2, AlertCircle, Check } from "lucide-react";
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

// Nouvelle DA (maquette-creneau-propose.html, variante B « Bandeau », 29/09).
// Titre, puis le changement (créneau demandé barré → créneau proposé) en une ligne pleine largeur
// entre deux filets, boutons dessous. Téléphone : une colonne et barre de réponse collante en bas
// (même schéma que la proposition d'itinéraire). Confirmation sur place après acceptation.

const WRAP = "max-w-[1400px] mx-auto px-4 sm:px-6 xl:px-10";
const LABEL = "text-[11px] font-bold uppercase tracking-[2px] text-muted-foreground mb-1.5";

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

  const busy = isPending || decliningPending;

  return (
    <main className="min-h-screen bg-white">
      <section className="pt-page pb-0 lg:pb-28">
        <div className={WRAP}>

          <p className="text-[11px] font-bold text-primary uppercase tracking-[3px] mb-3">Nouveau créneau proposé</p>
          <h1 className="text-[32px] lg:text-[44px] font-black text-foreground leading-[1.08] lg:leading-[1.04] tracking-[-0.02em]">
            Un autre créneau vous est proposé.
          </h1>
          <p className="mt-3.5 max-w-[520px] text-base leading-[1.7] text-foreground/80">
            {prenom && <strong className="block font-bold text-foreground capitalize">Bonjour {prenom},</strong>}
            Le vol du <span className="first-letter:uppercase">{requestedDateStr}</span> ne peut malheureusement pas être organisé.
            Voici ce qui vous est proposé à la place.
          </p>

          {/* Le changement : demandé (barré) → proposé */}
          <div className="mt-7 lg:mt-11 lg:py-9 lg:border-y lg:border-border lg:grid lg:grid-cols-[1fr_auto_1.3fr] lg:gap-x-14 lg:items-center">
            <div>
              <p className={LABEL}>Demandé</p>
              <p className="text-lg lg:text-xl font-medium text-muted-foreground line-through first-letter:uppercase">{requestedDateStr}</p>
            </div>
            <ArrowRight aria-hidden size={34} strokeWidth={1.5} className="hidden lg:block text-muted-foreground" />
            <div className="mt-[22px] lg:mt-0">
              <p className={LABEL}>Proposé</p>
              <p className="text-[26px] lg:text-[34px] font-black leading-[1.15] tracking-[-0.01em] text-foreground first-letter:uppercase">{proposedDateStr}</p>
              <p className="mt-1.5 text-[15px] text-foreground/70">à {proposedHeure} · {formatDuration(duree)} de vol</p>
            </div>
          </div>

          {/* Réponse : barre collante en bas sur téléphone, sous le bandeau sur ordinateur */}
          <div className="sticky bottom-0 z-[600] mt-8 -mx-4 sm:-mx-6 px-4 sm:px-6 pt-3.5 pb-4 bg-white border-t border-border shadow-[0_-6px_20px_rgba(11,34,56,.08)] lg:static lg:z-auto lg:mx-0 lg:px-0 lg:pt-0 lg:pb-0 lg:mt-9 lg:border-0 lg:shadow-none">
            {done === "accepted" ? (
              <div className="flex items-start gap-3.5" role="status">
                <span className="w-11 h-11 shrink-0 rounded-full bg-primary text-[#0b2238] grid place-items-center">
                  <Check size={20} strokeWidth={2.5} />
                </span>
                <div>
                  <h2 className="text-lg lg:text-[22px] font-black text-foreground leading-tight">Créneau accepté.</h2>
                  <p className="mt-1.5 text-sm lg:text-[15px] leading-[1.7] text-foreground/75">
                    Votre pilote vous confirme les derniers détails très vite.
                  </p>
                </div>
              </div>
            ) : (
              <>
                {error && (
                  <p className="flex items-center gap-2 mb-3 text-[13px] text-red-700">
                    <AlertCircle size={14} className="shrink-0" /> {error}
                  </p>
                )}
                <div className="flex flex-col gap-2 lg:flex-row lg:gap-3">
                  <button
                    type="button"
                    onClick={handleAccept}
                    disabled={busy}
                    className="w-full lg:w-auto inline-flex items-center justify-center gap-2 px-6 py-[15px] rounded-[10px] bg-primary text-[#0b2238] text-[15px] font-black shadow-gold hover:brightness-105 transition-all disabled:opacity-50 cursor-pointer"
                  >
                    {isPending ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                    J&apos;accepte ce créneau
                  </button>
                  <button
                    type="button"
                    onClick={handleDecline}
                    disabled={busy}
                    className="w-full lg:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 lg:py-3.5 rounded-[10px] border border-border bg-white text-sm font-bold text-foreground hover:border-foreground transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    {decliningPending ? <Loader2 size={15} className="animate-spin" /> : <Calendar size={15} />}
                    Je choisis une autre date
                  </button>
                </div>
                <p className="mt-2.5 lg:mt-4 text-xs lg:text-[13px] leading-relaxed text-muted-foreground">
                  Une question ?{" "}
                  <a href="mailto:info@fly-horizons.com" className="font-semibold text-[#0b2238] underline decoration-[#0b2238]/25 underline-offset-[3px] hover:decoration-primary transition-colors">
                    info@fly-horizons.com
                  </a>
                </p>
              </>
            )}
          </div>

        </div>
      </section>
    </main>
  );
}
