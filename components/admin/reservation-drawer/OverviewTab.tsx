"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Check, Send, CheckCircle2, CalendarClock, Phone, Mail, Scale, Ticket, Banknote,
  ExternalLink, Copy, RotateCcw, ChevronLeft, Route as RouteIcon,
} from "lucide-react";
import { Button, Input } from "@/components/pilote/studio";
import { cn } from "@/lib/utils";
import { isPiloteVol } from "@/lib/pilote/payment";
import { stripeNetInfo } from "@/lib/stripe-fee";
import type { DrawerReservation } from "./types";
import type { PendingAction } from "./ConfirmActionDialog";

// ── Onglet Aperçu (maquette v2 validée le 24/09) ──────────────────────────
// La frise du parcours, puis UNE « prochaine étape » avec son action
// principale (selon le statut et le rôle, mêmes règles qu'avant), puis
// l'essentiel du vol, le client et le paiement. Reporter / Annuler en bas, en petit.

const fmtDate = (d: string, opts: Intl.DateTimeFormatOptions = { weekday: "short", day: "numeric", month: "short" }) =>
  new Date(d + "T12:00:00Z").toLocaleDateString("fr-BE", { ...opts, timeZone: "Europe/Brussels" });

// ── Frise : Demande → Créneau → Route → Paiement → Effectué ───────────────
function Journey({ r, routeStatus }: { r: DrawerReservation; routeStatus: string | null }) {
  const st = r.statut;
  const paid = r.payment_status === "paid" || (r.paye ?? 0) > 0 || r.pilote_paye === true || !!r.voucher_code || st === "acompte_recu";
  const steps = [
    { label: "Demande", done: true },
    { label: "Créneau", done: ["date_confirmee", "heure_confirmee", "vol_effectue"].includes(st) },
    { label: "Route", done: !!r.products?.route_waypoints?.length || routeStatus === "accepted" || routeStatus === "validated" || st === "vol_effectue" },
    { label: "Paiement", done: paid },
    { label: "Effectué", done: st === "vol_effectue" },
  ];
  const now = st === "annulee" ? -1 : steps.findIndex((s) => !s.done);
  return (
    <ol className={cn("flex items-start", st === "annulee" && "opacity-50")} aria-label="Parcours du vol">
      {steps.map((s, i) => (
        <li key={s.label} className="relative flex min-w-0 flex-1 flex-col items-center gap-1.5">
          {i > 0 && (
            <span className={cn("absolute right-1/2 top-[5px] h-0.5 w-full", steps[i - 1].done && (s.done || i === now) ? "bg-st-ok" : "bg-st-line-strong")} />
          )}
          <span
            className={cn(
              "relative z-10 h-3 w-3 rounded-full border-2",
              s.done ? "border-st-ok bg-st-ok" : i === now ? "border-st-gold bg-st-gold shadow-[0_0_0_4px_var(--color-st-gold-soft)]" : "border-st-line-strong bg-white",
            )}
          />
          <span className={cn("truncate text-[10.5px]", i === now ? "font-semibold text-st-text" : s.done ? "text-st-text-2" : "text-st-muted")}>{s.label}</span>
        </li>
      ))}
    </ol>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-t border-st-line-soft py-2.5 text-[13px] first:border-t-0 first:pt-0">
      <span className="shrink-0 text-st-text-2">{label}</span>
      <span className="min-w-0 text-right text-st-text">{children}</span>
    </div>
  );
}

