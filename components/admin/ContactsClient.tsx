"use client";

import { useState, useTransition } from "react";
import { updateContactStatut, replyContact, deleteContact } from "@/lib/actions/contacts";
import { AdminBadge, STATUT_CONTACT } from "@/components/admin/ui/AdminBadge";
import { AdminRowActions } from "@/components/admin/ui/AdminRowActions";
import { AdminSheet, SheetSection } from "@/components/admin/ui/AdminSheet";
import { Send, Loader2, Mail } from "lucide-react";

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

// ── Corps interactif du drawer (remonté à chaque contact) ──────
function DrawerBody({
  contact,
  onStatusChange,
}: {
  contact: Contact;
  onStatusChange: (id: string, statut: string) => void;
}) {
  const [reponse, setReponse] = useState(contact.reponse ?? "");
  const [feedback, setFeedback] = useState("");
  const [isPending, startTransition] = useTransition();

  function changeStatut(val: string) {
    startTransition(async () => {
      await updateContactStatut(contact.id, val);
      onStatusChange(contact.id, val);
    });
  }

  function handleReply() {
    startTransition(async () => {
      const r = await replyContact(contact.id, reponse, contact.email, contact.nom, contact.sujet);
      if (r?.error) { setFeedback(r.error); return; }
      setFeedback("Réponse envoyée ✓");
      onStatusChange(contact.id, "repondu");
      setTimeout(() => setFeedback(""), 3000);
    });
  }

  return (
    <>
      {/* Message */}
      <SheetSection title="Message">
        <div className="bg-secondary/30 rounded-xl p-4 text-sm text-foreground leading-relaxed whitespace-pre-wrap">
          {contact.message}
        </div>
      </SheetSection>

      {/* Statut */}
      <SheetSection title="Statut">
        <div className="flex flex-wrap gap-2">
          {STATUTS_LIST.map(s => {
            const cfg = STATUT_CONTACT[s.value];
            const isActive = contact.statut === s.value;
            return (
              <button
                key={s.value}
                disabled={isActive || isPending}
                onClick={() => changeStatut(s.value)}
                className={[
                  "text-xs px-3 py-1.5 rounded-lg border font-medium transition-all",
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

      {/* Réponse */}
      <SheetSection title={`Répondre à ${contact.nom}`}>
        {contact.reponse && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 mb-3 text-xs text-emerald-800 leading-relaxed whitespace-pre-wrap">
            <p className="font-semibold mb-1 text-emerald-600">Réponse précédente :</p>
            {contact.reponse}
          </div>
        )}
        <textarea
          value={reponse}
          onChange={e => setReponse(e.target.value)}
          rows={6}
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
          className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#0b2238] text-white text-xs font-semibold hover:bg-[#0b2238] disabled:opacity-50 transition-colors"
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
      {/* remonte le corps à chaque contact pour reset l'état local */}
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
  const statut = STATUT_CONTACT[contact.statut] ?? { label: contact.statut, variant: "secondary" as const };
  const dateStr = new Date(contact.created_at).toLocaleDateString("fr-BE", {
    day: "numeric", month: "short", year: "numeric",
  });

  return (
    <div className="card-premium p-4 hover:border-primary/30 transition-colors">
      <div className="flex items-start justify-between gap-4">
        {/* Infos — cliquables */}
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

        {/* Actions */}
        <div onClick={e => e.stopPropagation()} className="shrink-0">
          <AdminRowActions
            onView={onOpen}
            onDelete={onDelete}
          />
        </div>
      </div>
    </div>
  );
}

// ── Page principale ────────────────────────────────────────────
export function ContactsClient({ contacts: initial }: { contacts: Contact[] }) {
  const [contacts, setContacts] = useState<Contact[]>(initial);
  const [filter, setFilter] = useState<typeof FILTERS[number]>("Tous");
  const [drawer, setDrawer] = useState<Contact | null>(null);

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
            const val = FILTER_VALUES[f];
            const count = val === null
              ? contacts.length
              : contacts.filter(c => c.statut === val).length;
            return (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition-colors ${
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
