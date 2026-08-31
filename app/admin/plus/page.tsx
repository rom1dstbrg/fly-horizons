import Link from "next/link";
import {
  LayoutDashboard, Route, UserCog, Ticket, Tag,
  Star, Mails, Bot, BarChart2, Images, Mail,
} from "lucide-react";
import { PageHeader } from "@/components/admin/PageHeader";

export const metadata = { title: "Plus — Admin" };

const PLUS_PAGES = [
  { href: "/admin",                       icon: LayoutDashboard, label: "Vue globale",     description: "Statistiques et activité récente" },
  { href: "/admin/vols?tab=sur-mesure",   icon: Route,           label: "Vol sur mesure",  description: "Escales, itinéraires libres, demandes perso" },
  { href: "/admin/pilotes",               icon: UserCog,         label: "Pilotes",         description: "Équipe et marketplace pilotes" },
  { href: "/admin/boutique?tab=vouchers", icon: Ticket,          label: "Vouchers",        description: "Codes cadeaux vendus et disponibles" },
  { href: "/admin/boutique?tab=coupons",  icon: Tag,             label: "Coupons",         description: "Codes promo" },
  { href: "/admin/satisfaction",          icon: Star,            label: "Satisfaction",    description: "Retours clients après vol" },
  { href: "/admin/newsletter",            icon: Mails,           label: "Newsletter",      description: "Abonnés et envois" },
  { href: "/admin/chat",                  icon: Bot,             label: "Assistant",       description: "Conversations du chatbot IA" },
  { href: "/admin/analytics",             icon: BarChart2,       label: "Analytiques",     description: "Trafic et statistiques du site" },
  { href: "/admin/galerie",               icon: Images,          label: "Galerie",         description: "Photos du site public" },
  { href: "/admin/emails-preview",        icon: Mail,            label: "Emails",          description: "Aperçu des modèles envoyés aux clients" },
];

export default function AdminPlusPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Plus" subtitle="Pages utilisées occasionnellement." />

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {PLUS_PAGES.map(({ href, icon: Icon, label, description }) => (
          <Link
            key={href}
            href={href}
            className="card-premium p-5 flex flex-col gap-3 hover:border-primary/40 hover:-translate-y-0.5 transition-all"
          >
            <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center text-navy">
              <Icon size={18} />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">{label}</p>
              <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{description}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
