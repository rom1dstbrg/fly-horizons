"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { Send, Loader2, CheckCircle2 } from "lucide-react";
import { submitClientReply } from "@/lib/actions/contacts";

export function TicketReplyForm({ token }: { token: string }) {
  const [content, setContent]   = useState("");
  const [success, setSuccess]   = useState(false);
  const [error, setError]       = useState("");
  const [isPending, start]      = useTransition();
  const textareaRef             = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = textareaRef.current.scrollHeight + "px";
    }
  }, [content]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) return;
    start(async () => {
      const r = await submitClientReply(token, content);
      if (r?.error) { setError(r.error); return; }
      setSuccess(true);
      setContent("");
    });
  }

  if (success) {
    return (
      <div className="flex flex-col items-center gap-3 py-8 text-center">
        <CheckCircle2 className="w-10 h-10 text-emerald-500" />
        <p className="font-semibold text-[#0b2238]">Message envoyé</p>
        <p className="text-sm text-slate-500">Romain vous répondra dans les meilleurs délais.</p>
        <button
          onClick={() => setSuccess(false)}
          className="mt-2 text-xs text-slate-400 underline underline-offset-2 cursor-pointer"
        >
          Envoyer un autre message
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <textarea
        ref={textareaRef}
        value={content}
        onChange={e => { setContent(e.target.value); setError(""); }}
        placeholder="Votre message…"
        rows={4}
        className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm text-slate-700 resize-none focus:outline-none focus:ring-2 focus:ring-[#0b2238]/20 focus:border-[#0b2238] transition-colors leading-relaxed"
      />
      {error && <p className="text-xs text-red-500">{error}</p>}
      <button
        type="submit"
        disabled={isPending || !content.trim()}
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#F2B705] text-[#0b2238] text-sm font-bold hover:bg-[#e0a800] disabled:opacity-50 transition-colors cursor-pointer"
      >
        {isPending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
        Envoyer ma réponse
      </button>
    </form>
  );
}
