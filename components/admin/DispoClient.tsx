"use client";

import { useState, useTransition } from "react";
import { Plus, Trash2, Power, CalendarOff, Clock, Pencil } from "lucide-react";
import {
  createPlage,
  updatePlage,
  togglePlageActif,
  deletePlage,
  upsertJourIndiv,
  deleteJourIndiv,
} from "@/lib/actions/disponibilites";

const JOURS_LABELS = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];
const JOURS_ORDER  = [1, 2, 3, 4, 5, 6, 0]; // Mon→Sun display order

interface Plage {
  id: string;
  date_debut: string;
  date_fin: string;
  heure_debut: string;
  heure_fin: string;
  jours: number[] | null;
  actif: boolean;
}

interface JourIndiv {
  id: string;
  date: string;
  ferme: boolean;
  heure_debut: string | null;
  heure_fin: string | null;
}

interface Props {
  plages: Plage[];
  joursIndiv: JourIndiv[];
}

function formatDate(d: string) {
  return new Date(d + "T12:00:00Z").toLocaleDateString("fr-BE", {
    day: "numeric", month: "short", year: "numeric",
  });
}

function JoursChips({ jours }: { jours: number[] | null }) {
  const active = jours ?? [0,1,2,3,4,5,6];
  return (
    <div className="flex gap-0.5">
      {JOURS_ORDER.map((j) => (
        <span
          key={j}
          className={`text-[10px] font-semibold w-6 h-6 flex items-center justify-center rounded ${
            active.includes(j)
              ? "bg-primary/15 text-primary"
              : "bg-muted text-muted-foreground/40"
          }`}
        >
          {JOURS_LABELS[j]}
        </span>
      ))}
    </div>
  );
}

