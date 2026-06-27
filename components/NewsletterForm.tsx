"use client";

import { useState } from "react";
import { ArrowRight, CheckCircle2, Loader2 } from "lucide-react";

export function NewsletterForm({ compact = false }: { compact?: boolean }) {
  const [email, setEmail]   = useState("");
  const [prenom, setPrenom] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "already" | "error">("idle");
  const [error, setError]   = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setStatus("loading");
    setError("");
    try {
      const res = await fetch("/api/newsletter/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, prenom: prenom || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.error === "already_subscribed") setStatus("already");
        else { setError(data.error ?? "Une erreur est survenue."); setStatus("error"); }
      } else {
        setStatus("success");
      }
    } catch {
      setError("Une erreur est survenue. Réessayez.");
      setStatus("error");
    }
  }

  if (status === "success" || status === "already") {
    return (
      <div className="flex items-center gap-2.5">
        <CheckCircle2 size={16} className="text-[#F2B705] shrink-0" />
        <p className="text-sm text-white/70">
          {status === "success" ? "Inscription confirmée. À très vite !" : "Cette adresse est déjà inscrite."}
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      {!compact && (
        <input
          type="text"
          placeholder="Prénom (optionnel)"
          value={prenom}
          onChange={e => setPrenom(e.target.value)}
          className="w-full px-4 py-2.5 text-sm bg-white/8 border border-white/12 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-[#F2B705]/40 focus:bg-white/12 transition-all"
        />
      )}
      <div className="flex gap-2">
        <input
          type="email"
          required
          placeholder="Votre adresse email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          className="flex-1 min-w-0 px-4 py-2.5 text-sm bg-white/8 border border-white/12 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-[#F2B705]/40 focus:bg-white/12 transition-all"
        />
        <button
          type="submit"
          disabled={status === "loading"}
          className="px-5 py-2.5 bg-[#F2B705] text-[#0b2238] rounded-xl font-bold text-sm hover:bg-[#e6a800] transition-colors disabled:opacity-60 cursor-pointer shrink-0 flex items-center gap-1.5"
        >
          {status === "loading" ? <Loader2 size={15} className="animate-spin" /> : <ArrowRight size={15} />}
        </button>
      </div>
      {status === "error" && <p className="text-xs text-red-400">{error}</p>}
      <p className="text-[10px] text-white/20">Désinscription possible à tout moment.</p>
    </form>
  );
}
