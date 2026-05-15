"use client";

import { useState, useTransition } from "react";
import { updateContactStatut, replyContact, deleteContact } from "@/lib/actions/contacts";
import { ChevronDown, ChevronUp, Send, Trash2, Loader2, Mail } from "lucide-react";

const STATUTS = [
  { value: "nouveau",  label: "Nouveau",  color: "bg-yellow-100 text-yellow-700 border-yellow-200" },
  { value: "lu",       label: "Lu",       color: "bg-blue-100 text-blue-700 border-blue-200" },
  { value: "repondu",  label: "Répondu",  color: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  { value: "archive",  label: "Archivé",  color: "bg-gray-100 text-gray-500 border-gray-200" },
];

const FILTERS = ["Tous", "Nouveaux", "Lus", "Répondus", "Archivés"] as const;
const FILTER_VALUES: Record<string, string | null> = {
  Tous: null, Nouveaux: "nouveau", Lus: "lu", Répondus: "repondu", Archivés: "archive",
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

function ContactCard({ contact }: { contact: Contact }) {
  const [expanded, setExpanded] = useState(false);
  const [reponse, setReponse] = useState(contact.reponse ?? "");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  const statut = STATUTS.find(s => s.value === contact.statut) ?? STATUTS[0];
  const dateStr = new Date(contact.created_at).toLocaleDateString("fr-BE", {
    day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });

  function changeStatut(val: string) {
    startTransition(async () => {
      await updateContactStatut(contact.id, val);
    });
  }

  function handleDelete() {
    startTransition(async () => {
      await deleteContact(contact.id);
    });
  }

  function handleReply() {
    startTransition(async () => {
      const r = await replyContact(contact.id, reponse, contact.email, contact.nom, contact.sujet);
      if (r?.error) { setMessage(r.error); return; }
      setMessage("Réponse envoyée ✓");
      setTimeout(() => setMessage(""), 3000);
    });
  }

  return (
    <div className="card-premium p-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-foreground text-sm">{contact.nom}</p>
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${statut.color}`}>
              {statut.label}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">{contact.email}</p>
          <p className="text-xs text-foreground font-medium mt-1">{contact.sujet}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{dateStr}</p>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {confirmDelete ? (
            <>
              <button onClick={handleDelete} disabled={isPending}
                className="px-2 py-1 rounded bg-destructive text-destructive-foreground text-xs font-medium hover:bg-destructive/90 disabled:opacity-50">
                {isPending ? <Loader2 size={11} className="animate-spin" /> : "Supprimer"}
              </button>
              <button onClick={() => setConfirmDelete(false)}
                className="px-2 py-1 rounded border border-border text-xs text-muted-foreground hover:bg-secondary">
                Annuler
              </button>
            </>
          ) : (
            <button onClick={() => setConfirmDelete(true)} title="Supprimer"
              className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
              <Trash2 size={14} />
            </button>
          )}
          <button onClick={() => setExpanded(e => !e)}
            className="p-1.5 rounded-lg hover:bg-secondary transition-colors text-muted-foreground">
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>
      </div>

      {/* Preview message */}
      {!expanded && (
        <p className="text-xs text-muted-foreground mt-2 line-clamp-2 leading-relaxed">
          {contact.message}
        </p>
      )}

      {message && (
        <p className={`text-xs mt-2 ${message.includes("✓") ? "text-emerald-600" : "text-destructive"}`}>
          {message}
        </p>
      )}

      {/* Expanded */}
      {expanded && (
        <div className="mt-4 pt-4 border-t border-border space-y-5">

          {/* Message complet */}
          <div>
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Message
            </p>
            <div className="bg-secondary/30 rounded-xl p-4 text-sm text-foreground leading-relaxed whitespace-pre-wrap">
              {contact.message}
            </div>
          </div>

          {/* Statut */}
          <div>
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Statut
            </p>
            <div className="flex flex-wrap gap-2">
              {STATUTS.map(s => (
                <button key={s.value}
                  disabled={contact.statut === s.value || isPending}
                  onClick={() => changeStatut(s.value)}
                  className={[
                    "text-xs px-3 py-1.5 rounded-lg border font-medium transition-all",
                    contact.statut === s.value
                      ? `${s.color} cursor-default`
                      : "border-border text-muted-foreground hover:bg-secondary disabled:opacity-50",
                  ].join(" ")}>
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Réponse */}
          <div>
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Mail size={10} />
              Répondre à {contact.nom}
            </p>
            {contact.reponse && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 mb-3 text-xs text-emerald-800 leading-relaxed whitespace-pre-wrap">
                <p className="font-semibold mb-1 text-emerald-600">Réponse envoyée :</p>
                {contact.reponse}
              </div>
            )}
            <textarea
              value={reponse}
              onChange={e => setReponse(e.target.value)}
              rows={5}
              placeholder={`Votre réponse à ${contact.nom}…`}
              className="w-full px-3.5 py-3 rounded-xl border border-input bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <button
              onClick={handleReply}
              disabled={isPending || !reponse.trim()}
              className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#113356] text-white text-xs font-semibold hover:bg-[#0b2238] disabled:opacity-50 transition-colors"
            >
              {isPending ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
              Envoyer par email
            </button>
          </div>

        </div>
      )}
    </div>
  );
}

export function ContactsClient({ contacts }: { contacts: Contact[] }) {
  const [filter, setFilter] = useState<typeof FILTERS[number]>("Tous");

  const filtered = filter === "Tous"
    ? contacts
    : contacts.filter(c => c.statut === FILTER_VALUES[filter]);

  return (
    <div className="space-y-4">
      {/* Filtres */}
      <div className="flex flex-wrap gap-2">
        {FILTERS.map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition-colors ${
              filter === f
                ? "bg-[#113356] text-white border-[#113356]"
                : "border-border text-muted-foreground hover:bg-secondary"
            }`}>
            {f}
            {f !== "Tous" && (
              <span className="ml-1.5 opacity-60">
                {contacts.filter(c => c.statut === FILTER_VALUES[f]).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground text-sm">
          Aucun message {filter !== "Tous" ? `"${filter.toLowerCase()}"` : ""} pour le moment.
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(c => <ContactCard key={c.id} contact={c} />)}
        </div>
      )}
    </div>
  );
}
