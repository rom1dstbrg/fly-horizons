"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { Button } from "@/components/pilote/studio";
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
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-st-ink/30 backdrop-blur-[1.5px] sm:items-center sm:p-4">
      <div className="flex max-h-[92dvh] w-full max-w-2xl flex-col overflow-hidden rounded-t-[26px] bg-white pb-[env(safe-area-inset-bottom)] shadow-st-panel sm:max-h-[calc(100dvh-2rem)] sm:rounded-[22px] sm:pb-0">
        <div className="shrink-0 px-6 pb-3 pt-5">
          <h2 className="text-lg font-semibold tracking-[-0.01em] text-st-text">{CHARTE_PILOTE_TITRE}</h2>
          <p className="mt-0.5 text-[13px] text-st-muted">
            Merci de lire cette charte jusqu&apos;au bout avant de rejoindre l&apos;espace pilote.
          </p>
        </div>

        <div
          ref={scrollRef}
          onScroll={onScroll}
          className="mx-3 flex-1 overflow-y-auto overscroll-contain whitespace-pre-line rounded-[16px] bg-st-surface px-4 py-4 text-[13.5px] leading-relaxed text-st-text-2"
        >
          {CHARTE_PILOTE_TEXTE}
        </div>

        <div className="shrink-0 space-y-2 px-6 py-4">
          {error && <p className="text-[12.5px] text-st-bad">{error}</p>}
          {!reachedEnd && (
            <p className="text-[12.5px] text-st-muted">Faites défiler jusqu&apos;en bas pour activer le bouton.</p>
          )}
          <Button fullWidth size="lg" className="sm:h-[38px] sm:text-[13px]" onClick={accept} disabled={!reachedEnd} loading={isPending}>
            {!isPending && <Check />}
            J&apos;ai lu et j&apos;accepte la charte
          </Button>
        </div>
      </div>
    </div>
  );
}
