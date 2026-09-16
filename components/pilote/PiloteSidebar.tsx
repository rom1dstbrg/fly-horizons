"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard, PlaneTakeoff, Plane, CalendarRange, Scale, User,
  ArrowLeftRight, LogOut, Menu, X,
} from "lucide-react";
import { logout } from "@/lib/actions/auth";

// ── Chrome de navigation de l'espace pilote ─────────────────────────────────
// Même structure que components/admin/AdminSidebar.tsx (sidebar navy groupée
// desktop, top bar + bottom nav mobile) — un seul vocabulaire de nav pour les
// deux espaces, pas une variante maison plus légère.

export interface PilotIdInfo {
  nom: string;
  licenceNumero: string | null;
  licenceExpiration: string | null;
  medicalExpiration: string | null;
  legalOk: boolean;
  legalWarn: boolean;
}

function frDate(iso: string | null): string {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return d && m && y ? `${d}/${m}/${y}` : iso;
}

type NavSection = { type: "section"; label: string };
type NavLink = {
  type: "link";
  id: string;
  icon: React.ElementType;
  label: string;
  href: string;
  exact?: boolean;
  badgeKey?: string;
};
type NavEntry = NavLink | NavSection;

const NAVIGATION: NavEntry[] = [
  { type: "link", id: "dashboard", icon: LayoutDashboard, label: "Tableau de bord", href: "/pilote", exact: true },

  { type: "section", label: "Vols" },
  { type: "link", id: "vols",      icon: Plane,         label: "Mes vols",         href: "/pilote/vols",           badgeKey: "/pilote/vols" },
  { type: "link", id: "annonces",  icon: PlaneTakeoff,  label: "Mes annonces",     href: "/pilote/annonces" },
  { type: "link", id: "dispos",    icon: CalendarRange, label: "Disponibilités",   href: "/pilote/disponibilites" },

  { type: "section", label: "Réglages" },
  { type: "link", id: "mb",     icon: Scale, label: "Masse & centrage", href: "/pilote/mass-balance" },
  { type: "link", id: "profil", icon: User,  label: "Mon profil",       href: "/pilote/profil", badgeKey: "/pilote/profil" },
];

function isLinkActive(item: NavLink, pathname: string): boolean {
  if (item.exact) return pathname === item.href;
  if (item.id === "vols") return pathname.startsWith("/pilote/vols") || pathname.startsWith("/pilote/reservations");
  return pathname.startsWith(item.href);
}

