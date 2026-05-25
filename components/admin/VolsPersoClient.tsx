"use client";

import { useState, useTransition, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  updateStatutReservationPerso,
  updateReservationPersoFields,
  updateReservationDateHeure,
  sendCustomEmail,
  sendRescheduleInvite,
} from "@/lib/actions/reservations";
import { deleteReservationPerso } from "@/lib/actions/delete";
import { AdminBadge, STATUT_PERSO } from "@/components/admin/ui/AdminBadge";
import { AdminRowActions } from "@/components/admin/ui/AdminRowActions";
import {
  X, User, Phone, Mail, Calendar, Clock, Users, Weight,
  CreditCard, Loader2, Send, Pencil, Check, MapPin,
  Sparkles, RotateCcw, Zap, Wind, AlertTriangle,
  CheckCircle2, XCircle, ChevronRight,
} from "lucide-react";

type Waypoint = { lat: number; lng: number; nom?: string };
type Stopover = { icao: string; nom: string; taxe: number };
type Reservation = {
  id: string;
  date_vol: string;
  heure_vol: string | null;
  duree: number;
  passagers: number;
  poids_total: number | null;
  statut: string;
  acompte: number | null;
  distance_km: number | null;
  style_vol: "rapide" | "vues" | null;
  waypoints: Waypoint[] | null;
  stopovers: Stopover[] | null;
  taxes_escales: number | null;
  commentaire: string | null;
  created_at: string;
  date_confirmee_at: string | null;
  heure_confirmee_at: string | null;
  clients: { id: string; prenom: string; nom: string; email: string; telephone: string | null } | null;
};

// ── Templates email ────────────────────────────────────────────────────────────
type EmailTemplate = { label: string; subject: (dateStr: string) => string; body: (prenom: string, dateStr: string) => string };
const EMAIL_TEMPLATES: EmailTemplate[] = [
  {
    label: "☁️ Report météo",
    subject: (dateStr) => `Fly Horizons — Votre vol du ${dateStr}`,
    body: (prenom, dateStr) =>
`Bonjour ${prenom},

J'ai suivi les prévisions pour le ${dateStr} et les conditions ne permettent malheureusement pas de voler en sécurité. Je préfère reporter plutôt que de vous faire prendre des risques ou de vous faire passer une mauvaise expérience.

Votre acompte est bien conservé, aucun frais ne vous est facturé.

Je vous contacterai dès qu'une nouvelle date se libère. N'hésitez pas à me donner vos prochaines disponibilités pour que je puisse vous proposer quelque chose rapidement.

À très vite,
Romain`,
  },
  {
    label: "✈️ Vol maintenu",
    subject: (dateStr) => `Fly Horizons — Vol confirmé pour le ${dateStr}`,
    body: (prenom, dateStr) =>
`Bonjour ${prenom},

Bonne nouvelle, j'ai vérifié la météo pour le ${dateStr} et tout est au vert. Le vol est bien maintenu comme prévu.

Rendez-vous à l'aéroport de Charleroi (EBCI) 15 minutes avant l'heure convenue. N'hésitez pas si vous avez une question avant votre arrivée.

À très bientôt,
Romain`,
  },
  {
    label: "🗺️ Zone restreinte",
    subject: (dateStr) => `Fly Horizons — Votre itinéraire du ${dateStr}`,
    body: (prenom) =>
`Bonjour ${prenom},

J'ai analysé votre itinéraire en détail. Une partie de la route que vous m'avez demandée traverse une zone d'espace aérien contrôlé que je ne peux pas survoler sans autorisation spéciale pour ce type de vol.

Je vous propose de contourner cette zone par [à compléter], ce qui donnera un résultat très similaire. Le reste de votre itinéraire est tout à fait réalisable.

Dites-moi si cette alternative vous convient ou si vous préférez qu'on en parle, je reste disponible pour ajuster.

À bientôt,
Romain`,
  },
  {
    label: "⏰ Rappel J-1",
    subject: () => `Fly Horizons — Votre vol est demain`,
    body: (prenom) =>
`Bonjour ${prenom},

Je vous confirme votre vol prévu demain. Quelques rappels pour que tout se passe au mieux.

Présentez-vous à l'aéroport de Charleroi (EBCI) 15 minutes avant l'heure prévue. Portez des chaussures fermées, c'est indispensable pour circuler sur la piste. Un pull ou une veste légère est conseillé même en été, il fait généralement plus frais en altitude.

Si vous avez une question de dernière minute, répondez directement à cet email.

À demain,
Romain`,
  },
];

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">{label}</p>
      <div className="text-sm text-foreground">{children}</div>
    </div>
  );
}

