"use client";

import { useState, useTransition } from "react";
import { FileCheck, Mail, Plane, TriangleAlert, UserPlus } from "lucide-react";
import { createPilote, togglePiloteActif, updatePilote, deletePilote, resendPiloteInvitation } from "@/lib/actions/pilotes";
import { piloteLegalStatus } from "@/lib/pilote/legal";
import { qualifLabel } from "@/lib/pilote/qualifications";
import { ConfirmActionDialog, type PendingAction } from "@/components/admin/reservation-drawer/ConfirmActionDialog";
import {
  Badge, Button, EmptyState, FormField, Input, LinkButton, PageHeader, Segmented, Sheet, SheetBody, SheetFooter,
  SheetHeader, SheetRow, SheetRows, Table, TableCell, TableHeaderCell, TableRow,
  TableSearch,
} from "@/components/pilote/studio";
import { cn } from "@/lib/utils";
import type { Pilote } from "@/types/database";
import { emptyReliabilityStats, type PiloteReliabilityStats } from "@/lib/pilote-stats";

// Page /admin/pilotes en style Studio (27/09) : chiffres clés, tableau filtrable,
// un tiroir par pilote (Documents · Fiche · Fiabilité). Les documents à vérifier
// ouvrent directement l'onglet Documents.

type Filter = "tous" | "a_verifier" | "pas_en_regle" | "inactifs";
type Tab = "documents" | "fiche" | "fiabilite";
type Notice = { tone: "ok" | "warn" | "bad"; text: string } | null;

const CLASSE: Record<string, string> = { classe1: "Classe 1", classe2: "Classe 2", lapl: "LAPL" };
const fr = (iso: string | null | undefined) => (iso ? iso.slice(0, 10).split("-").reverse().join("/") : null);
const initials = (nom: string) => nom.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();

function Avatar({ pilote, size = 34 }: { pilote: Pilote; size?: number }) {
  return pilote.photo_url ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={pilote.photo_url} alt="" style={{ width: size, height: size }} className="shrink-0 rounded-full border border-st-line object-cover" />
  ) : (
    <span style={{ width: size, height: size }} className="grid shrink-0 place-items-center rounded-full bg-st-ink text-[12px] font-semibold text-white">
      {initials(pilote.nom)}
    </span>
  );
}

function DocsBadge({ status }: { status: Pilote["docs_status"] }) {
  if (status === "verifies") return <Badge tone="success">Vérifiés</Badge>;
  if (status === "envoyes") return <Badge tone="warning" dot>À vérifier</Badge>;
  if (status === "refuses") return <Badge tone="danger">Refusés</Badge>;
  return <Badge>Aucun</Badge>;
}

function NoticeBar({ notice, onClose }: { notice: NonNullable<Notice>; onClose: () => void }) {
  const cls = notice.tone === "ok" ? "bg-st-ok-soft text-st-ok" : notice.tone === "warn" ? "bg-st-warn-soft text-st-warn" : "bg-st-bad-soft text-st-bad";
  return (
    <div className={cn("flex items-start justify-between gap-3 rounded-[14px] px-4 py-3 text-[13px]", cls)}>
      <p>{notice.text}</p>
      <button type="button" onClick={onClose} className="shrink-0 cursor-pointer text-[12px] font-semibold opacity-70 hover:opacity-100">Fermer</button>
    </div>
  );
}

// ── Page ────────────────────────────────────────────────────────

