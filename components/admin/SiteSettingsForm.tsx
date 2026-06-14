"use client";

import { useState, useTransition } from "react";
import { updateSiteSettings } from "@/lib/actions/settings";
import { Check, Loader2 } from "lucide-react";

interface Props {
  calendarClosed: boolean;
  calendarClosedMessage: string;
  chatEnabled: boolean;
}

export function SiteSettingsForm({ calendarClosed, calendarClosedMessage, chatEnabled }: Props) {
  const [closed,  setClosed]  = useState(calendarClosed);
  const [message, setMessage] = useState(calendarClosedMessage);
  const [chat,    setChat]    = useState(chatEnabled);
  const [saved,   setSaved]   = useState(false);
  const [error,   setError]   = useState("");
  const [isPending, startTransition] = useTransition();

  function handleSave() {
    setError(""); setSaved(false);
    startTransition(async () => {
      const result = await updateSiteSettings({
        calendar_closed:         closed,
        calendar_closed_message: message,
        chat_enabled:            chat,
      });
      if (result.error) setError(result.error);
      else { setSaved(true); setTimeout(() => setSaved(false), 2500); }
    });
  }

  return (
    <div className="card-premium p-6 space-y-6">
      <div>
        <h2 className="text-base font-semibold text-foreground">Site & réservations</h2>
        <p className="text-xs text-muted-foreground mt-1">
          Paramètres opérationnels visibles par les clients.
        </p>
      </div>

      {/* Fermeture calendrier */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-foreground">Fermer les réservations</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Bloque le calendrier sur toutes les pages de réservation.
            </p>
          </div>
          <button
            type="button"
            onClick={() => { setClosed(v => !v); setSaved(false); }}
            className={`relative w-11 h-6 rounded-full transition-colors cursor-pointer shrink-0 ${closed ? "bg-red-500" : "bg-muted-foreground/30"}`}
          >
            <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${closed ? "translate-x-5" : "translate-x-0"}`} />
          </button>
        </div>

        {closed && (
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Message affiché aux clients</label>
            <input
              type="text"
              value={message}
              onChange={e => { setMessage(e.target.value); setSaved(false); }}
              placeholder="Réservations suspendues jusqu'au 15 janvier — contactez-nous pour toute demande."
              className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        )}
      </div>

      <div className="border-t border-border" />

      {/* Chatbot */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-foreground">Assistant chatbot</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Affiche ou masque le bouton de chat sur tout le site.
          </p>
        </div>
        <button
          type="button"
          onClick={() => { setChat(v => !v); setSaved(false); }}
          className={`relative w-11 h-6 rounded-full transition-colors cursor-pointer shrink-0 ${chat ? "bg-primary" : "bg-muted-foreground/30"}`}
        >
          <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${chat ? "translate-x-5" : "translate-x-0"}`} />
        </button>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={isPending}
          className="h-10 px-5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors flex items-center gap-2 cursor-pointer"
        >
          {isPending ? <Loader2 size={14} className="animate-spin" /> : saved ? <Check size={14} /> : null}
          {saved ? "Enregistré" : "Enregistrer"}
        </button>
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>
    </div>
  );
}
