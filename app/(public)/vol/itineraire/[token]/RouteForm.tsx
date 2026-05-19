"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, MessageSquare, AlertTriangle, Clock, Send, Loader2, MapPin } from "lucide-react";
import { submitRouteResponse } from "@/lib/actions/route";

interface Props {
  token: string;
  prenom: string;
  dateStr: string;
  duree: number;
  route: string;
  alreadyResponded: boolean;
  existingStatus: string | null;
  isPastDeadline: boolean;
}

export function RouteForm({ token, prenom, dateStr, duree, route, alreadyResponded, existingStatus, isPastDeadline }: Props) {
  const [isPending, startTransition] = useTransition();
  const [done, setDone] = useState<"validated" | "modification_requested" | null>(
    alreadyResponded ? (existingStatus as "validated" | "modification_requested" | null) : null
  );
  const [showModify, setShowModify] = useState(false);
  const [modifyText, setModifyText] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleValidate() {
    setError(null);
    startTransition(async () => {
      const r = await submitRouteResponse(token, "validated");
      if (r.error) { setError(r.error); return; }
      setDone("validated");
    });
  }

  function handleModify() {
    if (!modifyText.trim()) { setError("Veuillez décrire vos souhaits de modification."); return; }
    setError(null);
    startTransition(async () => {
      const r = await submitRouteResponse(token, "modification_requested", modifyText);
      if (r.error) { setError(r.error); return; }
      setDone("modification_requested");
    });
  }

  return (
    <main className="min-h-screen bg-gradient-navy pt-24 pb-16">
      <div className="container-shop max-w-xl">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-[#F2B705]/10 border border-[#F2B705]/30 mb-4">
            <MapPin size={22} className="text-[#F2B705]" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-1">Votre itinéraire de vol</h1>
          {prenom && (
            <p className="text-sm text-muted-foreground">
              Bonjour <span className="font-semibold text-foreground capitalize">{prenom}</span>,
            </p>
          )}
          <p className="text-sm text-muted-foreground mt-1 capitalize">{dateStr} · {duree} min</p>
        </div>

        {/* Route card */}
        <div className="card-premium p-6 mb-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Itinéraire prévu</p>
            <p className="text-[10px] text-muted-foreground">Proposé par votre pilote, <span className="font-semibold text-foreground">Romain D.</span></p>
          </div>
          <pre className="text-sm text-foreground leading-relaxed whitespace-pre-wrap font-[inherit]">{route}</pre>
        </div>

        {/* Already responded */}
        {done === "validated" && (
          <div className="card-premium p-6 border-green-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-green-50 border border-green-200 flex items-center justify-center shrink-0">
                <CheckCircle2 size={20} className="text-green-600" />
              </div>
              <div>
                <p className="font-semibold text-foreground">Itinéraire validé !</p>
                <p className="text-sm text-muted-foreground mt-0.5">Merci — nous vous attendons à Charleroi EBCI.</p>
              </div>
            </div>
          </div>
        )}

        {done === "modification_requested" && (
          <div className="card-premium p-6 border-amber-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center shrink-0">
                <MessageSquare size={20} className="text-amber-600" />
              </div>
              <div>
                <p className="font-semibold text-foreground">Demande envoyée !</p>
                <p className="text-sm text-muted-foreground mt-0.5">Nous reviendrons vers vous avec un itinéraire modifié.</p>
              </div>
            </div>
          </div>
        )}

        {/* Past deadline */}
        {!done && isPastDeadline && (
          <div className="card-premium p-6 border-orange-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-orange-50 border border-orange-200 flex items-center justify-center shrink-0">
                <Clock size={20} className="text-orange-500" />
              </div>
              <div>
                <p className="font-semibold text-foreground">Délai dépassé</p>
                <p className="text-sm text-muted-foreground mt-0.5">
                  La fenêtre de réponse est fermée (48 h avant le vol). Contactez-nous directement.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Action buttons */}
        {!done && !isPastDeadline && !alreadyResponded && (
          <div className="space-y-3">

            {error && (
              <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">
                <AlertTriangle size={15} className="shrink-0" />
                {error}
              </div>
            )}

            {/* Validate */}
            {!showModify && (
              <button
                onClick={handleValidate}
                disabled={isPending}
                className="w-full flex items-center justify-center gap-2.5 px-6 py-4 rounded-xl bg-[#F2B705] text-[#113356] font-bold text-base hover:bg-[#e6a800] transition-colors disabled:opacity-50"
              >
                {isPending ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle2 size={18} />}
                Je valide cet itinéraire ✓
              </button>
            )}

            {/* Modify toggle */}
            {!showModify && (
              <button
                onClick={() => setShowModify(true)}
                className="w-full flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-xl border border-border text-foreground font-semibold text-sm hover:bg-secondary transition-colors"
              >
                <MessageSquare size={16} />
                Je souhaite modifier l&apos;itinéraire
              </button>
            )}

            {/* Modify form */}
            {showModify && (
              <div className="card-premium p-5 space-y-4">
                <p className="text-sm font-semibold text-foreground">Décrivez vos souhaits</p>
                <p className="text-xs text-muted-foreground -mt-2">
                  Quelle région souhaitez-vous survoler ? Y a-t-il un lieu particulier qui vous tient à cœur ?
                </p>
                <textarea
                  value={modifyText}
                  onChange={e => setModifyText(e.target.value)}
                  rows={5}
                  placeholder="Je souhaite visiter…"
                  className="w-full px-3 py-2.5 rounded-xl border border-input bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#F2B705]/40"
                  autoFocus
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleModify}
                    disabled={isPending || !modifyText.trim()}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#113356] text-white font-semibold text-sm hover:bg-[#0d2847] transition-colors disabled:opacity-50"
                  >
                    {isPending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                    Envoyer ma demande
                  </button>
                  <button
                    onClick={() => { setShowModify(false); setError(null); }}
                    className="px-4 py-2.5 rounded-xl border border-border text-sm text-muted-foreground hover:bg-secondary transition-colors"
                  >
                    Retour
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground mt-8">
          Une question ?{" "}
          <a href="mailto:info@fly-horizons.com" className="text-primary hover:text-[#F2B705] transition-colors font-medium">
            info@fly-horizons.com
          </a>
        </p>

      </div>
    </main>
  );
}