export function PilotesClient({ pilotes, reliability }: {
  pilotes: Pilote[];
  reliability: Record<string, PiloteReliabilityStats>;
}) {
  const [filter, setFilter] = useState<Filter>("tous");
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState<{ id: string; tab: Tab } | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [notice, setNotice] = useState<Notice>(null);

  const statsOf = (id: string) => reliability[id] ?? emptyReliabilityStats();
  const legalOf = (p: Pilote) => piloteLegalStatus(p);

  const actifs = pilotes.filter((p) => p.statut === "actif");
  const aVerifier = pilotes.filter((p) => p.docs_status === "envoyes");
  const pasEnRegle = actifs.filter((p) => !legalOf(p).ok);

  const q = search.trim().toLowerCase();
  const rows = pilotes
    .filter((p) =>
      filter === "a_verifier" ? p.docs_status === "envoyes"
      : filter === "pas_en_regle" ? p.statut === "actif" && !legalOf(p).ok
      : filter === "inactifs" ? p.statut !== "actif"
      : true)
    .filter((p) => !q || p.nom.toLowerCase().includes(q) || p.email.toLowerCase().includes(q));

  const selected = open ? pilotes.find((p) => p.id === open.id) ?? null : null;
  const openPilote = (p: Pilote) => setOpen({ id: p.id, tab: p.docs_status === "envoyes" ? "documents" : "fiche" });

  return (
    <div className="pilote-studio space-y-5">
      <PageHeader
        title="Pilotes"
        actions={<Button onClick={() => setInviteOpen(true)}><UserPlus /> Inviter un pilote</Button>}
      />

      {notice && <NoticeBar notice={notice} onClose={() => setNotice(null)} />}

      {pilotes.length === 0 ? (
        <EmptyState icon={Plane} title="Aucun pilote pour l'instant" description="Invitez un premier pilote pour lui ouvrir son espace." />
      ) : (
        <Table
          toolbar={
            <>
              <Segmented
                value={filter}
                onChange={setFilter}
                items={[
                  { key: "tous", label: "Tous", count: pilotes.length },
                  { key: "a_verifier", label: "À vérifier", count: aVerifier.length },
                  { key: "pas_en_regle", label: "Pas en règle", count: pasEnRegle.length },
                  { key: "inactifs", label: "Inactifs", count: pilotes.length - actifs.length },
                ]}
              />
              <TableSearch value={search} onChange={setSearch} placeholder="Nom ou email" />
            </>
          }
        >
          <thead>
            <tr>
              <TableHeaderCell>Pilote</TableHeaderCell>
              <TableHeaderCell>Documents</TableHeaderCell>
              <TableHeaderCell>Statut</TableHeaderCell>
              <TableHeaderCell align="right">Vols effectués</TableHeaderCell>
              <TableHeaderCell>Compte</TableHeaderCell>
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => {
              const legal = legalOf(p);
              const errors = legal.issues.filter((i) => i.severity === "error");
              const st = statsOf(p.id);
              return (
                <TableRow key={p.id} onClick={() => openPilote(p)} selected={open?.id === p.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar pilote={p} />
                      <div className="min-w-0">
                        <p className="flex items-center gap-1.5 truncate font-medium text-st-text">
                          {p.nom}
                          {st.isAtRisk && <TriangleAlert size={13} className="shrink-0 text-st-bad" aria-label="À surveiller" />}
                        </p>
                        <p className="truncate text-[12px] text-st-muted">{p.email}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell><DocsBadge status={p.docs_status} /></TableCell>
                  <TableCell>
                    {legal.ok
                      ? <Badge tone="success" dot>En règle</Badge>
                      : <span title={errors.map((e) => e.label).join("\n")}><Badge tone="danger" dot>{errors.length} point{errors.length > 1 ? "s" : ""} à régler</Badge></span>}
                  </TableCell>
                  <TableCell align="right">{st.volsEffectues}</TableCell>
                  <TableCell>{p.statut === "actif" ? <Badge tone="ink">Actif</Badge> : <Badge>Inactif</Badge>}</TableCell>
                </TableRow>
              );
            })}
            {rows.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-[13px] text-st-muted">Aucun pilote ne correspond.</td></tr>
            )}
          </tbody>
        </Table>
      )}

      <Sheet value={selected} onClose={() => setOpen(null)}>
        {(p) => (
          <PiloteSheet
            key={p.id}
            pilote={p}
            stats={statsOf(p.id)}
            tab={open?.tab ?? "fiche"}
            onTab={(tab) => setOpen((o) => (o ? { ...o, tab } : o))}
            onClose={() => setOpen(null)}
            onConfirm={setPendingAction}
            onNotice={setNotice}
          />
        )}
      </Sheet>

      <Sheet value={inviteOpen ? true : null} onClose={() => setInviteOpen(false)}>
        {() => <InviteSheet onClose={() => setInviteOpen(false)} onNotice={setNotice} />}
      </Sheet>

      <ConfirmActionDialog
        action={pendingAction}
        isPending={false}
        onCancel={() => setPendingAction(null)}
        onConfirm={() => {
          pendingAction?.run();
          setPendingAction(null);
        }}
      />
    </div>
  );
}

