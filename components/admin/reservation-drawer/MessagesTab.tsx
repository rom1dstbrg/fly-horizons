"use client";

import { useRef, useEffect, useState, useTransition } from "react";
import { Send, Loader2, User } from "lucide-react";
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

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="px-5 pt-3 pb-2 border-b border-border shrink-0">
        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[1.5px]">
          Messages · {reservation.clients?.email ?? "client sans email"}
        </p>
        <p className="text-[10px] text-muted-foreground mt-0.5">
          Envoyé depuis info@fly-horizons.com, à votre nom. Le client répond via un lien.
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4">
        {loading ? (
          <p className="text-xs text-muted-foreground text-center py-8">Chargement…</p>
        ) : messages.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-8">
            Aucun message. Écrivez ci-dessous pour démarrer la conversation.
          </p>
        ) : (
          messages.map((msg, i) => {
            const isClient = msg.author === "client";
            const isFirst = i === 0 || messages[i - 1].author !== msg.author;
            const isLast = i === messages.length - 1 || messages[i + 1].author !== msg.author;
            const senderLabel = msg.author_nom?.trim() || (isClient ? "Client" : "Fly Horizons");
            const timeStr = new Date(msg.created_at).toLocaleString("fr-BE", {
              day: "numeric",
              month: "short",
              hour: "2-digit",
              minute: "2-digit",
            });
            return (
              <div
                key={msg.id}
                className={[
                  "flex items-start gap-2",
                  isClient ? "" : "flex-row-reverse",
                  i === 0 ? "" : isFirst ? "mt-4" : "mt-1",
                ].join(" ")}
              >
                <div className="w-6 shrink-0 pt-0.5">
                  {isFirst && (
                    <div
                      className={[
                        "w-6 h-6 rounded-md flex items-center justify-center text-[9px] font-black",
                        isClient
                          ? "bg-secondary text-muted-foreground border border-border"
                          : "bg-navy text-white",
                      ].join(" ")}
                    >
                      {isClient ? <User size={11} /> : senderLabel.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <div className={`flex flex-col max-w-[82%] ${isClient ? "items-start" : "items-end"}`}>
                  {isFirst && (
                    <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-[1px] mb-0.5 px-0.5">
                      {senderLabel}
                    </p>
                  )}
                  <div
                    className={[
                      "px-3 py-2 text-xs leading-relaxed whitespace-pre-wrap rounded-lg",
                      isClient
                        ? "bg-secondary text-foreground"
                        : "bg-navy text-white",
                    ].join(" ")}
                  >
                    {msg.content}
                  </div>
                  {isLast && (
                    <p className="text-[9px] text-muted-foreground mt-0.5 px-0.5">{timeStr}</p>
                  )}
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      <form
        onSubmit={handleSubmit}
        className="shrink-0 border-t border-border px-5 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]"
      >
        {error && <p className="text-xs text-destructive mb-2">{error}</p>}
        <div className="flex items-end gap-2 rounded-xl border border-border bg-background px-3 py-2">
          <textarea
            ref={textareaRef}
            value={content}
            onChange={e => {
              setContent(e.target.value);
              setError("");
            }}
            placeholder="Votre message au client…"
            rows={1}
            className="flex-1 bg-transparent text-xs text-foreground resize-none focus:outline-none leading-relaxed min-h-[20px] max-h-[140px] overflow-y-auto"
          />
          <button
            type="submit"
            disabled={isPending || !content.trim()}
            className="w-7 h-7 rounded-lg bg-navy text-white flex items-center justify-center hover:brightness-110 disabled:opacity-40 transition-all cursor-pointer shrink-0"
          >
            {isPending ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
          </button>
        </div>
      </form>
    </div>
  );
}
