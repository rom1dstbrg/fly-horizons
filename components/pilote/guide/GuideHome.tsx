"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, ChevronRight, Clock } from "lucide-react";
import { Badge, Card, EmptyState, LinkButton, Segmented, TableSearch } from "@/components/pilote/studio";
import { cn } from "@/lib/utils";
import { GUIDE_ENTRIES, GUIDE_TABS, type GuideEntry, type GuideTabKey } from "./catalog";

export type GuideProgress = {
  profil: boolean;
  dispos: boolean;
  annonce: boolean;
  app: boolean;
};

// Les 4 premiers pas, dans l'ordre où les faire (chacun mène à sa page).
const STEPS: { key: keyof GuideProgress; label: string; href: string; action: string }[] = [
  { key: "profil", label: "Profil", href: "/pilote/profil", action: "Compléter mon profil" },
  { key: "dispos", label: "Disponibilités", href: "/pilote/disponibilites", action: "Ouvrir mes disponibilités" },
  { key: "annonce", label: "Première annonce", href: "/pilote/annonces/nouvelle", action: "Publier une annonce" },
  { key: "app", label: "App installée", href: "/pilote/guide/installer", action: "Installer l'app" },
];

function GuideCard({ entry }: { entry: GuideEntry }) {
  const Icon = entry.icon;
  const body = (
    <Card interactive={!entry.soon} className={cn("relative flex h-full items-start gap-3.5", entry.soon && "opacity-60")}>
      <span
        className={cn(
          "grid h-[42px] w-[42px] shrink-0 place-items-center rounded-[12px]",
          entry.featured ? "bg-st-ink text-white" : "bg-st-surface text-st-ink",
        )}
      >
        <Icon size={20} />
      </span>
      <span className="min-w-0 flex-1 pr-5">
        <span className="block text-[14.5px] font-semibold leading-snug tracking-[-0.01em] text-st-text">{entry.title}</span>
        <span className="mt-0.5 block text-[12.5px] leading-snug text-st-text-2">{entry.desc}</span>
        <span className="mt-2.5 flex flex-wrap gap-1.5">
          {entry.soon ? (
            <Badge>Bientôt</Badge>
          ) : (
            <>
              <Badge><Clock className="size-3" />{entry.min} min</Badge>
              {!entry.ready && <Badge tone="warning">En construction</Badge>}
            </>
          )}
        </span>
      </span>
      {!entry.soon && <ChevronRight size={16} className="absolute right-4 top-5 text-st-line-strong" />}
    </Card>
  );
  if (entry.soon) return <div>{body}</div>;
  return (
    <Link href={`/pilote/guide/${entry.slug}`} className="block rounded-[20px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-st-ink/25">
      {body}
    </Link>
  );
}

export function GuideHome({ progress }: { progress: GuideProgress }) {
  const [tab, setTab] = useState<GuideTabKey>("demarrer");
  const [query, setQuery] = useState("");

  const needle = query.trim().toLowerCase();
  const current = GUIDE_TABS.find((t) => t.key === tab)!;
  const entries = needle
    ? GUIDE_ENTRIES.filter((e) => `${e.title} ${e.desc}`.toLowerCase().includes(needle))
    : current.entries;

  const done = STEPS.filter((s) => progress[s.key]).length;
  const next = STEPS.find((s) => !progress[s.key]);

  return (
    <div className="space-y-5">
      {/* Premiers pas : disparaît quand tout est fait */}
      {next && (
        <Card className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-[15px] font-semibold text-st-text">Vos premiers pas · {done} sur {STEPS.length}</p>
            <p className="mt-0.5 text-[13px] text-st-text-2">Quatre choses à faire une fois, avant votre premier passager.</p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {STEPS.map((s) => (
                <Link key={s.key} href={s.href} className="rounded-[7px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-st-ink/25">
                  <Badge tone={progress[s.key] ? "success" : "neutral"}>
                    {progress[s.key] ? <Check className="size-3" /> : <span className="h-2.5 w-2.5 rounded-full border-[1.5px] border-st-line-strong" />}
                    {s.label}
                  </Badge>
                </Link>
              ))}
            </div>
          </div>
          <LinkButton href={next.href} className="max-sm:w-full">
            {next.action}
            <ChevronRight />
          </LinkButton>
        </Card>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Segmented
          value={needle ? ("" as GuideTabKey) : tab}
          onChange={(k) => { setTab(k); setQuery(""); }}
          items={GUIDE_TABS.map((t) => ({ key: t.key, label: t.label, count: t.entries.length }))}
        />
        <TableSearch value={query} onChange={setQuery} placeholder="Chercher : paiement, route, IBAN…" className="sm:w-72" />
      </div>

      <p className="text-[13px] text-st-text-2">
        {needle ? `${entries.length} fiche${entries.length > 1 ? "s" : ""} pour « ${query.trim()} »` : current.intro}
      </p>

      {entries.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {entries.map((e) => <GuideCard key={e.slug} entry={e} />)}
        </div>
      ) : (
        <EmptyState title="Aucune fiche ne correspond" description="Essayez « paiement », « route » ou « IBAN »." />
      )}
    </div>
  );
}