// ── Tiroir d'un pilote ──────────────────────────────────────────

function PiloteSheet({ pilote, stats, tab, onTab, onClose, onConfirm, onNotice }: {
  pilote: Pilote;
  stats: PiloteReliabilityStats;
  tab: Tab;
  onTab: (t: Tab) => void;
  onClose: () => void;
  onConfirm: (a: PendingAction) => void;
  onNotice: (n: Notice) => void;
}) {
  return (
    <>
      <SheetHeader title={pilote.nom} subtitle={pilote.email} leading={<Avatar pilote={pilote} size={40} />} onClose={onClose} />
      <div className="px-[22px] pb-3">
        <Segmented
          fill
          value={tab}
          onChange={onTab}
          items={[
            { key: "documents", label: pilote.docs_status === "envoyes" ? "Documents •" : "Documents" },
            { key: "fiche", label: "Fiche" },
            { key: "fiabilite", label: "Fiabilité" },
          ]}
        />
      </div>
      {tab === "documents" && <DocumentsTab pilote={pilote} />}
      {tab === "fiche" && <FicheTab pilote={pilote} onClose={onClose} onConfirm={onConfirm} onNotice={onNotice} />}
      {tab === "fiabilite" && <FiabiliteTab stats={stats} />}
    </>
  );
}

// Résumé ; la vérification elle-même se fait pas à pas sur une page dédiée
// (/admin/pilotes/[id]/verification), document à gauche, points à droite.
function DocumentsTab({ pilote }: { pilote: Pilote }) {
  const legal = piloteLegalStatus(pilote);
  const missing = (v: string | null | undefined) => v ?? <span className="text-st-bad">Non renseigné</span>;
  const href = `/admin/pilotes/${pilote.id}/verification`;

  return (
    <>
      <SheetBody>
        <SheetRows>
          <SheetRow label="Documents"><DocsBadge status={pilote.docs_status} /></SheetRow>
          <SheetRow label="Licence">{missing(pilote.licence_numero)}</SheetRow>
          <SheetRow label="SEP valable jusqu'au">{missing(fr(pilote.licence_expiration))}</SheetRow>
          <SheetRow label="Médical">
            {missing(pilote.medical_classe ? CLASSE[pilote.medical_classe] : null)}
            {pilote.medical_expiration && <span className="text-st-muted"> · jusqu&apos;au {fr(pilote.medical_expiration)}</span>}
          </SheetRow>
          <SheetRow label="Qualifications">
            {Array.isArray(pilote.qualifications) && pilote.qualifications.length
              ? pilote.qualifications.map((q) => `${qualifLabel(q)}${q.expire ? ` (${fr(q.expire)})` : ""}`).join(", ")
              : <span className="text-st-muted">Aucune</span>}
          </SheetRow>
        </SheetRows>

        {pilote.docs_status === "verifies" && (
          <p className="rounded-[12px] bg-st-ok-soft px-3.5 py-2.5 text-[13px] text-st-ok">
            Vérifiés le {fr(pilote.docs_verified_at)}{pilote.docs_note ? ` · ${pilote.docs_note}` : ""}
          </p>
        )}
        {!legal.ok && (
          <ul className="space-y-1 rounded-[12px] bg-st-bad-soft px-3.5 py-2.5 text-[12.5px] text-st-bad">
            {legal.issues.filter((i) => i.severity === "error").map((i) => <li key={i.code}>{i.label}</li>)}
          </ul>
        )}
        <p className="text-[12.5px] text-st-muted">
          La vérification se fait point par point, le document sous les yeux. Vous pouvez corriger la classe et les dates lues sur le document.
        </p>
      </SheetBody>
      <SheetFooter>
        <LinkButton href={href} size="lg" fullWidth className="sm:h-[38px] sm:text-[13px]">
          <FileCheck /> {pilote.docs_status === "verifies" ? "Revérifier" : "Vérifier étape par étape"}
        </LinkButton>
      </SheetFooter>
    </>
  );
}

