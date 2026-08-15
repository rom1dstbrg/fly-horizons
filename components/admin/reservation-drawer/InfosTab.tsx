"use client";

import {
  User, Mail, Phone, Calendar, Clock, Users, Weight, Ticket, CreditCard,
  CheckCircle2, XCircle, RotateCcw, ExternalLink, Calculator, ChevronDown,
  Loader2, Check, Sparkles, Send, MapPin,
} from "lucide-react";
import type { WaypointDraft } from "@/components/admin/AdminRouteEditor";
import { PAYMENT_STATUS_CONFIG } from "@/components/admin/ui/AdminBadge";
import { toForeFlight } from "@/lib/foreflight";
import { EMAIL_TEMPLATES, type DrawerReservation } from "./types";
import { RouteSection } from "./RouteSection";
import { PaymentLinkCard } from "./PaymentLinkCard";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">{label}</p>
      <div className="text-sm text-foreground">{children}</div>
    </div>
  );
}

export function InfosTab({
  reservation: r,
  avionReserve, isReservePending, onToggleAvion,
  bilan,
  route,
  linkCopied, onCopyPaymentLink,
  onOpenEmailComposer, onApplyTemplate,
  isPending,
  cashPayment, isCashPaymentPending, onToggleCashPayment,
}: {
  reservation: DrawerReservation;
  avionReserve: boolean;
  isReservePending: boolean;
  onToggleAvion: (val: boolean) => void;
  cashPayment: boolean;
  isCashPaymentPending: boolean;
  onToggleCashPayment: (val: boolean) => void;
  bilan: {
    open: boolean; toggle: () => void;
    dureeReelle: string; setDureeReelle: (v: string) => void;
    tarifEcole: number | null; prixDemande: number; coutEcole: number | null; resultat: number | null; dureeR: number;
    isPending: boolean; save: () => void;
  };
  route: {
    routeDraft: WaypointDraft[]; setRouteDraft: (wps: WaypointDraft[]) => void;
    routeComment: string; setRouteComment: (v: string) => void;
    proposalLoaded: boolean;
    localRouteStatus: string | null; localRouteFeedback: string | null;
    routeStats: { distKm: number; totalMin: number } | null;
    isPending: boolean; foreFlightCopied: boolean;
    saveRoute: () => void; sendRoute: () => void; copyForeFlight: () => void;
    openItineraires: () => void; openFullscreen: () => void;
  };
  linkCopied: boolean;
  onCopyPaymentLink: () => void;
  onOpenEmailComposer: () => void;
  onApplyTemplate: (tpl: typeof EMAIL_TEMPLATES[number], includeReschedule: boolean) => void;
  isPending: boolean;
}) {
  const isStandard = r.type_resa !== "perso";
  const isPerso = !isStandard;

  const dureeNewCAG = isPerso ? Math.ceil(r.duree / 15) * 15 + 45 : r.duree + 60;
  const h = Math.floor(dureeNewCAG / 60);
  const m = dureeNewCAG % 60;
  const dureeLabel = h > 0 ? (m > 0 ? `${h}h${String(m).padStart(2, "0")}` : `${h}h`) : `${m} min`;
  const dateLabelNewCAG = r.date_vol
    ? new Date(r.date_vol + "T12:00:00Z").toLocaleDateString("fr-BE", { weekday: "long", day: "numeric", month: "long" })
    : null;

  const showNewCAG = r.statut !== "annulee" && (
    isPerso || ["acompte_recu", "date_confirmee", "heure_confirmee", "vol_effectue"].includes(r.statut)
  );

  const dateLabel = new Date(r.date_vol + "T12:00:00Z").toLocaleDateString("fr-BE", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });

  return (
    <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">

      {/* Client */}
      <div className="pb-4 border-b border-border space-y-2">
        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[1.5px] mb-1">Client</p>
        <div className="flex items-center gap-2.5">
          <User size={13} className="text-muted-foreground shrink-0" />
          <span className="text-sm font-semibold text-foreground">{r.clients?.prenom} {r.clients?.nom}</span>
        </div>
        {r.clients?.email && (
          <a href={`mailto:${r.clients.email}`} className="flex items-center gap-2.5 hover:text-navy transition-colors">
            <Mail size={13} className="text-muted-foreground shrink-0" />
            <span className="text-sm text-foreground">{r.clients.email}</span>
          </a>
        )}
        {r.clients?.telephone && (
          <a href={`tel:${r.clients.telephone}`} className="flex items-center gap-2.5 hover:text-navy transition-colors">
            <Phone size={13} className="text-muted-foreground shrink-0" />
            <span className="text-sm text-foreground">{r.clients.telephone}</span>
          </a>
        )}
        <p className="text-[10px] text-muted-foreground/70 pt-1">
          Créée le {new Date(r.created_at).toLocaleDateString("fr-BE", { day: "numeric", month: "long", year: "numeric" })}
        </p>
      </div>

      {r.type_resa === "annonce_pilote" && r.pilotes && (
        <div className="bg-navy/5 border border-navy/15 rounded-xl p-3.5 flex items-center gap-2.5">
          <User size={13} className="text-navy shrink-0" />
          <p className="text-xs text-foreground">
            Vol partagé assuré par <strong>{r.pilotes.nom}</strong>
          </p>
        </div>
      )}

      {r.statut === "payment_pending" && r.payment_token && (
        <PaymentLinkCard paymentToken={r.payment_token} linkCopied={linkCopied} onCopy={onCopyPaymentLink} />
      )}

      {/* Encart NewCAG */}
      {showNewCAG && (
        avionReserve ? (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 flex items-start gap-3">
            <span className="text-emerald-500 mt-0.5 shrink-0">✓</span>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-emerald-800 mb-1">Avion réservé sur NewCAG</p>
              {dateLabelNewCAG && (
                <p className="text-[11px] text-emerald-700">{dateLabelNewCAG}{r.heure_vol ? ` à ${r.heure_vol}` : ""} — {dureeLabel}</p>
              )}
              <button
                onClick={() => onToggleAvion(false)}
                disabled={isReservePending}
                className="mt-2 text-[10px] text-emerald-600 hover:text-emerald-900 underline underline-offset-2 cursor-pointer transition-colors"
              >
                Annuler la réservation avion
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 space-y-2">
            <p className="text-xs font-semibold text-amber-800">Réserve l&apos;avion sur NewCAG avant de confirmer.</p>
            <div className="text-[11px] text-amber-700 space-y-0.5">
              {dateLabelNewCAG && (
                <p><span className="font-semibold">Date :</span> {dateLabelNewCAG}{r.heure_vol ? ` à ${r.heure_vol}` : ""}</p>
              )}
              <p><span className="font-semibold">Durée :</span> {dureeLabel}{isPerso ? " (arrondi ¼h + 45 min)" : " (vol + 60 min)"}</p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <a href="https://newcag.flymate.app/bookings" target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 hover:text-amber-900 underline underline-offset-2 transition-colors">
                Ouvrir NewCAG
                <ExternalLink size={10} />
              </a>
              <button
                onClick={() => onToggleAvion(true)}
                disabled={isReservePending}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-600 text-white text-[11px] font-semibold hover:bg-amber-700 transition-colors disabled:opacity-50 cursor-pointer"
              >
                {isReservePending ? <Loader2 size={10} className="animate-spin" /> : null}
                Marquer comme réservé
              </button>
            </div>
          </div>
        )
      )}

      {/* Vol details */}
      <div>
        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[1.5px] mb-2">Vol</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Field label="Date du vol">
            <div className="flex items-center gap-1.5 mt-0.5">
              <Calendar size={13} className="text-muted-foreground shrink-0" />
              <span className="capitalize text-sm">{dateLabel}</span>
            </div>
          </Field>
          <Field label="Heure">
            <div className="flex items-center gap-1.5 mt-0.5">
              <Clock size={13} className="text-muted-foreground shrink-0" />
              {r.heure_vol ? <span>{r.heure_vol.slice(0, 5)}</span> : <span className="text-amber-500 text-xs">À définir</span>}
            </div>
          </Field>
          <Field label="Passagers">
            <div className="flex items-center gap-1.5 mt-0.5">
              <Users size={13} className="text-muted-foreground" />
              {r.passagers}
            </div>
          </Field>
          {r.poids_total != null && (
            <Field label="Poids total">
              <div className="flex items-center gap-1.5 mt-0.5">
                <Weight size={13} className="text-muted-foreground" />
                {r.poids_total} kg
              </div>
            </Field>
          )}
          {isPerso && r.distance_km != null && (
            <Field label="Distance">
              <div className="flex items-center gap-1.5 mt-0.5">
                <MapPin size={13} className="text-muted-foreground" />
                {r.distance_km} km
              </div>
            </Field>
          )}
          {isPerso && r.taxes_escales != null && r.taxes_escales > 0 && (
            <Field label="Taxes escales">
              <span className="text-sm">{r.taxes_escales} €</span>
            </Field>
          )}
          {r.voucher_code && (
            <Field label="Voucher">
              <div className="flex items-center gap-1.5 mt-0.5">
                <Ticket size={13} className="text-muted-foreground" />
                <span className="font-mono text-xs tracking-wider">{r.voucher_code}</span>
              </div>
            </Field>
          )}
          {r.coupon_code && (
            <Field label="Code promo">
              <span className="font-mono text-xs tracking-wider">{r.coupon_code}</span>
            </Field>
          )}
        </div>

        {/* Paiement — pleine largeur, pas coincé dans la grille */}
        {r.acompte != null && (
          <div className="mt-3 pt-3 border-t border-border">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-3 flex-wrap text-sm">
                <span className="flex items-center gap-1.5 text-foreground">
                  <CreditCard size={13} className="text-muted-foreground" />
                  Prévu : <strong>{r.acompte} €</strong>
                </span>
                {r.paye != null && r.paye > 0 ? (
                  <span className="flex items-center gap-1.5 text-emerald-600 font-semibold">
                    <CheckCircle2 size={13} />
                    {r.paye} € encaissé
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 text-amber-600 text-xs">
                    <XCircle size={13} className="text-amber-400" />
                    Pas encore encaissé
                  </span>
                )}
              </div>
              {r.payment_status && PAYMENT_STATUS_CONFIG[r.payment_status] && (
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${PAYMENT_STATUS_CONFIG[r.payment_status].color}`}>
                  {PAYMENT_STATUS_CONFIG[r.payment_status].label}
                </span>
              )}
            </div>
            <label className="flex items-center gap-2 mt-2 cursor-pointer group w-fit">
              <input
                type="checkbox"
                checked={cashPayment}
                disabled={isCashPaymentPending}
                onChange={e => onToggleCashPayment(e.target.checked)}
                className="w-3.5 h-3.5 accent-emerald-600 cursor-pointer disabled:cursor-not-allowed"
              />
              <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors">
                Le client paie en espèces
              </span>
              {isCashPaymentPending && <Loader2 size={11} className="animate-spin text-muted-foreground" />}
            </label>
            {r.remboursement != null && r.remboursement > 0 && (
              <div className="flex items-center gap-3 mt-2 pt-2 border-t border-border flex-wrap text-sm">
                <span className="flex items-center gap-1.5 text-blue-600 font-semibold">
                  <RotateCcw size={13} />
                  −{r.remboursement} € remboursé
                </span>
                {r.paye != null && (
                  <span className="text-muted-foreground text-xs">
                    Net : <strong className="text-foreground">{r.paye - r.remboursement} €</strong>
                  </span>
                )}
              </div>
            )}
          </div>
        )}

        {isPerso && r.commentaire && (
          <div className="mt-3">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Remarques client</p>
            <p className="text-xs text-muted-foreground bg-secondary rounded-lg p-3 whitespace-pre-wrap">{r.commentaire}</p>
          </div>
        )}

        {isPerso && r.waypoints && r.waypoints.length > 0 && (
          <div className="mt-3">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[1.5px] flex items-center gap-1.5 mb-2">
              <MapPin size={11} />
              Route demandée par le client ({r.waypoints.length} points)
            </p>
            <div className="bg-secondary rounded-lg p-3 space-y-1 text-xs font-mono overflow-x-auto">
              <p className="text-muted-foreground">✈ EBCI (départ)</p>
              {r.waypoints.map((wp, i) => (
                <p key={i} className="text-foreground pl-3">
                  → {wp.nom ?? `${wp.lat.toFixed(5)}, ${wp.lng.toFixed(5)}`}
                  {wp.nom && <span className="text-muted-foreground ml-2">({toForeFlight(wp.lat, wp.lng)})</span>}
                </p>
              ))}
              {(r.stopovers ?? []).map(so => (
                <p key={so.icao} className="text-primary pl-3">⊕ {so.icao}, {so.nom} (+{so.taxe}€)</p>
              ))}
              <p className="text-muted-foreground">✈ EBCI (retour)</p>
            </div>
          </div>
        )}
      </div>

      {/* Route */}
      <RouteSection
        reservation={r}
        routeDraft={route.routeDraft}
        setRouteDraft={route.setRouteDraft}
        routeComment={route.routeComment}
        setRouteComment={route.setRouteComment}
        proposalLoaded={route.proposalLoaded}
        localRouteStatus={route.localRouteStatus}
        localRouteFeedback={route.localRouteFeedback}
        routeStats={route.routeStats}
        isPending={route.isPending}
        foreFlightCopied={route.foreFlightCopied}
        onSave={route.saveRoute}
        onSend={route.sendRoute}
        onCopyForeFlight={route.copyForeFlight}
        onOpenItineraires={route.openItineraires}
        onFullscreen={route.openFullscreen}
      />

      {/* Bilan vol — après la route, c'est un calcul secondaire/post-vol, pas une info de premier plan */}
      <div>
        <button
          type="button"
          onClick={bilan.toggle}
          className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg border border-border bg-secondary hover:bg-secondary/80 transition-colors cursor-pointer"
        >
          <span className="flex items-center gap-2 text-[11px] font-bold text-foreground uppercase tracking-wider">
            <Calculator size={12} className="text-muted-foreground" />
            Bilan vol
            {r.duree_reelle != null && (
              <span className="text-[10px] font-normal text-emerald-600 normal-case tracking-normal">
                · {r.duree_reelle} min enregistré
              </span>
            )}
          </span>
          <ChevronDown size={13} className={`text-muted-foreground transition-transform ${bilan.open ? "rotate-180" : ""}`} />
        </button>

        {bilan.open && (
          <div className="mt-2 p-4 rounded-xl border border-border bg-background space-y-3.5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pb-3 border-b border-border">
              <div>
                <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Pack</p>
                <p className="text-sm font-black text-foreground">{r.duree} min</p>
              </div>
              <div>
                <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Prix demandé</p>
                <p className="text-sm font-black text-foreground">
                  {r.acompte != null ? `${r.acompte} €` : <span className="text-muted-foreground text-xs">—</span>}
                </p>
              </div>
            </div>

            <div>
              <label className="block text-[9px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
                Durée réelle (min)
              </label>
              <input
                type="number" min={1} max={r.duree + 120}
                value={bilan.dureeReelle}
                onChange={e => bilan.setDureeReelle(e.target.value)}
                placeholder={`pack : ${r.duree} min`}
                className="w-full h-9 px-2.5 rounded-lg border border-input bg-secondary text-sm font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-navy/30 placeholder:text-muted-foreground/40"
              />
            </div>

            {bilan.dureeR > 0 && (
              <div className="pt-3 border-t border-border space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">
                    Coût avion école
                    {bilan.tarifEcole !== null && <span className="ml-1 text-[10px] opacity-60 font-mono">({bilan.tarifEcole} €/h)</span>}
                  </span>
                  {bilan.coutEcole !== null
                    ? <span className="font-semibold text-red-500">−{bilan.coutEcole.toFixed(2)} €</span>
                    : <span className="text-muted-foreground text-[10px] italic">tarif école non renseigné</span>}
                </div>

                {bilan.resultat !== null && (
                  <div className={`flex items-center justify-between pt-2 border-t border-border text-sm font-bold ${bilan.resultat >= 0 ? "text-emerald-700" : "text-red-600"}`}>
                    <span>Résultat</span>
                    <span className="text-lg font-black">{bilan.resultat >= 0 ? "+" : ""}{bilan.resultat.toFixed(2)} €</span>
                  </div>
                )}

                <button
                  onClick={bilan.save}
                  disabled={bilan.isPending}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-navy text-white text-xs font-semibold hover:brightness-90 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {bilan.isPending ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                  Enregistrer le bilan vol
                </button>
              </div>
            )}

            {bilan.dureeR === 0 && (
              <p className="text-[10px] text-muted-foreground text-center py-1">Entrez la durée réelle pour voir les calculs.</p>
            )}
          </div>
        )}
      </div>

      {/* Free email */}
      <div>
        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[1.5px] mb-2">Email libre</p>
        <div className="mb-2">
          <p className="text-[10px] text-muted-foreground flex items-center gap-1 mb-1.5">
            <Sparkles size={9} />
            Templates rapides
          </p>
          <div className="flex flex-wrap gap-1.5">
            {EMAIL_TEMPLATES.map((tpl, idx) => (
              <button
                key={tpl.label}
                disabled={isPending}
                onClick={() => onApplyTemplate(tpl, idx === 0)}
                className="text-[11px] px-2.5 py-1 rounded-lg border border-border text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors disabled:opacity-50 cursor-pointer"
              >
                {tpl.label}
              </button>
            ))}
          </div>
        </div>
        <button
          onClick={onOpenEmailComposer}
          className="w-full flex items-center gap-2.5 px-4 py-2.5 rounded-lg border border-border text-sm text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors cursor-pointer"
        >
          <Send size={14} />
          Composer un email…
        </button>
      </div>
    </div>
  );
}
