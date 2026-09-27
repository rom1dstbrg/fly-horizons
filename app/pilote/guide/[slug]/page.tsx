import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowUpRight, ChevronLeft, ChevronRight, Clock } from "lucide-react";
import { Badge, Card, LinkButton, PageHeader, UnderConstruction } from "@/components/pilote/studio";
import { guideEntry, guideNeighbours } from "@/components/pilote/guide/catalog";
import { ReservationParcours } from "@/components/pilote/guide/ReservationParcours";
import { GuideCharte, GuideContact, GuideInstaller } from "@/components/pilote/guide/GuideSimple";

// Fiche du guide pilote. Une fiche pas encore rédigée affiche « En construction ».
const CONTENT: Record<string, () => React.ReactNode> = {
  reservation: () => <ReservationParcours />,
  installer: () => <GuideInstaller />,
  charte: () => <GuideCharte />,
  contact: () => <GuideContact />,
};

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const entry = guideEntry(slug);
  return { title: `${entry?.title ?? "Guide"} — Guide pilote` };
}

export default async function GuideFichePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const entry = guideEntry(slug);
  if (!entry || entry.soon) notFound();

  const render = entry.ready ? CONTENT[slug] : undefined;
  const { prev, next } = guideNeighbours(slug);

  return (
    <div className="space-y-5">
      <PageHeader
        back={{ href: "/pilote/guide", label: "Guide pilote" }}
        title={entry.title}
        actions={entry.href ? (
          <LinkButton href={entry.href} variant="secondary">
            Ouvrir la page <ArrowUpRight />
          </LinkButton>
        ) : undefined}
      />
      <div className="-mt-2 space-y-3">
        <p className="max-w-2xl text-[14.5px] leading-relaxed text-st-text-2">{entry.desc}</p>
        <div className="flex flex-wrap gap-1.5">
          <Badge><Clock className="size-3" />{entry.min} min</Badge>
        </div>
      </div>

      {render ? render() : (
        <UnderConstruction title="Cette fiche arrive bientôt">
          Nous la rédigeons en ce moment. En attendant, une question sur ce sujet : écrivez-nous sur WhatsApp ou
          depuis <Link href="/pilote/guide/contact" className="font-semibold text-st-ink hover:underline">Nous contacter</Link>.
        </UnderConstruction>
      )}

      {(prev || next) && (
        <nav className="grid gap-3 pt-4 sm:grid-cols-2" aria-label="Fiches voisines">
          {prev && !prev.soon ? (
            <Link href={`/pilote/guide/${prev.slug}`} className="block rounded-[20px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-st-ink/25">
              <Card interactive className="flex items-center gap-3">
                <ChevronLeft size={18} className="shrink-0 text-st-muted" />
                <span className="min-w-0">
                  <span className="block text-[12px] text-st-muted">Précédent</span>
                  <span className="block truncate text-[14px] font-semibold text-st-text">{prev.title}</span>
                </span>
              </Card>
            </Link>
          ) : <span />}
          {next && !next.soon && (
            <Link href={`/pilote/guide/${next.slug}`} className="block rounded-[20px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-st-ink/25">
              <Card interactive className="flex items-center justify-end gap-3 text-right">
                <span className="min-w-0">
                  <span className="block text-[12px] text-st-muted">Suivant</span>
                  <span className="block truncate text-[14px] font-semibold text-st-text">{next.title}</span>
                </span>
                <ChevronRight size={18} className="shrink-0 text-st-muted" />
              </Card>
            </Link>
          )}
        </nav>
      )}
    </div>
  );
}
