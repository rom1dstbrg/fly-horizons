import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { TicketThread } from "./TicketThread";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Votre demande · Fly Horizons",
  robots: { index: false },
};

const STATUT: Record<string, { label: string; cls: string }> = {
  nouveau: { label: "En attente", cls: "bg-secondary text-muted-foreground border-border" },
  lu:      { label: "Lu",         cls: "bg-secondary text-muted-foreground border-border" },
  repondu: { label: "Répondu",    cls: "bg-primary/10 text-primary border-primary/30"     },
  archive: { label: "Archivé",    cls: "bg-secondary text-muted-foreground border-border" },
};

function relativeTime(iso: string): string {
  const diff  = Date.now() - new Date(iso).getTime();
  const mins  = Math.floor(diff / 60_000);
  if (mins < 1)  return "à l'instant";
  if (mins < 60) return `il y a ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `il y a ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "hier";
  return `il y a ${days} jours`;
}

interface Message {
  id: string;
  author: "client" | "admin";
  content: string;
  created_at: string;
}

export default async function TicketPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const supabase  = createAdminClient();

  const { data: contact } = await supabase
    .from("contacts")
    .select("id, nom, email, sujet, statut, created_at")
    .eq("thread_token", token)
    .single();

  if (!contact) notFound();

  const { data: rawMessages } = await supabase
    .from("contact_messages")
    .select("id, author, content, created_at")
    .eq("contact_id", contact.id)
    .order("created_at", { ascending: true });

  const messages: Message[] = rawMessages ?? [];

  const dateStr  = new Date(contact.created_at).toLocaleDateString("fr-BE", {
    day: "numeric", month: "long", year: "numeric",
  });
  const statut   = STATUT[contact.statut] ?? STATUT.nouveau;
  const ticketId = contact.id.slice(0, 8).toUpperCase();
  const lastMsg  = messages.at(-1);
  const lastReply = lastMsg ? relativeTime(lastMsg.created_at) : null;

  return (
    <main className="min-h-screen bg-[#f5f5f7]">
      <div className="pt-[80px] sm:pt-[98px] pb-16 px-4 sm:px-6 xl:px-10">
        <div className="max-w-[1400px] mx-auto">
          <div className="max-w-[760px] mx-auto">

            {/* Ticket info */}
            <div className="bg-card border border-border rounded-lg px-5 py-4 shadow-premium mb-6">
              <h1 className="text-base font-black text-foreground leading-snug mb-2">
                {contact.sujet}
              </h1>
              <div className="flex items-center gap-2 mb-3">
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-[1px] ${statut.cls}`}>
                  {statut.label}
                </span>
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-[2px]">
                  #{ticketId}
                </span>
              </div>
              <div className="border-t border-border pt-3 space-y-0.5">
                <p className="text-[11px] text-muted-foreground">Ouvert le {dateStr}</p>
                <p className="text-[11px] text-muted-foreground truncate">{contact.email}</p>
                {lastReply && (
                  <p className="text-[11px] text-muted-foreground">Dernière réponse {lastReply}</p>
                )}
              </div>
            </div>

            {/* Thread + reply */}
            <TicketThread token={token} initialMessages={messages} />

            <div className="pb-8" />

          </div>
        </div>
      </div>
    </main>
  );
}
