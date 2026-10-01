import Link from "next/link";
import type { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase/admin";
import { MessagesThread } from "./MessagesThread";
import { getAdminPilotePhoto } from "@/lib/pilote/admin-photo";

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
    .select("id, date_vol, heure_vol, pilotes(id, nom, photo_url)")
    .eq("messages_token", token)
    .maybeSingle();

  if (!resa) {
    return (
      <main className="min-h-screen bg-white">
        <section className="pt-page pb-24 lg:pb-32">
          <div className="max-w-[1400px] mx-auto px-4 sm:px-6 xl:px-10">
            <p className="text-[11px] font-bold text-primary uppercase tracking-[3px] mb-3">Vos échanges</p>
            <h1 className="text-[32px] lg:text-[44px] font-black text-foreground leading-[1.08] lg:leading-[1.04] tracking-[-0.02em] mb-3">
              Lien invalide.
            </h1>
            <p className="max-w-[520px] text-base leading-[1.7] text-foreground/80">
              Ce lien n&apos;est plus valide. Écrivez-nous à{" "}
              <a href="mailto:info@fly-horizons.com" className="font-semibold text-[#0b2238] underline decoration-[#0b2238]/25 underline-offset-[3px] hover:decoration-primary transition-colors">
                info@fly-horizons.com
              </a>{" "}
              si vous avez besoin d&apos;aide.
            </p>
          </div>
        </section>
      </main>
    );
  }

  const { data: rawMessages } = await supabase
    .from("reservation_messages")
    .select("id, author, author_nom, content, created_at")
    .eq("reservation_id", resa.id)
    .order("created_at", { ascending: true });

  const messages: Message[] = rawMessages ?? [];
  const pilote = pick<{ id: string; nom: string; photo_url: string | null }>(resa.pilotes);
  const adminPhotoUrl = await getAdminPilotePhoto();
  const dateStr = new Date(resa.date_vol + "T12:00:00Z").toLocaleDateString("fr-BE", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Europe/Brussels",
  });
  const dateShort = new Date(resa.date_vol + "T12:00:00Z").toLocaleDateString("fr-BE", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "Europe/Brussels",
  });
  const heure = resa.heure_vol ? resa.heure_vol.slice(0, 5) : null;

  return (
    <main className="min-h-screen bg-white">
      <div className="pt-page pb-0 lg:pb-28">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 xl:px-10 lg:grid lg:grid-cols-[minmax(0,8fr)_minmax(0,4fr)] lg:items-start">
          <div className="lg:col-start-1 lg:pr-[72px]">
            <p className="text-[11px] font-bold text-primary uppercase tracking-[3px] mb-3">Vos échanges</p>
            <h1 className="text-[32px] lg:text-[44px] font-black text-foreground leading-[1.08] lg:leading-[1.04] tracking-[-0.02em] first-letter:uppercase">
              Votre vol du {dateShort}.
            </h1>
          </div>

          <aside className="mt-[22px] lg:mt-0 lg:col-start-2 lg:row-start-1 lg:row-span-3 lg:sticky lg:top-28 lg:border-l lg:border-border lg:pl-[72px] lg:pt-1.5">
            <p className="text-[11px] font-bold uppercase tracking-[2px] text-muted-foreground mb-1.5">Votre vol</p>
            <p className="text-base font-bold text-foreground first-letter:uppercase">{dateStr}</p>
            {heure && <p className="text-sm lg:text-[15px] text-muted-foreground mt-0.5">à {heure}</p>}
            {pilote && (
              <div className="mt-3.5 flex items-center gap-2.5">
                {pilote.photo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={pilote.photo_url} alt={pilote.nom} className="h-9 w-9 shrink-0 rounded-full border border-border object-cover" />
                ) : (
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-black text-[#0b2238]">
                    {pilote.nom.trim().charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-sm font-bold leading-tight text-foreground">{pilote.nom}</p>
                  <Link href={`/nos-pilotes/${pilote.id}`} className="text-[12.5px] text-foreground/55 underline decoration-foreground/25 underline-offset-[3px] hover:decoration-primary hover:text-foreground transition-colors">
                    Voir le profil
                  </Link>
                </div>
              </div>
            )}
            <p className="hidden lg:block mt-7 text-[13px] leading-[1.6] text-muted-foreground">
              Urgent le jour du vol ? Écrivez-nous à{" "}
              <a href="mailto:info@fly-horizons.com" className="font-semibold text-[#0b2238] underline decoration-[#0b2238]/25 underline-offset-[3px] hover:decoration-primary transition-colors">
                info@fly-horizons.com
              </a>.
            </p>
          </aside>

          <MessagesThread
            token={token}
            initialMessages={messages}
            pilotePhotoUrl={pilote?.photo_url ?? null}
            adminPhotoUrl={adminPhotoUrl}
          />
        </div>
      </div>
    </main>
  );
}
