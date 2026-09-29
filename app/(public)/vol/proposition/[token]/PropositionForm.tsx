"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, MessageSquare, AlertTriangle, Send, Loader2, PlaneTakeoff, PlaneLanding, Clock } from "lucide-react";
import { respondToRouteProposal } from "@/lib/actions/reservation-edit";
import { formatDuration } from "@/lib/vouchers";
import dynamic from "next/dynamic";

const RouteMapReadOnly = dynamic(
  () => import("@/components/maps/RouteMapReadOnly"),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full bg-secondary flex items-center justify-center">
        <p className="text-sm text-muted-foreground animate-pulse">Chargement de la carte…</p>
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
  alreadyPaid: boolean;
  cashPayment: boolean;
  hasAmountDue: boolean;
}

// Nouvelle DA (maquette-proposition.html, variantes C1 + M2, 29/09).
// Ordinateur : titre pleine largeur, puis carte 8/12 (prend la hauteur de la colonne, min. 470 px)
// | colonne 4/12 (message, lieux, réponse). Téléphone : une colonne (titre, carte figée, message,
// lieux) et la réponse dans une barre collante en bas d'écran (un seul CTA, toujours visible).
// L'ordre du DOM est l'ordre de lecture téléphone.

const WRAP = "max-w-[1400px] mx-auto px-4 sm:px-6 xl:px-10";
const LABEL = "text-[11px] font-bold uppercase tracking-[2px] text-muted-foreground mb-2.5";

