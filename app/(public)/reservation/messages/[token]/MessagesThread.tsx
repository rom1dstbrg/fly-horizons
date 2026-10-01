"use client";

import { submitClientMessageReply } from "@/lib/actions/reservation-messages";
import { Thread, type ThreadMessage } from "@/components/messages/Thread";

interface Message {
  id: string;
  author: "client" | "pilote" | "admin";
  author_nom: string | null;
  content: string;
  created_at: string;
}

interface Props {
  token: string;
  initialMessages: Message[];
  /** Photo du pilote du vol (messages « pilote »). */
  pilotePhotoUrl?: string | null;
  /** Photo de Romain (messages « admin »). */
  adminPhotoUrl?: string | null;
}

export function MessagesThread({ token, initialMessages, pilotePhotoUrl = null, adminPhotoUrl = null }: Props) {
  const messages: ThreadMessage[] = initialMessages.map(m => ({
    id: m.id,
    mine: m.author === "client",
    label: m.author_nom?.trim() || "Fly Horizons",
    avatarUrl: m.author === "admin" ? adminPhotoUrl : pilotePhotoUrl,
    content: m.content,
    created_at: m.created_at,
  }));

  return (
    <Thread
      initialMessages={messages}
      onSend={content => submitClientMessageReply(token, content)}
      emptyText="Aucun message pour l'instant. Écrivez ici pour joindre votre pilote."
    />
  );
}
