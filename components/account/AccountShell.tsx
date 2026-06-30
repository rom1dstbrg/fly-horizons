"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarDays,
  Ticket,
  MapPin,
  Mails,
  ShieldCheck,
  User,
  LayoutDashboard,
  LogOut,
} from "lucide-react";
import { logout } from "@/lib/actions/auth";

const NAV = [
  { href: "/account",              label: "Aperçu",       Icon: User,         exact: true  },
  { href: "/account/reservations", label: "Réservations", Icon: CalendarDays, exact: false },
  { href: "/account/bons",         label: "Bons de vol",  Icon: Ticket,       exact: false },
  { href: "/account/adresses",     label: "Adresses",     Icon: MapPin,       exact: false },
  { href: "/account/newsletter",   label: "Newsletter",   Icon: Mails,        exact: false },
  { href: "/account/securite",     label: "Sécurité",     Icon: ShieldCheck,  exact: false },
] as const;

function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .slice(0, 2)
    .join("");
}

export function AccountShell({
  user,
  children,
}: {
  user: { email: string; full_name: string; is_admin: boolean };
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const active = (href: string, exact: boolean) =>
    exact ? pathname === href : pathname.startsWith(href);

  return (
    <main className="min-h-screen bg-gradient-navy pt-24 pb-16">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">

        {/* Mobile sticky tab bar */}
        <div className="lg:hidden sticky top-[72px] z-40 -mx-4 sm:-mx-6 px-4 sm:px-6 py-2.5 bg-card/90 backdrop-blur border-b border-border mb-6">
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
            {NAV.map(({ href, label, Icon, exact }) => (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors shrink-0 ${
                  active(href, exact)
                    ? "bg-navy text-white"
                    : "bg-secondary border border-border text-muted-foreground"
                }`}
              >
                <Icon size={12} />
                {label}
              </Link>
            ))}
          </div>
        </div>

        <div className="flex gap-8 lg:gap-10">

          {/* Desktop sidebar */}
          <aside className="hidden lg:block w-52 shrink-0 sticky top-28 self-start">
            <div className="space-y-1">

              {/* User summary */}
              <div className="px-3 pb-4 mb-1">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-navy flex items-center justify-center shrink-0">
                    <span className="text-xs font-bold text-white">
                      {initials(user.full_name || user.email)}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate leading-tight">
                      {user.full_name || "Mon compte"}
                    </p>
                    <p className="text-[10px] text-muted-foreground truncate">{user.email}</p>
                  </div>
                </div>
              </div>

              <nav className="space-y-0.5">
                {NAV.map(({ href, label, Icon, exact }) => {
                  const isActive = active(href, exact);
                  return (
                    <Link
                      key={href}
                      href={href}
                      className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                        isActive
                          ? "bg-navy text-white shadow-sm"
                          : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                      }`}
                    >
                      <Icon size={15} className={isActive ? "opacity-100" : "opacity-50"} />
                      <span className="flex-1">{label}</span>
                    </Link>
                  );
                })}
              </nav>

              {user.is_admin && (
                <div className="pt-2">
                  <Link
                    href="/admin"
                    className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium text-primary hover:bg-primary/8 transition-all"
                  >
                    <LayoutDashboard size={15} className="opacity-70" />
                    Dashboard admin
                  </Link>
                </div>
              )}

              <div className="pt-3 mt-1 border-t border-border">
                <form action={logout}>
                  <button
                    type="submit"
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-red-600 hover:bg-red-50 transition-all text-left cursor-pointer"
                  >
                    <LogOut size={15} className="opacity-50" />
                    Déconnexion
                  </button>
                </form>
              </div>
            </div>
          </aside>

          {/* Page content */}
          <div className="flex-1 min-w-0">
            {children}
          </div>

        </div>
      </div>
    </main>
  );
}
