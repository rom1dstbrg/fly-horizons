"use client";

import { useState } from "react";
import { Star, Send, CheckCircle, AlertCircle } from "lucide-react";

interface Props {
  reservationId: string;
  prenom: string;
  dateStr: string;
  duree: string;
}

function StarRating({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  const [hovered, setHovered] = useState(0);
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-foreground">{label}</p>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            onMouseEnter={() => setHovered(n)}
            onMouseLeave={() => setHovered(0)}
            className="p-0.5 transition-transform hover:scale-110 focus:outline-none"
            aria-label={`${n} étoile${n > 1 ? "s" : ""}`}
          >
            <Star
              size={28}
              className="transition-colors"
              fill={(hovered || value) >= n ? "#F2B705" : "transparent"}
              stroke={(hovered || value) >= n ? "#F2B705" : "#cbd5e1"}
              strokeWidth={1.5}
            />
          </button>
        ))}
      </div>
    </div>
  );
}

export default function SatisfactionForm({ reservationId, prenom, dateStr, duree }: Props) {
  const [noteGlobale, setNoteGlobale] = useState(0);
  const [noteAccueil, setNoteAccueil] = useState(0);
  const [notePilote, setNotePilote] = useState(0);
  const [commentaire, setCommentaire] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const canSubmit = noteGlobale > 0 && noteAccueil > 0 && notePilote > 0 && status === "idle";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setStatus("loading");
    try {
      const res = await fetch("/api/satisfaction/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reservation_id: reservationId,
          note_globale: noteGlobale,
          note_accueil: noteAccueil,
          note_pilote: notePilote,
          commentaire,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error ?? "Une erreur est survenue.");
        setStatus("error");
      } else {
        setStatus("success");
      }
    } catch {
      setErrorMsg("Impossible d'envoyer le formulaire. Vérifiez votre connexion.");
      setStatus("error");
    }
  }

  if (status === "success") {
    return (
      <div className="text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
          <CheckCircle className="text-green-600" size={32} />
        </div>
        <h2 className="text-xl font-bold text-foreground">Merci, {prenom} !</h2>
        <p className="text-muted-foreground text-sm leading-relaxed">
          Votre avis a bien été transmis. Il nous aide à améliorer chaque vol.
        </p>
        <p className="text-xs text-muted-foreground pt-2">
          À bientôt à bord &mdash; L&apos;équipe Fly Horizons
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-7">
      <div className="text-center">
        <p className="text-xs font-bold uppercase tracking-widest text-[#F2B705] mb-1">Fly Horizons</p>
        <h1 className="text-2xl font-extrabold text-foreground mb-1">Votre avis</h1>
        <p className="text-sm text-muted-foreground">
          Vol du {dateStr} &middot; {duree}
        </p>
      </div>

      <hr className="border-border" />

      <StarRating label="Note globale" value={noteGlobale} onChange={setNoteGlobale} />
      <StarRating label="Qualité de l'accueil" value={noteAccueil} onChange={setNoteAccueil} />
      <StarRating label="Professionnalisme du pilote" value={notePilote} onChange={setNotePilote} />

      <div className="space-y-2">
        <label htmlFor="commentaire" className="text-sm font-medium text-foreground">
          Commentaire <span className="text-muted-foreground font-normal">(facultatif)</span>
        </label>
        <textarea
          id="commentaire"
          rows={4}
          value={commentaire}
          onChange={(e) => setCommentaire(e.target.value)}
          placeholder="Partagez votre expérience..."
          maxLength={1000}
          className="w-full rounded-xl border border-border bg-secondary/30 px-4 py-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[#F2B705]/50 resize-none"
        />
      </div>

      {status === "error" && (
        <div className="flex items-start gap-2.5 rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <AlertCircle size={16} className="shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      <button
        type="submit"
        disabled={!canSubmit}
        className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#F2B705] text-[#0b2238] font-bold py-3.5 text-sm transition-opacity disabled:opacity-40"
      >
        {status === "loading" ? (
          <span className="animate-pulse">Envoi en cours…</span>
        ) : (
          <>
            <Send size={16} />
            Envoyer mon avis
          </>
        )}
      </button>
    </form>
  );
}
