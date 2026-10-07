import Link from "next/link";
import { BarChart2, Bot, ChevronRight, Images, Mails, Star } from "lucide-react";
import { Card, PageHeader } from "@/components/pilote/studio";

export const metadata = { title: "Plus — Admin" };

// Pages utilisées occasionnellement. Le Dashboard n'y figure plus : il est en
// tête de la barre latérale. Liste à garder synchronisée avec PLUS_PREFIXES
// (components/admin/admin-nav.ts), qui allume « Plus » dans la navigation.
const PLUS_PAGES = [
  { href: "/admin/satisfaction", icon: Star, label: "Satisfaction", description: "Avis des clients après leur vol" },
  { href: "/admin/newsletter", icon: Mails, label: "Newsletter", description: "Abonnés et envois" },
  { href: "/admin/chat", icon: Bot, label: "Assistant", description: "Conversations du chatbot" },
  { href: "/admin/analytics", icon: BarChart2, label: "Analytiques", description: "Trafic et statistiques du site" },
  { href: "/admin/galerie", icon: Images, label: "Galerie", description: "Photos du site public" },
];

export default function AdminPlusPage() {
  return (
    <div className="pilote-studio space-y-5 font-sans text-st-text">
      <PageHeader title="Plus" />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {PLUS_PAGES.map(({ href, icon: Icon, label, description }) => (
          <Link key={href} href={href} className="group block rounded-[20px] outline-none focus-visible:ring-2 focus-visible:ring-st-ink/25">
            <Card interactive className="flex items-center gap-4">
              <span className="grid size-11 shrink-0 place-items-center rounded-[13px] bg-st-surface text-st-ink transition-colors group-hover:bg-st-ink-soft">
                <Icon size={20} strokeWidth={1.8} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[15px] font-semibold">{label}</span>
                <span className="mt-0.5 block text-[12.5px] leading-snug text-st-muted">{description}</span>
              </span>
              <ChevronRight size={18} className="shrink-0 text-st-muted transition-transform group-hover:translate-x-0.5" />
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