// Proposer un autre créneau, en ligne dans la prochaine étape.
function ProposeSlot({ r, isPending, onPropose, onClose }: {
  r: DrawerReservation; isPending: boolean; onPropose: (date: string, heure: string) => void; onClose: () => void;
}) {
  const [date, setDate] = useState(r.date_vol);
  const [heure, setHeure] = useState(r.heure_vol?.slice(0, 5) ?? "");
  return (
    <div className="space-y-2 rounded-[14px] border border-st-line bg-white p-3">
      <p className="text-[12.5px] font-semibold text-st-text">Proposer un autre créneau</p>
      <div className="grid grid-cols-2 gap-2">
        <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} aria-label="Date proposée" />
        <Input type="time" value={heure} onChange={(e) => setHeure(e.target.value)} aria-label="Heure proposée" />
      </div>
      <div className="grid grid-cols-[auto_1fr] gap-2">
        <Button variant="secondary" size="sm" onClick={onClose}>Annuler</Button>
        <Button size="sm" loading={isPending} disabled={!date || !heure} onClick={() => { onPropose(date, heure); onClose(); }}>
          <Send /> Envoyer la proposition
        </Button>
      </div>
      <p className="text-[11.5px] text-st-muted">Le client reçoit un email pour accepter ou refuser ce créneau.</p>
    </div>
  );
}

function CashForm({ acompte, isPending, onRecord }: { acompte: number; isPending: boolean; onRecord: (n: number) => void }) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState(String(acompte));
  if (!open) {
    return (
      <Button variant="secondary" size="sm" onClick={() => { setAmount(String(acompte)); setOpen(true); }}>
        <Banknote /> Encaisser
      </Button>
    );
  }
  return (
    <div className="flex items-center gap-2">
      <Input type="number" min={0} step={0.01} value={amount} onChange={(e) => setAmount(e.target.value)} className="w-28" aria-label="Montant encaissé" autoFocus />
      <Button size="sm" loading={isPending} disabled={!(parseFloat(amount) > 0)} onClick={() => { onRecord(parseFloat(amount)); setOpen(false); }}>
        <Check /> Enregistrer
      </Button>
      <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>Annuler</Button>
    </div>
  );
}

