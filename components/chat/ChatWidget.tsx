"use client";

import { useState, useRef, useEffect } from "react";
import { Send, MessageCircle, X } from "lucide-react";
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
  const [open, setOpen] = useState(false);
  const [hintVisible, setHintVisible] = useState(false);
  const [messages, setMessages] = useState<Message[]>([WELCOME]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | undefined>();
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Hint après 3s sur toutes les tailles d'écran
  useEffect(() => {
    const t = setTimeout(() => setHintVisible(true), 3000);
    return () => clearTimeout(t);
  }, []);

  // Masque le hint dès que le chat s'ouvre
  useEffect(() => {
    if (open) setHintVisible(false);
  }, [open]);

  useEffect(() => {
    const stored = localStorage.getItem("fh_chat_session");
    if (stored) setSessionId(stored);
  }, []);

  useEffect(() => {
    if (open) {
      setTimeout(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
        inputRef.current?.focus();
      }, 50);
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

    const apiMessages = updated.filter((m) => m !== WELCOME);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: apiMessages, sessionId }),
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
    <div className="fixed bottom-4 right-5 z-50 flex flex-col items-end gap-1">

      {/* Panneau de chat */}
      {open && (
        <div
          className="w-[360px] max-w-[calc(100vw-3rem)] bg-white rounded-xl border border-border shadow-2xl flex flex-col overflow-hidden"
          style={{ maxHeight: "50vh" }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-[#0b2238] shrink-0">
            <div className="flex items-center gap-2">
              <MessageCircle size={14} className="text-[#F2B705]" />
              <span className="text-sm font-bold text-white">Assistant Fly Horizons</span>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="text-white/50 hover:text-white transition-colors cursor-pointer"
            >
              <X size={15} />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 min-h-0 overflow-y-auto px-4 py-3 space-y-3 bg-[#f5f8ff]">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[82%] rounded-xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
                    msg.role === "user"
                      ? "bg-[#0b2238] text-white rounded-br-sm"
                      : "bg-white border border-border text-foreground rounded-bl-sm"
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
                <div className="bg-white border border-border rounded-xl rounded-bl-sm px-4 py-3">
                  <div className="flex gap-1 items-center">
                    <span className="w-1.5 h-1.5 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-1.5 h-1.5 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-1.5 h-1.5 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
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
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              placeholder="Votre question…"
              disabled={loading}
              className="flex-1 text-sm px-3.5 py-2 rounded-lg bg-[#f5f8ff] border border-border focus:outline-none focus:border-foreground transition-colors text-foreground placeholder:text-muted-foreground disabled:opacity-50"
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim() || loading}
              className="w-9 h-9 rounded-lg bg-[#0b2238] flex items-center justify-center shrink-0 hover:bg-[#0b2238]/80 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              <Send size={14} className="text-white" />
            </button>
          </div>
        </div>
      )}

      {/* Hint mobile — bulle "Une question ?" */}
      <div
        className="flex items-end gap-2"
        style={{
          transition: "opacity 0.4s ease, transform 0.4s ease",
          opacity: hintVisible ? 1 : 0,
          transform: hintVisible ? "translateY(0)" : "translateY(6px)",
          pointerEvents: hintVisible ? "auto" : "none",
        }}
      >
        <div className="bg-white border border-border rounded-2xl rounded-br-sm px-4 py-2 shadow-lg">
          <p className="text-sm font-medium text-[#0b2238] whitespace-nowrap">Une question ?</p>
        </div>
      </div>

      {/* Bulle flottante */}
      <button
        onClick={() => { setOpen((v) => !v); setHintVisible(false); }}
        className="w-14 h-14 rounded-full bg-[#0b2238] shadow-xl flex items-center justify-center hover:scale-105 active:scale-95 transition-transform cursor-pointer border-2 border-[#F2B705]/40"
        aria-label={open ? "Fermer le chat" : "Ouvrir le chat"}
      >
        {open
          ? <X size={20} className="text-white" />
          : <MessageCircle size={20} className="text-[#F2B705]" />
        }
      </button>

    </div>
  );
}