// ── Drawer principal ───────────────────────────────────────────────────────────
function VolsPersoDrawer({
  reservation,
  onClose,
  onStatusChange,
}: {
  reservation: Reservation | null;
  onClose: () => void;
  onStatusChange: (id: string, statut: string) => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [emailPending, startEmailTransition] = useTransition();

  // Edit mode
  const [editingDetails, setEditingDetails] = useState(false);
  const [draftDate, setDraftDate] = useState("");
  const [draftHeure, setDraftHeure] = useState("");
  const [draftDuree, setDraftDuree] = useState("");
  const [draftPassagers, setDraftPassagers] = useState("");
  const [draftPoids, setDraftPoids] = useState("");
  const [draftAcompte, setDraftAcompte] = useState("");
  const [draftCommentaire, setDraftCommentaire] = useState("");

  // Email
  const [emailOpen, setEmailOpen] = useState(false);
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [includeReschedule, setIncludeReschedule] = useState(false);

  // UI
  const [feedback, setFeedback] = useState<{ msg: string; ok: boolean } | null>(null);

  // Reset on reservation change
  useEffect(() => {
    setEditingDetails(false);
    setEmailOpen(false);
    setIncludeReschedule(false);
  }, [reservation?.id]);

  function showFeedback(msg: string, ok = true) {
    setFeedback({ msg, ok });
    setTimeout(() => setFeedback(null), 3500);
  }

  function openEditDetails() {
    if (!reservation) return;
    setDraftDate(reservation.date_vol);
    setDraftHeure(reservation.heure_vol?.slice(0, 5) ?? "");
    setDraftDuree(String(reservation.duree));
    setDraftPassagers(String(reservation.passagers));
    setDraftPoids(reservation.poids_total != null ? String(reservation.poids_total) : "");
    setDraftAcompte(reservation.acompte != null ? String(reservation.acompte) : "");
    setDraftCommentaire(reservation.commentaire ?? "");
    setEditingDetails(true);
  }

  function saveDetails() {
    if (!reservation) return;
    startTransition(async () => {
      // Date / heure
      const dateChanged  = draftDate && draftDate !== reservation.date_vol;
      const heureChanged = draftHeure !== (reservation.heure_vol?.slice(0, 5) ?? "");
      if (dateChanged || heureChanged) {
        const updates: Record<string, string> = {};
        if (dateChanged)  updates.date_vol  = draftDate;
        if (heureChanged) updates.heure_vol = draftHeure;
        const dr = await updateReservationDateHeure(reservation.id, updates);
        if (dr.error) { showFeedback("Erreur : " + dr.error, false); return; }
      }
      // Autres champs
      const r = await updateReservationPersoFields(reservation.id, {
        duree:       parseInt(draftDuree)    || reservation.duree,
        passagers:   parseInt(draftPassagers) || reservation.passagers,
        poids_total: draftPoids ? parseFloat(draftPoids) : null,
        acompte:     draftAcompte ? parseFloat(draftAcompte) : null,
        commentaire: draftCommentaire.trim() || null,
      });
      if (r.error) { showFeedback("Erreur : " + r.error, false); return; }
      setEditingDetails(false);
      showFeedback("Informations sauvegardées ✓");
    });
  }

  function doChangeStatut(statut: string) {
    if (!reservation) return;
    startTransition(async () => {
      const result = await updateStatutReservationPerso(reservation.id, statut);
      if (result.error) { showFeedback("Erreur : " + result.error, false); return; }
      onStatusChange(reservation.id, statut);
      const emailStatuts = ["date_confirmee", "heure_confirmee", "vol_effectue"];
      showFeedback(emailStatuts.includes(statut) ? "Statut mis à jour, email envoyé ✓" : "Statut mis à jour");
    });
  }

  function doSendRescheduleInvite() {
    if (!reservation) return;
    startTransition(async () => {
      const result = await sendRescheduleInvite(reservation.id);
      if (result.error) { showFeedback("Erreur : " + result.error, false); return; }
      showFeedback("Email de report envoyé au client ✓");
    });
  }

  function applyTemplate(tpl: EmailTemplate, withReschedule = false) {
    if (!reservation) return;
    const prenom = reservation.clients?.prenom ?? "";
    setEmailSubject(tpl.subject(dateLabel));
    setEmailBody(tpl.body(prenom, dateLabel));
    setIncludeReschedule(withReschedule);
    setEmailOpen(true);
  }

  function openEmailComposer() {
    if (!reservation) return;
    setEmailSubject(`Fly Horizons — Votre vol sur mesure du ${dateLabel}`);
    setEmailBody(`Bonjour ${reservation.clients?.prenom ?? ""},\n\n\n\nCordialement,\nRomain`);
    setEmailOpen(true);
  }

  function sendEmail() {
    if (!reservation) return;
    startEmailTransition(async () => {
      const result = await sendCustomEmail(reservation.id, emailSubject, emailBody, includeReschedule);
      if (result.error) { showFeedback("Erreur : " + result.error, false); return; }
      setEmailOpen(false);
      setIncludeReschedule(false);
      showFeedback("Email envoyé ✓");
    });
  }

  if (!reservation) return null;

  const r = reservation;
  const statusCfg = STATUT_PERSO[r.statut] ?? { label: r.statut, variant: "secondary" as const };
  const dateLabel = new Date(r.date_vol + "T12:00:00Z").toLocaleDateString("fr-BE", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });

  return (
    <AnimatePresence>
      {r && (
        <>
          <motion.div
            className="fixed inset-0 bg-foreground/20 backdrop-blur-[1px] z-50"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
          />

          <motion.aside
            className={`fixed right-0 top-0 bottom-0 w-full bg-card border-l border-border shadow-[−8px_0_40px_rgba(17,51,86,.12)] z-50 flex flex-col transition-[max-width] duration-200 ease-in-out ${emailOpen ? "max-w-2xl" : "max-w-lg"}`}
            initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 300 }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
              <div className="min-w-0">
                <div className="flex items-center gap-2.5 mb-1">
                  <AdminBadge variant={statusCfg.variant} label={statusCfg.label} />
                  <span className="text-xs text-muted-foreground font-mono">
                    #{r.id.slice(0, 8).toUpperCase()}
                  </span>
                </div>
                <p className="text-sm font-semibold text-foreground truncate">
                  {r.clients?.prenom} {r.clients?.nom}
                </p>
              </div>
              <button onClick={onClose} className="p-2 rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground shrink-0">
                <X size={16} />
              </button>
            </div>

            {/* Feedback toast */}
            <AnimatePresence>
              {feedback && (
                <motion.div
                  className={`mx-4 mt-3 px-3 py-2 rounded-lg text-sm flex items-center gap-2 shrink-0 border ${
                    feedback.ok
                      ? "bg-green-50 border-green-200 text-green-700"
                      : "bg-red-50 border-red-200 text-red-700"
                  }`}
                  initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                >
                  <Check size={13} /> {feedback.msg}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Contenu principal — masqué quand le compositeur email est ouvert */}
            {!emailOpen && (
              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">

                {/* Client */}
                <div className="bg-secondary/50 rounded-xl p-4 space-y-2.5">
                  <p className="text-[10px] font-bold text-muted-foreground/50 uppercase tracking-[1.5px] mb-3">Client</p>
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
                </div>

                {/* Vol */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[10px] font-bold text-muted-foreground/50 uppercase tracking-[1.5px]">Vol</p>
                    {!editingDetails && (
                      <button
                        onClick={openEditDetails}
                        className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors px-1.5 py-0.5 rounded hover:bg-secondary"
                      >
                        <Pencil size={10} />
                        Modifier
                      </button>
                    )}
                  </div>

                  {editingDetails ? (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Date du vol</p>
                          <input type="date" value={draftDate} onChange={e => setDraftDate(e.target.value)}
                            className="w-full h-8 px-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-1 focus:ring-navy/30" />
                        </div>
                        <div>
                          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Heure</p>
                          <input type="time" value={draftHeure} onChange={e => setDraftHeure(e.target.value)}
                            className="w-full h-8 px-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-1 focus:ring-navy/30" />
                        </div>
                        <div>
                          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Durée (min)</p>
                          <input type="number" value={draftDuree} onChange={e => setDraftDuree(e.target.value)} min={1}
                            className="w-full h-8 px-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-1 focus:ring-navy/30" />
                        </div>
                        <div>
                          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Passagers</p>
                          <input type="number" value={draftPassagers} onChange={e => setDraftPassagers(e.target.value)} min={1}
                            className="w-full h-8 px-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-1 focus:ring-navy/30" />
                        </div>
                        <div>
                          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Poids total (kg)</p>
                          <input type="number" value={draftPoids} onChange={e => setDraftPoids(e.target.value)} min={0} placeholder="—"
                            className="w-full h-8 px-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-1 focus:ring-navy/30" />
                        </div>
                        <div>
                          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Acompte (€)</p>
                          <input type="number" value={draftAcompte} onChange={e => setDraftAcompte(e.target.value)} min={0} placeholder="—"
                            className="w-full h-8 px-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-1 focus:ring-navy/30" />
                        </div>
                      </div>
                      <div>
                        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Remarques client</p>
                        <textarea
                          rows={3}
                          value={draftCommentaire}
                          onChange={e => setDraftCommentaire(e.target.value)}
                          className="w-full px-2.5 py-2 rounded-lg border border-input bg-background text-xs resize-none focus:outline-none focus:ring-1 focus:ring-navy/30 placeholder:text-muted-foreground/40"
                          placeholder="Texte libre client…"
                        />
                      </div>
                      <div className="flex gap-2">
                        <button onClick={saveDetails} disabled={isPending}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-navy text-white text-xs font-semibold hover:bg-navy/90 transition-colors disabled:opacity-50">
                          {isPending ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />}
                          Sauvegarder
                        </button>
                        <button onClick={() => setEditingDetails(false)}
                          className="px-3 py-1.5 rounded-lg border border-border text-xs text-muted-foreground hover:bg-secondary transition-colors">
                          Annuler
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <Field label="Date du vol">
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <Calendar size={13} className="text-muted-foreground shrink-0" />
                            <span className="capitalize text-sm">{dateLabel}</span>
                          </div>
                        </Field>
                        <Field label="Heure">
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <Clock size={13} className="text-muted-foreground shrink-0" />
                            {r.heure_vol
                              ? <span>{r.heure_vol.slice(0, 5)}</span>
                              : <span className="text-orange-400 text-xs">À définir</span>
                            }
                          </div>
                        </Field>
                        <Field label="Durée">
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <Clock size={13} className="text-muted-foreground" />
                            ~{r.duree} min
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
                        {r.acompte != null && (
                          <Field label="Acompte">
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <CreditCard size={13} className="text-muted-foreground" />
                              {r.acompte} €
                            </div>
                          </Field>
                        )}
                        {r.distance_km != null && (
                          <Field label="Distance">
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <MapPin size={13} className="text-muted-foreground" />
                              {r.distance_km} km
                            </div>
                          </Field>
                        )}
                        {r.taxes_escales != null && r.taxes_escales > 0 && (
                          <Field label="Taxes escales">
                            <span className="text-sm">{r.taxes_escales} €</span>
                          </Field>
                        )}
                      </div>

                      {/* Style de vol */}
                      {r.style_vol && (
                        <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-semibold ${
                          r.style_vol === "rapide"
                            ? "bg-blue-50 border-blue-200 text-blue-800"
                            : "bg-purple-50 border-purple-200 text-purple-800"
                        }`}>
                          {r.style_vol === "rapide" ? <Zap size={14} /> : <Wind size={14} />}
                          <div>
                            <p className="font-bold text-sm">
                              {r.style_vol === "rapide" ? "Itinéraire direct" : "Parcours pittoresque"}
                            </p>
                            <p className="text-xs font-normal opacity-70 mt-0.5">
                              {r.style_vol === "rapide"
                                ? "Le client souhaite le trajet le plus court entre les lieux."
                                : "Le client préfère une route plus ample. Tu peux ajouter des détours."}
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Remarques client (texte libre uniquement) */}
                      {r.commentaire && (
                        <div>
                          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Remarques client</p>
                          <p className="text-xs text-muted-foreground bg-secondary/30 rounded-lg p-3 whitespace-pre-wrap">{r.commentaire}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Route — waypoints (lecture seule) */}
                {r.waypoints && r.waypoints.length > 0 && (
                  <div>
                    <p className="text-[10px] font-bold text-muted-foreground/50 uppercase tracking-[1.5px] flex items-center gap-1.5 mb-2">
                      <MapPin size={11} />
                      Route
                    </p>
                    <div className="bg-secondary/30 rounded-lg p-3 space-y-1 text-xs font-mono overflow-x-auto">
                      <p className="text-muted-foreground">✈ EBCI (départ)</p>
                      {r.waypoints.map((wp, i) => (
                        <p key={i} className="text-foreground pl-3">
                          → {wp.nom ?? `${wp.lat.toFixed(5)}, ${wp.lng.toFixed(5)}`}
                          {wp.nom && (
                            <span className="text-muted-foreground ml-2">
                              ({wp.lat.toFixed(4)}, {wp.lng.toFixed(4)})
                            </span>
                          )}
                        </p>
                      ))}
                      {(r.stopovers ?? []).map(so => (
                        <p key={so.icao} className="text-[#F2B705] pl-3">
                          ⊕ {so.icao}, {so.nom} (+{so.taxe}€)
                        </p>
                      ))}
                      <p className="text-muted-foreground">✈ EBCI (retour)</p>
                    </div>
                  </div>
                )}

                {/* Actions de statut — contextuelles */}
                <div>
                  <p className="text-[10px] font-bold text-muted-foreground/50 uppercase tracking-[1.5px] mb-2">Actions</p>
                  <div className="space-y-2">

                    {r.statut === "en_attente" && (
                      <>
                        <button
                          onClick={() => doChangeStatut("date_confirmee")}
                          disabled={isPending}
                          className="w-full flex items-center gap-2.5 px-4 py-2.5 rounded-lg bg-blue-500 text-white text-sm font-semibold hover:bg-blue-600 transition-colors disabled:opacity-50"
                        >
                          {isPending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                          Confirmer la date, envoyer l&apos;email
                        </button>
                        <button
                          onClick={() => doChangeStatut("heure_confirmee")}
                          disabled={isPending}
                          className="w-full flex items-center gap-2.5 px-4 py-2.5 rounded-lg bg-green-500 text-white text-sm font-semibold hover:bg-green-600 transition-colors disabled:opacity-50"
                        >
                          {isPending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                          Confirmer date + heure, envoyer l&apos;email
                        </button>
                      </>
                    )}

                    {r.statut === "acompte_recu" && (
                      <button
                        onClick={() => doChangeStatut("date_confirmee")}
                        disabled={isPending}
                        className="w-full flex items-center gap-2.5 px-4 py-2.5 rounded-lg bg-blue-500 text-white text-sm font-semibold hover:bg-blue-600 transition-colors disabled:opacity-50"
                      >
                        {isPending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                        Confirmer la date, envoyer l&apos;email
                      </button>
                    )}

                    {r.statut === "date_confirmee" && (
                      <>
                        <button
                          onClick={() => doChangeStatut("heure_confirmee")}
                          disabled={isPending}
                          className="w-full flex items-center gap-2.5 px-4 py-2.5 rounded-lg bg-green-500 text-white text-sm font-semibold hover:bg-green-600 transition-colors disabled:opacity-50"
                        >
                          {isPending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                          Confirmer l&apos;heure, envoyer l&apos;email
                        </button>
                        <button
                          onClick={() => doChangeStatut("en_attente")}
                          disabled={isPending}
                          className="w-full flex items-center gap-2.5 px-4 py-2.5 rounded-lg border border-border text-sm text-muted-foreground hover:bg-secondary transition-colors disabled:opacity-50"
                        >
                          <ChevronRight size={14} className="rotate-180" />
                          Revenir en attente
                        </button>
                      </>
                    )}

                    {r.statut === "heure_confirmee" && (
                      <>
                        <button
                          onClick={() => doChangeStatut("vol_effectue")}
                          disabled={isPending}
                          className="w-full flex items-center gap-2.5 px-4 py-2.5 rounded-lg bg-purple-500 text-white text-sm font-semibold hover:bg-purple-600 transition-colors disabled:opacity-50"
                        >
                          {isPending ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                          Marquer vol effectué
                        </button>
                        <button
                          onClick={() => doChangeStatut("date_confirmee")}
                          disabled={isPending}
                          className="w-full flex items-center gap-2.5 px-4 py-2.5 rounded-lg border border-border text-sm text-muted-foreground hover:bg-secondary transition-colors disabled:opacity-50"
                        >
                          <ChevronRight size={14} className="rotate-180" />
                          Revenir planification
                        </button>
                      </>
                    )}

                    {r.statut === "vol_effectue" && (
                      <div className="flex items-center gap-2.5 px-4 py-3 rounded-lg bg-purple-50 border border-purple-200">
                        <CheckCircle2 size={14} className="text-purple-600" />
                        <span className="text-sm text-purple-700 font-medium">Vol effectué, dossier clôturé</span>
                      </div>
                    )}

                    {!["annulee", "vol_effectue"].includes(r.statut) && (
                      <>
                        <button
                          onClick={doSendRescheduleInvite}
                          disabled={isPending}
                          className="w-full flex items-center gap-2.5 px-4 py-2.5 rounded-lg border border-amber-200 text-sm text-amber-600 hover:bg-amber-50 transition-colors disabled:opacity-50"
                        >
                          {isPending ? <Loader2 size={14} className="animate-spin" /> : <RotateCcw size={14} />}
                          Proposer un report
                        </button>
                        <button
                          onClick={() => doChangeStatut("annulee")}
                          disabled={isPending}
                          className="w-full flex items-center gap-2.5 px-4 py-2.5 rounded-lg border border-red-200 text-sm text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50"
                        >
                          <XCircle size={14} />
                          Annuler la réservation
                        </button>
                      </>
                    )}

                    {r.statut === "annulee" && (
                      <button
                        onClick={() => doChangeStatut("en_attente")}
                        disabled={isPending}
                        className="w-full flex items-center gap-2.5 px-4 py-2.5 rounded-lg bg-navy text-white text-sm font-semibold hover:bg-navy/90 transition-colors disabled:opacity-50"
                      >
                        <AlertTriangle size={14} />
                        Réactiver la réservation
                      </button>
                    )}
                  </div>
                </div>

                {/* Email libre */}
                {r.clients && (
                  <div>
                    <p className="text-[10px] font-bold text-muted-foreground/50 uppercase tracking-[1.5px] mb-2">Email libre</p>
                    <div className="mb-2">
                      <p className="text-[10px] text-muted-foreground/60 flex items-center gap-1 mb-1.5">
                        <Sparkles size={9} />
                        Templates rapides
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {EMAIL_TEMPLATES.map((tpl, idx) => (
                          <button
                            key={tpl.label}
                            disabled={isPending}
                            onClick={() => idx === 0 ? applyTemplate(tpl, true) : applyTemplate(tpl, false)}
                            className="text-[11px] px-2.5 py-1 rounded-lg border border-border text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors disabled:opacity-50"
                          >
                            {tpl.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <button
                      onClick={openEmailComposer}
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 rounded-lg border border-border text-sm text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
                    >
                      <Send size={14} />
                      Composer un email…
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Compositeur email */}
            {emailOpen && (
              <div className="flex-1 flex flex-col min-h-0 px-5 py-4 gap-3">
                <p className="text-[10px] font-bold text-muted-foreground/50 uppercase tracking-[1.5px] shrink-0">Email libre</p>
                <div className="shrink-0">
                  <p className="text-[10px] text-muted-foreground mb-1">À</p>
                  <p className="text-xs text-foreground font-medium">{r.clients?.email}</p>
                </div>
                <div className="shrink-0">
                  <p className="text-[10px] text-muted-foreground mb-1">Sujet</p>
                  <input
                    autoFocus
                    value={emailSubject}
                    onChange={e => setEmailSubject(e.target.value)}
                    className="w-full h-8 px-2.5 rounded-lg border border-input bg-background text-xs focus:outline-none focus:ring-1 focus:ring-navy/30"
                  />
                </div>
                <div className="flex-1 min-h-0 flex flex-col">
                  <p className="text-[10px] text-muted-foreground mb-1">Message</p>
                  <textarea
                    value={emailBody}
                    onChange={e => setEmailBody(e.target.value)}
                    className="flex-1 min-h-0 w-full px-2.5 py-2 rounded-lg border border-input bg-background text-xs resize-none focus:outline-none focus:ring-1 focus:ring-navy/30"
                  />
                </div>
                <div className="shrink-0">
                  <button
                    type="button"
                    onClick={() => setIncludeReschedule(v => !v)}
                    className={[
                      "flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors w-full",
                      includeReschedule
                        ? "border-amber-300 bg-amber-50 text-amber-700"
                        : "border-border text-muted-foreground hover:bg-secondary",
                    ].join(" ")}
                  >
                    <RotateCcw size={11} className={includeReschedule ? "text-amber-600" : ""} />
                    {includeReschedule ? "Lien de report inclus dans l'email ✓" : "Ajouter un lien de report"}
                  </button>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={sendEmail}
                    disabled={emailPending || !emailSubject.trim() || !emailBody.trim()}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-navy text-white text-xs font-semibold hover:bg-navy/90 transition-colors disabled:opacity-50"
                  >
                    {emailPending ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
                    Envoyer
                  </button>
                  <button
                    onClick={() => { setEmailOpen(false); setIncludeReschedule(false); }}
                    className="px-3 py-1.5 rounded-lg border border-border text-xs text-muted-foreground hover:bg-secondary transition-colors"
                  >
                    Annuler
                  </button>
                </div>
              </div>
            )}

            {/* Footer */}
            <div className="px-5 py-3 border-t border-border shrink-0">
              <p className="text-xs text-muted-foreground/50">
                Créée le {new Date(r.created_at).toLocaleDateString("fr-BE", { day: "numeric", month: "long", year: "numeric" })}
              </p>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

// ── Carte ──────────────────────────────────────────────────────────────────────
function ReservationCard({
  reservation: r,
  onOpen,
  onDelete,
}: {
  reservation: Reservation;
  onOpen: () => void;
  onDelete: () => Promise<{ error?: string } | void>;
}) {
  const statusCfg = STATUT_PERSO[r.statut] ?? { label: r.statut, variant: "secondary" as const };
  const client = r.clients;
  const dateStr = new Date(r.date_vol + "T12:00:00Z").toLocaleDateString("fr-BE", {
    weekday: "short", day: "numeric", month: "short", year: "numeric",
  });

  return (
    <div className="card-premium p-4 hover:border-primary/30 transition-colors">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0 cursor-pointer" onClick={onOpen}>
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-foreground text-sm">
              {client ? `${client.prenom} ${client.nom}` : "Client inconnu"}
            </p>
            <AdminBadge variant={statusCfg.variant} label={statusCfg.label} />
            {r.style_vol === "rapide" && (
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                <Zap size={9} /> Direct
              </span>
            )}
            {r.style_vol === "vues" && (
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
                <Wind size={9} /> Pittoresque
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1">
            <p className="text-xs text-muted-foreground">
              {dateStr}{r.heure_vol ? ` · ${r.heure_vol.slice(0, 5)}` : ""}
            </p>
            <p className="text-xs text-muted-foreground">
              ~{r.duree} min{r.distance_km ? ` · ${r.distance_km} km` : ""}
            </p>
            <p className="text-xs text-muted-foreground">
              {r.passagers} pax{r.poids_total ? ` · ${r.poids_total} kg` : ""}
            </p>
            {r.acompte != null && (
              <p className="text-xs text-primary font-semibold">Acompte : {r.acompte} €</p>
            )}
          </div>
          {client && (
            <p className="text-xs text-muted-foreground mt-0.5">
              {client.email}{client.telephone ? ` · ${client.telephone}` : ""}
            </p>
          )}
        </div>

        <div onClick={e => e.stopPropagation()} className="shrink-0">
          <AdminRowActions onView={onOpen} onDelete={onDelete} />
        </div>
      </div>
    </div>
  );
}

// ── Page principale ────────────────────────────────────────────────────────────
export function VolsPersoClient({ reservations: initial }: { reservations: Reservation[] }) {
  const [reservations, setReservations] = useState<Reservation[]>(initial);
  const [drawer, setDrawer] = useState<Reservation | null>(null);

  function handleStatusChange(id: string, statut: string) {
    setReservations(prev => prev.map(r => r.id === id ? { ...r, statut } : r));
    setDrawer(prev => prev?.id === id ? { ...prev, statut } : prev);
  }

  async function handleDelete(id: string) {
    const result = await deleteReservationPerso(id);
    if (!result?.error) {
      setReservations(prev => prev.filter(r => r.id !== id));
      if (drawer?.id === id) setDrawer(null);
    }
    return result;
  }

  if (!reservations.length) {
    return (
      <div className="text-center py-20 text-muted-foreground text-sm">
        Aucune demande de vol sur mesure pour le moment.
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {reservations.map(r => (
          <ReservationCard
            key={r.id}
            reservation={r}
            onOpen={() => setDrawer(r)}
            onDelete={() => handleDelete(r.id)}
          />
        ))}
      </div>

      <VolsPersoDrawer
        reservation={drawer}
        onClose={() => setDrawer(null)}
        onStatusChange={handleStatusChange}
      />
    </>
  );
}
