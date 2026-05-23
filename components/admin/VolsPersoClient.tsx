"use client";

import { useState, useTransition } from "react";
import { updateStatutReservationPerso, updateReservationPersoFields, sendCustomEmail } from "@/lib/actions/reservations";
import { deleteReservationPerso } from "@/lib/actions/delete";
import { AdminBadge, STATUT_PERSO } from "@/components/admin/ui/AdminBadge";
import { AdminRowActions } from "@/components/admin/ui/AdminRowActions";
import { AdminSheet, SheetSection } from "@/components/admin/ui/AdminSheet";
import { MapPin, Loader2, Check, X, Zap, Wind, Mail, Send } from "lucide-react";

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

type EditFields = {
  passagers: string;
  poids_total: string;
  commentaire: string;
  acompte: string;
};

const STATUTS_LIST = Object.entries(STATUT_PERSO).map(([value, cfg]) => ({ value, ...cfg }));

// ── Corps interactif du drawer (remonté à chaque réservation) ──
function DrawerBody({
  reservation: r,
  onStatusChange,
}: {
  reservation: Reservation;
  onStatusChange: (id: string, statut: string) => void;
}) {
  const [loadingStatut, setLoadingStatut] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ msg: string; ok: boolean } | null>(null);

  // Édition des champs
  const [editing, setEditing] = useState(false);
  const [editFields, setEditFields] = useState<EditFields>({
    passagers: String(r.passagers),
    poids_total: r.poids_total != null ? String(r.poids_total) : "",
    commentaire: r.commentaire ?? "",
    acompte: r.acompte != null ? String(r.acompte) : "",
  });
  const [editSaving, setEditSaving] = useState(false);

  // Email
  const [emailOpen, setEmailOpen] = useState(false);
  const [emailSubject, setEmailSubject] = useState(() => {
    const dateStr = new Date(r.date_vol + "T12:00:00Z").toLocaleDateString("fr-BE", {
      weekday: "long", day: "numeric", month: "long", year: "numeric",
    });
    return `Fly Horizons — Votre vol sur mesure du ${dateStr}`;
  });
  const [emailBody, setEmailBody] = useState(
    `Bonjour ${r.clients?.prenom ?? ""},\n\n\n\nCordialement,\nL'équipe Fly Horizons`
  );
  const [emailPending, startEmailTransition] = useTransition();

  function showFeedback(msg: string, ok = true) {
    setFeedback({ msg, ok });
    setTimeout(() => setFeedback(null), 3500);
  }

  function changeStatut(statut: string) {
    setLoadingStatut(statut);
    startTransition(async () => {
      const result = await updateStatutReservationPerso(r.id, statut);
      setLoadingStatut(null);
      if (result.error) { showFeedback("Erreur : " + result.error, false); return; }
      onStatusChange(r.id, statut);
      const emailStatuts = ["date_confirmee", "heure_confirmee", "vol_effectue"];
      showFeedback(emailStatuts.includes(statut) ? "Statut mis à jour. Email envoyé ✓" : "Statut mis à jour ✓");
    });
  }

  async function saveEdit() {
    setEditSaving(true);
    const result = await updateReservationPersoFields(r.id, {
      passagers: parseInt(editFields.passagers) || 1,
      poids_total: editFields.poids_total ? parseInt(editFields.poids_total) : null,
      commentaire: editFields.commentaire.trim() || null,
      acompte: editFields.acompte !== "" ? parseFloat(editFields.acompte) : null,
    });
    setEditSaving(false);
    if (result.error) { showFeedback("Erreur : " + result.error, false); return; }
    setEditing(false);
    showFeedback("Informations sauvegardées ✓");
  }

  function sendEmail() {
    startEmailTransition(async () => {
      const result = await sendCustomEmail(r.id, emailSubject, emailBody);
      if (result.error) { showFeedback("Erreur : " + result.error, false); return; }
      setEmailOpen(false);
      showFeedback("Email envoyé ✓");
    });
  }

  const dateLabel = new Date(r.date_vol + "T12:00:00Z").toLocaleDateString("fr-BE", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });

  return (
    <>
      {/* Feedback */}
      {feedback && (
        <div className={`-mt-1 px-3 py-2 rounded-lg text-xs flex items-center gap-2 border ${
          feedback.ok
            ? "bg-green-50 border-green-200 text-green-700"
            : "bg-red-50 border-red-200 text-red-700"
        }`}>
          <Check size={12} /> {feedback.msg}
        </div>
      )}

      {/* Détails du vol */}
      <SheetSection title="Vol">
        {editing ? (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1">
                <span className="text-[10px] text-muted-foreground">Passagers</span>
                <input
                  type="number" min={1} max={10}
                  value={editFields.passagers}
                  onChange={e => setEditFields(f => ({ ...f, passagers: e.target.value }))}
                  className="w-full h-9 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-[10px] text-muted-foreground">Poids total (kg)</span>
                <input
                  type="number" min={0}
                  value={editFields.poids_total}
                  onChange={e => setEditFields(f => ({ ...f, poids_total: e.target.value }))}
                  className="w-full h-9 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="Non renseigné"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-[10px] text-muted-foreground">Acompte reçu (€)</span>
                <input
                  type="number" min={0} step={0.01}
                  value={editFields.acompte}
                  onChange={e => setEditFields(f => ({ ...f, acompte: e.target.value }))}
                  className="w-full h-9 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="Aucun"
                />
              </label>
            </div>
            <label className="flex flex-col gap-1">
              <span className="text-[10px] text-muted-foreground">Remarques</span>
              <textarea
                rows={3}
                value={editFields.commentaire}
                onChange={e => setEditFields(f => ({ ...f, commentaire: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="Aucune remarque"
              />
            </label>
            <div className="flex gap-2">
              <button
                onClick={saveEdit}
                disabled={editSaving}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors disabled:opacity-50"
              >
                {editSaving ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />}
                Enregistrer
              </button>
              <button
                onClick={() => setEditing(false)}
                disabled={editSaving}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-border text-muted-foreground hover:bg-secondary transition-colors"
              >
                <X size={11} /> Annuler
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2 text-xs">
              {[
                { label: "Date du vol", value: <span className="capitalize">{dateLabel}</span> },
                { label: "Heure", value: r.heure_vol ? r.heure_vol.slice(0, 5) : <span className="text-orange-400">À définir</span> },
                { label: "Durée", value: `~${r.duree} min` },
                { label: "Distance", value: r.distance_km ? `${r.distance_km} km` : "Inconnue" },
                { label: "Passagers", value: r.passagers },
                { label: "Poids total", value: r.poids_total ? `${r.poids_total} kg` : "Non renseigné" },
                { label: "Taxes escales", value: r.taxes_escales ? `${r.taxes_escales} €` : "Aucune" },
                { label: "Acompte", value: r.acompte != null ? `${r.acompte} €` : "Aucun" },
              ].map(({ label, value }) => (
                <div key={label} className="bg-secondary/30 rounded-lg p-2.5">
                  <p className="text-muted-foreground">{label}</p>
                  <p className="font-semibold text-foreground mt-0.5">{value}</p>
                </div>
              ))}
            </div>

            {/* Style de vol */}
            {r.style_vol && (
              <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-semibold ${
                r.style_vol === "rapide"
                  ? "bg-blue-50 border-blue-200 text-blue-800"
                  : "bg-purple-50 border-purple-200 text-purple-800"
              }`}>
                {r.style_vol === "rapide" ? <Zap size={15} /> : <Wind size={15} />}
                <div>
                  <p className="font-bold">
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

            {r.commentaire && (
              <div>
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Remarques</p>
                <p className="text-xs text-muted-foreground bg-secondary/30 rounded-lg p-3">{r.commentaire}</p>
              </div>
            )}

            <button
              onClick={() => setEditing(true)}
              className="text-xs px-3 py-1.5 rounded-lg border border-border text-muted-foreground hover:bg-secondary transition-colors"
            >
              Modifier les champs…
            </button>
          </div>
        )}
      </SheetSection>

      {/* Route */}
      {r.waypoints && r.waypoints.length > 0 && (
        <SheetSection title="Route">
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
        </SheetSection>
      )}

      {/* Statut */}
      <SheetSection title="Statut">
        <div className="flex flex-wrap gap-2">
          {STATUTS_LIST.map(s => (
            <button
              key={s.value}
              disabled={r.statut === s.value || isPending}
              onClick={() => changeStatut(s.value)}
              className={[
                "text-xs px-3 py-1.5 rounded-lg border font-medium transition-all",
                r.statut === s.value
                  ? "bg-[#113356] text-white border-[#113356] cursor-default"
                  : "border-border text-muted-foreground hover:bg-secondary disabled:opacity-50",
              ].join(" ")}
            >
              {loadingStatut === s.value && r.statut !== s.value
                ? <Loader2 size={11} className="animate-spin inline mr-1" />
                : null}
              {s.label}
            </button>
          ))}
        </div>
      </SheetSection>

      {/* Email libre */}
      {r.clients && (
        <SheetSection title="Email libre">
          {emailOpen ? (
            <div className="space-y-2.5 bg-secondary/40 rounded-xl p-3.5 border border-border">
              <div>
                <p className="text-[10px] text-muted-foreground mb-1">À</p>
                <p className="text-xs text-foreground font-medium">{r.clients.email}</p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground mb-1">Sujet</p>
                <input
                  autoFocus
                  value={emailSubject}
                  onChange={e => setEmailSubject(e.target.value)}
                  className="w-full h-8 px-2.5 rounded-lg border border-input bg-background text-xs focus:outline-none focus:ring-1 focus:ring-navy/30"
                />
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground mb-1">Message</p>
                <textarea
                  value={emailBody}
                  onChange={e => setEmailBody(e.target.value)}
                  rows={6}
                  className="w-full px-2.5 py-2 rounded-lg border border-input bg-background text-xs resize-none focus:outline-none focus:ring-1 focus:ring-navy/30"
                />
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={sendEmail}
                  disabled={emailPending || !emailSubject.trim() || !emailBody.trim()}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#113356] text-white text-xs font-semibold hover:bg-[#0b2238] transition-colors disabled:opacity-50"
                >
                  {emailPending ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
                  Envoyer
                </button>
                <button
                  onClick={() => setEmailOpen(false)}
                  disabled={emailPending}
                  className="px-3 py-1.5 rounded-lg border border-border text-xs text-muted-foreground hover:bg-secondary transition-colors"
                >
                  Annuler
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setEmailOpen(true)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border text-xs text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
            >
              <Mail size={13} />
              Composer un email…
            </button>
          )}
        </SheetSection>
      )}
    </>
  );
}

// ── Drawer ─────────────────────────────────────────────────────
function VolsPersoDrawer({
  reservation,
  onClose,
  onStatusChange,
}: {
  reservation: Reservation | null;
  onClose: () => void;
  onStatusChange: (id: string, statut: string) => void;
}) {
  if (!reservation) return null;

  const r = reservation;
  const statusCfg = STATUT_PERSO[r.statut] ?? { label: r.statut, variant: "secondary" as const };
  const dateStr = new Date(r.date_vol + "T12:00:00Z").toLocaleDateString("fr-BE", {
    weekday: "short", day: "numeric", month: "short", year: "numeric",
  });

  return (
    <AdminSheet
      open={!!reservation}
      onClose={onClose}
      title={r.clients ? `${r.clients.prenom} ${r.clients.nom}` : "Vol sur mesure"}
      subtitle={
        <span className="flex items-center gap-2">
          <AdminBadge variant={statusCfg.variant} label={statusCfg.label} />
          <span>{dateStr}{r.heure_vol ? ` · ${r.heure_vol.slice(0, 5)}` : ""}</span>
        </span>
      }
      width="w-[520px]"
    >
      <DrawerBody
        key={r.id}
        reservation={r}
        onStatusChange={onStatusChange}
      />
    </AdminSheet>
  );
}

// ── Carte ──────────────────────────────────────────────────────
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
        {/* Infos — cliquables */}
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

        {/* Actions */}
        <div onClick={e => e.stopPropagation()} className="shrink-0">
          <AdminRowActions
            onView={onOpen}
            onDelete={onDelete}
          />
        </div>
      </div>
    </div>
  );
}

// ── Page principale ────────────────────────────────────────────
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
