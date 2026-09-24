"use client";

import { useRef, useEffect, useState, useTransition } from "react";
import { Send, Loader2 } from "lucide-react";
import { sendReservationMessage, type ReservationMessage } from "@/lib/actions/reservation-messages";
import type { DrawerReservation } from "./types";

interface Props {
  reservation: DrawerReservation;
  messages: ReservationMessage[];
  loading: boolean;
  onOptimisticAdd: (m: ReservationMessage) => void;
  onOptimisticRemove: (id: string) => void;
  onSent: () => void;
}

export function MessagesTab({
  reservation,
  messages,
  loading,
  onOptimisticAdd,
  onOptimisticRemove,
  onSent,
}: Props) {
  const [content, setContent] = useState("");
  const [error, setError] = useState("");
  const [isPending, start] = useTransition();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages, loading]);

  useEffect(() => {
    if (!textareaRef.current) return;
    textareaRef.current.style.height = "auto";
    textareaRef.current.style.height = textareaRef.current.scrollHeight + "px";
  }, [content]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = content.trim();
    if (!trimmed) return;
    setError("");

    const optimistic: ReservationMessage = {
      id: `optimistic-${Date.now()}`,
      author: "admin", // affichage seulement ; l'auteur réel est posé côté serveur
      author_nom: "Vous",
      content: trimmed,
      created_at: new Date().toISOString(),
    };
    onOptimisticAdd(optimistic);
    setContent("");

    start(async () => {
      const r = await sendReservationMessage(reservation.id, trimmed);
      if (r?.error) {
        onOptimisticRemove(optimistic.id);
        setError(r.error);
      } else {
        onSent();
      }
    });
  }

  // Pleine hauteur (maquette v2 validée le 24/09) : la conversation remplit le
  // tiroir, la zone de saisie reste collée en bas.
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-[18px] py-3">
        <p className="mb-3 text-center text-[11.5px] text-st-muted">
          Envoyé depuis info@fly-horizons.com, à votre nom. {reservation.clients?.prenom || "Le client"} répond via un lien.
        </p>
        {loading ? (
          <p className="py-8 text-center text-[12.5px] text-st-muted">Chargement…</p>
        ) : messages.length === 0 ? (
          <p className="py-8 text-center text-[12.5px] text-st-muted">Aucun message. Écrivez ci-dessous pour démarrer la conversation.</p>
        ) : (
          messages.map((msg, i) => {
            const isClient = msg.author === "client";
            const isFirst = i === 0 || messages[i - 1].author !== msg.author;
            const isLast = i === messages.length - 1 || messages[i + 1].author !== msg.author;
            const senderLabel = msg.author_nom?.trim() || (isClient ? "Client" : "Fly Horizons");
            const timeStr = new Date(msg.created_at).toLocaleString("fr-BE", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
            return (
              <div key={msg.id} className={`flex flex-col ${isClient ? "items-start" : "items-end"} ${i === 0 ? "" : isFirst ? "mt-3" : "mt-1"}`}>
                {isFirst && <p className="mb-0.5 px-1 text-[11px] font-medium text-st-muted">{senderLabel}</p>}
                <div
                  className={`max-w-[85%] whitespace-pre-wrap px-3 py-2 text-[13px] leading-snug ${
                    isClient ? "rounded-[14px] rounded-bl-[5px] bg-st-surface text-st-text" : "rounded-[14px] rounded-br-[5px] bg-st-ink text-white"
                  }`}
                >
                  {msg.content}
                </div>
                {isLast && <p className="mt-0.5 px-1 text-[10.5px] text-st-muted">{timeStr}</p>}
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSubmit} className="shrink-0 border-t border-st-line-soft px-[18px] pb-[calc(0.875rem+env(safe-area-inset-bottom))] pt-3">
        {error && <p className="mb-2 text-[12px] text-st-bad">{error}</p>}
        <div className="flex items-end gap-2 rounded-[14px] border border-st-line bg-white py-1.5 pl-3 pr-1.5 focus-within:border-st-ink focus-within:ring-4 focus-within:ring-st-ink-soft">
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => { setContent(e.target.value); setError(""); }}
            placeholder={`Votre message à ${reservation.clients?.prenom || "votre client"}…`}
            rows={1}
            className="max-h-[140px] min-h-[24px] flex-1 resize-none self-center overflow-y-auto bg-transparent text-[16px] leading-snug text-st-text outline-none placeholder:text-st-muted sm:text-[13px]"
          />
          <button
            type="submit"
            aria-label="Envoyer"
            disabled={isPending || !content.trim()}
            className="grid h-9 w-9 shrink-0 cursor-pointer place-items-center rounded-[10px] bg-st-ink text-white transition-opacity disabled:opacity-40"
          >
            {isPending ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
          </button>
        </div>
      </form>
    </div>
  );
}
