"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Mail, Pencil, Phone } from "lucide-react";
import { deleteClient } from "@/lib/actions/delete";
import {
  Badge, Button, Card, EmptyState, LinkButton, PageHeader, SectionHeader, SheetRow, SheetRows,
  type BadgeTone,
} from "@/components/pilote/studio";
import { ConfirmActionDialog, type PendingAction } from "@/components/admin/reservation-drawer/ConfirmActionDialog";
import { ClientAvatar, ClientEditForm, ClientEmailForm, ClientThread, SignalText } from "@/components/admin/clients/ClientParts";
import { VolLine } from "@/components/admin/ClientsClient";
import { fmtDateLongue, fmtEuro, summarizeClient, type AdminClient } from "@/lib/admin-clients";

// Fiche client complète (01/10, maquette validée) : le prochain vol d'abord, puis
// l'historique des vols et les messages ; coordonnées et chiffres à droite.
// Le tiroir de la liste donne le coup d'œil, la fiche garde tout.

const ROLE: Record<string, { label: string; tone: BadgeTone }> = {
  customer: { label: "Client", tone: "neutral" },
  pilote: { label: "Pilote", tone: "gold" },
  admin: { label: "Admin", tone: "ink" },
};

export function ClientFiche({ client: initial, today, satisfaction }: {
  client: AdminClient;
  today: string;
  satisfaction: number | null;
}) {
  const router = useRouter();
  const [client, setClient] = useState(initial);
  const [editing, setEditing] = useState(false);
  const [writing, setWriting] = useState(false);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const s = summarizeClient(client, today);
  const role = ROLE[client.role] ?? ROLE.customer;
  const vols = [...client.reservations].sort((a, b) => b.date_vol.localeCompare(a.date_vol));

  function askDelete() {
    const n = client.reservations.length;
    setPendingAction({
      title: `Supprimer ${client.prenom} ${client.nom} ?`,
      consequences: [
        `Ses ${n} réservation${n > 1 ? "s" : ""} et leurs messages sont supprimés aussi.`,
        "Cette action est définitive.",
      ],
      confirmLabel: "Supprimer le client",
      danger: true,
      run: () => {
        startTransition(async () => {
          const r = await deleteClient(client.id);
          if (r?.error) { setError(r.error); setPendingAction(null); return; }
          router.push("/admin/clients");
        });
      },
    });
  }

  return (
    <>
      <PageHeader
        back={{ href: "/admin/clients", label: "Clients" }}
        title={
          <span className="flex items-center gap-3">
            <ClientAvatar prenom={client.prenom} nom={client.nom} size="lg" />
            <span className="min-w-0">
              <span className="flex items-center gap-2">
                <span className="truncate">{client.prenom} {client.nom}</span>
                {client.role !== "customer" && <Badge tone={role.tone}>{role.label}</Badge>}
              </span>
              <span className="block text-[12.5px] font-normal tracking-normal text-st-muted">
                {client.id} · client depuis le {fmtDateLongue(client.created_at)}
              </span>
            </span>
          </span>
        }
        actions={
          <>
            <Button variant="secondary" onClick={() => setEditing(true)}><Pencil /> Modifier</Button>
            {client.email && <Button onClick={() => setWriting(true)}><Mail /> Écrire</Button>}
          </>
        }
      />

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-4">
          <Card className="space-y-3 p-5">
            <SectionHeader title="Prochain vol" />
            {s.prochain ? (
              <>
                <div className="rounded-2xl bg-st-surface p-3"><VolLine r={s.prochain} today={today} /></div>
                {s.signal && <SignalText signal={s.signal} />}
              </>
            ) : (
              <p className="text-sm text-st-muted">Aucun vol prévu.</p>
            )}
          </Card>

          <Card className="p-5">
            <SectionHeader title="Historique des vols" action={<span className="text-xs text-st-muted">{vols.length} vol{vols.length > 1 ? "s" : ""}</span>} />
            {vols.length === 0 ? (
              <EmptyState title="Aucun vol" description="Les demandes de ce client apparaîtront ici." />
            ) : (
              <div className="mt-2 divide-y divide-st-line-soft">
                {vols.map((r) => <div key={r.id} className="py-3 last:pb-0"><VolLine r={r} today={today} /></div>)}
              </div>
            )}
          </Card>

          <Card className="p-5">
            <SectionHeader title="Messages" />
            <div className="mt-3"><ClientThread messages={client.messages} reservations={client.reservations} /></div>
          </Card>
        </div>

        <div className="min-w-0 space-y-4">
          <Card className="space-y-3 p-5">
            <SectionHeader title="Coordonnées" />
            {editing ? (
              <ClientEditForm
                clientId={client.id}
                prenom={client.prenom}
                nom={client.nom}
                telephone={client.telephone}
                onCancel={() => setEditing(false)}
                onSaved={(f) => { setClient((c) => ({ ...c, ...f })); setEditing(false); router.refresh(); }}
              />
            ) : (
              <SheetRows>
                <SheetRow label="Email">{client.email || "—"}</SheetRow>
                <SheetRow label="Téléphone">{client.telephone || "—"}</SheetRow>
                <SheetRow label="Compte"><Badge tone={role.tone}>{role.label}</Badge></SheetRow>
              </SheetRows>
            )}
            {client.telephone && (
              <LinkButton variant="secondary" size="sm" href={`tel:${client.telephone.replace(/\s/g, "")}`} className="sm:hidden">
                <Phone /> Appeler
              </LinkButton>
            )}
          </Card>

          <Card className="space-y-3 p-5">
            <SectionHeader title="En chiffres" />
            <SheetRows>
              <SheetRow label="Vols effectués">{s.effectues}</SheetRow>
              <SheetRow label="Total payé">{fmtEuro(s.paye)}</SheetRow>
              <SheetRow label="Pilote habituel">{s.piloteHabituel ?? "—"}</SheetRow>
              <SheetRow label="Satisfaction">{satisfaction != null ? `${Math.round(satisfaction * 10) / 10} / 5` : "—"}</SheetRow>
            </SheetRows>
          </Card>

          {error && <p className="text-center text-xs font-semibold text-st-bad">{error}</p>}
          <button
            type="button"
            onClick={askDelete}
            className="mx-auto block cursor-pointer text-[12.5px] font-semibold text-st-bad hover:underline"
          >
            Supprimer ce client
          </button>
        </div>
      </div>

      {writing && client.email && (
        <EmailDialog client={client} onClose={() => setWriting(false)} />
      )}

      <ConfirmActionDialog
        action={pendingAction}
        isPending={isPending}
        onCancel={() => setPendingAction(null)}
        onConfirm={() => pendingAction?.run()}
      />
    </>
  );
}

// Composition d'email en fenêtre : on reste sur la fiche.
function EmailDialog({ client, onClose }: { client: AdminClient; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[200] flex items-end justify-center bg-st-ink/30 backdrop-blur-[1.5px] sm:items-center sm:p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        className="max-h-[92dvh] w-full max-w-[520px] space-y-4 overflow-y-auto rounded-t-[26px] bg-white p-5 shadow-st-panel sm:rounded-[22px]"
      >
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold">Écrire à {client.prenom}</h2>
          <Button variant="ghost" size="sm" onClick={onClose}>Fermer</Button>
        </div>
        <ClientEmailForm clientId={client.id} prenom={client.prenom} nom={client.nom} email={client.email} onSent={() => setTimeout(onClose, 1200)} />
      </div>
    </div>
  );
}