function FicheTab({ pilote, onClose, onConfirm, onNotice }: {
  pilote: Pilote;
  onClose: () => void;
  onConfirm: (a: PendingAction) => void;
  onNotice: (n: Notice) => void;
}) {
  const [form, setForm] = useState({ nom: pilote.nom, telephone: pilote.telephone ?? "", iban: pilote.iban ?? "" });
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const actif = pilote.statut === "actif";

  function save(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const r = await updatePilote(pilote.id, { nom: form.nom, telephone: form.telephone || undefined, iban: form.iban || undefined });
      if (r.error) setError(r.error);
      else onNotice({ tone: "ok", text: `Fiche de ${form.nom} enregistrée.` });
    });
  }

  function resend() {
    startTransition(async () => {
      const r = await resendPiloteInvitation(pilote.id);
      onNotice(r.error ? { tone: "bad", text: `Lien non envoyé : ${r.error}.` } : { tone: "ok", text: `Lien d'accès envoyé à ${r.email}.` });
    });
  }

  function toggle(next: boolean) {
    startTransition(async () => {
      const r = await togglePiloteActif(pilote.id, next);
      if (r.error) { setError(r.error); return; }
      const parts: string[] = [];
      if (r.releasedFlights) parts.push(`${r.releasedFlights} vol${r.releasedFlights > 1 ? "s" : ""} à réassigner`);
      if (r.unpublishedAnnonces) parts.push(`${r.unpublishedAnnonces} annonce${r.unpublishedAnnonces > 1 ? "s" : ""} retirée${r.unpublishedAnnonces > 1 ? "s" : ""}`);
      if (r.cancelledAnnonceResas) parts.push(`${r.cancelledAnnonceResas} vol${r.cancelledAnnonceResas > 1 ? "s" : ""} d'annonce annulé${r.cancelledAnnonceResas > 1 ? "s" : ""} (clients prévenus)`);
      if (r.paidOrphans) parts.push(`${r.paidOrphans} vol${r.paidOrphans > 1 ? "s" : ""} déjà réglé${r.paidOrphans > 1 ? "s" : ""} à traiter à la main`);
      onNotice({
        tone: r.paidOrphans ? "warn" : "ok",
        text: next ? `${pilote.nom} réactivé.` : `${pilote.nom} désactivé${parts.length ? ` · ${parts.join(", ")}` : ""}.`,
      });
      onClose();
    });
  }

  function askToggle() {
    if (!actif) { toggle(true); return; }
    onConfirm({
      title: `Désactiver ${pilote.nom} ?`,
      consequences: [
        "Ses vols standard attribués repassent en demandes à réassigner.",
        "Ses annonces et leurs demandes non réglées sont annulées, clients prévenus.",
        "Les vols déjà réglés vous sont signalés.",
      ],
      warning: "Réversible en le réactivant.",
      confirmLabel: "Désactiver",
      danger: true,
      run: () => toggle(false),
    });
  }

  function remove() {
    if (!confirmDelete) { setConfirmDelete(true); return; }
    startTransition(async () => {
      const r = await deletePilote(pilote.id);
      if (r.error) { setError(r.error); return; }
      onNotice({ tone: "ok", text: `${pilote.nom} supprimé.` });
      onClose();
    });
  }

  return (
    <form onSubmit={save} className="flex min-h-0 flex-1 flex-col">
      <SheetBody>
        <FormField id="pf-nom" label="Nom">
          <Input id="pf-nom" required value={form.nom} onChange={(e) => setForm((f) => ({ ...f, nom: e.target.value }))} />
        </FormField>
        <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2">
          <FormField id="pf-tel" label="Téléphone">
            <Input id="pf-tel" type="tel" value={form.telephone} onChange={(e) => setForm((f) => ({ ...f, telephone: e.target.value }))} />
          </FormField>
          <FormField id="pf-iban" label="IBAN">
            <Input id="pf-iban" value={form.iban} onChange={(e) => setForm((f) => ({ ...f, iban: e.target.value }))} />
          </FormField>
        </div>

        <div className="space-y-2 pt-1">
          <p className="text-[13px] font-medium text-st-text">Compte</p>
          <div className="divide-y divide-st-line overflow-hidden rounded-[14px] border border-st-line">
            <button type="button" disabled={pending} onClick={resend} className="flex w-full cursor-pointer items-center gap-3 px-3.5 py-3 text-left transition-colors hover:bg-st-surface disabled:opacity-50">
              <Mail size={17} className="shrink-0 text-st-muted" />
              <span className="min-w-0 flex-1">
                <span className="block text-[13.5px] font-medium text-st-text">Renvoyer l&apos;accès</span>
                <span className="block text-[12px] text-st-muted">Email pour choisir ou rechoisir son mot de passe</span>
              </span>
            </button>
            <button type="button" disabled={pending} onClick={askToggle} className="flex w-full cursor-pointer items-center gap-3 px-3.5 py-3 text-left transition-colors hover:bg-st-surface disabled:opacity-50">
              <Plane size={17} className="shrink-0 text-st-muted" />
              <span className="min-w-0 flex-1">
                <span className="block text-[13.5px] font-medium text-st-text">{actif ? "Désactiver le pilote" : "Réactiver le pilote"}</span>
                <span className="block text-[12px] text-st-muted">{actif ? "Retire l'accès à l'espace pilote et libère ses vols" : "Lui rend l'accès à l'espace pilote"}</span>
              </span>
              {actif ? <Badge tone="ink">Actif</Badge> : <Badge>Inactif</Badge>}
            </button>
          </div>
        </div>

        {error && <p className="rounded-[12px] bg-st-bad-soft px-3.5 py-2.5 text-[13px] text-st-bad">{error}</p>}
      </SheetBody>
      <SheetFooter>
        <div className="space-y-3">
          <Button type="submit" size="lg" className="sm:h-[38px] sm:text-[13px]" fullWidth loading={pending}>Enregistrer</Button>
          <button
            type="button"
            disabled={pending}
            onClick={remove}
            className="mx-auto block cursor-pointer text-[12.5px] font-semibold text-st-bad hover:underline disabled:opacity-50"
          >
            {confirmDelete ? "Confirmer la suppression" : "Supprimer ce pilote"}
          </button>
        </div>
      </SheetFooter>
    </form>
  );
}

