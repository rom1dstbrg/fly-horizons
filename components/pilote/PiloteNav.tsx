"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, PlaneTakeoff } from "lucide-react";

const LINKS = [
  { href: "/pilote", label: "Tableau de bord", icon: LayoutDashboard, exact: true },
  { href: "/pilote/annonces", label: "Mes annonces", icon: PlaneTakeoff, exact: false },
];

export function PiloteNav() {
  const pathname = usePathname();

  return (
    <nav className="border-b border-border bg-card">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 flex items-center gap-1 overflow-x-auto">
        {LINKS.map(({ href, label, icon: Icon, exact }) => {
          const active = exact ? pathname === href : pathname.startsWith(href);
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
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
