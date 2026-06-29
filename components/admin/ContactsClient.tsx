"use client";

import { useState, useTransition, useEffect } from "react";
import {
  updateContactStatut, replyContact, deleteContact, getContactMessages,
} from "@/lib/actions/contacts";
import { AdminBadge, STATUT_CONTACT } from "@/components/admin/ui/AdminBadge";
import { AdminRowActions } from "@/components/admin/ui/AdminRowActions";
import { AdminSheet, SheetSection } from "@/components/admin/ui/AdminSheet";
import { Send, Loader2, User } from "lucide-react";

const FILTERS = ["Tous", "Nouveaux", "Lus", "Répondus", "Archivés"] as const;
const FILTER_VALUES: Record<string, string | null> = {
  Tous: null, Nouveaux: "nouveau", Lus: "lu", Répondus: "repondu", Archivés: "archive",
};

const STATUTS_LIST = [
  { value: "nouveau", label: "Nouveau" },
  { value: "lu",      label: "Lu"      },
  { value: "repondu", label: "Répondu" },
  { value: "archive", label: "Archivé" },
];

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

// ── Corps du drawer ────────────────────────────────────────────
function DrawerBody({
  contact,
  onStatusChange,
}: {
  contact: Contact;
  onStatusChange: (id: string, statut: string) => void;
}) {
  const [messages, setMessages]   = useState<ContactMessage[]>([]);
  const [loadingMsgs, setLoading] = useState(true);
  const [reponse, setReponse]     = useState("");
  const [feedback, setFeedback]   = useState("");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setLoading(true);
    getContactMessages(contact.id).then(r => {
      setMessages(r.messages as ContactMessage[]);
      setLoading(false);
    });
  }, [contact.id]);

  function changeStatut(val: string) {
    startTransition(async () => {
      await updateContactStatut(contact.id, val);
      onStatusChange(contact.id, val);
    });
  }

  function handleReply() {
    if (!reponse.trim()) return;
    startTransition(async () => {
      const r = await replyContact(contact.id, reponse, contact.email, contact.nom, contact.sujet);
      if (r?.error) { setFeedback(r.error); return; }
      const newMsg: ContactMessage = {
        id: crypto.randomUUID(),
        author: "admin",
        content: reponse,
        created_at: new Date().toISOString(),
      };
      setMessages(prev => [...prev, newMsg]);
      setReponse("");
      setFeedback("Réponse envoyée ✓");
      onStatusChange(contact.id, "repondu");
      setTimeout(() => setFeedback(""), 3000);
    });
  }

  return (
    <>
      {/* Fil de messages */}
      <SheetSection title="Conversation">
        {loadingMsgs ? (
          <div className="flex items-center gap-2 text-xs text-muted-foreground py-4">
            <Loader2 size={12} className="animate-spin" />
            Chargement…
          </div>
        ) : messages.length === 0 ? (
          <p className="text-xs text-muted-foreground italic">Aucun message.</p>
        ) : (
          <div className="space-y-3">
            {messages.map(msg => {
              const isAdmin = msg.author === "admin";
              const timeStr = new Date(msg.created_at).toLocaleString("fr-BE", {
                day: "numeric", month: "short",
                hour: "2-digit", minute: "2-digit",
              });
              return (
                <div key={msg.id} className={`flex gap-2 ${isAdmin ? "flex-row-reverse" : ""}`}>
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 text-[10px] font-bold ${
                    isAdmin ? "bg-[#0b2238] text-[#F2B705]" : "bg-secondary text-muted-foreground"
                  }`}>
                    {isAdmin ? "R" : <User size={12} />}
                  </div>
                  <div className={`flex-1 max-w-[85%] flex flex-col ${isAdmin ? "items-end" : "items-start"}`}>
                    <div className={`rounded-xl px-3 py-2 text-xs leading-relaxed whitespace-pre-wrap ${
                      isAdmin
                        ? "bg-[#0b2238] text-white rounded-tr-sm"
                        : "bg-secondary text-foreground rounded-tl-sm"
                    }`}>
                      {msg.content}
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-0.5 px-0.5">{timeStr}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </SheetSection>

      {/* Statut */}
      <SheetSection title="Statut">
        <div className="flex flex-wrap gap-2">
          {STATUTS_LIST.map(s => {
            const isActive = contact.statut === s.value;
            return (
              <button
                key={s.value}
                disabled={isActive || isPending}
                onClick={() => changeStatut(s.value)}
                className={[
                  "text-xs px-3 py-1.5 rounded-lg border font-medium transition-all cursor-pointer",
                  isActive
                    ? "bg-[#0b2238] text-white border-[#0b2238] cursor-default"
                    : "border-border text-muted-foreground hover:bg-secondary disabled:opacity-50",
                ].join(" ")}
              >
                {s.label}
              </button>
            );
          })}
        </div>
      </SheetSection>

      {/* Répondre */}
      <SheetSection title={`Répondre à ${contact.nom}`}>
        <textarea
          value={reponse}
          onChange={e => setReponse(e.target.value)}
          rows={5}
          placeholder={`Votre réponse à ${contact.nom}…`}
          className="w-full px-3.5 py-3 rounded-xl border border-input bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
        />
        {feedback && (
          <p className={`text-xs mt-1 ${feedback.includes("✓") ? "text-emerald-600" : "text-destructive"}`}>
            {feedback}
          </p>
        )}
        <button
          onClick={handleReply}
          disabled={isPending || !reponse.trim()}
          className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#0b2238] text-white text-xs font-semibold hover:opacity-90 disabled:opacity-50 transition-colors cursor-pointer"
        >
          {isPending ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
          Envoyer par email
        </button>
      </SheetSection>
    </>
  );
}

// ── Drawer wrapper ─────────────────────────────────────────────
function ContactDrawer({
  contact,
  onClose,
  onStatusChange,
}: {
  contact: Contact | null;
  onClose: () => void;
  onStatusChange: (id: string, statut: string) => void;
}) {
  if (!contact) return null;

  const dateStr = new Date(contact.created_at).toLocaleDateString("fr-BE", {
    day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });

  return (
    <AdminSheet
      open={!!contact}
      onClose={onClose}
      title={contact.nom}
      subtitle={`${contact.email} · ${dateStr}`}
      width="w-[520px]"
    >
      <DrawerBody
        key={contact.id}
        contact={contact}
        onStatusChange={onStatusChange}
      />
    </AdminSheet>
  );
}

// ── Carte contact ──────────────────────────────────────────────
function ContactCard({
  contact,
  onOpen,
  onDelete,
}: {
  contact: Contact;
  onOpen: () => void;
  onDelete: () => Promise<{ error?: string } | void>;
}) {
  const statut  = STATUT_CONTACT[contact.statut] ?? { label: contact.statut, variant: "secondary" as const };
  const dateStr = new Date(contact.created_at).toLocaleDateString("fr-BE", {
    day: "numeric", month: "short", year: "numeric",
  });

  return (
    <div className="card-premium p-4 hover:border-primary/30 transition-colors">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0 cursor-pointer" onClick={onOpen}>
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-foreground text-sm">{contact.nom}</p>
            <AdminBadge variant={statut.variant} label={statut.label} />
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            {contact.email} · {dateStr}
          </p>
          <p className="text-xs text-foreground font-medium mt-1">{contact.sujet}</p>
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2 leading-relaxed">
            {contact.message}
          </p>
        </div>
        <div onClick={e => e.stopPropagation()} className="shrink-0">
          <AdminRowActions onView={onOpen} onDelete={onDelete} />
        </div>
      </div>
    </div>
  );
}

// ── Page principale ────────────────────────────────────────────
export function ContactsClient({ contacts: initial }: { contacts: Contact[] }) {
  const [contacts, setContacts] = useState<Contact[]>(initial);
  const [filter, setFilter]     = useState<typeof FILTERS[number]>("Tous");
  const [drawer, setDrawer]     = useState<Contact | null>(null);

  function handleStatusChange(id: string, statut: string) {
    setContacts(prev => prev.map(c => c.id === id ? { ...c, statut } : c));
    setDrawer(prev => prev?.id === id ? { ...prev, statut } : prev);
  }

  async function handleDelete(id: string) {
    const result = await deleteContact(id);
    if (!result?.error) {
      setContacts(prev => prev.filter(c => c.id !== id));
      if (drawer?.id === id) setDrawer(null);
    }
    return result;
  }

  const filtered = filter === "Tous"
    ? contacts
    : contacts.filter(c => c.statut === FILTER_VALUES[filter]);

  return (
    <>
      <div className="space-y-4">
        {/* Filtres */}
        <div className="flex flex-wrap gap-2">
          {FILTERS.map(f => {
            const val   = FILTER_VALUES[f];
            const count = val === null
              ? contacts.length
              : contacts.filter(c => c.statut === val).length;
            return (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition-colors cursor-pointer ${
                  filter === f
                    ? "bg-[#0b2238] text-white border-[#0b2238]"
                    : "border-border text-muted-foreground hover:bg-secondary"
                }`}
              >
                {f}
                <span className="ml-1.5 opacity-60">{count}</span>
              </button>
            );
          })}
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground text-sm">
            Aucun message{filter !== "Tous" ? ` "${filter.toLowerCase()}"` : ""} pour le moment.
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(c => (
              <ContactCard
                key={c.id}
                contact={c}
                onOpen={() => setDrawer(c)}
                onDelete={() => handleDelete(c.id)}
              />
            ))}
          </div>
        )}
      </div>

      <ContactDrawer
        contact={drawer}
        onClose={() => setDrawer(null)}
        onStatusChange={handleStatusChange}
      />
    </>
  );
}
