"use client";

import { useState, useTransition, useEffect } from "react";
import {
  CheckCircle2, MessageSquare, AlertTriangle, Send, Loader2,
  PlaneTakeoff, Clock,
} from "lucide-react";
import { respondToRouteProposal } from "@/lib/actions/reservation-edit";
import { formatDuration } from "@/lib/vouchers";
import dynamic from "next/dynamic";

const RouteMapReadOnly = dynamic(
  () => import("@/components/maps/RouteMapReadOnly"),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full bg-navy flex items-center justify-center">
        <p className="text-sm text-white/40 animate-pulse">Chargement de la carte…</p>
      </div>
    ),
  }
);

type Waypoint = { lat: number; lng: number; nom?: string };

interface Props {
  token: string;
  prenom: string;
  dateStr: string;
  duree: number;
  waypoints: Waypoint[];
  adminComment: string;
  alreadyResponded: boolean;
  existingStatus: string;
  typeResa: string;
  alreadyPaid: boolean;
}

export function PropositionForm({ token, prenom, dateStr, duree, waypoints, adminComment, alreadyResponded, existingStatus, typeResa, alreadyPaid }: Props) {
  const [isPending, startTransition] = useTransition();
  const [done, setDone] = useState<"accepted" | "modification_requested" | null>(
    alreadyResponded ? (existingStatus as "accepted" | "modification_requested") : null
  );
  const [showModify, setShowModify] = useState(false);
  const [modifyText, setModifyText] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  function handleAccept() {
    setError(null);
    startTransition(async () => {
      const r = await respondToRouteProposal(token, "accepted");
      if (r.error) { setError(r.error); return; }
      setDone("accepted");
    });
  }

  function handleModify() {
    if (!modifyText.trim()) { setError("Veuillez décrire vos souhaits de modification."); return; }
    setError(null);
    startTransition(async () => {
      const r = await respondToRouteProposal(token, "modification_requested", modifyText);
      if (r.error) { setError(r.error); return; }
      setDone("modification_requested");
    });
  }

  return (
    <div
      className="fixed left-0 right-0 bottom-0 z-40 bg-background p-3 flex flex-col lg:flex-row gap-3"
      style={{ top: "84px" }}
    >
      {/* ── Carte ─────────────────────────────────────────────── */}
      <div className="h-[42vh] lg:h-auto lg:flex-1 relative rounded-[var(--r-sm)] overflow-hidden shadow-[0_2px_16px_rgba(0,0,0,0.10)] border border-border">
        <RouteMapReadOnly waypoints={waypoints} height="100%" className="w-full h-full" />
      </div>

      {/* ── Panneau droit ─────────────────────────────────────── */}
      <div className="lg:w-[360px] xl:w-[400px] shrink-0 card-premium overflow-hidden flex flex-col">

        {/* En-tête */}
        <div className="px-5 pt-5 pb-4 border-b border-border shrink-0">
          {prenom && (
            <p className="text-xs text-muted-foreground mb-1.5">
              Bonjour <strong className="text-foreground capitalize">{prenom}</strong>,
            </p>
          )}
          <p className="text-xs font-bold text-primary uppercase tracking-[3px] mb-0.5">
            Proposition d&apos;itinéraire
          </p>
          <h1 className="text-lg font-black text-foreground leading-tight capitalize">{dateStr}</h1>
          <div className="flex items-center gap-1.5 mt-1.5 text-xs text-muted-foreground">
            <Clock size={11} />
            {formatDuration(duree)}
          </div>
        </div>

        {/* Contenu scrollable */}
        <div className="flex-1 overflow-y-auto min-h-0">
          <div className="p-5 space-y-5">

            {/* Message du pilote */}
            {adminComment && (
              <div>
                <p className="text-[10px] font-bold text-primary uppercase tracking-[3px] mb-2">
                  Message de votre pilote
                </p>
                <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{adminComment}</p>
              </div>
            )}

            {/* Timeline parcours */}
            <div>
              <p className="text-[10px] font-bold text-primary uppercase tracking-[3px] mb-4">
                Lieux à survoler
              </p>
              <ol className="space-y-0">

                {/* Départ EBCI */}
                <li className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className="w-7 h-7 rounded-full bg-navy flex items-center justify-center shrink-0">
                      <PlaneTakeoff size={13} className="text-primary" />
                    </div>
                    <div className="w-px flex-1 bg-border my-1 min-h-[20px]" />
                  </div>
                  <div className="pb-3 pt-1">
                    <p className="text-sm font-semibold text-foreground">Charleroi EBCI</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">Départ</p>
                  </div>
                </li>

                {waypoints.map((wp, i) => (
                  <li key={i} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center shrink-0 text-[11px] font-black text-primary-foreground">
                        {i + 1}
                      </div>
                      <div className="w-px flex-1 bg-border my-1 min-h-[20px]" />
                    </div>
                    <div className="pb-3 pt-1">
                      <p className="text-sm font-semibold text-foreground">
                        {wp.nom ?? `Point ${i + 1}`}
                      </p>
                    </div>
                  </li>
                ))}

                {/* Retour EBCI */}
                {waypoints.length > 0 && (
                  <li className="flex gap-3">
                    <div className="w-7 h-7 rounded-full bg-navy flex items-center justify-center shrink-0">
                      <PlaneTakeoff size={13} className="text-primary scale-x-[-1]" />
                    </div>
                    <div className="pt-1">
                      <p className="text-sm font-semibold text-foreground">Charleroi EBCI</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">Retour</p>
                    </div>
                  </li>
                )}

              </ol>
            </div>

          </div>
        </div>

        {/* Actions — collées en bas */}
        <div className="px-5 pb-5 pt-4 shrink-0 border-t border-border space-y-2.5">

          {done === "accepted" && (
            <div className="flex items-start gap-3 px-4 py-3.5 rounded-xl bg-green-50 border border-green-200">
              <CheckCircle2 size={16} className="text-green-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-green-800 text-sm">Itinéraire accepté !</p>
                <p className="text-xs text-green-700 mt-0.5">
                  {typeResa === "perso" && !alreadyPaid
                    ? "Votre lien de paiement vous a été envoyé par email."
                    : typeResa === "perso" && alreadyPaid
                    ? "Votre pilote a bien été notifié. Votre paiement a déjà été enregistré."
                    : "Votre pilote a bien été notifié, à bientôt pour le vol !"}
                </p>
              </div>
            </div>
          )}

          {done === "modification_requested" && (
            <div className="flex items-start gap-3 px-4 py-3.5 rounded-xl bg-amber-50 border border-amber-200">
              <MessageSquare size={16} className="text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-amber-800 text-sm">Demande envoyée !</p>
                <p className="text-xs text-amber-700 mt-0.5">Je reviens vers vous avec un itinéraire modifié.</p>
              </div>
            </div>
          )}

          {!done && !alreadyResponded && (
            <>
              {error && (
                <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
                  <AlertTriangle size={13} className="shrink-0" />
                  {error}
                </div>
              )}

              {!showModify && (
                <>
                  <button
                    onClick={handleAccept}
                    disabled={isPending}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-primary text-primary-foreground font-black text-sm hover:brightness-105 active:scale-[0.98] transition-all shadow-gold disabled:opacity-50 cursor-pointer"
                  >
                    {isPending ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
                    J&apos;accepte cet itinéraire
                  </button>
                  <button
                    onClick={() => setShowModify(true)}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-border text-muted-foreground font-semibold text-sm hover:text-foreground hover:bg-secondary transition-colors cursor-pointer"
                  >
                    <MessageSquare size={14} />
                    Demander une modification
                  </button>
                </>
              )}

              {showModify && (
                <div className="space-y-2.5">
                  <div>
                    <p className="text-sm font-bold text-foreground mb-1">Décrivez vos souhaits</p>
                    <p className="text-xs text-muted-foreground mb-2">
                      Quelle région souhaitez-vous survoler ? Un lieu particulier ?
                    </p>
                    <textarea
                      value={modifyText}
                      onChange={e => setModifyText(e.target.value)}
                      rows={3}
                      placeholder="Je souhaite visiter…"
                      className="w-full px-3.5 py-3 rounded-lg border border-border bg-secondary text-sm text-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all placeholder:text-muted-foreground/35"
                      autoFocus
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleModify}
                      disabled={isPending || !modifyText.trim()}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground font-black text-sm hover:brightness-105 active:scale-[0.98] transition-all disabled:opacity-50 cursor-pointer"
                    >
                      {isPending ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                      Envoyer
                    </button>
                    <button
                      onClick={() => { setShowModify(false); setError(null); }}
                      className="px-4 py-2.5 rounded-xl border border-border text-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer"
                    >
                      Retour
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

          <p className="text-center text-xs text-muted-foreground pt-0.5">
            Une question ?{" "}
            <a href="mailto:info@fly-horizons.com" className="text-primary hover:brightness-90 transition-all font-semibold">
              info@fly-horizons.com
            </a>
          </p>

        </div>
      </div>
    </div>
  );
}
