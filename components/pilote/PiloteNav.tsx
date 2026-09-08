"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, PlaneTakeoff, Plane, Scale, User, Megaphone } from "lucide-react";

const LINKS = [
  { href: "/pilote", label: "Tableau de bord", icon: LayoutDashboard, exact: true },
  { href: "/pilote/annonces", label: "Mes annonces", icon: PlaneTakeoff, exact: false },
  { href: "/pilote/vols", label: "Mes vols", icon: Plane, exact: false },
  { href: "/pilote/offres", label: "Offres", icon: Megaphone, exact: false },
  { href: "/pilote/mass-balance", label: "Masse & centrage", icon: Scale, exact: false },
  { href: "/pilote/profil", label: "Mon profil", icon: User, exact: false },
];

export function PiloteNav({ counts = {} }: { counts?: Record<string, number> }) {
  const pathname = usePathname();

  return (
    <nav className="border-b border-border bg-card">
      <div className="w-full px-4 sm:px-6 lg:px-8 flex items-center gap-1 overflow-x-auto">
        {LINKS.map(({ href, label, icon: Icon, exact }) => {
          const active = exact ? pathname === href : pathname.startsWith(href);
          const count = counts[href] ?? 0;
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-1.5 px-3 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                active
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon size={14} />
              {label}
              {count > 0 && (
                <span
                  aria-label={`${count} élément${count > 1 ? "s" : ""} à voir`}
                  className="ml-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold leading-none text-white"
                >
                  {count}
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