// ── Formulaire plage (création ou édition) ────────────────────
function PlageForm({
  initial,
  onDone,
}: {
  initial?: Plage;
  onDone: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [jours, setJours] = useState<number[]>(initial?.jours ?? [1,2,3,4,5,6,0]);

  function toggle(j: number) {
    setJours((prev) =>
      prev.includes(j) ? prev.filter((x) => x !== j) : [...prev, j]
    );
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    jours.forEach((j) => fd.append("jours", String(j)));
    startTransition(async () => {
      const res = initial
        ? await updatePlage(initial.id, fd)
        : await createPlage(fd);
      if (res?.error) setError(res.error);
      else onDone();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="card-premium p-5 space-y-4 border-primary/30">
      <p className="text-sm font-semibold text-foreground">
        {initial ? "Modifier la plage récurrente" : "Nouvelle plage récurrente"}
      </p>

      {error && <p className="text-xs text-destructive">{error}</p>}

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Date début *</label>
          <input name="date_debut" type="date" required
            defaultValue={initial?.date_debut}
            className="w-full h-9 px-3 rounded-md border border-border bg-input text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Date fin *</label>
          <input name="date_fin" type="date" required
            defaultValue={initial?.date_fin}
            className="w-full h-9 px-3 rounded-md border border-border bg-input text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Heure début *</label>
          <input name="heure_debut" type="time" required
            defaultValue={initial?.heure_debut?.slice(0, 5) ?? "08:00"}
            className="w-full h-9 px-3 rounded-md border border-border bg-input text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Heure fin *</label>
          <input name="heure_fin" type="time" required
            defaultValue={initial?.heure_fin?.slice(0, 5) ?? "18:00"}
            className="w-full h-9 px-3 rounded-md border border-border bg-input text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-xs text-muted-foreground">Jours actifs</label>
        <div className="flex gap-1.5">
          {JOURS_ORDER.map((j) => (
            <button
              key={j}
              type="button"
              onClick={() => toggle(j)}
              className={`text-xs font-semibold w-9 h-9 rounded-md transition-colors cursor-pointer ${
                jours.includes(j)
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-secondary"
              }`}
            >
              {JOURS_LABELS[j]}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-2">
        <button type="submit" disabled={pending}
          className="px-4 h-9 bg-primary text-primary-foreground text-sm font-semibold rounded-md hover:bg-primary/90 disabled:opacity-50 transition-colors cursor-pointer">
          {pending ? "Enregistrement…" : initial ? "Enregistrer" : "Créer"}
        </button>
        <button type="button" onClick={onDone}
          className="px-4 h-9 border border-border text-sm text-muted-foreground rounded-md hover:bg-secondary transition-colors cursor-pointer">
          Annuler
        </button>
      </div>
    </form>
  );
}

// ── Formulaire override individuel ────────────────────────────
function JourForm({
  initial,
  onDone,
}: {
  initial?: JourIndiv;
  onDone: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [ferme, setFerme] = useState(initial?.ferme ?? false);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    fd.set("ferme", String(ferme));
    startTransition(async () => {
      const res = await upsertJourIndiv(fd);
      if (res?.error) setError(res.error);
      else onDone();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="card-premium p-5 space-y-4 border-primary/30">
      <p className="text-sm font-semibold text-foreground">
        {initial ? "Modifier l'override" : "Override d'un jour précis"}
      </p>

      {error && <p className="text-xs text-destructive">{error}</p>}

      <div className="space-y-1">
        <label className="text-xs text-muted-foreground">Date *</label>
        <input name="date" type="date" required
          defaultValue={initial?.date}
          readOnly={!!initial}
          className={`w-full h-9 px-3 rounded-md border border-border bg-input text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary ${initial ? "opacity-60" : ""}`} />
      </div>

      <label className="flex items-center gap-3 cursor-pointer">
        <button type="button" onClick={() => setFerme((v) => !v)}
          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors cursor-pointer ${
            ferme ? "bg-destructive" : "bg-border"
          }`}>
          <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
            ferme ? "translate-x-4" : "translate-x-1"
          }`} />
        </button>
        <span className="text-sm text-foreground">Jour fermé (annule les plages récurrentes)</span>
      </label>

      {!ferme && (
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Heure début</label>
            <input name="heure_debut" type="time"
              defaultValue={initial?.heure_debut?.slice(0, 5) ?? "08:00"}
              className="w-full h-9 px-3 rounded-md border border-border bg-input text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Heure fin</label>
            <input name="heure_fin" type="time"
              defaultValue={initial?.heure_fin?.slice(0, 5) ?? "18:00"}
              className="w-full h-9 px-3 rounded-md border border-border bg-input text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
          </div>
        </div>
      )}

      <div className="flex gap-2">
        <button type="submit" disabled={pending}
          className="px-4 h-9 bg-primary text-primary-foreground text-sm font-semibold rounded-md hover:bg-primary/90 disabled:opacity-50 transition-colors cursor-pointer">
          {pending ? "Enregistrement…" : "Enregistrer"}
        </button>
        <button type="button" onClick={onDone}
          className="px-4 h-9 border border-border text-sm text-muted-foreground rounded-md hover:bg-secondary transition-colors cursor-pointer">
          Annuler
        </button>
      </div>
    </form>
  );
}

// ── Main client ───────────────────────────────────────────────
export function DispoClient({ plages, joursIndiv }: Props) {
  const [showPlageForm, setShowPlageForm] = useState(false);
  const [editingPlage, setEditingPlage] = useState<Plage | null>(null);
  const [showJourForm, setShowJourForm] = useState(false);
  const [editingJour, setEditingJour] = useState<JourIndiv | null>(null);
  const [pending, startTransition] = useTransition();

  function handleToggle(id: string, current: boolean) {
    startTransition(async () => { await togglePlageActif(id, !current); });
  }

  function handleDeletePlage(id: string) {
    if (!confirm("Supprimer cette plage ?")) return;
    startTransition(async () => { await deletePlage(id); });
  }

  function handleDeleteJour(id: string) {
    if (!confirm("Supprimer cet override ?")) return;
    startTransition(async () => { await deleteJourIndiv(id); });
  }

  function openEditPlage(p: Plage) {
    setShowPlageForm(false);
    setEditingPlage(p);
  }

  function openEditJour(j: JourIndiv) {
    setShowJourForm(false);
    setEditingJour(j);
  }

  return (
    <div className="space-y-10">

      {/* ── Plages récurrentes ── */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-foreground">Plages récurrentes</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Définissez vos créneaux d&apos;ouverture sur une période donnée selon les jours de la semaine.
            </p>
          </div>
          {!showPlageForm && !editingPlage && (
            <button onClick={() => setShowPlageForm(true)}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-md bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors cursor-pointer">
              <Plus size={15} /> Ajouter
            </button>
          )}
        </div>

        {showPlageForm && (
          <PlageForm onDone={() => setShowPlageForm(false)} />
        )}

        {editingPlage && (
          <PlageForm initial={editingPlage} onDone={() => setEditingPlage(null)} />
        )}

        {plages.length === 0 && !showPlageForm && !editingPlage ? (
          <div className="card-premium p-8 text-center">
            <p className="text-sm text-muted-foreground">Aucune plage configurée : le calendrier sera vide.</p>
          </div>
        ) : plages.length > 0 && (
          <div className="card-premium overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Période</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden sm:table-cell">Horaires</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden md:table-cell">Jours</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody>
                {plages.map((p) => (
                  <tr key={p.id} className={`border-b border-border last:border-0 transition-colors ${editingPlage?.id === p.id ? "bg-primary/5" : "hover:bg-secondary/30"}`}>
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-foreground">
                        {formatDate(p.date_debut)} → {formatDate(p.date_fin)}
                      </p>
                      <span className={`text-xs font-medium ${p.actif ? "text-green-500" : "text-muted-foreground"}`}>
                        {p.actif ? "Actif" : "Inactif"}
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <div className="flex items-center gap-1 text-sm text-foreground">
                        <Clock size={12} className="text-muted-foreground" />
                        {p.heure_debut.slice(0,5)} – {p.heure_fin.slice(0,5)}
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <JoursChips jours={p.jours} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openEditPlage(p)}
                          disabled={pending}
                          title="Modifier"
                          className="p-1.5 rounded hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground cursor-pointer"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => handleToggle(p.id, p.actif)}
                          disabled={pending}
                          title={p.actif ? "Désactiver" : "Activer"}
                          className="p-1.5 rounded hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground cursor-pointer"
                        >
                          <Power size={14} className={p.actif ? "text-green-500" : ""} />
                        </button>
                        <button
                          onClick={() => handleDeletePlage(p.id)}
                          disabled={pending}
                          title="Supprimer"
                          className="p-1.5 rounded hover:bg-secondary transition-colors text-muted-foreground hover:text-destructive cursor-pointer"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ── Overrides individuels ── */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-foreground">Overrides par date</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Fermez un jour ou définissez des horaires spéciaux pour une date précise (prioritaire sur les plages).
            </p>
          </div>
          {!showJourForm && !editingJour && (
            <button onClick={() => setShowJourForm(true)}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-md bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors cursor-pointer">
              <Plus size={15} /> Ajouter
            </button>
          )}
        </div>

        {showJourForm && (
          <JourForm onDone={() => setShowJourForm(false)} />
        )}

        {editingJour && (
          <JourForm initial={editingJour} onDone={() => setEditingJour(null)} />
        )}

        {joursIndiv.length === 0 && !showJourForm && !editingJour ? (
          <div className="card-premium p-8 text-center">
            <p className="text-sm text-muted-foreground">Aucun override configuré.</p>
          </div>
        ) : joursIndiv.length > 0 && (
          <div className="card-premium overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Date</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Type</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody>
                {joursIndiv.map((j) => (
                  <tr key={j.id} className={`border-b border-border last:border-0 transition-colors ${editingJour?.id === j.id ? "bg-primary/5" : "hover:bg-secondary/30"}`}>
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-foreground capitalize">
                        {new Date(j.date + "T12:00:00Z").toLocaleDateString("fr-BE", {
                          weekday: "long", day: "numeric", month: "long", year: "numeric",
                        })}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      {j.ferme ? (
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-destructive bg-destructive/10 px-2 py-1 rounded">
                          <CalendarOff size={11} /> Fermé
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-primary bg-primary/10 px-2 py-1 rounded">
                          <Clock size={11} />
                          {j.heure_debut?.slice(0,5)} – {j.heure_fin?.slice(0,5)}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openEditJour(j)}
                          disabled={pending}
                          title="Modifier"
                          className="p-1.5 rounded hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground cursor-pointer"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => handleDeleteJour(j.id)}
                          disabled={pending}
                          title="Supprimer"
                          className="p-1.5 rounded hover:bg-secondary transition-colors text-muted-foreground hover:text-destructive cursor-pointer"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

    </div>
  );
}
