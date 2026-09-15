"use client";

import { useState, useTransition } from "react";
import { createPilote, togglePiloteActif, updatePilote, deletePilote } from "@/lib/actions/pilotes";
import { AdminRowActions } from "@/components/admin/ui/AdminRowActions";
import { EmptyState } from "@/components/admin/ui";
import { ConfirmActionDialog, type PendingAction } from "@/components/admin/reservation-drawer/ConfirmActionDialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserPlus, Loader2, Check, Plane, Gauge, TriangleAlert } from "lucide-react";
import type { Pilote } from "@/types/database";
import { emptyReliabilityStats, type PiloteReliabilityStats } from "@/lib/pilote-stats";

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

// ── Panneau de fiabilité ─────────────────────────────────────────────────

function pct(rate: number | null): string | undefined {
  return rate != null ? `${Math.round(rate * 100)}%` : undefined;
}

function ReliabilityPanel({ stats }: { stats: PiloteReliabilityStats }) {
  const items: { label: string; value: number; pctBadge?: string; warn?: boolean; sub?: string }[] = [
    { label: "Vols effectués", value: stats.volsEffectues },
    {
      label: "Vols rendus / retirés",
      value: stats.volsRendus,
      pctBadge: pct(stats.tauxVolsRendus),
      warn: stats.volsRendusProchesDuVol > 0,
      sub: stats.volsRendusProchesDuVol > 0
        ? `dont ${stats.volsRendusProchesDuVol} à moins de 3 j du vol`
        : stats.tauxVolsRendus != null ? "des vols attribués" : undefined,
    },
    {
      label: "Demandes d'annonce annulées",
      value: stats.demandesAnnonceAnnulees,
      pctBadge: pct(stats.tauxAnnonceAnnulees),
      warn: stats.demandesAnnonceAnnuleesProchesDuVol > 0,
      sub: stats.demandesAnnonceAnnuleesProchesDuVol > 0
        ? `dont ${stats.demandesAnnonceAnnuleesProchesDuVol} à moins de 3 j du vol`
        : stats.tauxAnnonceAnnulees != null ? "des demandes reçues" : undefined,
    },
    { label: "Créneaux renégociés", value: stats.creneauxRenegocies },
    {
      label: "Annonces publiées",
      value: stats.annoncesPubliees,
      sub: stats.annoncesPubliees > 0 ? `${stats.vuesAnnonces} vue${stats.vuesAnnonces > 1 ? "s" : ""} cumulées` : undefined,
    },
    {
      label: "Messages clients en attente",
      value: stats.messagesEnAttente,
      pctBadge: pct(stats.tauxMessagesEnAttente),
      warn: stats.messagesEnAttente > 0,
      sub: stats.plusVieuxMessageEnAttenteJours != null
        ? `le plus ancien depuis ${Math.floor(stats.plusVieuxMessageEnAttenteJours)} j`
        : stats.tauxMessagesEnAttente != null ? "des vols en cours" : undefined,
    },
  ];

  return (
    <td colSpan={5} className="px-4 py-4 bg-secondary/20">
      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[1.5px] mb-2.5">
        Fiabilité
      </p>

      {stats.isAtRisk && (
        <div className="mb-3 rounded-lg border border-red-300 bg-red-50 px-3 py-2.5">
          <p className="flex items-center gap-1.5 text-xs font-bold text-red-700">
            <TriangleAlert size={13} /> Pilote à surveiller
          </p>
          <ul className="mt-1 space-y-0.5 text-xs text-red-700 list-disc list-inside">
            {stats.alertes.map((a) => <li key={a}>{a}</li>)}
          </ul>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
        {items.map((it) => (
          <div
            key={it.label}
            className={`rounded-lg border p-3 ${it.warn ? "border-amber-300 bg-amber-50" : "border-border bg-card"}`}
          >
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">{it.label}</p>
            <div className="flex items-baseline gap-1.5">
              <p className={`text-xl font-bold ${it.warn ? "text-amber-700" : "text-foreground"}`}>{it.value}</p>
              {it.pctBadge && (
                <span className={`text-xs font-semibold ${it.warn ? "text-amber-700" : "text-muted-foreground"}`}>
                  ({it.pctBadge})
                </span>
              )}
            </div>
            {it.sub && <p className="text-[11px] text-muted-foreground mt-0.5">{it.sub}</p>}
          </div>
        ))}
      </div>
    </td>
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

function PiloteRow({
  pilote,
  stats,
  onConfirm,
}: {
  pilote: Pilote;
  stats: PiloteReliabilityStats;
  onConfirm: (a: PendingAction) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [showStats, setShowStats] = useState(false);
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
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-semibold text-foreground">{pilote.nom}</span>
            {stats.isAtRisk && (
              <span
                title={stats.alertes.join(" · ")}
                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-red-50 text-red-700 text-[10px] font-bold cursor-help"
              >
                <TriangleAlert size={10} /> À surveiller
              </span>
            )}
          </div>
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
              extra={[{
                icon: Gauge,
                label: "Fiabilité",
                onClick: () => setShowStats(v => !v),
                title: "Vols rendus, annonces annulées, messages en attente…",
              }]}
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
      {showStats && (
        <tr className="border-b border-border">
          <ReliabilityPanel stats={stats} />
        </tr>
      )}
    </>
  );
}

// ── Composant principal ─────────────────────────────────────────────────

export function PilotesClient({
  pilotes,
  reliability,
}: {
  pilotes: Pilote[];
  reliability: Record<string, PiloteReliabilityStats>;
}) {
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
                {pilotes.map((p) => (
                  <PiloteRow
                    key={p.id}
                    pilote={p}
                    stats={reliability[p.id] ?? emptyReliabilityStats()}
                    onConfirm={setPendingAction}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
