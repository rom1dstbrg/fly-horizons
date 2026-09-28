"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, CheckCircle2, Loader2 } from "lucide-react";

// Deux habillages : "dark" (footer navy, historique) et "light" (fond blanc, ex. alerte
// « aucun vol publié » de l'accueil, nouvelle DA 28/09). Même logique, même consentement.
const THEMES = {
  dark: {
    input: "px-4 py-2.5 text-sm bg-white/8 border border-white/12 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-[#F2B705]/40 focus:bg-white/12 transition-all",
    button: "px-5 py-2.5 rounded-xl font-bold text-sm",
    box: "bg-white/8 border-white/20 group-hover:border-white/40",
    consent: "text-[10px] text-white/30",
    consentLink: "hover:text-white/60",
    done: "text-sm text-white/70",
    footnote: "text-[10px] text-white/20",
    error: "text-xs text-red-400",
  },
  light: {
    input: "h-[52px] px-4 text-[15px] bg-secondary border border-border rounded-xl text-foreground placeholder:text-[#8a94a6] outline-none focus:bg-white focus:border-foreground transition-colors",
    button: "h-[52px] px-6 rounded-[10px] font-black text-sm shadow-gold",
    box: "bg-white border-border group-hover:border-foreground",
    consent: "text-xs text-muted-foreground",
    consentLink: "text-[#0b2238] hover:decoration-primary",
    done: "text-[15px] text-foreground/80",
    footnote: "text-xs text-muted-foreground",
    error: "text-sm text-red-600",
  },
} as const;

export function NewsletterForm({
  compact = false,
  variant = "dark",
  submitLabel,
}: {
  compact?: boolean;
  variant?: "dark" | "light";
  submitLabel?: string;
}) {
  const [email, setEmail]     = useState("");
  const [prenom, setPrenom]   = useState("");
  const [consent, setConsent] = useState(false);
  const [status, setStatus]   = useState<"idle" | "loading" | "success" | "already" | "error">("idle");
  const [error, setError]     = useState("");
  const t = THEMES[variant];

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
      <div className="flex items-center gap-2.5" role="status">
        <CheckCircle2 size={variant === "light" ? 18 : 16} className="text-[#F2B705] shrink-0" />
        <p className={t.done}>
          {status === "success"
            ? variant === "light" ? "C'est noté : nous vous prévenons dès qu'un vol est en ligne." : "Inscription confirmée. À très vite !"
            : "Cette adresse est déjà inscrite."}
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className={variant === "light" ? "space-y-3" : "space-y-2"}>
      {!compact && (
        <input
          type="text"
          placeholder="Prénom (optionnel)"
          value={prenom}
          onChange={e => setPrenom(e.target.value)}
          className={`w-full ${t.input}`}
        />
      )}
      <div className={variant === "light" ? "flex flex-col sm:flex-row gap-2.5" : "flex gap-2"}>
        <input
          type="email"
          required
          placeholder="Votre adresse email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          className={`${variant === "light" ? "w-full sm:flex-1" : "flex-1"} min-w-0 ${t.input}`}
        />
        <button
          type="submit"
          disabled={status === "loading" || !consent}
          className={`${t.button} bg-[#F2B705] text-[#0b2238] hover:bg-[#e6a800] transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shrink-0 flex items-center justify-center gap-1.5`}
        >
          {status === "loading" ? <Loader2 size={15} className="animate-spin" /> : submitLabel ?? <ArrowRight size={15} />}
        </button>
      </div>
      <label className="flex items-start gap-2 cursor-pointer group">
        <div className="relative shrink-0 mt-0.5">
          <input
            type="checkbox"
            checked={consent}
            onChange={e => setConsent(e.target.checked)}
            className="sr-only"
          />
          <div className={`w-4 h-4 rounded border transition-all flex items-center justify-center ${
            consent ? "bg-[#F2B705] border-[#F2B705]" : t.box
          }`}>
            {consent && <Check size={10} strokeWidth={3} className="text-[#0b2238]" />}
          </div>
        </div>
        <span className={`${t.consent} leading-relaxed`}>
          J&apos;accepte de recevoir la newsletter Fly Horizons.{" "}
          <Link href="/politique-de-confidentialite" target="_blank" className={`underline underline-offset-2 transition-colors ${t.consentLink}`}>
            Politique de confidentialité
          </Link>.
        </span>
      </label>
      {status === "error" && <p className={t.error}>{error}</p>}
      <p className={t.footnote}>Désinscription possible à tout moment.</p>
    </form>
  );
}
