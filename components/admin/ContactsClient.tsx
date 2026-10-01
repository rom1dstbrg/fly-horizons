"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { MessageSquare, Send } from "lucide-react";
import {
  updateContactStatut, replyContact, deleteContact, getContactMessages,
} from "@/lib/actions/contacts";
import {
  Badge, Button, EmptyState, FormField, LinkButton, Segmented, Sheet, SheetBody, SheetFooter,
  SheetHeader, Table, TableCell, TableHeaderCell, TableRow, TableSearch, Textarea, SectionHeader,
  type BadgeTone,
} from "@/components/pilote/studio";
import { ConfirmActionDialog, type PendingAction } from "@/components/admin/reservation-drawer/ConfirmActionDialog";
import { cn } from "@/lib/utils";
import { uuid } from "@/lib/uuid";

// Page Contacts de l'admin (01/10, maquette validée) : les messages du formulaire
// public, un tableau, et un tiroir avec la conversation et la réponse par email.
// Mêmes composants Studio que Clients et Réservations.

type Vue = "traiter" | "repondus" | "archives" | "tous";

const VUES: Record<Vue, (c: Contact) => boolean> = {
  traiter: (c) => c.statut === "nouveau" || c.statut === "lu",
  repondus: (c) => c.statut === "repondu",
  archives: (c) => c.statut === "archive",
  tous: () => true,
};

const STATUT: Record<string, { label: string; tone: BadgeTone }> = {
  nouveau: { label: "Nouveau", tone: "gold" },
  lu: { label: "Lu", tone: "neutral" },
  repondu: { label: "Répondu", tone: "success" },
  archive: { label: "Archivé", tone: "neutral" },
};

interface Contact {
  id: string;
  nom: string;
  email: string;
  sujet: string;
  message: string;
  statut: string;
  reponse: string | null;
  created_at: string;
}

interface ContactMessage {
  id: string;
  author: "client" | "admin";
  content: string;
  created_at: string;
}

const TZ = "Europe/Brussels";
const jourKey = (iso: string) => new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(new Date(iso));

function fmtRecu(iso: string) {
  const d = new Date(iso);
  const jour = jourKey(iso) === jourKey(new Date().toISOString())
    ? "Aujourd'hui"
    : d.toLocaleDateString("fr-BE", { day: "numeric", month: "short", timeZone: TZ });
  const heure = d.toLocaleTimeString("fr-BE", { hour: "2-digit", minute: "2-digit", timeZone: TZ });
  return { jour, heure };
}

const fmtLong = (iso: string) =>
  new Date(iso).toLocaleString("fr-BE", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: TZ });

function initiales(nom: string) {
  const parts = nom.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "?") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
}

function Avatar({ nom, size = "md" }: { nom: string; size?: "md" | "lg" }) {
  return (
    <span
      className={cn(
        "grid shrink-0 place-items-center rounded-full bg-st-ink-soft font-bold text-st-ink",
        size === "lg" ? "h-[52px] w-[52px] text-[17px]" : "h-9 w-9 text-[12.5px]",
      )}
    >
      {initiales(nom)}
    </span>
  );
}

