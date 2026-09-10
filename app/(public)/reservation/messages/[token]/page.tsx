import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase/admin";
import { MessagesThread } from "./MessagesThread";

export const metadata: Metadata = {
  title: "Vos échanges · Fly Horizons",
  robots: { index: false },
};

interface Message {
  id: string;
  author: "client" | "pilote" | "admin";
  author_nom: string | null;
  content: string;
  created_at: string;
}

function pick<T>(v: T | T[] | null | undefined): T | null {
  return Array.isArray(v) ? v[0] ?? null : v ?? null;
}

export default async function ReservationMessagesPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const supabase = createAdminClient();

  const { data: resa } = await supabase
    .from("reservations")
    .select("id, date_vol, heure_vol, clients(prenom, nom), pilotes(nom)")
    .eq("messages_token", token)
    .single();

  if (!resa) notFound();

  const { data: rawMessages } = await supabase
    .from("reservation_messages")
    .select("id, author, author_nom, content, created_at")
    .eq("reservation_id", resa.id)
    .order("created_at", { ascending: true });

  const messages: Message[] = rawMessages ?? [];
  const pilote = pick<{ nom: string }>(resa.pilotes);
  const dateStr = new Date(resa.date_vol + "T12:00:00Z").toLocaleDateString("fr-BE", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const heure = resa.heure_vol ? resa.heure_vol.slice(0, 5) : null;

  return (
    <main className="min-h-screen bg-[#f5f5f7]">
      <div className="pt-[80px] sm:pt-[98px] pb-16 px-4 sm:px-6 xl:px-10">
        <div className="max-w-[760px] mx-auto">
          <div className="bg-card border border-border rounded-lg px-5 py-4 shadow-premium mb-6">
            <p className="text-[10px] font-bold text-primary uppercase tracking-[2px] mb-1">
              Vos échanges
            </p>
            <h1 className="text-base font-black text-foreground leading-snug capitalize">
              Vol du {dateStr}
              {heure ? ` · ${heure}` : ""}
            </h1>
            {pilote && (
              <p className="text-[11px] text-muted-foreground mt-1">
                avec {pilote.nom}, votre pilote
              </p>
            )}
          </div>

          <MessagesThread token={token} initialMessages={messages} />

          <div className="pb-8" />
        </div>
      </div>
    </main>
  );
}
