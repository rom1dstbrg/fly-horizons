"use client";

import { useState, useRef, useEffect } from "react";
import { Send, X, PlaneTakeoff } from "lucide-react";
import Link from "next/link";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const WELCOME: Message = {
  role: "assistant",
  content:
    "Bonjour ! Je suis l'assistant Fly Horizons. Posez-moi vos questions sur nos vols, les tarifs, les bons cadeaux ou tout ce dont vous avez besoin.",
};

export function ChatWidget() {
  const [open, setOpen]           = useState(false);
  const [messages, setMessages]   = useState<Message[]>([WELCOME]);
  const [input, setInput]         = useState("");
  const [loading, setLoading]     = useState(false);
  const [sessionId, setSessionId] = useState<string | undefined>();
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const s = localStorage.getItem("fh_chat_session");
    if (s) setSessionId(s);
  }, []);

  useEffect(() => {
    if (open) {
      setTimeout(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
        inputRef.current?.focus();
      }, 320);
    }
  }, [open]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function sendMessage() {
    const text = input.trim();
    if (!text || loading) return;
    const userMsg: Message = { role: "user", content: text };
    const updated = [...messages, userMsg];
    setMessages(updated);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: updated.filter((m) => m !== WELCOME),
          sessionId,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erreur");
      setMessages([...updated, { role: "assistant", content: data.response }]);
      if (data.sessionId) {
        setSessionId(data.sessionId);
        localStorage.setItem("fh_chat_session", data.sessionId);
      }
    } catch {
      setMessages([
        ...updated,
        {
          role: "assistant",
          content:
            "Désolé, je rencontre une difficulté. Veuillez réessayer ou nous contacter directement via la page contact.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {/* ── Panneau ─────────────────────────────────────────────────────── */}
      <div
        className="fixed bottom-6 right-6 z-50 w-[360px] max-w-[calc(100vw-3rem)] bg-white rounded-2xl overflow-hidden flex flex-col"
        style={{
          maxHeight: "50vh",
          boxShadow: "0 12px 48px rgba(11,34,56,.22), 0 2px 8px rgba(11,34,56,.08)",
          borderTop: "2.5px solid #F2B705",
          transform: open ? "translateY(0)" : "translateY(calc(100% + 1.5rem))",
          opacity: open ? 1 : 0,
          transition: "transform 0.32s cubic-bezier(0.4,0,0.2,1), opacity 0.25s ease",
          pointerEvents: open ? "auto" : "none",
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3.5 bg-[#0b2238] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-[#F2B705] flex items-center justify-center shrink-0">
              <PlaneTakeoff size={14} className="text-[#0b2238]" />
            </div>
            <div>
              <p className="text-sm font-black text-white leading-tight tracking-tight">Fly Horizons</p>
              <p className="text-[10px] text-white/45 leading-tight mt-0.5">Assistant virtuel</p>
            </div>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X size={13} className="text-white/70" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 min-h-0 overflow-y-auto px-4 py-4 space-y-3 bg-[#f5f8ff]">
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[82%] rounded-xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
                  msg.role === "user"
                    ? "bg-[#0b2238] text-white rounded-br-sm"
                    : "bg-white border border-[#F2B705]/20 text-foreground rounded-bl-sm shadow-sm"
                }`}
              >
                {msg.content}
                {msg.role === "assistant" && msg.content.includes("page contact") && (
                  <Link
                    href="/contact"
                    className="block mt-2 text-xs font-semibold text-[#F2B705] hover:underline"
                  >
                    Accéder à la page contact →
                  </Link>
                )}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-white border border-[#F2B705]/20 shadow-sm rounded-xl rounded-bl-sm px-4 py-3">
                <div className="flex gap-1 items-center">
                  <span className="w-1.5 h-1.5 bg-[#F2B705] rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-1.5 h-1.5 bg-[#F2B705] rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-1.5 h-1.5 bg-[#F2B705] rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="px-3 py-3 border-t border-border flex gap-2 bg-white shrink-0">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
            }}
            placeholder="Votre question…"
            disabled={loading}
            className="flex-1 text-sm px-3.5 py-2 rounded-lg bg-[#f5f8ff] border border-border focus:outline-none focus:ring-1 focus:ring-[#F2B705]/40 focus:border-[#F2B705]/50 transition-colors text-foreground placeholder:text-muted-foreground disabled:opacity-50"
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || loading}
            className="w-9 h-9 rounded-lg bg-[#0b2238] flex items-center justify-center shrink-0 hover:bg-[#0b2238]/80 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
          >
            <Send size={14} className="text-[#F2B705]" />
          </button>
        </div>
      </div>

      {/* ── Bouton déclencheur ───────────────────────────────────────────── */}
      <button
        onClick={() => setOpen(true)}
        aria-label="Ouvrir le chat"
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 bg-[#F2B705] text-[#0b2238] rounded-full pl-4 pr-5 py-3 font-bold text-sm shadow-[0_4px_20px_rgba(242,183,5,.45)] hover:bg-[#e6a800] hover:-translate-y-0.5 active:translate-y-0 transition-all cursor-pointer"
        style={{
          opacity: open ? 0 : 1,
          transform: open ? "scale(0.9) translateY(4px)" : "scale(1) translateY(0)",
          transition: "opacity 0.2s ease, transform 0.2s ease, background-color 0.15s",
          pointerEvents: open ? "none" : "auto",
        }}
      >
        <PlaneTakeoff size={15} className="shrink-0" />
        Une question ?
      </button>
    </>
  );
}
