"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { Send, Loader2, User } from "lucide-react";
import { submitClientReply } from "@/lib/actions/contacts";

interface Message {
  id: string;
  author: "client" | "admin";
  content: string;
  created_at: string;
}

interface Props {
  token: string;
  initialMessages: Message[];
}

export function TicketThread({ token, initialMessages }: Props) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [content, setContent]   = useState("");
  const [error, setError]       = useState("");
  const [isPending, start]      = useTransition();
  const textareaRef             = useRef<HTMLTextAreaElement>(null);
  const bottomRef               = useRef<HTMLDivElement>(null);
  const lastMsgRef              = useRef<HTMLDivElement>(null);
  const isMount                 = useRef(true);

  useEffect(() => {
    if (isMount.current) {
      isMount.current = false;
      lastMsgRef.current?.scrollIntoView({ block: "start" });
    } else {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
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

    const optimistic: Message = {
      id: `optimistic-${Date.now()}`,
      author: "client",
      content: trimmed,
      created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, optimistic]);
    setContent("");
    setError("");

    start(async () => {
      const r = await submitClientReply(token, trimmed);
      if (r?.error) {
        setMessages(prev => prev.filter(m => m.id !== optimistic.id));
        setError(r.error);
      }
    });
  }

  return (
    <div>
      {/* ── Fil de messages ── */}
      {messages.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-sm text-muted-foreground leading-relaxed">
            Votre demande a bien été reçue.<br />
            Nous vous répondrons sous 24 h.
          </p>
        </div>
      ) : (
        <div>
          {messages.map((msg, i) => {
            const isAdmin   = msg.author === "admin";
            const isFirst   = i === 0 || messages[i - 1].author !== msg.author;
            const isLast    = i === messages.length - 1 || messages[i + 1].author !== msg.author;
            const isOnlyOne = isFirst && isLast;
            const isLastMsg = i === messages.length - 1;

            const timeStr = new Date(msg.created_at).toLocaleString("fr-BE", {
              day: "numeric", month: "short",
              hour: "2-digit", minute: "2-digit",
            });

            const bubbleRadius = isOnlyOne
              ? "rounded-lg"
              : isFirst
                ? isAdmin ? "rounded-lg rounded-tl-sm" : "rounded-lg rounded-tr-sm"
                : "rounded-lg";

            return (
              <div
                key={msg.id}
                ref={isLastMsg ? lastMsgRef : undefined}
                className={[
                  "flex items-start gap-2.5",
                  isAdmin ? "" : "flex-row-reverse",
                  i === 0   ? "mt-0"
                  : isFirst ? "mt-6"
                  :           "mt-1.5",
                ].join(" ")}
              >
                {/* Avatar — masqué sur mobile */}
                <div className="hidden sm:block w-7 shrink-0 pt-0.5">
                  {isFirst && (
                    <div className={[
                      "w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-black",
                      isAdmin
                        ? "bg-primary text-[#0b2238] shadow-gold-sm"
                        : "bg-secondary text-muted-foreground border border-border",
                    ].join(" ")}>
                      {isAdmin ? "R" : <User size={12} />}
                    </div>
                  )}
                </div>

                {/* Colonne bulle */}
                <div className={[
                  "flex flex-col max-w-[88%] sm:max-w-[76%]",
                  isAdmin ? "items-start" : "items-end",
                ].join(" ")}>

                  {isFirst && isAdmin && (
                    <p className="text-[10px] font-bold text-primary uppercase tracking-[2px] mb-1 ml-1">
                      Romain · Fly Horizons
                    </p>
                  )}

                  <div className={[
                    "px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap",
                    bubbleRadius,
                    isAdmin
                      ? "bg-navy text-white"
                      : "bg-card text-foreground border border-border",
                  ].join(" ")}>
                    {msg.content}
                  </div>

                  {isLast && (
                    <p className="text-[10px] text-muted-foreground mt-1 px-0.5">
                      {timeStr}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div ref={bottomRef} className="h-2" />

      {/* ── Zone de réponse style messenger ── */}
      <form onSubmit={handleSubmit} className="mt-8">
        {error && <p className="text-xs text-destructive mb-2 px-1">{error}</p>}
        <div className="bg-card border border-border rounded-2xl shadow-premium flex items-center gap-3 px-4 py-3">
          <textarea
            ref={textareaRef}
            value={content}
            onChange={e => { setContent(e.target.value); setError(""); }}
            placeholder="Votre message…"
            rows={1}
            className="flex-1 bg-transparent text-sm text-foreground resize-none focus:outline-none leading-relaxed placeholder:text-muted-foreground min-h-[22px] max-h-[160px] overflow-y-auto"
          />
          <button
            type="submit"
            disabled={isPending || !content.trim()}
            className="w-8 h-8 rounded-lg bg-primary text-[#0b2238] flex items-center justify-center hover:brightness-95 disabled:opacity-40 transition-all cursor-pointer shadow-gold-sm shrink-0"
          >
            {isPending ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
          </button>
        </div>
      </form>
    </div>
  );
}
