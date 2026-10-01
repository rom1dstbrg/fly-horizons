"use client";

import { submitClientReply } from "@/lib/actions/contacts";
import { Thread, type ThreadMessage } from "@/components/messages/Thread";

interface Message {
  id: string;
  author: "client" | "admin";
  content: string;
  created_at: string;
}

interface Props {
  token: string;
  initialMessages: Message[];
  /** Photo de Romain (fiche pilote du compte admin), à la place du « R ». */
  adminPhotoUrl?: string | null;
}

export function TicketThread({ token, initialMessages, adminPhotoUrl = null }: Props) {
  const messages: ThreadMessage[] = initialMessages.map(m => ({
    id: m.id,
    mine: m.author === "client",
    label: "Romain · Fly Horizons",
    avatarUrl: adminPhotoUrl,
    content: m.content,
    created_at: m.created_at,
  }));

  return (
    <Thread
      initialMessages={messages}
      onSend={content => submitClientReply(token, content)}
      emptyText="Votre demande a bien été reçue. Nous vous répondrons sous 24 h."
    />
  );
}