export function OverviewTab({
  reservation: r,
  viewerRole,
  routeStatus,
  hasRoute,
  isPending,
  isCashPending,
  isProposePending,
  avionReserve, isReservePending, onToggleAvion,
  cashPayment, isCashPaymentPending, onToggleCashPayment,
  linkCopied, onCopyPaymentLink,
  ask,
  onConfirmSlot,
  onChangeStatut,
  onSendPaymentLink,
  onResendPaymentLink,
  onSendBoardingPass,
  onSendReschedule,
  onRecordCash,
  onProposeSlot,
  onGoTo,
  annonceSlot,
  assignSlot,
}: {
  reservation: DrawerReservation;
  viewerRole: "admin" | "pilote";
  routeStatus: string | null;
  hasRoute: boolean;
  isPending: boolean;
  isCashPending: boolean;
  isProposePending: boolean;
  avionReserve: boolean; isReservePending: boolean; onToggleAvion: (v: boolean) => void;
  cashPayment: boolean; isCashPaymentPending: boolean; onToggleCashPayment: (v: boolean) => void;
  linkCopied: boolean; onCopyPaymentLink: () => void;
  /** Ouvre la fenêtre de confirmation. */
  ask: (a: PendingAction) => void;
  /** Confirme date + heure (et envoie la route) ; `time` si l'heure vient d'être choisie. */
  onConfirmSlot: (time?: string) => void;
  onChangeStatut: (s: string) => void;
  onSendPaymentLink: () => void;
  onResendPaymentLink: () => void;
  onSendBoardingPass: () => void;
  onSendReschedule: () => void;
  onRecordCash: (n: number) => void;
  onProposeSlot: (date: string, heure: string) => void;
  onGoTo: (tab: "route" | "messages" | "dossier") => void;
  /** Règlement d'une annonce pilote (virement direct). */
  annonceSlot?: React.ReactNode;
  /** Attribution d'un pilote (admin). */
  assignSlot?: React.ReactNode;
}) {
  const [proposing, setProposing] = useState(false);
  const isAdmin = viewerRole === "admin";
  const isPerso = r.type_resa === "perso";
  const isStandard = !isPerso;
  const piloteVol = isPiloteVol(r);
  const st = r.statut;
  const prenom = r.clients?.prenom?.trim() || "Le client";
  const heure = r.heure_vol?.slice(0, 5) ?? null;
  const dateCourte = fmtDate(r.date_vol);
  const needsRoute = isStandard && !r.products?.route_waypoints?.length;
  const routeMissing = needsRoute && !hasRoute;

  // NewCAG (réservation de l'avion) : outil de l'exploitant, admin seulement.
  const showNewCAG = isAdmin && st !== "annulee" && (isPerso || ["acompte_recu", "date_confirmee", "heure_confirmee", "vol_effectue"].includes(st));
  const dureeNewCAG = isPerso ? Math.ceil(r.duree / 15) * 15 + 45 : r.duree + 60;
  const dureeLabel = `${Math.floor(dureeNewCAG / 60)} h ${String(dureeNewCAG % 60).padStart(2, "0")}`;

  const confirmSlot = () =>
    ask({
      title: heure ? `Confirmer ${dateCourte} à ${heure} ?` : `Confirmer ${dateCourte} ?`,
      askTime: heure ? undefined : "",
      consequences: [
        `${prenom} reçoit un email avec la date, l'heure${needsRoute ? " et votre route" : ""}.`,
        "Le vol passe en « Vol confirmé ».",
        ...(r.type_resa === "annonce_pilote" ? ["Quand il valide la route, il reçoit le lien pour vous payer par virement."] : []),
      ],
      warning: showNewCAG && !avionReserve ? "L'avion n'est pas encore coché comme réservé sur NewCAG." : undefined,
      confirmLabel: "Confirmer et envoyer",
      run: (time) => onConfirmSlot(time),
    });

  // ── Prochaine étape selon le statut (mêmes droits qu'avant la refonte) ──
  let title = "";
  let text: React.ReactNode = null;
  let primary: React.ReactNode = null;
  const secondary: React.ReactNode[] = [];

  if (st === "annulee") {
    title = "Réservation annulée";
    if (isAdmin) primary = <Button onClick={() => onChangeStatut("en_attente")} loading={isPending}><RotateCcw /> Réactiver la réservation</Button>;
  } else if (st === "vol_effectue") {
    title = "Vol effectué";
    text = "Dossier clôturé.";
  } else if (st === "payment_pending") {
    title = "En attente du paiement";
    text = `${prenom} a reçu le lien de paiement.`;
    if (isAdmin && !piloteVol) {
      primary = (
        <Button onClick={() => ask({ title: "Marquer le paiement reçu ?", consequences: [`${prenom} reçoit un email confirmant son paiement.`, "La réservation passe en « Payé »."], confirmLabel: "Marquer reçu et envoyer", run: () => onChangeStatut("acompte_recu") })} loading={isPending}>
          <Check /> Marquer paiement reçu
        </Button>
      );
      secondary.push(
        <Button key="resend" variant="secondary" onClick={() => ask({ title: "Renvoyer le lien de paiement ?", consequences: [`${prenom} reçoit à nouveau l'email avec son lien de paiement.`], confirmLabel: "Renvoyer", run: onResendPaymentLink })}>
          <Send /> Renvoyer le lien
        </Button>,
      );
    }
  } else if (["demande_recue", "en_attente", "acompte_recu", "date_confirmee"].includes(st)) {
    title = st === "date_confirmee"
      ? heure ? `Confirmer l'heure : ${heure}` : "Fixer l'heure du vol"
      : heure ? `Confirmer ${dateCourte} à ${heure}` : "Fixer l'heure et confirmer le créneau";
    text = r.slot_proposal_token && st === "demande_recue"
      ? `Créneau proposé${r.slot_proposal_date ? ` le ${fmtDate(r.slot_proposal_date)}` : ""}${r.slot_proposal_heure ? ` à ${r.slot_proposal_heure}` : ""}, en attente de réponse de ${prenom}.`
      : routeMissing
        ? `${prenom} demande ${dateCourte}. Tracez d'abord la route : elle part avec la confirmation.`
        : `${prenom} demande ${dateCourte}.${needsRoute ? " En confirmant, votre route part avec." : ""}`;
    primary = routeMissing ? (
      <Button onClick={() => onGoTo("route")}><RouteIcon /> Tracer la route</Button>
    ) : (
      <Button onClick={confirmSlot} loading={isPending}><Send /> {st === "date_confirmee" ? "Confirmer l'heure" : `Confirmer ${dateCourte}`}</Button>
    );
    if (st === "demande_recue" && !r.slot_proposal_token) {
      secondary.push(<Button key="slot" variant="secondary" onClick={() => setProposing(true)}><CalendarClock /> Autre créneau</Button>);
    }
    if (isStandard && isAdmin && !piloteVol && (st === "en_attente" || st === "demande_recue")) {
      secondary.push(
        <Button key="pay" variant="secondary" onClick={() => ask({ title: "Envoyer le lien de paiement ?", consequences: [`${prenom} reçoit un email avec son lien de paiement Stripe.`, "La réservation passe en « Paiement en attente »."], confirmLabel: "Envoyer", run: onSendPaymentLink })}>
          <Send /> Lien de paiement
        </Button>,
      );
    }
    if (st === "date_confirmee") {
      secondary.push(<Button key="back" variant="ghost" onClick={() => onChangeStatut("en_attente")}><ChevronLeft /> Revenir en attente</Button>);
    }
  } else if (st === "heure_confirmee") {
    title = `Vol confirmé · ${dateCourte}${heure ? ` à ${heure}` : ""}`;
    text = "Préparez la masse & centrage avant le vol.";
    if (isAdmin || !piloteVol) {
      primary = (
        <Button onClick={() => ask({ title: "Marquer le vol comme effectué ?", consequences: [`${prenom} reçoit un email de remerciement avec une demande d'avis.`, "Le dossier est clôturé."], confirmLabel: "Marquer effectué et envoyer", run: () => onChangeStatut("vol_effectue") })} loading={isPending}>
          <CheckCircle2 /> Marquer vol effectué
        </Button>
      );
    }
    if (hasRoute && isAdmin) {
      secondary.push(
        <Button key="bp" variant="secondary" onClick={() => ask({ title: "Envoyer le boarding pass ?", consequences: [`${prenom} reçoit son boarding pass par email, en PDF.`], confirmLabel: "Envoyer", run: onSendBoardingPass })}>
          <Ticket /> Boarding pass
        </Button>,
      );
    }
    secondary.push(<Button key="back" variant="ghost" onClick={() => onChangeStatut("en_attente")}><ChevronLeft /> Revenir en attente</Button>);
  }

  const netInfo = stripeNetInfo({
    paye: r.paye ?? 0,
    stripeFee: r.stripe_fee,
    cashPayment,
    coveredByVoucher: !!r.voucher_code && (r.paye ?? 0) === 0,
  });
  const showCash = isAdmin && !piloteVol && !["vol_effectue", "annulee"].includes(st) && r.acompte != null && (r.paye ?? 0) < r.acompte;
  const terminal = st === "vol_effectue" || st === "annulee";
  const mbHref = isAdmin ? `/admin/mass-balance?resa=${r.id}` : `/pilote/mass-balance?resa=${r.id}`;

  return (
    <div className="space-y-4">
      <Journey r={r} routeStatus={routeStatus} />

      {/* Prochaine étape */}
      <div className="space-y-2.5 rounded-[16px] bg-st-surface p-3.5">
        <p className="text-[11.5px] font-semibold text-st-gold-text">Prochaine étape</p>
        <p className="text-[15px] font-semibold leading-snug text-st-text">{title}</p>
        {text && <p className="text-[12.5px] leading-snug text-st-text-2">{text}</p>}

        {showNewCAG && (avionReserve ? (
          <p className="flex items-center gap-2 text-[12.5px] text-st-ok">
            <CheckCircle2 size={15} /> Avion réservé sur NewCAG
            <button type="button" onClick={() => onToggleAvion(false)} disabled={isReservePending} className="ml-auto cursor-pointer text-[12px] text-st-muted underline-offset-2 hover:underline">annuler</button>
          </p>
        ) : (
          <div className="flex items-center gap-2.5 rounded-[12px] bg-st-warn-soft px-3 py-2.5 text-[12.5px] font-[550] text-st-warn">
            <input
              type="checkbox"
              checked={false}
              disabled={isReservePending}
              onChange={() => onToggleAvion(true)}
              aria-label="Marquer l'avion comme réservé sur NewCAG"
              className="h-4 w-4 cursor-pointer accent-st-warn"
            />
            <span className="min-w-0 flex-1">Réserver l&apos;avion sur NewCAG ({dureeLabel})</span>
            <a href="https://newcag.flymate.app/bookings" target="_blank" rel="noopener noreferrer" className="inline-flex shrink-0 items-center gap-1 hover:underline">
              Ouvrir <ExternalLink size={12} />
            </a>
          </div>
        ))}

        {proposing ? (
          <ProposeSlot r={r} isPending={isProposePending} onPropose={onProposeSlot} onClose={() => setProposing(false)} />
        ) : (primary || secondary.length > 0) && (
          <div className="flex flex-wrap gap-2 [&>*:first-child]:flex-1">
            {primary}
            {secondary}
          </div>
        )}
      </div>

      {isAdmin && (r.slot_change_count ?? 0) > 0 && (
        <p className={cn("flex items-center gap-2 text-[12.5px]", (r.slot_change_count ?? 0) >= 2 ? "font-semibold text-st-warn" : "text-st-muted")}>
          <RotateCcw size={14} /> Créneau changé {r.slot_change_count}× par le pilote{(r.slot_change_count ?? 0) >= 2 ? ", à surveiller" : ""}
        </p>
      )}

      {assignSlot}

      {/* L'essentiel */}
      <div>
        <Row label="Date">{fmtDate(r.date_vol, { weekday: "long", day: "numeric", month: "long" })}</Row>
        <Row label="Heure">{heure ?? <span className="font-semibold text-st-warn">À fixer</span>}</Row>
        <Row label="Durée">{r.duree} min</Row>
        <Row label="Passagers">{r.passagers}{r.poids_total != null ? ` · ${r.poids_total} kg` : ""}</Row>
        {isAdmin && r.pilotes?.nom && <Row label="Pilote">{r.pilotes.nom}</Row>}
        {isPerso && r.distance_km != null && <Row label="Distance">{r.distance_km} km</Row>}
        {isPerso && r.taxes_escales != null && r.taxes_escales > 0 && <Row label="Taxes escales">{r.taxes_escales} €</Row>}
        {r.voucher_code && <Row label="Voucher"><span className="font-mono text-[12px]">{r.voucher_code}</span></Row>}
        {r.coupon_code && <Row label="Code promo"><span className="font-mono text-[12px]">{r.coupon_code}</span></Row>}
        {!piloteVol && r.acompte != null && (
          <Row label="Paiement">
            {r.paye != null && r.paye > 0 ? (
              <span className="font-semibold text-st-ok">
                {r.acompte} € payé{netInfo ? <span className="font-normal text-st-muted"> · net {netInfo.isEstimate ? "~" : ""}{netInfo.net} €</span> : null}
              </span>
            ) : (
              <span><b className="font-semibold">{r.acompte} €</b> <span className="text-st-warn">· pas encore encaissé</span></span>
            )}
          </Row>
        )}
        {r.remboursement != null && r.remboursement > 0 && <Row label="Remboursé"><span className="text-st-info">− {r.remboursement} €</span></Row>}
      </div>

      {/* Paiement admin : lien, espèces, encaissement */}
      {isAdmin && !piloteVol && r.acompte != null && !terminal && (
        <div className="space-y-2.5">
          {st === "payment_pending" && r.payment_token && (
            <div className="flex items-center gap-2 rounded-[12px] border border-st-line px-3 py-2">
              <code className="min-w-0 flex-1 truncate font-mono text-[11.5px] text-st-text-2">/api/reservation/pay/{r.payment_token.slice(0, 12)}…</code>
              <Button variant="secondary" size="sm" onClick={onCopyPaymentLink}>{linkCopied ? <Check /> : <Copy />}{linkCopied ? "Copié" : "Copier le lien"}</Button>
            </div>
          )}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <label className="flex cursor-pointer items-center gap-2 text-[12.5px] text-st-text-2">
              <input type="checkbox" checked={cashPayment} disabled={isCashPaymentPending} onChange={(e) => onToggleCashPayment(e.target.checked)} className="h-4 w-4 cursor-pointer accent-st-ink" />
              Le client paie en espèces
            </label>
            {showCash && <CashForm acompte={r.acompte} isPending={isCashPending} onRecord={onRecordCash} />}
          </div>
        </div>
      )}

      {annonceSlot}

      {/* Le client */}
      <div className="flex items-center gap-3 rounded-[14px] border border-st-line px-3 py-2.5">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-st-ink-soft text-[12px] font-semibold text-st-ink">
          {`${r.clients?.prenom?.[0] ?? ""}${r.clients?.nom?.[0] ?? ""}`.toUpperCase() || "?"}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13.5px] font-semibold text-st-text">{r.clients?.prenom} {r.clients?.nom}</p>
          <p className="truncate text-[12px] text-st-muted">{r.clients?.telephone || r.clients?.email || "Pas de contact"}</p>
        </div>
        {r.clients?.telephone && (
          <a href={`tel:${r.clients.telephone.replace(/\s+/g, "")}`} aria-label="Appeler" className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] border border-st-line text-st-text-2 transition-colors hover:bg-st-surface">
            <Phone size={15} />
          </a>
        )}
        <button type="button" onClick={() => onGoTo("messages")} aria-label="Écrire" className="grid h-9 w-9 shrink-0 cursor-pointer place-items-center rounded-[10px] border border-st-line text-st-text-2 transition-colors hover:bg-st-surface">
          <Mail size={15} />
        </button>
      </div>

      {!terminal && (
        <Link href={mbHref} className="flex h-[38px] items-center justify-center gap-2 rounded-[11px] border border-st-line bg-white text-[13px] font-[550] text-st-text shadow-st-sm transition-colors hover:bg-st-surface">
          <Scale size={16} /> Préparer la masse &amp; centrage
        </Link>
      )}

      {/* Actions rares, en petit */}
      {!terminal && (
        <div className="flex items-center justify-between border-t border-st-line-soft pt-3">
          <button
            type="button"
            onClick={() => ask({ title: "Proposer un report ?", consequences: [`${prenom} reçoit un email pour choisir lui-même une nouvelle date.`], confirmLabel: "Envoyer", run: onSendReschedule })}
            className="cursor-pointer text-[12.5px] font-semibold text-st-ink hover:underline"
          >
            Reporter le vol
          </button>
          {isAdmin && (
            <button
              type="button"
              onClick={() => ask({ title: "Annuler cette réservation ?", consequences: [`${prenom} reçoit un email l'informant de l'annulation.`, "Irréversible côté communication client."], confirmLabel: "Annuler la réservation", danger: true, run: () => onChangeStatut("annulee") })}
              className="cursor-pointer text-[12.5px] font-semibold text-st-bad hover:underline"
            >
              Annuler la réservation
            </button>
          )}
        </div>
      )}
    </div>
  );
}