// ── Contenu du tiroir ─────────────────────────────────────────
function ContactSheetContent({ contact: c, clientId, onClose, onStatus, onDeleted }: {
  contact: Contact;
  clientId: string | null;
  onClose: () => void;
  onStatus: (id: string, statut: string) => void;
  onDeleted: (id: string) => void;
}) {
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [reponse, setReponse] = useState("");
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    let cancelled = false;
    getContactMessages(c.id).then((r) => {
      if (cancelled) return;
      setMessages(r.messages as ContactMessage[]);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [c.id]);

  function changeStatut(statut: string) {
    startTransition(async () => {
      await updateContactStatut(c.id, statut);
      onStatus(c.id, statut);
    });
  }

  function send() {
    if (!reponse.trim()) return;
    startTransition(async () => {
      const r = await replyContact(c.id, reponse, c.email, c.nom, c.sujet);
      if (r?.error) { setFeedback({ ok: false, text: r.error }); return; }
      setMessages((prev) => [...prev, { id: uuid(), author: "admin", content: reponse, created_at: new Date().toISOString() }]);
      setReponse("");
      setFeedback({ ok: true, text: "Réponse envoyée" });
      onStatus(c.id, "repondu");
    });
  }

  function askDelete() {
    setPendingAction({
      title: `Supprimer le message de ${c.nom} ?`,
      consequences: ["La conversation est supprimée, le client ne pourra plus ouvrir son lien de suivi.", "Cette action est définitive."],
      confirmLabel: "Supprimer le message",
      danger: true,
      run: () => {
        startTransition(async () => {
          const r = await deleteContact(c.id);
          setPendingAction(null);
          if (r?.error) { setFeedback({ ok: false, text: r.error }); return; }
          onDeleted(c.id);
        });
      },
    });
  }

  const statut = STATUT[c.statut] ?? { label: c.statut, tone: "neutral" as BadgeTone };
  const prenom = c.nom.split(" ")[0];

  return (
    <>
      <SheetHeader
        leading={<Avatar nom={c.nom} size="lg" />}
        title={c.nom}
        subtitle={`${c.email} · ${fmtLong(c.created_at)}`}
        onClose={onClose}
      />
      <div className="px-[22px] pb-3">
        <Badge tone={statut.tone} dot={c.statut === "nouveau"}>{statut.label}</Badge>
      </div>

      <SheetBody>
        <section className="space-y-1">
          <SectionHeader title="Sujet" />
          <p className="text-[15px] font-semibold">{c.sujet}</p>
        </section>

        <section className="space-y-2">
          <SectionHeader title="Conversation" />
          {loading ? (
            <p className="py-4 text-sm text-st-muted">Chargement…</p>
          ) : messages.length === 0 ? (
            <p className="py-4 text-sm text-st-muted">Aucun message.</p>
          ) : (
            <div className="space-y-2.5">
              {messages.map((m) => {
                const moi = m.author === "admin";
                return (
                  <div key={m.id} className={cn("flex flex-col", moi ? "items-end" : "items-start")}>
                    <div className={cn("max-w-[88%] whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-[13px]", moi ? "bg-st-ink text-white" : "bg-st-surface text-st-text")}>
                      {m.content}
                    </div>
                    <span className="mt-0.5 px-1 text-[11px] text-st-muted">
                      {moi ? "Vous" : prenom}
                      {" · "}
                      {new Date(m.created_at).toLocaleString("fr-BE", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: TZ })}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="space-y-2 border-t border-st-line-soft pt-4">
          <SectionHeader title={`Répondre à ${prenom}`} />
          <FormField id="ct-reponse" label="Message">
            <Textarea
              id="ct-reponse"
              rows={6}
              value={reponse}
              onChange={(e) => setReponse(e.target.value)}
              placeholder="Votre réponse…"
            />
          </FormField>
          {feedback && <p className={cn("text-xs font-semibold", feedback.ok ? "text-st-ok" : "text-st-bad")}>{feedback.text}</p>}
        </section>

        {clientId && (
          <LinkButton variant="ghost" size="sm" href={`/admin/clients/${clientId}`} className="self-start">
            Voir la fiche client
          </LinkButton>
        )}
      </SheetBody>

      <SheetFooter>
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Button className="min-w-[160px] flex-[2]" onClick={send} loading={isPending} disabled={!reponse.trim()}>
              <Send /> Envoyer par email
            </Button>
            {c.statut === "nouveau" && (
              <Button variant="secondary" className="flex-1" onClick={() => changeStatut("lu")} disabled={isPending}>Marquer comme lu</Button>
            )}
            {c.statut === "archive" ? (
              <Button variant="secondary" className="flex-1" onClick={() => changeStatut("lu")} disabled={isPending}>Désarchiver</Button>
            ) : (
              <Button variant="secondary" className="flex-1" onClick={() => changeStatut("archive")} disabled={isPending}>Archiver</Button>
            )}
          </div>
          <button
            type="button"
            onClick={askDelete}
            className="mx-auto block cursor-pointer text-[12.5px] font-semibold text-st-bad hover:underline"
          >
            Supprimer ce message
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

// ── Page ──────────────────────────────────────────────────────
export function ContactsClient({ contacts: initial, clientIds }: { contacts: Contact[]; clientIds: Record<string, string> }) {
  const [contacts, setContacts] = useState<Contact[]>(initial);
  const [openId, setOpenId] = useState<string | null>(null);
  const [vue, setVue] = useState<Vue>("traiter");
  const [query, setQuery] = useState("");

  const counts = useMemo(() => ({
    traiter: contacts.filter(VUES.traiter).length,
    repondus: contacts.filter(VUES.repondus).length,
    archives: contacts.filter(VUES.archives).length,
    tous: contacts.length,
  }), [contacts]);

  const needle = query.trim().toLowerCase();
  const filtered = contacts
    .filter(VUES[vue])
    .filter((c) => !needle || `${c.nom} ${c.email} ${c.sujet} ${c.message}`.toLowerCase().includes(needle));

  const open = contacts.find((c) => c.id === openId) ?? null;

  function setStatut(id: string, statut: string) {
    setContacts((prev) => prev.map((c) => (c.id === id ? { ...c, statut } : c)));
  }
  function removeContact(id: string) {
    setContacts((prev) => prev.filter((c) => c.id !== id));
    setOpenId(null);
  }

  if (contacts.length === 0) {
    return (
      <EmptyState
        icon={MessageSquare}
        title="Aucun message reçu"
        description="Les messages du formulaire de contact apparaîtront ici."
      />
    );
  }

  return (
    <>
      <Table
        toolbar={
          <>
            <Segmented
              value={vue}
              onChange={setVue}
              items={[
                { key: "traiter", label: "À traiter", count: counts.traiter },
                { key: "repondus", label: "Répondus", count: counts.repondus },
                { key: "archives", label: "Archivés", count: counts.archives },
                { key: "tous", label: "Tous", count: counts.tous },
              ]}
            />
            <TableSearch value={query} onChange={setQuery} placeholder="Nom, email, sujet…" className="max-sm:w-full" />
          </>
        }
      >
        <thead>
          <tr>
            <TableHeaderCell>Contact</TableHeaderCell>
            <TableHeaderCell>Message</TableHeaderCell>
            <TableHeaderCell>Reçu</TableHeaderCell>
            <TableHeaderCell>Statut</TableHeaderCell>
          </tr>
        </thead>
        <tbody>
          {filtered.length === 0 ? (
            <tr>
              <td colSpan={4} className="py-10 text-center text-sm text-st-muted">
                {needle ? "Aucun message ne correspond." : "Aucun message dans cette vue."}
              </td>
            </tr>
          ) : (
            filtered.map((c) => {
              const s = STATUT[c.statut] ?? { label: c.statut, tone: "neutral" as BadgeTone };
              const recu = fmtRecu(c.created_at);
              const nouveau = c.statut === "nouveau";
              return (
                <TableRow key={c.id} onClick={() => setOpenId(c.id)} selected={openId === c.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar nom={c.nom} />
                      <div className="min-w-0">
                        <p className={cn("truncate", nouveau ? "font-bold" : "font-[550]")}>{c.nom}</p>
                        <p className="max-w-[220px] truncate text-xs text-st-muted max-sm:max-w-none">{c.email}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <p className={cn("max-w-[340px] truncate max-sm:max-w-none", nouveau && "font-bold")}>{c.sujet}</p>
                    <p className="max-w-[340px] truncate text-xs text-st-muted max-sm:max-w-none">{c.message}</p>
                  </TableCell>
                  <TableCell>
                    <p className="whitespace-nowrap">{recu.jour}</p>
                    <p className="text-xs text-st-muted">{recu.heure}</p>
                  </TableCell>
                  <TableCell>
                    <Badge size="sm" tone={s.tone} dot={nouveau}>{s.label}</Badge>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </tbody>
      </Table>

      <Sheet value={open} onClose={() => setOpenId(null)}>
        {(c) => (
          <ContactSheetContent
            key={c.id}
            contact={c}
            clientId={clientIds[c.email.toLowerCase()] ?? null}
            onClose={() => setOpenId(null)}
            onStatus={setStatut}
            onDeleted={removeContact}
          />
        )}
      </Sheet>
    </>
  );
}
