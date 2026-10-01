"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { Info, MessageSquare, Plane, Users, Phone } from "lucide-react";
import { deleteClient } from "@/lib/actions/delete";
import {
  Badge, Button, EmptyState, LinkButton, PillTabs, Segmented, Select, Sheet, SheetBody, SheetFooter,
  SheetHeader, SheetRow, SheetRows, StatCard, StatGrid, Table, TableCell, TableHeaderCell,
  TableRow, TableSearch, type BadgeTone, DateTile, SectionHeader,
} from "@/components/pilote/studio";
import { ResaBadge } from "@/components/pilote/ResaBadge";
import { ConfirmActionDialog, type PendingAction } from "@/components/admin/reservation-drawer/ConfirmActionDialog";
import {
  ClientAvatar, ClientEditForm, ClientEmailForm, ClientThread, SignalText, typeLabel,
} from "@/components/admin/clients/ClientParts";
import {
  fmtDateLongue, fmtEuro, fmtJour, routeCities, summarizeClient,
  type AdminClient, type ClientResa, type ClientSummary,
} from "@/lib/admin-clients";
import { cn } from "@/lib/utils";

// Page Clients de l'admin (01/10, maquette validée) : surveiller (qui attend quoi,
// qui est fidèle), coup d'œil dans le tiroir, historique complet dans la fiche.
// Mêmes composants Studio que Réservations.

type Filtre = "tous" | "suivre" | "avenir" | "fideles";
type Vue = "clients" | "equipe";
type Tri = "activite" | "nom" | "vols" | "inscription";
type DrawerTab = "apercu" | "vols" | "messages";

const ROLE_TONE: Record<string, { label: string; tone: BadgeTone }> = {
  admin: { label: "Admin", tone: "ink" },
  pilote: { label: "Pilote", tone: "gold" },
};

type Row = { client: AdminClient; s: ClientSummary };

