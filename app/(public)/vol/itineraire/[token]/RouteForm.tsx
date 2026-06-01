"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, MessageSquare, AlertTriangle, Clock, Send, Loader2, MapPin } from "lucide-react";
import { submitRouteResponse } from "@/lib/actions/route";
import { formatDuration } from "@/lib/vouchers";

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
    <div className="flex-1 flex items-center justify-center bg-[#f5f5f7] px-4 pt-[86px] pb-16">
      <div className="max-w-xl w-full py-6">

        {/* En-tête */}
        <div className="mb-6">
          <div className="w-11 h-11 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-4">
            <MapPin size={20} className="text-primary" />
          </div>
          <p className="text-[10px] font-black text-primary uppercase tracking-[3px] mb-1">
            Itinéraire de vol
          </p>
          <h1 className="text-xl font-black text-foreground">Votre itinéraire de vol</h1>
          {prenom && (
            <p className="text-sm text-muted-foreground mt-1">
              Bonjour <span className="font-semibold text-foreground capitalize">{prenom}</span>,
            </p>
          )}
          <p className="text-sm text-muted-foreground mt-0.5 capitalize">{dateStr} · {formatDuration(duree)}</p>
        </div>

        {/* Carte itinéraire */}
        <div className="bg-card rounded-2xl border border-border shadow-[var(--sh-card)] p-6 mb-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] font-black text-primary uppercase tracking-[3px]">Itinéraire prévu</p>
            <p className="text-[10px] text-muted-foreground">Proposé par votre pilote</p>
          </div>
          <pre className="text-sm text-foreground leading-relaxed whitespace-pre-wrap font-[inherit]">{route}</pre>
        </div>

        {/* Réponse déjà envoyée — validé */}
        {done === "validated" && (
          <div className="bg-card rounded-2xl border border-green-200 shadow-[var(--sh-card)] p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-green-50 border border-green-200 flex items-center justify-center shrink-0">
                <CheckCircle2 size={20} className="text-green-600" />
              </div>
              <div>
                <p className="font-semibold text-foreground">Itinéraire validé !</p>
                <p className="text-sm text-muted-foreground mt-0.5">Merci, nous vous attendons à Charleroi EBCI.</p>
              </div>
            </div>
          </div>
        )}

        {/* Réponse déjà envoyée — modif demandée */}
        {done === "modification_requested" && (
          <div className="bg-card rounded-2xl border border-primary/30 shadow-[var(--sh-card)] p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center shrink-0">
                <MessageSquare size={20} className="text-[#b38500]" />
              </div>
              <div>
                <p className="font-semibold text-foreground">Demande envoyée !</p>
                <p className="text-sm text-muted-foreground mt-0.5">Nous reviendrons vers vous avec un itinéraire modifié.</p>
              </div>
            </div>
          </div>
        )}

        {/* Délai dépassé */}
        {!done && isPastDeadline && (
          <div className="bg-card rounded-2xl border border-border shadow-[var(--sh-card)] p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-secondary border border-border flex items-center justify-center shrink-0">
                <Clock size={20} className="text-muted-foreground" />
              </div>
              <div>
                <p className="font-semibold text-foreground">Délai dépassé</p>
                <p className="text-sm text-muted-foreground mt-0.5">
                  La fenêtre de réponse est fermée (48 h avant le vol).{" "}
                  <a href="mailto:info@fly-horizons.com" className="text-primary hover:brightness-90 transition-all font-semibold">
                    Contactez-nous directement.
                  </a>
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Boutons d'action */}
        {!done && !isPastDeadline && !alreadyResponded && (
          <div className="space-y-3">

            {error && (
              <div className="flex items-center gap-2.5 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
                <AlertTriangle size={15} className="shrink-0" />
                {error}
              </div>
            )}

            {!showModify && (
              <button
                onClick={handleValidate}
                disabled={isPending}
                className="w-full flex items-center justify-center gap-2.5 px-6 py-4 rounded-lg bg-primary text-primary-foreground font-black text-sm hover:brightness-105 active:scale-[0.98] transition-all shadow-gold disabled:opacity-50 cursor-pointer"
              >
                {isPending ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle2 size={18} />}
                Je valide cet itinéraire
              </button>
            )}

            {!showModify && (
              <button
                onClick={() => setShowModify(true)}
                className="w-full flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-lg border border-border text-muted-foreground font-semibold text-sm hover:text-foreground hover:border-foreground/20 hover:bg-secondary transition-colors cursor-pointer"
              >
                <MessageSquare size={16} />
                Je souhaite modifier l&apos;itinéraire
              </button>
            )}

            {showModify && (
              <div className="bg-card rounded-2xl border border-border shadow-[var(--sh-card)] p-5 space-y-4">
                <p className="text-sm font-black text-foreground">Décrivez vos souhaits</p>
                <p className="text-xs text-muted-foreground -mt-2">
                  Quelle région souhaitez-vous survoler ? Y a-t-il un lieu particulier qui vous tient à cœur ?
                </p>
                <textarea
                  value={modifyText}
                  onChange={e => setModifyText(e.target.value)}
                  rows={5}
                  placeholder="Je souhaite visiter…"
                  className="w-full px-4 py-3 rounded-lg border border-border bg-secondary text-sm text-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all placeholder:text-muted-foreground/35"
                  autoFocus
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleModify}
                    disabled={isPending || !modifyText.trim()}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground font-black text-sm hover:brightness-105 active:scale-[0.98] transition-all disabled:opacity-50 cursor-pointer"
                  >
                    {isPending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                    Envoyer ma demande
                  </button>
                  <button
                    onClick={() => { setShowModify(false); setError(null); }}
                    className="px-4 py-2.5 rounded-lg border border-border text-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer"
                  >
                    Retour
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        <p className="text-center text-xs text-muted-foreground mt-8">
          Une question ?{" "}
          <a href="mailto:info@fly-horizons.com" className="text-primary hover:brightness-90 transition-all font-semibold">
            info@fly-horizons.com
          </a>
        </p>

      </div>
    </div>
  );
}
