"use client";

import { useState, useTransition } from "react";
import { createPilote, togglePiloteActif, updatePilote, deletePilote } from "@/lib/actions/pilotes";
import { AdminRowActions } from "@/components/admin/ui/AdminRowActions";
import { EmptyState } from "@/components/admin/ui";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserPlus, Loader2, Check, Plane } from "lucide-react";
import type { Pilote } from "@/types/database";

// ── Formulaire d'invitation ─────────────────────────────────────────────

function InviteForm({ onDone }: { onDone: () => void }) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);

    startTransition(async () => {
      const result = await createPilote({
        nom: fd.get("nom") as string,
        email: fd.get("email") as string,
        telephone: (fd.get("telephone") as string) || undefined,
        iban: (fd.get("iban") as string) || undefined,
      });
      if (result?.error) setError(result.error);
      else {
        (document.getElementById("invite-form") as HTMLFormElement | null)?.reset();
        onDone();
      }
    });
  }

  return (
    <form id="invite-form" onSubmit={handleSubmit} className="bg-card rounded-xl border border-border p-5 space-y-4">
      {error && (
        <div className="bg-destructive/10 border border-destructive/30 text-destructive text-sm rounded-md px-4 py-3">
          {error}
        </div>
      )}
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label className="text-sm text-muted-foreground">Nom complet *</Label>
          <Input name="nom" required placeholder="Jean Dupont" className="bg-input border-border" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-sm text-muted-foreground">Email *</Label>
          <Input name="email" type="email" required placeholder="jean@exemple.com" className="bg-input border-border" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-sm text-muted-foreground">Téléphone</Label>
          <Input name="telephone" placeholder="+32 4xx xx xx xx" className="bg-input border-border" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-sm text-muted-foreground">IBAN</Label>
          <Input name="iban" placeholder="BE xx xxxx xxxx xxxx" className="bg-input border-border" />
        </div>
      </div>
      <button
        type="submit"
        disabled={isPending}
        className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-[#e6a800] transition-colors disabled:opacity-60 cursor-pointer"
      >
        {isPending ? <Loader2 size={14} className="animate-spin" /> : <UserPlus size={14} />}
        {isPending ? "Envoi de l'invitation..." : "Envoyer l'invitation"}
      </button>
    </form>
  );
}

// ── Ligne éditable ────────────────────────────────────────────────────────

function EditPiloteForm({ pilote, onClose }: { pilote: Pilote; onClose: () => void }) {
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const r = await updatePilote(pilote.id, {
        nom: fd.get("nom") as string,
        telephone: (fd.get("telephone") as string) || undefined,
        iban: (fd.get("iban") as string) || undefined,
      });
      if (r.error) { setError(r.error); return; }
      onClose();
    });
  }

  return (
    <td colSpan={5} className="px-4 py-3 bg-secondary/20">
      <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3">
        {error && <p className="w-full text-xs text-destructive">{error}</p>}
        <div>
          <label className="block text-xs text-muted-foreground mb-1">Nom</label>
          <input name="nom" required defaultValue={pilote.nom}
            className="h-8 px-2 w-40 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
        </div>
        <div>
          <label className="block text-xs text-muted-foreground mb-1">Téléphone</label>
          <input name="telephone" defaultValue={pilote.telephone ?? ""}
            className="h-8 px-2 w-36 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
        </div>
        <div>
          <label className="block text-xs text-muted-foreground mb-1">IBAN</label>
          <input name="iban" defaultValue={pilote.iban ?? ""}
            className="h-8 px-2 w-52 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
        </div>
        <div className="flex gap-2">
          <button type="submit" disabled={isPending}
            className="flex items-center gap-1.5 px-3 h-8 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 disabled:opacity-50 transition-colors cursor-pointer">
            {isPending ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />} Sauvegarder
          </button>
          <button type="button" onClick={onClose}
            className="px-3 h-8 rounded-lg border border-border text-xs text-muted-foreground hover:bg-secondary transition-colors cursor-pointer">
            Annuler
          </button>
        </div>
      </form>
    </td>
  );
}

function PiloteRow({ pilote }: { pilote: Pilote }) {
  const [editing, setEditing] = useState(false);
  const [isActive, setIsActive] = useState(pilote.statut === "actif");
  const [isPending, startTransition] = useTransition();

  function handleToggle() {
    startTransition(async () => {
      const result = await togglePiloteActif(pilote.id, !isActive);
      if (!result.error) setIsActive(!isActive);
    });
  }

  return (
    <>
      <tr className="border-b border-border last:border-0 hover:bg-secondary/20 transition-colors">
        <td className="px-4 py-3">
          <span className="text-sm font-semibold text-foreground">{pilote.nom}</span>
          <div className="text-xs text-muted-foreground">{pilote.email}</div>
        </td>
        <td className="px-4 py-3 hidden sm:table-cell">
          <span className="text-sm text-muted-foreground">{pilote.telephone ?? "—"}</span>
        </td>
        <td className="px-4 py-3 hidden md:table-cell">
          <span className="text-sm text-muted-foreground font-mono">{pilote.iban ?? "—"}</span>
        </td>
        <td className="px-4 py-3 text-center">
          <button
            onClick={handleToggle}
            disabled={isPending}
            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none cursor-pointer ${
              isActive ? "bg-primary" : "bg-border"
            } ${isPending ? "opacity-50" : ""}`}
          >
            <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
              isActive ? "translate-x-4" : "translate-x-1"
            }`} />
          </button>
        </td>
        <td className="px-4 py-3">
          <div className="flex justify-end">
            <AdminRowActions
              onEdit={() => setEditing(e => !e)}
              onDelete={() => deletePilote(pilote.id)}
            />
          </div>
        </td>
      </tr>
      {editing && (
        <tr className="border-b border-border">
          <EditPiloteForm pilote={pilote} onClose={() => setEditing(false)} />
        </tr>
      )}
    </>
  );
}

// ── Composant principal ─────────────────────────────────────────────────

export function PilotesClient({ pilotes }: { pilotes: Pilote[] }) {
  const [showInvite, setShowInvite] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          onClick={() => setShowInvite(v => !v)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-[#e6a800] transition-colors cursor-pointer"
        >
          <UserPlus size={14} />
          {showInvite ? "Fermer" : "Inviter un pilote"}
        </button>
      </div>

      {showInvite && <InviteForm onDone={() => setShowInvite(false)} />}

      {pilotes.length === 0 ? (
        <EmptyState
          icon={Plane}
          title="Aucun pilote pour l'instant"
          description="Invitez un premier pilote pour lui donner accès à son espace."
        />
      ) : (
        <div className="card-premium overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Pilote</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden sm:table-cell">Téléphone</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden md:table-cell">IBAN</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Actif</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pilotes.map((p) => <PiloteRow key={p.id} pilote={p} />)}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
