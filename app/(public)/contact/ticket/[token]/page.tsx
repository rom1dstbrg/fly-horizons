import type { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase/admin";
import { TicketThread } from "./TicketThread";
import { getAdminPilotePhoto } from "@/lib/pilote/admin-photo";

export const metadata: Metadata = {
  title: "Votre demande · Fly Horizons",
  robots: { index: false },
};

const STATUT: Record<string, { label: string; dot: string }> = {
  nouveau: { label: "En attente", dot: "bg-muted-foreground/50" },
  lu:      { label: "Lu",         dot: "bg-muted-foreground/50" },
  repondu: { label: "Répondu",    dot: "bg-primary" },
  archive: { label: "Archivé",    dot: "bg-muted-foreground/50" },
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

const mailLink = "font-semibold text-[#0b2238] underline decoration-[#0b2238]/25 underline-offset-[3px] hover:decoration-primary transition-colors";

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
    .maybeSingle();

  if (!contact) {
    return (
      <main className="min-h-screen bg-white">
        <section className="pt-page pb-24 lg:pb-32">
          <div className="max-w-[1400px] mx-auto px-4 sm:px-6 xl:px-10">
            <p className="text-[11px] font-bold text-primary uppercase tracking-[3px] mb-3">Votre demande</p>
            <h1 className="text-[32px] lg:text-[44px] font-black text-foreground leading-[1.08] lg:leading-[1.04] tracking-[-0.02em] mb-3">
              Lien invalide.
            </h1>
            <p className="max-w-[520px] text-base leading-[1.7] text-foreground/80">
              Ce lien n&apos;est plus valide. Écrivez-nous à{" "}
              <a href="mailto:info@fly-horizons.com" className={mailLink}>info@fly-horizons.com</a>{" "}
              si vous avez besoin d&apos;aide.
            </p>
          </div>
        </section>
      </main>
    );
  }

  const { data: rawMessages } = await supabase
    .from("contact_messages")
    .select("id, author, content, created_at")
    .eq("contact_id", contact.id)
    .order("created_at", { ascending: true });

  const messages: Message[] = rawMessages ?? [];
  const adminPhotoUrl = await getAdminPilotePhoto();

  const dateStr  = new Date(contact.created_at).toLocaleDateString("fr-BE", {
    day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Brussels",
  });
  const statut   = STATUT[contact.statut] ?? STATUT.nouveau;
  const ticketId = contact.id.slice(0, 8).toUpperCase();
  const lastMsg  = messages.at(-1);
  const lastReply = lastMsg ? relativeTime(lastMsg.created_at) : null;

  return (
    <main className="min-h-screen bg-white">
      <div className="pt-page pb-0 lg:pb-28">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 xl:px-10 lg:grid lg:grid-cols-[minmax(0,8fr)_minmax(0,4fr)] lg:items-start">
          <div className="lg:col-start-1 lg:pr-[72px]">
            <p className="text-[11px] font-bold text-primary uppercase tracking-[3px] mb-3">Votre demande</p>
            <h1 className="text-[32px] lg:text-[44px] font-black text-foreground leading-[1.08] lg:leading-[1.04] tracking-[-0.02em] break-words first-letter:uppercase">
              {contact.sujet}
            </h1>
          </div>

          <aside className="mt-[22px] lg:mt-0 lg:col-start-2 lg:row-start-1 lg:row-span-3 lg:sticky lg:top-28 lg:border-l lg:border-border lg:pl-[72px] lg:pt-1.5">
            <p className="text-[11px] font-bold uppercase tracking-[2px] text-muted-foreground mb-1.5">Votre demande</p>
            <p className="flex items-center gap-2 text-base font-bold text-foreground">
              <span className={`h-2 w-2 rounded-full ${statut.dot}`} aria-hidden />
              {statut.label}
              <span className="text-[12px] font-semibold uppercase tracking-[2px] text-muted-foreground">#{ticketId}</span>
            </p>
            <p className="mt-0.5 text-sm lg:text-[15px] text-muted-foreground">Ouverte le {dateStr}</p>
            {lastReply && <p className="text-sm lg:text-[15px] text-muted-foreground">Dernier message {lastReply}</p>}
            <p className="mt-3.5 truncate text-sm text-foreground/70">{contact.email}</p>
            <p className="hidden lg:block mt-7 text-[13px] leading-[1.6] text-muted-foreground">
              Vous préférez écrire par email ? <a href="mailto:info@fly-horizons.com" className={mailLink}>info@fly-horizons.com</a>.
            </p>
          </aside>

          <TicketThread token={token} initialMessages={messages} adminPhotoUrl={adminPhotoUrl} />
        </div>
      </div>
    </main>
  );
}
