"use client";

import { useState, useTransition, useRef, useEffect, useLayoutEffect } from "react";
import { Send, Loader2 } from "lucide-react";
import { StaffAvatar } from "./StaffAvatar";

export interface ThreadMessage {
  id: string;
  /** Message du visiteur (bulle navy à droite) ; sinon côté Fly Horizons (bulle grise à gauche). */
  mine: boolean;
  /** Nom affiché au-dessus du premier message d'une série côté Fly Horizons. */
  label: string;
  /** Photo de l'expéditeur côté Fly Horizons (sinon son initiale). */
  avatarUrl?: string | null;
  content: string;
  created_at: string;
}

interface Props {
  initialMessages: ThreadMessage[];
  onSend: (content: string) => Promise<{ error?: string } | void>;
  emptyText: string;
}

// Fil de messages des pages publiques (échanges d'un vol, ticket de contact), nouvelle DA (01/10).
// Rend deux éléments de la grille de la page : le fil, puis la saisie (collante en bas sur téléphone).
export function Thread({ initialMessages, onSend, emptyText }: Props) {
  const [messages, setMessages] = useState<ThreadMessage[]>(initialMessages);
  const [content, setContent] = useState("");
  const [error, setError] = useState("");
  const [isPending, start] = useTransition();
  // Le fil reste masqué le temps de se placer sur le dernier message, pour ne pas voir la page sauter.
  const [placed, setPlaced] = useState(initialMessages.length === 0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const isMount = useRef(true);

  // Au chargement : directement sur le dernier message (reçu ou envoyé), saisie en bas de l'écran.
  useLayoutEffect(() => {
    if (!placed) {
      endRef.current?.scrollIntoView({ block: "end" });
      setPlaced(true);
    }
  }, [placed]);

  // Après un envoi : on suit le nouveau message.
  useEffect(() => {
    if (isMount.current) {
      isMount.current = false;
      return;
    }
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  useEffect(() => {
    if (!textareaRef.current) return;
    textareaRef.current.style.height = "auto";
    textareaRef.current.style.height = textareaRef.current.scrollHeight + "px";
  }, [content]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = content.trim();
    if (!trimmed) return;

    const optimistic: ThreadMessage = {
      id: `optimistic-${Date.now()}`,
      mine: true,
      label: "",
      content: trimmed,
      created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, optimistic]);
    setContent("");
    setError("");

    start(async () => {
      const r = await onSend(trimmed);
      if (r?.error) {
        setMessages(prev => prev.filter(m => m.id !== optimistic.id));
        setError(r.error);
      }
    });
  }

  return (
    <>
      <div className="mt-7 lg:mt-9 lg:col-start-1 lg:pr-[72px]" style={{ visibility: placed ? "visible" : "hidden" }}>
        {messages.length === 0 ? (
          <p className="max-w-[420px] pt-6 text-base leading-[1.7] text-foreground/70">{emptyText}</p>
        ) : (
          messages.map((msg, i) => {
            const isFirst = i === 0 || messages[i - 1].mine !== msg.mine;
            const isLast = i === messages.length - 1 || messages[i + 1].mine !== msg.mine;

            const timeStr = new Date(msg.created_at).toLocaleString("fr-BE", {
              weekday: "short",
              day: "numeric",
              month: "short",
              hour: "2-digit",
              minute: "2-digit",
              timeZone: "Europe/Brussels",
            });

            return (
              <div
                key={msg.id}
                className={[
                  "flex items-start gap-2.5",
                  msg.mine ? "flex-row-reverse" : "",
                  i === 0 ? "mt-0" : isFirst ? "mt-5" : "mt-1",
                ].join(" ")}
              >
                {!msg.mine && (
                  <div className="hidden sm:block w-7 shrink-0 pt-6">
                    {isFirst && <StaffAvatar photoUrl={msg.avatarUrl} nom={msg.label} />}
                  </div>
                )}

                <div
                  className={[
                    "flex min-w-0 max-w-[86%] flex-col lg:max-w-[78%]",
                    msg.mine ? "items-end" : "items-start",
                  ].join(" ")}
                >
                  {isFirst && !msg.mine && (
                    <p className="mb-1 ml-0.5 text-[11px] font-bold uppercase tracking-[2px] text-primary">{msg.label}</p>
                  )}

                  <div
                    className={[
                      "whitespace-pre-wrap break-words rounded-[18px] px-[15px] py-2.5 text-[15px] leading-[1.55] lg:text-[15.5px]",
                      msg.mine ? "bg-[#0b2238] text-white" : "bg-[#edf0f7] text-foreground",
                      isFirst ? (msg.mine ? "rounded-tr-[6px]" : "rounded-tl-[6px]") : "",
                    ].join(" ")}
                  >
                    {msg.content}
                  </div>

                  {isLast && <p className="mx-[3px] mt-[5px] text-[11px] text-muted-foreground">{timeStr}</p>}
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="sticky bottom-0 z-30 -mx-4 mt-3.5 border-t border-border bg-white px-4 pb-3.5 pt-3 shadow-[0_-6px_20px_rgba(11,34,56,0.07)] sm:-mx-6 sm:px-6 lg:static lg:col-start-1 lg:mx-0 lg:mt-5 lg:border-0 lg:bg-transparent lg:px-0 lg:py-0 lg:pr-[72px] lg:shadow-none">
        <form onSubmit={handleSubmit}>
          {error && <p className="mb-2 px-1 text-xs text-destructive">{error}</p>}
          <div className="flex items-end gap-2.5">
            <textarea
              ref={textareaRef}
              value={content}
              onChange={e => {
                setContent(e.target.value);
                setError("");
              }}
              placeholder="Votre message…"
              rows={1}
              className="max-h-[140px] min-h-[46px] flex-1 resize-none rounded-[14px] border border-border bg-[#f5f5f7] px-3.5 py-[11px] text-[15px] leading-normal text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-2 focus:outline-primary/55 lg:min-h-[50px]"
            />
            <button
              type="submit"
              disabled={isPending || !content.trim()}
              aria-label="Envoyer"
              className="flex h-[46px] w-[46px] shrink-0 cursor-pointer items-center justify-center gap-2 rounded-xl bg-primary text-[#0b2238] shadow-[0_6px_24px_rgba(242,183,5,0.35)] transition-colors hover:bg-[#e6a800] disabled:cursor-default disabled:opacity-40 lg:h-[50px] lg:w-auto lg:px-[22px] lg:text-sm lg:font-black"
            >
              {isPending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
              <span className="hidden lg:inline">Envoyer</span>
            </button>
          </div>
        </form>
      </div>
      {/* Repère de fin de page, hors de la barre collante (qui est déjà à l'écran et ne ferait rien défiler). */}
      <div ref={endRef} aria-hidden className="h-0 lg:col-start-1 lg:scroll-mb-8" />
    </>
  );
}
