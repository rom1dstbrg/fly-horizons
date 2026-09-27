"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { Button } from "@/components/pilote/studio";
import { acceptCharte } from "@/lib/actions/pilote-profil";
import { CHARTE_PILOTE_TITRE, CHARTE_PILOTE_TEXTE } from "@/lib/pilote/charte";
import { useScrollLock, useSwipeToClose } from "@/components/pilote/studio/sheet-gestures";

// Bloc A · item 6 — popup obligatoire au premier accès, et à chaque nouvelle
// version de la charte (`updated`). Le bouton d'acceptation ne s'active qu'une
// fois le texte lu jusqu'en bas ; non fermable autrement. `onClose` : mode
// relecture (profil → Compte), même fenêtre avec un simple bouton Fermer.

export function ChartePiloteGate({ updated = false, onClose }: { updated?: boolean; onClose?: () => void } = {}) {
  const readOnly = !!onClose;
  const router = useRouter();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [reachedEnd, setReachedEnd] = useState(false);
  useScrollLock(true);
  // Charte à accepter : pas de fermeture par geste (étape obligatoire).
  const swipeRef = useSwipeToClose(() => onClose?.(), { enabled: readOnly });
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
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-st-ink/30 backdrop-blur-[1.5px] sm:items-center sm:p-4"
      onClick={readOnly ? onClose : undefined}
    >
      <div
        ref={swipeRef}
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[92dvh] w-full max-w-2xl flex-col overflow-hidden rounded-t-[26px] bg-white pb-[env(safe-area-inset-bottom)] shadow-st-panel sm:max-h-[calc(100dvh-2rem)] sm:rounded-[22px] sm:pb-0"
      >
        <div className="shrink-0 px-6 pb-3 pt-5">
          <h2 className="text-lg font-semibold tracking-[-0.01em] text-st-text">{CHARTE_PILOTE_TITRE}</h2>
          <p className="mt-0.5 text-[13px] text-st-muted">
            {readOnly
              ? "La charte que vous avez acceptée."
              : updated
                ? "La charte a été mise à jour. Merci de la relire jusqu'au bout et de l'accepter pour continuer."
                : "Merci de lire cette charte jusqu'au bout avant de rejoindre l'espace pilote."}
          </p>
        </div>

        <div
          ref={scrollRef}
          onScroll={onScroll}
          className="mx-3 flex-1 overflow-y-auto overscroll-contain whitespace-pre-line rounded-[16px] bg-st-surface px-4 py-4 text-[13.5px] leading-relaxed text-st-text-2"
        >
          {CHARTE_PILOTE_TEXTE}
        </div>

        {readOnly ? (
          <div className="shrink-0 px-6 py-4">
            <Button fullWidth size="lg" variant="secondary" className="sm:h-[38px] sm:text-[13px]" onClick={onClose}>Fermer</Button>
          </div>
        ) : (
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
        )}
      </div>
    </div>
  );
}
