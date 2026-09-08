"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Check } from "lucide-react";
import { acceptCharte } from "@/lib/actions/pilote-profil";
import { CHARTE_PILOTE_TITRE, CHARTE_PILOTE_TEXTE } from "@/lib/pilote/charte";

// Bloc A · item 6 — popup obligatoire au premier accès. Le bouton d'acceptation
// ne s'active qu'une fois le texte lu jusqu'en bas. Non fermable autrement.

export function ChartePiloteGate() {
  const router = useRouter();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [reachedEnd, setReachedEnd] = useState(false);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  function onScroll() {
    const el = scrollRef.current;
    if (!el) return;
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 24) setReachedEnd(true);
  }

  function accept() {
    setError("");
    startTransition(async () => {
      const res = await acceptCharte();
      if (res.error) {
        setError(res.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-navy/40 backdrop-blur-[2px] p-4">
      <div className="flex w-full max-w-2xl flex-col rounded-2xl border border-border bg-card shadow-xl max-h-[calc(100vh-2rem)]">
        <div className="border-b border-border px-6 py-4 shrink-0">
          <h2 className="text-lg font-bold text-foreground">{CHARTE_PILOTE_TITRE}</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Merci de lire cette charte jusqu&apos;au bout avant de rejoindre l&apos;espace pilote.
          </p>
        </div>

        <div
          ref={scrollRef}
          onScroll={onScroll}
          className="flex-1 overflow-y-auto px-6 py-5 text-sm leading-relaxed text-foreground whitespace-pre-line"
        >
          {CHARTE_PILOTE_TEXTE}
        </div>

        <div className="border-t border-border px-6 py-4 shrink-0 space-y-2">
          {error && <p className="text-xs text-destructive">{error}</p>}
          {!reachedEnd && (
            <p className="text-xs text-muted-foreground">Faites défiler jusqu&apos;en bas pour activer le bouton.</p>
          )}
          <button
            type="button"
            onClick={accept}
            disabled={!reachedEnd || isPending}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-[#e6a800] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {isPending ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
            J&apos;ai lu et j&apos;accepte la charte
          </button>
        </div>
      </div>
    </div>
  );
}
