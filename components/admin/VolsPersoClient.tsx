"use client";

import { useState, useTransition } from "react";
import { updateStatutReservationPerso, sendEmailConfirmation, updateReservationPersoFields } from "@/lib/actions/reservations";
import { deleteReservationPerso } from "@/lib/actions/delete";
import { DeleteButton } from "@/components/admin/DeleteButton";
import { MapPin, Mail, ChevronDown, ChevronUp, Loader2, Pencil, Check, X } from "lucide-react";

const STATUTS = [
  { value: "en_attente",      label: "En attente",       color: "bg-yellow-100 text-yellow-700 border-yellow-200" },
  { value: "acompte_recu",    label: "Acompte reçu",     color: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  { value: "date_confirmee",  label: "Date confirmée",   color: "bg-blue-100 text-blue-700 border-blue-200" },
  { value: "heure_confirmee", label: "Heure confirmée",  color: "bg-green-100 text-green-700 border-green-200" },
  { value: "vol_effectue",    label: "Vol effectué",     color: "bg-purple-100 text-purple-700 border-purple-200" },
  { value: "annulee",         label: "Annulée",          color: "bg-red-100 text-red-700 border-red-200" },
];

type Waypoint = { lat: number; lng: number };
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

export function VolsPersoClient({ reservations }: { reservations: Reservation[] }) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [emailLoading, setEmailLoading] = useState<string | null>(null);
  const [messages, setMessages] = useState<Record<string, string>>({});

  // Track which emails have been sent — initialize from DB timestamps
  const [sentEmails, setSentEmails] = useState<Record<string, Set<"date" | "heure">>>(() => {
    const init: Record<string, Set<"date" | "heure">> = {};
    reservations.forEach(r => {
      const s = new Set<"date" | "heure">();
      if (r.date_confirmee_at) s.add("date");
      if (r.heure_confirmee_at) s.add("heure");
      if (s.size > 0) init[r.id] = s;
    });
    return init;
  });

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editFields, setEditFields] = useState<EditFields>({ passagers: "", poids_total: "", commentaire: "", acompte: "" });
  const [editSaving, setEditSaving] = useState(false);

  function toggle(id: string) { setExpanded(prev => prev === id ? null : id); }

  async function changeStatut(id: string, statut: string) {
    setLoadingId(id);
    startTransition(async () => {
      const r = await updateStatutReservationPerso(id, statut);
      if (r.error) setMessages(m => ({ ...m, [id]: r.error! }));
      setLoadingId(null);
    });
  }

  async function sendEmail(id: string, type: "date" | "heure") {
    const key = `${id}-${type}`;
    setEmailLoading(key);
    const r = await sendEmailConfirmation(id, type);
    setEmailLoading(null);
    if (r.error) {
      setMessages(m => ({ ...m, [id]: r.error! }));
    } else {
      setSentEmails(prev => {
        const s = new Set(prev[id] ?? []);
        s.add(type);
        return { ...prev, [id]: s };
      });
      setMessages(m => ({ ...m, [id]: "Email envoyé ✓" }));
      setTimeout(() => setMessages(m => { const c = { ...m }; delete c[id]; return c; }), 3000);
    }
  }

  function startEdit(r: Reservation) {
    setEditingId(r.id);
    setEditFields({
      passagers: String(r.passagers),
      poids_total: r.poids_total != null ? String(r.poids_total) : "",
      commentaire: r.commentaire ?? "",
      acompte: r.acompte != null ? String(r.acompte) : "",
    });
  }

  async function saveEdit(id: string) {
    setEditSaving(true);
    const result = await updateReservationPersoFields(id, {
      passagers: parseInt(editFields.passagers) || 1,
      poids_total: editFields.poids_total ? parseInt(editFields.poids_total) : null,
      commentaire: editFields.commentaire.trim() || null,
      acompte: editFields.acompte !== "" ? parseFloat(editFields.acompte) : null,
    });
    setEditSaving(false);
    if (result.error) {
      setMessages(m => ({ ...m, [id]: result.error! }));
    } else {
      setEditingId(null);
    }
  }

  if (!reservations.length) {
    return (
      <div className="text-center py-20 text-muted-foreground text-sm">
        Aucune demande de vol sur mesure pour le moment.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {reservations.map(r => {
        const statut = STATUTS.find(s => s.value === r.statut) ?? STATUTS[0];
        const client = r.clients;
        const dateStr = new Date(r.date_vol + "T12:00:00Z").toLocaleDateString("fr-BE", {
          weekday: "short", day: "numeric", month: "short", year: "numeric",
        });
        const isExpanded = expanded === r.id;
        const isEditing = editingId === r.id;
        const sent = sentEmails[r.id] ?? new Set();
        const dateSent = sent.has("date");
        const heureSent = sent.has("heure");

        return (
          <div key={r.id} className="card-premium p-4">
            {/* Header row */}
            <div
              className="flex items-start justify-between gap-4 cursor-pointer select-none"
              onClick={() => toggle(r.id)}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold text-foreground text-sm">
                    {client ? `${client.prenom} ${client.nom}` : "—"}
                  </p>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${statut.color}`}>
                    {statut.label}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1">
                  <p className="text-xs text-muted-foreground">{dateStr}{r.heure_vol ? ` · ${r.heure_vol}` : ""}</p>
                  <p className="text-xs text-muted-foreground">~{r.duree} min · {r.distance_km ? `${r.distance_km} km` : "dist. inconnue"}</p>
                  {r.acompte != null && <p className="text-xs text-primary font-semibold">Acompte : {r.acompte} €</p>}
                  {r.waypoints && <p className="text-xs text-muted-foreground">{r.waypoints.length} point{r.waypoints.length > 1 ? "s" : ""}</p>}
                </div>
                {client && (
                  <p className="text-xs text-muted-foreground mt-0.5">{client.email}{client.telephone ? ` · ${client.telephone}` : ""}</p>
                )}
              </div>

              <div
                className="flex items-center gap-1 shrink-0"
                onClick={e => e.stopPropagation()}
              >
                <DeleteButton
                  onDelete={() => deleteReservationPerso(r.id)}
                  confirmMessage="Confirmer ?"
                />
                <span className="p-1.5 text-muted-foreground pointer-events-none">
                  {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </span>
              </div>
            </div>

            {messages[r.id] && (
              <p className="text-xs text-green-600 mt-2">{messages[r.id]}</p>
            )}

            {/* Expanded details */}
            {isExpanded && (
              <div className="mt-4 pt-4 border-t border-border space-y-4">

                {/* Route */}
                {r.waypoints && r.waypoints.length > 0 && (
                  <div>
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <MapPin size={11} /> Route
                    </p>
                    <div className="bg-secondary/30 rounded-lg p-3 space-y-1 text-xs font-mono">
                      <p className="text-muted-foreground">✈ EBCI (départ)</p>
                      {r.waypoints.map((wp, i) => (
                        <p key={i} className="text-foreground pl-3">→ {wp.lat.toFixed(5)}, {wp.lng.toFixed(5)}</p>
                      ))}
                      {(r.stopovers ?? []).map(so => (
                        <p key={so.icao} className="text-[#F2B705] pl-3">⊕ {so.icao} — {so.nom} (+{so.taxe}€)</p>
                      ))}
                      <p className="text-muted-foreground">✈ EBCI (retour)</p>
                    </div>
                  </div>
                )}

                {/* Détails — view or edit */}
                {isEditing ? (
                  <div className="space-y-3">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Modifier la réservation</p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
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
                          placeholder="—"
                        />
                      </label>
                      <label className="flex flex-col gap-1">
                        <span className="text-[10px] text-muted-foreground">Acompte reçu (€)</span>
                        <input
                          type="number" min={0} step={0.01}
                          value={editFields.acompte}
                          onChange={e => setEditFields(f => ({ ...f, acompte: e.target.value }))}
                          className="w-full h-9 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                          placeholder="—"
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
                        onClick={() => saveEdit(r.id)}
                        disabled={editSaving}
                        className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors disabled:opacity-50"
                      >
                        {editSaving ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />}
                        Enregistrer
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        disabled={editSaving}
                        className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-border text-muted-foreground hover:bg-secondary transition-colors"
                      >
                        <X size={11} /> Annuler
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                      {[
                        { label: "Passagers", value: String(r.passagers) },
                        { label: "Poids total", value: r.poids_total ? `${r.poids_total} kg` : "—" },
                        { label: "Taxes escales", value: r.taxes_escales ? `${r.taxes_escales} €` : "—" },
                        { label: "Acompte", value: r.acompte != null ? `${r.acompte} €` : "—" },
                      ].map(({ label, value }) => (
                        <div key={label} className="bg-secondary/30 rounded-lg p-2.5">
                          <p className="text-muted-foreground">{label}</p>
                          <p className="font-semibold text-foreground mt-0.5">{value}</p>
                        </div>
                      ))}
                    </div>

                    {r.commentaire && (
                      <div>
                        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Remarques</p>
                        <p className="text-xs text-muted-foreground bg-secondary/30 rounded-lg p-3">{r.commentaire}</p>
                      </div>
                    )}

                    <button
                      onClick={() => startEdit(r)}
                      className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-border text-muted-foreground hover:bg-secondary transition-colors"
                    >
                      <Pencil size={11} /> Modifier
                    </button>
                  </>
                )}

                {/* Actions statut */}
                <div className="flex flex-wrap gap-2">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider w-full">Statut</p>
                  {STATUTS.map(s => (
                    <button key={s.value}
                      disabled={r.statut === s.value || isPending}
                      onClick={() => changeStatut(r.id, s.value)}
                      className={[
                        "text-xs px-3 py-1.5 rounded-lg border font-medium transition-all",
                        r.statut === s.value
                          ? `${s.color} cursor-default`
                          : "border-border text-muted-foreground hover:bg-secondary disabled:opacity-50",
                      ].join(" ")}>
                      {loadingId === r.id && r.statut !== s.value ? <Loader2 size={11} className="animate-spin inline mr-1" /> : null}
                      {s.label}
                    </button>
                  ))}
                </div>

                {/* Emails */}
                <div className="flex flex-wrap gap-2">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider w-full flex items-center gap-1">
                    <Mail size={10} /> Emails
                  </p>
                  <button
                    onClick={() => sendEmail(r.id, "date")}
                    disabled={emailLoading === `${r.id}-date`}
                    className={[
                      "text-xs px-3 py-1.5 rounded-lg border transition-colors flex items-center gap-1.5 disabled:opacity-50",
                      dateSent
                        ? "bg-emerald-50 border-emerald-300 text-emerald-700 hover:bg-emerald-100"
                        : "border-border text-muted-foreground hover:bg-secondary",
                    ].join(" ")}
                  >
                    {emailLoading === `${r.id}-date` ? <Loader2 size={11} className="animate-spin" /> : <Mail size={11} />}
                    Envoyer confirmation date
                  </button>
                  <button
                    onClick={() => sendEmail(r.id, "heure")}
                    disabled={emailLoading === `${r.id}-heure`}
                    className={[
                      "text-xs px-3 py-1.5 rounded-lg border transition-colors flex items-center gap-1.5 disabled:opacity-50",
                      heureSent
                        ? "bg-emerald-50 border-emerald-300 text-emerald-700 hover:bg-emerald-100"
                        : "border-border text-muted-foreground hover:bg-secondary",
                    ].join(" ")}
                  >
                    {emailLoading === `${r.id}-heure` ? <Loader2 size={11} className="animate-spin" /> : <Mail size={11} />}
                    Envoyer confirmation heure
                  </button>
                </div>

              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