export function ClientsClient({ clients: initial, today }: { clients: AdminClient[]; today: string }) {
  const [clients, setClients] = useState<AdminClient[]>(initial);
  const [openId, setOpenId] = useState<string | null>(null);
  const [drawerTab, setDrawerTab] = useState<DrawerTab>("apercu");
  const [vue, setVue] = useState<Vue>("clients");
  const [filtre, setFiltre] = useState<Filtre>("tous");
  const [tri, setTri] = useState<Tri>("activite");
  const [query, setQuery] = useState("");

  const rows: Row[] = useMemo(
    () => clients.map((client) => ({ client, s: summarizeClient(client, today) })),
    [clients, today],
  );

  const equipe = rows.filter((r) => r.client.role !== "customer");
  const publics = rows.filter((r) => r.client.role === "customer");
  const base = vue === "clients" ? publics : equipe;

  const aSuivre = publics.filter((r) => r.s.signal).length;
  const avenir = publics.filter((r) => r.s.prochain).length;
  const avenir7 = publics.filter((r) => r.s.prochain && r.s.prochain.date_vol <= addDays(today, 7)).length;
  const fideles = publics.filter((r) => r.s.effectues >= 2 || r.s.vols >= 2).length;
  const monthStart = today.slice(0, 7);
  const nouveaux = publics.filter((r) => r.client.created_at.slice(0, 7) === monthStart).length;

  const needle = query.trim().toLowerCase();
  const filtered = base
    .filter((r) => {
      if (vue === "clients") {
        if (filtre === "suivre" && !r.s.signal) return false;
        if (filtre === "avenir" && !r.s.prochain) return false;
        if (filtre === "fideles" && !(r.s.effectues >= 2 || r.s.vols >= 2)) return false;
      }
      if (!needle) return true;
      const c = r.client;
      return `${c.prenom} ${c.nom} ${c.email ?? ""} ${c.telephone ?? ""} ${c.id}`.toLowerCase().includes(needle);
    })
    .sort((a, b) => {
      if (tri === "nom") return `${a.client.nom} ${a.client.prenom}`.localeCompare(`${b.client.nom} ${b.client.prenom}`);
      if (tri === "vols") return b.s.vols - a.s.vols;
      if (tri === "inscription") return b.client.created_at.localeCompare(a.client.created_at);
      return b.s.activite.localeCompare(a.s.activite);
    });

  const open = rows.find((r) => r.client.id === openId) ?? null;

  function patchClient(id: string, fields: Partial<AdminClient>) {
    setClients((prev) => prev.map((c) => (c.id === id ? { ...c, ...fields } : c)));
  }
  function removeClient(id: string) {
    setClients((prev) => prev.filter((c) => c.id !== id));
    setOpenId(null);
  }
  function toggle(f: Filtre) {
    setFiltre((cur) => (cur === f ? "tous" : f));
  }
  function openDrawer(id: string, tab: DrawerTab = "apercu") {
    setDrawerTab(tab);
    setOpenId(id);
  }

  // Chiffres posés sur le fond, sans boîte : le filtre actif est souligné.
  const stat = (f: Filtre, props: Parameters<typeof StatCard>[0]) => (
    <button
      type="button"
      onClick={() => toggle(f)}
      aria-pressed={filtre === f}
      className={cn(
        "cursor-pointer border-b-2 pb-3 text-left outline-none transition-colors focus-visible:ring-4 focus-visible:ring-st-ink-soft",
        filtre === f ? "border-st-ink" : "border-st-line hover:border-st-line-strong",
      )}
    >
      <StatCard {...props} className={cn(props.className, "rounded-none border-0 bg-transparent p-0 shadow-none sm:p-0")} />
    </button>
  );

  if (clients.length === 0) {
    return (
      <EmptyState
        icon={Users}
        title="Aucun client pour l'instant"
        description="Les clients apparaissent ici dès leur première demande de vol."
      />
    );
  }

  return (
    <div className="space-y-5">
      {vue === "clients" && (
        <StatGrid>
          {stat("tous", {
            label: "Clients",
            value: publics.length,
            hint: nouveaux > 0 ? `+${nouveaux} ce mois-ci` : "aucun nouveau ce mois-ci",
          })}
          {stat("suivre", {
            label: "À suivre",
            value: aSuivre,
            tone: aSuivre > 0 ? "warn" : undefined,
            hint: "demande ou paiement en attente",
          })}
          {stat("avenir", {
            label: "Vol à venir",
            value: avenir,
            hint: `${avenir7} dans les 7 jours`,
          })}
          {stat("fideles", { label: "Fidèles", value: fideles, hint: "2 vols ou plus" })}
        </StatGrid>
      )}

      <Table
        className="rounded-none border-0 bg-transparent p-0 shadow-none"
        toolbar={
          <>
            <Segmented
              value={vue}
              onChange={(v) => { setVue(v); setFiltre("tous"); }}
              items={[
                { key: "clients", label: "Clients", count: publics.length },
                { key: "equipe", label: "Pilotes & admin", count: equipe.length },
              ]}
            />
            <div className="flex min-w-0 flex-wrap items-center gap-2 max-sm:w-full">
              <Select aria-label="Tri" className="h-[34px] min-h-0 w-auto rounded-[10px] py-0 pl-2.5 pr-8 text-[16px] sm:text-[12.5px] max-sm:flex-1" value={tri} onChange={(e) => setTri(e.target.value as Tri)}>
                <option value="activite">Dernière activité</option>
                <option value="nom">Nom</option>
                <option value="vols">Plus de vols</option>
                <option value="inscription">Inscription</option>
              </Select>
              <TableSearch value={query} onChange={setQuery} placeholder="Nom, email, téléphone…" className="max-sm:w-full" />
            </div>
          </>
        }
      >
        <thead>
          <tr>
            <TableHeaderCell>Client</TableHeaderCell>
            <TableHeaderCell>Contact</TableHeaderCell>
            <TableHeaderCell align="right">Vols</TableHeaderCell>
            <TableHeaderCell>Prochain vol</TableHeaderCell>
            <TableHeaderCell align="right">Payé</TableHeaderCell>
            <TableHeaderCell>Signal</TableHeaderCell>
          </tr>
        </thead>
        <tbody>
          {filtered.length === 0 ? (
            <tr>
              <td colSpan={6} className="py-10 text-center text-sm text-st-muted">
                {filtre !== "tous" || needle ? "Aucun client ne correspond." : "Aucun client."}
              </td>
            </tr>
          ) : (
            filtered.map(({ client: c, s }) => {
              const role = ROLE_TONE[c.role];
              return (
                <TableRow key={c.id} onClick={() => openDrawer(c.id)} selected={openId === c.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <ClientAvatar prenom={c.prenom} nom={c.nom} />
                      <div className="min-w-0">
                        <p className="flex items-center gap-2 font-[550]">
                          <span className="truncate">{c.prenom} {c.nom}</span>
                          {role && <Badge size="sm" tone={role.tone}>{role.label}</Badge>}
                        </p>
                        <p className="text-xs text-st-muted">{c.id}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <p className="max-w-[220px] truncate max-sm:max-w-none">{c.email || "—"}</p>
                    <p className="text-xs text-st-muted">{c.telephone || "pas de téléphone"}</p>
                  </TableCell>
                  <TableCell align="right">{s.vols}</TableCell>
                  <TableCell>
                    {s.prochain ? (
                      <>
                        <p className="font-[550]">{s.prochain.date_vol === today ? "Aujourd'hui" : fmtJour(s.prochain.date_vol)}</p>
                        <p className="max-w-[200px] truncate text-xs text-st-muted max-sm:max-w-none">
                          {[s.prochain.pilotes?.nom, s.prochain.heure_vol ? s.prochain.heure_vol.slice(0, 5) : "heure à fixer"].filter(Boolean).join(" · ")}
                        </p>
                      </>
                    ) : (
                      <span className="text-st-muted">Aucun</span>
                    )}
                  </TableCell>
                  <TableCell align="right">{s.paye > 0 ? fmtEuro(s.paye) : <span className="text-st-muted">0 €</span>}</TableCell>
                  <TableCell>
                    <SignalText signal={s.signal} />
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </tbody>
      </Table>

      <Sheet value={open} onClose={() => setOpenId(null)}>
        {(row) => (
          <ClientSheetContent
            key={row.client.id}
            row={row}
            today={today}
            startTab={drawerTab}
            onClose={() => setOpenId(null)}
            onPatch={(f) => patchClient(row.client.id, f)}
            onDeleted={() => removeClient(row.client.id)}
          />
        )}
      </Sheet>
    </div>
  );
}

function addDays(iso: string, n: number) {
  const d = new Date(iso + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

// ── Contenu du tiroir ─────────────────────────────────────────
function ClientSheetContent({ row, today, startTab, onClose, onPatch, onDeleted }: {
  row: Row;
  today: string;
  startTab: DrawerTab;
  onClose: () => void;
  onPatch: (f: Partial<AdminClient>) => void;
  onDeleted: () => void;
}) {
  const { client: c, s } = row;
  const [tab, setTab] = useState<DrawerTab>(startTab);
  const [editing, setEditing] = useState(false);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [isPending, startTransition] = useTransition();
  const [deleteError, setDeleteError] = useState("");

  function askDelete() {
    setPendingAction({
      title: `Supprimer ${c.prenom} ${c.nom} ?`,
      consequences: [
        `Ses ${c.reservations.length} réservation${c.reservations.length > 1 ? "s" : ""} et leurs messages sont supprimés aussi.`,
        "Cette action est définitive.",
      ],
      confirmLabel: "Supprimer le client",
      danger: true,
      run: () => {
        startTransition(async () => {
          const r = await deleteClient(c.id);
          if (r?.error) { setDeleteError(r.error); setPendingAction(null); return; }
          setPendingAction(null);
          onDeleted();
        });
      },
    });
  }

  const vols = [...c.reservations].sort((a, b) => b.date_vol.localeCompare(a.date_vol));

  return (
    <>
      <SheetHeader
        leading={<ClientAvatar prenom={c.prenom} nom={c.nom} size="lg" />}
        title={`${c.prenom} ${c.nom}`}
        subtitle={`${c.id} · client depuis le ${fmtDateLongue(c.created_at)}`}
        onClose={onClose}
      />
      <div className="px-[22px] pb-3">
        <PillTabs
          value={tab}
          onChange={setTab}
          items={[
            { key: "apercu", label: "Aperçu", icon: Info },
            { key: "vols", label: "Vols", icon: Plane },
            { key: "messages", label: "Messages", icon: MessageSquare },
          ]}
        />
      </div>

      <SheetBody>
        {tab === "apercu" && (
          <>
            <div className="grid grid-cols-3 gap-3 rounded-2xl bg-st-surface p-4">
              <Key label="Vols" value={String(s.vols)} />
              <Key label="Payé" value={fmtEuro(s.paye)} />
              <Key label="Dernier vol" value={s.dernier ? new Date(s.dernier.date_vol + "T12:00:00Z").toLocaleDateString("fr-BE", { day: "numeric", month: "short", timeZone: "Europe/Brussels" }) : "—"} />
            </div>

            <section className="space-y-2">
              <SectionHeader title="Prochain vol" />
              {s.prochain ? (
                <>
                  <VolLine r={s.prochain} today={today} />
                  {s.signal && <SignalText signal={s.signal} />}
                </>
              ) : (
                <p className="text-sm text-st-muted">Aucun vol prévu.</p>
              )}
            </section>

            <section className="space-y-2">
              <SectionHeader
                title="Coordonnées"
                action={!editing && <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>Modifier</Button>}
              />
              {editing ? (
                <ClientEditForm
                  clientId={c.id}
                  prenom={c.prenom}
                  nom={c.nom}
                  telephone={c.telephone}
                  onCancel={() => setEditing(false)}
                  onSaved={(f) => { onPatch(f); setEditing(false); }}
                />
              ) : (
                <SheetRows>
                  <SheetRow label="Email">{c.email || "—"}</SheetRow>
                  <SheetRow label="Téléphone">{c.telephone || "—"}</SheetRow>
                  {s.piloteHabituel && <SheetRow label="Pilote habituel">{s.piloteHabituel}</SheetRow>}
                </SheetRows>
              )}
            </section>
          </>
        )}

        {tab === "vols" && (
          vols.length === 0 ? (
            <p className="py-6 text-center text-sm text-st-muted">Aucune réservation.</p>
          ) : (
            <div className="divide-y divide-st-line-soft">
              {vols.map((r) => <div key={r.id} className="py-3 first:pt-0"><VolLine r={r} today={today} /></div>)}
            </div>
          )
        )}

        {tab === "messages" && (
          <>
            <ClientThread messages={c.messages} reservations={c.reservations} />
            <section className="space-y-2 border-t border-st-line-soft pt-4">
              <SectionHeader title="Écrire un email" />
              {c.email ? (
                <ClientEmailForm clientId={c.id} prenom={c.prenom} nom={c.nom} email={c.email} />
              ) : (
                <p className="text-sm text-st-muted">Ce client n&apos;a pas d&apos;email renseigné.</p>
              )}
            </section>
          </>
        )}

        {deleteError && <p className="text-xs font-semibold text-st-bad">{deleteError}</p>}
      </SheetBody>

      <SheetFooter>
        <div className="space-y-3">
          <div className="flex gap-2">
            <Button className="flex-1" onClick={() => setTab("messages")}>Écrire à {c.prenom}</Button>
            {c.telephone && (
              <a
                href={`tel:${c.telephone.replace(/\s/g, "")}`}
                className="inline-flex h-[38px] items-center justify-center gap-[7px] rounded-[11px] border border-st-line bg-white px-4 text-[13px] font-[550] text-st-text shadow-st-sm transition-all hover:border-st-line-strong hover:bg-st-surface sm:hidden"
              >
                <Phone className="size-4" /> Appeler
              </a>
            )}
            <LinkButton variant="secondary" href={`/admin/clients/${c.id}`}>
              Fiche complète
            </LinkButton>
          </div>
          <button
            type="button"
            onClick={askDelete}
            className="mx-auto block cursor-pointer text-[12.5px] font-semibold text-st-bad hover:underline"
          >
            Supprimer ce client
          </button>
        </div>
      </SheetFooter>

      <ConfirmActionDialog
        action={pendingAction}
        isPending={isPending}
        onCancel={() => setPendingAction(null)}
        onConfirm={() => pendingAction?.run()}
      />
    </>
  );
}

function Key({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] font-semibold uppercase tracking-[0.04em] text-st-muted">{label}</p>
      <p className="st-num truncate text-[15px] font-semibold text-st-text">{value}</p>
    </div>
  );
}

// Une ligne de vol : tuile de date, route, détails, statut. Ouvre la réservation.
export function VolLine({ r, today }: { r: ClientResa; today: string }) {
  const cities = routeCities(r);
  const detail = [
    r.pilotes?.nom,
    r.heure_vol ? r.heure_vol.slice(0, 5) : "heure à fixer",
    `${r.duree} min`,
    r.passagers ? `${r.passagers} pax` : null,
  ].filter(Boolean).join(" · ");
  return (
    <Link href={`/admin/vols?ouvrir=${r.id}`} className="flex items-center gap-3 rounded-xl outline-none transition-colors hover:bg-st-surface/70 focus-visible:bg-st-surface/70">
      <DateTile date={r.date_vol} today={r.date_vol === today} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-[550]">{cities ?? typeLabel(r)}</p>
        <p className="truncate text-xs text-st-muted">{detail}</p>
      </div>
      <ResaBadge reservation={r} />
    </Link>
  );
}
