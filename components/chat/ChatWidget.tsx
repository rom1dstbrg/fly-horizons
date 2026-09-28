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

export function ChatWidget({ mobileVisible = false }: { mobileVisible?: boolean }) {
  const [open, setOpen]           = useState(false);
  const [messages, setMessages]   = useState<Message[]>([WELCOME]);
  const [input, setInput]         = useState("");
  const [loading, setLoading]     = useState(false);
  const [sessionId, setSessionId] = useState<string | undefined>();
  const [enabled, setEnabled]     = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const s = localStorage.getItem("fh_chat_session");
    if (s) setSessionId(s);
    const cached = sessionStorage.getItem("fh_chat_enabled");
    if (cached !== null) { setEnabled(cached === "true"); return; }
    fetch("/api/site-settings")
      .then(r => r.json())
      .then(d => {
        const val = d.chat_enabled !== "false";
        setEnabled(val);
        sessionStorage.setItem("fh_chat_enabled", String(val));
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    function onOpen() { setOpen(true); }
    window.addEventListener("fh:open-chat", onOpen);
    return () => window.removeEventListener("fh:open-chat", onOpen);
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

  if (!enabled) return null;

  return (
    <>
      {/* ── Panneau ─────────────────────────────────────────────────────── */}
      <div
        className={`fixed bottom-6 left-3 right-3 sm:left-auto sm:right-6 sm:w-[360px] z-50 bg-white rounded-2xl overflow-hidden flex flex-col ${mobileVisible ? "" : "hidden sm:flex"}`}
        style={{
          maxHeight: "55vh",
          boxShadow: "0 8px 40px rgba(0,0,0,0.11), 0 2px 8px rgba(0,0,0,0.06)",
          transform: open ? "translateY(0)" : "translateY(calc(100% + 1.5rem))",
          opacity: open ? 1 : 0,
          transition: "transform 0.32s cubic-bezier(0.4,0,0.2,1), opacity 0.25s ease",
          pointerEvents: open ? "auto" : "none",
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3.5 bg-white border-b border-border shrink-0">
          <p className="text-sm font-black text-[#0b2238] tracking-tight">Assistant Fly Horizons</p>
          <button
            onClick={() => setOpen(false)}
            className="p-1.5 text-foreground/30 hover:text-foreground transition-colors cursor-pointer"
          >
            <X size={14} />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 min-h-0 overflow-y-auto px-4 py-4 space-y-3 bg-[#f5f5f7]">
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[82%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
                  msg.role === "user"
                    ? "bg-[#0b2238] text-white rounded-br-sm"
                    : "bg-white border border-border text-foreground rounded-bl-sm shadow-sm"
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
                {msg.role === "assistant" && msg.content.includes("access-ebci") && (
                  <Link
                    href="/access-ebci"
                    className="block mt-2 text-xs font-semibold text-[#F2B705] hover:underline"
                  >
                    Voir le plan d&apos;accès →
                  </Link>
                )}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-white border border-border shadow-sm rounded-2xl rounded-bl-sm px-4 py-3">
                <div className="flex gap-1 items-center">
                  <span className="w-1.5 h-1.5 bg-[#0b2238]/30 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-1.5 h-1.5 bg-[#0b2238]/30 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-1.5 h-1.5 bg-[#0b2238]/30 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
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
            className="flex-1 text-sm px-3.5 py-2 rounded-xl bg-[#f5f5f7] border border-transparent focus:outline-none focus:border-[#0b2238]/20 transition-colors text-foreground placeholder:text-muted-foreground disabled:opacity-50"
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || loading}
            className="w-9 h-9 rounded-xl bg-[#0b2238] flex items-center justify-center shrink-0 hover:bg-[#0b2238]/85 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
          >
            <Send size={13} className="text-white" />
          </button>
        </div>
      </div>

      {/* ── Bouton déclencheur ───────────────────────────────────────────── */}
      <button
        onClick={() => setOpen(true)}
        aria-label="Ouvrir le chat"
        className={`fixed bottom-6 right-6 z-50 flex items-center justify-center gap-2.5 bg-[#F2B705] text-[#0b2238] rounded-full w-14 h-14 sm:w-auto sm:h-auto sm:pl-4 sm:pr-5 sm:py-3 font-bold text-sm shadow-[0_4px_20px_rgba(242,183,5,.45)] hover:bg-[#e6a800] hover:-translate-y-0.5 active:translate-y-0 transition-all cursor-pointer ${mobileVisible ? "" : "hidden sm:flex"}`}
        style={{
          opacity: open ? 0 : 1,
          transform: open ? "scale(0.9) translateY(4px)" : "scale(1) translateY(0)",
          transition: "opacity 0.2s ease, transform 0.2s ease, background-color 0.15s",
          pointerEvents: open ? "none" : "auto",
        }}
      >
        <span className="sm:hidden text-xl font-black leading-none">?</span>
        <PlaneTakeoff size={16} className="hidden sm:block shrink-0" />
        <span className="hidden sm:inline">Une question ?</span>
      </button>
    </>
  );
}