function FiabiliteTab({ stats }: { stats: PiloteReliabilityStats }) {
  const pct = (r: number | null) => (r != null ? ` (${Math.round(r * 100)} %)` : "");
  const items: { label: string; value: string; hint?: string; warn?: boolean }[] = [
    { label: "Vols effectués", value: String(stats.volsEffectues) },
    {
      label: "Vols rendus ou retirés",
      value: `${stats.volsRendus}${pct(stats.tauxVolsRendus)}`,
      warn: stats.volsRendusProchesDuVol > 0,
      hint: stats.volsRendusProchesDuVol > 0 ? `dont ${stats.volsRendusProchesDuVol} à moins de 3 j du vol` : undefined,
    },
    {
      label: "Demandes d'annonce annulées",
      value: `${stats.demandesAnnonceAnnulees}${pct(stats.tauxAnnonceAnnulees)}`,
      warn: stats.demandesAnnonceAnnuleesProchesDuVol > 0,
      hint: stats.demandesAnnonceAnnuleesProchesDuVol > 0 ? `dont ${stats.demandesAnnonceAnnuleesProchesDuVol} à moins de 3 j du vol` : undefined,
    },
    { label: "Créneaux renégociés", value: String(stats.creneauxRenegocies) },
    { label: "Annonces publiées", value: String(stats.annoncesPubliees), hint: stats.annoncesPubliees > 0 ? `${stats.vuesAnnonces} vue${stats.vuesAnnonces > 1 ? "s" : ""}` : undefined },
    {
      label: "Messages clients en attente",
      value: `${stats.messagesEnAttente}${pct(stats.tauxMessagesEnAttente)}`,
      warn: stats.messagesEnAttente > 0,
      hint: stats.plusVieuxMessageEnAttenteJours != null ? `le plus ancien depuis ${Math.floor(stats.plusVieuxMessageEnAttenteJours)} j` : undefined,
    },
  ];

  return (
    <SheetBody>
      {stats.isAtRisk && (
        <div className="rounded-[12px] bg-st-bad-soft px-3.5 py-2.5 text-[13px] text-st-bad">
          <p className="flex items-center gap-1.5 font-semibold"><TriangleAlert size={14} /> Pilote à surveiller</p>
          <ul className="mt-1 list-inside list-disc space-y-0.5 text-[12.5px]">
            {stats.alertes.map((a) => <li key={a}>{a}</li>)}
          </ul>
        </div>
      )}
      <SheetRows>
        {items.map((it) => (
          <SheetRow key={it.label} label={it.label} className={it.warn ? "font-semibold text-st-warn" : "st-num"}>
            {it.value}
            {it.hint && <span className="block text-[12px] font-normal text-st-muted">{it.hint}</span>}
          </SheetRow>
        ))}
      </SheetRows>
    </SheetBody>
  );
}