function NavContent({
  counts,
  pilot,
  isAdmin,
  onClose,
}: {
  counts: Record<string, number>;
  pilot?: PilotIdInfo | null;
  isAdmin?: boolean;
  onClose?: () => void;
}) {
  const pathname = usePathname();

  return (
    <div className="flex flex-col h-full bg-card border-r border-border">
      {/* Logo + close */}
      <div className="flex items-center justify-between h-14 lg:h-16 px-5 border-b border-border shrink-0">
        <Link href="/pilote" className="flex items-center" onClick={onClose}>
          <Image
            src="/fly-horizons-logo-navy.svg"
            alt="Fly Horizons"
            width={130}
            height={32}
            className="h-6 w-auto object-contain"
            style={{ width: "auto" }}
            priority
            unoptimized
          />
        </Link>
        {onClose && (
          <button
            onClick={onClose}
            className="lg:hidden p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer"
            aria-label="Fermer le menu"
          >
            <X size={18} />
          </button>
        )}
      </div>

      {/* Plaque pilote — identité, licence, medical. Fond plat, pas de bloc navy :
          la hiérarchie vient de la bordure et du poids du texte, pas d'une ombre. */}
      {pilot && (
        <div className="px-4 pt-3.5 pb-3 border-b border-border shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-[13px] font-semibold text-foreground truncate">{pilot.nom}</span>
            <span
              className={`h-1.5 w-1.5 rounded-full shrink-0 ${
                !pilot.legalOk ? "bg-red-500" : pilot.legalWarn ? "bg-amber-500" : "bg-emerald-500"
              }`}
            />
          </div>
          <p className="mt-1 font-mono text-[10px] text-muted-foreground/70">
            {pilot.licenceNumero || "—"} · lic. {frDate(pilot.licenceExpiration)} · med. {frDate(pilot.medicalExpiration)}
          </p>
        </div>
      )}

      {/* Nav — hiérarchie par bordure + ton de gris, pas de bloc plein ni d'ombre */}
      <nav className="flex-1 overflow-y-auto py-2 px-2.5 space-y-px">
        {NAVIGATION.map((entry, i) => {
          if (entry.type === "section") {
            return (
              <div key={`section-${i}`} className="pt-3.5 pb-1 px-3">
                <p className="text-[9px] font-semibold text-muted-foreground/45 uppercase tracking-[1px]">
                  {entry.label}
                </p>
              </div>
            );
          }

          const isActive = isLinkActive(entry, pathname);
          const Icon = entry.icon;
          const badgeCount = entry.badgeKey ? counts[entry.badgeKey] ?? 0 : 0;
          return (
            <Link
              key={entry.id}
              href={entry.href}
              onClick={onClose}
              className={`flex items-center gap-2.5 pl-2.5 pr-3 py-2 lg:py-1.5 border-l-2 text-sm transition-colors ${
                isActive
                  ? "border-navy bg-secondary/60 text-navy font-semibold"
                  : "border-transparent text-muted-foreground font-medium hover:text-foreground hover:bg-secondary/40"
              }`}
            >
              <Icon size={15} className="shrink-0" />
              <span className="flex-1">{entry.label}</span>
              {badgeCount > 0 && (
                <span className={`shrink-0 min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold flex items-center justify-center ${
                  isActive ? "bg-primary/20 text-navy" : "bg-primary/15 text-primary"
                }`}>
                  {badgeCount > 99 ? "99+" : badgeCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Vue admin (si double rôle) + déconnexion */}
      <div className="px-2.5 pt-2 pb-[calc(0.75rem+env(safe-area-inset-bottom))] border-t border-border shrink-0 space-y-0.5">
        {isAdmin && (
          <Link
            href="/admin"
            onClick={onClose}
            className="flex items-center gap-2.5 px-3 py-2.5 lg:py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-all"
          >
            <ArrowLeftRight size={15} className="shrink-0" />
            Vue admin
          </Link>
        )}
        <form action={logout}>
          <button
            type="submit"
            className="flex items-center gap-2.5 px-3 py-2.5 lg:py-2 rounded-lg text-sm text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-all w-full cursor-pointer"
          >
            <LogOut size={14} />
            Déconnexion
          </button>
        </form>
      </div>
    </div>
  );
}

const BOTTOM_NAV = [
  { id: "dashboard", icon: LayoutDashboard, label: "Accueil",  href: "/pilote",           exact: true },
  { id: "vols",      icon: Plane,           label: "Vols",     href: "/pilote/vols" },
  { id: "annonces",  icon: PlaneTakeoff,    label: "Annonces", href: "/pilote/annonces" },
  { id: "dispos",    icon: CalendarRange,   label: "Dispos",   href: "/pilote/disponibilites" },
] as const;

function BottomNavInner({ onMenuOpen }: { onMenuOpen: () => void }) {
  const pathname = usePathname();

  function isActive(item: typeof BOTTOM_NAV[number]): boolean {
    if ("exact" in item && item.exact) return pathname === item.href;
    return pathname.startsWith(item.href);
  }

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border flex items-stretch" style={{ height: "calc(60px + env(safe-area-inset-bottom))", paddingBottom: "env(safe-area-inset-bottom)" }}>
      {BOTTOM_NAV.map((item) => {
        const Icon = item.icon;
        const active = isActive(item);
        return (
          <Link
            key={item.id}
            href={item.href}
            className={`flex-1 flex flex-col items-center justify-center gap-0.5 text-[10px] font-semibold transition-colors cursor-pointer ${
              active ? "text-navy" : "text-muted-foreground"
            }`}
          >
            <Icon size={20} strokeWidth={active ? 2.5 : 1.75} />
            <span>{item.label}</span>
          </Link>
        );
      })}
      <button
        onClick={onMenuOpen}
        className="flex-1 flex flex-col items-center justify-center gap-0.5 text-[10px] font-semibold text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
      >
        <Menu size={20} strokeWidth={1.75} />
        <span>Plus</span>
      </button>
    </nav>
  );
}

export function PiloteSidebar({
  counts = {},
  pilot,
  isAdmin = false,
}: {
  counts?: Record<string, number>;
  pilot?: PilotIdInfo | null;
  isAdmin?: boolean;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:block fixed left-0 top-0 bottom-0 w-64 z-40">
        <NavContent counts={counts} pilot={pilot} isAdmin={isAdmin} />
      </aside>

      {/* Mobile top bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 h-14 bg-card border-b border-border flex items-center justify-between px-4">
        <Link href="/pilote" className="flex items-center">
          <Image
            src="/fly-horizons-logo-navy.svg"
            alt="Fly Horizons"
            width={110}
            height={28}
            className="h-6 w-auto object-contain"
            style={{ width: "auto" }}
            unoptimized
          />
        </Link>
      </div>

      {/* Mobile bottom nav */}
      <BottomNavInner onMenuOpen={() => setMobileOpen(true)} />

      {/* Mobile drawer */}
      <div
        className={`lg:hidden fixed inset-0 z-[60] transition-all duration-300 ${
          mobileOpen ? "pointer-events-auto" : "pointer-events-none"
        }`}
      >
        <div
          className={`absolute inset-0 bg-foreground/30 backdrop-blur-[2px] transition-opacity duration-300 ${
            mobileOpen ? "opacity-100" : "opacity-0"
          }`}
          onClick={() => setMobileOpen(false)}
        />
        <aside
          className={`absolute right-0 top-0 bottom-0 w-[280px] max-w-[85vw] transition-transform duration-300 ease-out ${
            mobileOpen ? "translate-x-0" : "translate-x-full"
          }`}
        >
          <NavContent counts={counts} pilot={pilot} isAdmin={isAdmin} onClose={() => setMobileOpen(false)} />
        </aside>
      </div>
    </>
  );
}
