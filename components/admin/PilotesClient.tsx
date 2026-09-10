"use client";

import { useState, useTransition } from "react";
import { createPilote, togglePiloteActif, updatePilote, deletePilote } from "@/lib/actions/pilotes";
import { AdminRowActions } from "@/components/admin/ui/AdminRowActions";
import { EmptyState } from "@/components/admin/ui";
import { ConfirmActionDialog, type PendingAction } from "@/components/admin/reservation-drawer/ConfirmActionDialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserPlus, Loader2, Check, Plane } from "lucide-react";
import type { Pilote } from "@/types/database";

// ── Formulaire d'invitation ─────────────────────────────────────────────

function InviteForm({ onDone }: { onDone: () => void }) {
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    const fd = new FormData(e.currentTarget);

    startTransition(async () => {
      const result = await createPilote({
        nom: fd.get("nom") as string,
        email: fd.get("email") as string,
        telephone: (fd.get("telephone") as string) || undefined,
        iban: (fd.get("iban") as string) || undefined,
      });
      if (result?.error) setError(result.error);
      else if (result?.promoted) {
        (document.getElementById("invite-form") as HTMLFormElement | null)?.reset();
        setNotice("Ce compte existait déjà : il a été promu en pilote, sans email d'invitation. La personne se connecte avec son mot de passe habituel.");
      } else {
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
      {notice && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm rounded-md px-4 py-3">
          {notice}
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

function PiloteRow({ pilote, onConfirm }: { pilote: Pilote; onConfirm: (a: PendingAction) => void }) {
  const [editing, setEditing] = useState(false);
  const [isActive, setIsActive] = useState(pilote.statut === "actif");
  const [cascadeMsg, setCascadeMsg] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function runToggle(next: boolean) {
    startTransition(async () => {
      const result = await togglePiloteActif(pilote.id, next);
      if (result.error) return;
      setIsActive(next);
      const parts: string[] = [];
      if (result.releasedFlights) parts.push(`${result.releasedFlights} vol${result.releasedFlights > 1 ? "s" : ""} à réassigner`);
      if (result.unpublishedAnnonces) parts.push(`${result.unpublishedAnnonces} annonce${result.unpublishedAnnonces > 1 ? "s" : ""} retirée${result.unpublishedAnnonces > 1 ? "s" : ""}`);
      if (result.cancelledAnnonceResas) parts.push(`${result.cancelledAnnonceResas} vol${result.cancelledAnnonceResas > 1 ? "s" : ""} d'annonce annulé${result.cancelledAnnonceResas > 1 ? "s" : ""} (client prévenu)`);
      if (result.paidOrphans) parts.push(`⚠ ${result.paidOrphans} vol${result.paidOrphans > 1 ? "s" : ""} déjà réglé${result.paidOrphans > 1 ? "s" : ""} à traiter à la main`);
      setCascadeMsg(parts.length ? `Pilote désactivé · ${parts.join(", ")}.` : null);
    });
  }

  function handleToggle() {
    if (isActive) {
      // Désactivation : cascade (vols futurs désassignés, annonces retirées) → confirmation.
      onConfirm({
        title: `Désactiver ${pilote.nom} ?`,
        description: "Ses vols standard assignés repasseront en demandes à réassigner ; ses annonces et leurs demandes non réglées seront annulées (clients prévenus) ; les vols déjà réglés vous seront signalés. Réversible en le réactivant.",
        confirmLabel: "Désactiver",
        danger: true,
        run: () => runToggle(false),
      });
      return;
    }
    runToggle(true);
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
      {cascadeMsg && (
        <tr className="border-b border-border">
          <td colSpan={5} className="px-4 py-2 bg-amber-50 text-xs text-amber-800">
            {cascadeMsg}
          </td>
        </tr>
      )}
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
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);

  return (
    <div className="space-y-4">
      <ConfirmActionDialog
        action={pendingAction}
        isPending={false}
        onCancel={() => setPendingAction(null)}
        onConfirm={() => {
          pendingAction?.run();
          setPendingAction(null);
        }}
      />
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
                {pilotes.map((p) => <PiloteRow key={p.id} pilote={p} onConfirm={setPendingAction} />)}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