// ── Tiroir d'invitation ─────────────────────────────────────────

function InviteSheet({ onClose, onNotice }: { onClose: () => void; onNotice: (n: Notice) => void }) {
  const [form, setForm] = useState({ nom: "", email: "", telephone: "", iban: "" });
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const r = await createPilote({ nom: form.nom, email: form.email, telephone: form.telephone || undefined, iban: form.iban || undefined });
      if (r?.error) { setError(r.error); return; }
      onNotice(
        r?.mailFailed ? { tone: "bad", text: `${form.nom} créé, mais l'email n'est pas parti : ouvrez sa fiche et « Renvoyer l'accès ».` }
        : r?.promoted ? { tone: "ok", text: `${form.email} avait déjà un compte client : il est passé pilote et a reçu un email pour se connecter.` }
        : { tone: "ok", text: `Invitation envoyée à ${form.email}.` },
      );
      onClose();
    });
  }

  return (
    <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
      <SheetHeader title="Inviter un pilote" subtitle="Il reçoit un email pour choisir son mot de passe" onClose={onClose} />
      <SheetBody>
        <FormField id="inv-nom" label="Nom complet">
          <Input id="inv-nom" required value={form.nom} onChange={set("nom")} placeholder="Jean Dupont" autoFocus />
        </FormField>
        <FormField id="inv-email" label="Email">
          <Input id="inv-email" type="email" required value={form.email} onChange={set("email")} placeholder="jean@exemple.com" />
        </FormField>
        <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2">
          <FormField id="inv-tel" label="Téléphone">
            <Input id="inv-tel" type="tel" value={form.telephone} onChange={set("telephone")} placeholder="+32 4xx xx xx xx" />
          </FormField>
          <FormField id="inv-iban" label="IBAN">
            <Input id="inv-iban" value={form.iban} onChange={set("iban")} placeholder="BE.. .... .... ...." />
          </FormField>
        </div>
        {error && <p className="rounded-[12px] bg-st-bad-soft px-3.5 py-2.5 text-[13px] text-st-bad">{error}</p>}
      </SheetBody>
      <SheetFooter>
        <Button type="submit" size="lg" className="sm:h-[38px] sm:text-[13px]" fullWidth loading={pending}>
          <UserPlus /> Envoyer l&apos;invitation
        </Button>
      </SheetFooter>
    </form>
  );
}