export function PropositionForm({
  token, prenom, dateStr, duree, waypoints, adminComment,
  alreadyResponded, existingStatus, alreadyPaid, cashPayment, hasAmountDue,
}: Props) {
  const [isPending, startTransition] = useTransition();
  const [done, setDone] = useState<"accepted" | "modification_requested" | null>(
    alreadyResponded ? (existingStatus as "accepted" | "modification_requested") : null
  );
  const [showModify, setShowModify] = useState(false);
  const [modifyText, setModifyText] = useState("");
  const [error, setError] = useState<string | null>(null);

  const acceptedMessage = cashPayment
    ? "Votre pilote a bien été notifié. Vous réglerez en espèces le jour du vol."
    : alreadyPaid
    ? "Votre pilote a bien été notifié. Votre paiement a déjà été enregistré."
    : hasAmountDue
    ? "Votre pilote a bien été notifié. Votre lien de paiement vous a été envoyé par email."
    : "Votre pilote a bien été notifié, à bientôt pour le vol !";

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
    <main className="min-h-screen bg-white">
      <section className="pt-page pb-16 lg:pb-28">
        <div className={`${WRAP} lg:grid lg:grid-cols-[8fr_4fr] lg:gap-x-16 lg:grid-rows-[auto_auto_auto_1fr] lg:items-start`}>

          {/* Titre */}
          <div className="lg:col-span-2 lg:row-start-1">
            {prenom && (
              <p className="text-sm text-muted-foreground mb-1.5">
                Bonjour <strong className="font-bold text-foreground capitalize">{prenom}</strong>,
              </p>
            )}
            <p className="text-[11px] font-bold text-primary uppercase tracking-[3px] mb-3">Proposition d&apos;itinéraire</p>
            <h1 className="text-[30px] lg:text-[44px] font-black text-foreground leading-[1.08] lg:leading-[1.04] tracking-[-0.02em] first-letter:uppercase">
              {dateStr}
            </h1>
            <p className="mt-3 flex items-center gap-2 text-[15px] text-foreground/70">
              <Clock size={15} />
              {formatDuration(duree)} de vol · départ de Charleroi
            </p>
          </div>

          {/* Carte : figée sur téléphone (le doigt fait défiler la page), interactive sur ordinateur */}
          <div className="relative isolate overflow-hidden bg-secondary mt-6 -mx-4 sm:mx-0 sm:rounded-[14px] aspect-[4/3] lg:aspect-auto lg:min-h-[470px] lg:mt-8 lg:col-start-1 lg:row-start-2 lg:row-span-3 lg:self-stretch pointer-events-none lg:pointer-events-auto max-lg:[&_.leaflet-control-layers]:hidden max-lg:[&_.leaflet-control-zoom]:hidden">
            <div className="absolute inset-0">
              <RouteMapReadOnly waypoints={waypoints} height="100%" className="w-full h-full" />
            </div>
          </div>

          {/* Message du pilote */}
          {adminComment && (
            <div className="mt-7 lg:mt-8 lg:col-start-2 lg:row-start-2">
              <p className={LABEL}>Message de votre pilote</p>
              <p className="text-base leading-[1.7] text-foreground/85 whitespace-pre-wrap">{adminComment}</p>
            </div>
          )}

          {/* Lieux à survoler */}
          <div className="mt-7 lg:mt-7 lg:col-start-2 lg:row-start-3">
            <p className={LABEL}>Lieux à survoler</p>
            <ol>
              <Stop label="Charleroi EBCI" sub="Départ" icon={<PlaneTakeoff size={13} />} plane />
              {waypoints.map((wp, i) => (
                <Stop key={i} label={wp.nom?.trim() || `Point ${i + 1}`} n={i + 1} />
              ))}
              {waypoints.length > 0 && (
                <Stop label="Charleroi EBCI" sub="Retour" icon={<PlaneLanding size={13} />} plane last />
              )}
            </ol>
          </div>

          {/* Réponse : barre collante en bas sur téléphone, bloc de la colonne sur ordinateur */}
          <div className="sticky bottom-0 z-[600] mt-8 -mx-4 sm:-mx-6 px-4 sm:px-6 pt-3.5 pb-4 bg-white border-t border-border shadow-[0_-6px_20px_rgba(11,34,56,.08)] lg:static lg:z-auto lg:mx-0 lg:px-0 lg:pt-7 lg:pb-0 lg:mt-7 lg:shadow-none lg:col-start-2 lg:row-start-4">
            {done === "accepted" && (
              <Confirmation icon={<CheckCircle2 size={20} strokeWidth={2.5} />} title="Itinéraire accepté." text={acceptedMessage} />
            )}
            {done === "modification_requested" && (
              <Confirmation icon={<MessageSquare size={20} strokeWidth={2.5} />} title="Demande envoyée." text="Votre pilote revient vers vous avec un itinéraire modifié." />
            )}

            {!done && (
              <>
                {error && (
                  <p className="flex items-center gap-2 mb-3 text-[13px] text-red-700">
                    <AlertTriangle size={14} className="shrink-0" /> {error}
                  </p>
                )}

                {!showModify ? (
                  <>
                    <button
                      onClick={handleAccept}
                      disabled={isPending}
                      className="w-full inline-flex items-center justify-center gap-2 px-6 py-[15px] rounded-[10px] bg-primary text-[#0b2238] text-[15px] font-black shadow-gold hover:brightness-105 transition-all disabled:opacity-50 cursor-pointer"
                    >
                      {isPending ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                      J&apos;accepte cet itinéraire
                    </button>
                    <button
                      onClick={() => setShowModify(true)}
                      className="w-full mt-2 lg:mt-2.5 inline-flex items-center justify-center gap-2 px-5 py-2.5 lg:py-3 rounded-[10px] border border-border bg-white text-sm font-bold text-foreground hover:border-foreground transition-colors cursor-pointer"
                    >
                      <MessageSquare size={15} />
                      Demander une modification
                    </button>
                  </>
                ) : (
                  <div>
                    <label htmlFor="modif" className="block text-[13px] font-bold text-foreground mb-2">Vos souhaits de modification</label>
                    <textarea
                      id="modif"
                      value={modifyText}
                      onChange={(e) => setModifyText(e.target.value)}
                      rows={4}
                      placeholder="Je souhaite survoler…"
                      autoFocus
                      className="w-full min-h-[110px] resize-y rounded-xl border border-border bg-secondary px-4 py-3.5 text-[15px] leading-relaxed text-foreground outline-none focus:bg-white focus:border-foreground transition-colors placeholder:text-muted-foreground/60"
                    />
                    <div className="flex gap-2.5 mt-3">
                      <button
                        onClick={() => { setShowModify(false); setError(null); }}
                        className="px-5 py-3 rounded-[10px] border border-border bg-white text-sm font-bold text-foreground hover:border-foreground transition-colors cursor-pointer"
                      >
                        Annuler
                      </button>
                      <button
                        onClick={handleModify}
                        disabled={isPending || !modifyText.trim()}
                        className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 rounded-[10px] bg-primary text-[#0b2238] text-[15px] font-black shadow-gold hover:brightness-105 transition-all disabled:opacity-50 cursor-pointer"
                      >
                        {isPending ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
                        Envoyer
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}

            <p className="mt-2.5 lg:mt-4 text-xs lg:text-[13px] leading-relaxed text-muted-foreground">
              Une question ?{" "}
              <a href="mailto:info@fly-horizons.com" className="font-semibold text-[#0b2238] underline decoration-[#0b2238]/25 underline-offset-[3px] hover:decoration-primary transition-colors">
                info@fly-horizons.com
              </a>
            </p>
          </div>

        </div>
      </section>
    </main>
  );
}

function Stop({ label, sub, n, icon, plane, last }: { label: string; sub?: string; n?: number; icon?: React.ReactNode; plane?: boolean; last?: boolean }) {
  return (
    <li className={`relative flex gap-3.5 ${last ? "" : "pb-[18px]"}`}>
      {!last && <span aria-hidden className="absolute left-[13px] top-[30px] bottom-0.5 w-0.5 bg-border" />}
      <span className={`w-7 h-7 shrink-0 rounded-full grid place-items-center text-xs font-extrabold ${plane ? "bg-[#0b2238] text-primary" : "bg-primary text-[#0b2238]"}`}>
        {icon ?? n}
      </span>
      <div>
        <p className="mt-[3px] text-[15px] font-bold leading-[1.35] text-foreground">{label}</p>
        {sub && <p className="text-[13px] text-muted-foreground">{sub}</p>}
      </div>
    </li>
  );
}

function Confirmation({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <div className="flex items-start gap-3.5" role="status">
      <span className="w-11 h-11 shrink-0 rounded-full bg-primary text-[#0b2238] grid place-items-center">{icon}</span>
      <div>
        <h2 className="text-lg lg:text-[22px] font-black text-foreground leading-tight">{title}</h2>
        <p className="mt-1.5 text-sm lg:text-[15px] leading-[1.7] text-foreground/75">{text}</p>
      </div>
    </div>
  );
}
