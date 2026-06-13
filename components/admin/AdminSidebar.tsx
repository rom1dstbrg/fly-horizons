"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useSearchParams } from "next/navigation";
import { useState, Suspense } from "react";
import {
  LayoutDashboard, Users, MessageSquare, Settings, LogOut,
  Menu, X, ExternalLink, Search,
  CalendarCheck, Route, Clock, Navigation,
  Package, Ticket, Tag,
} from "lucide-react";
import { logout } from "@/lib/actions/auth";

type NavSection = { type: "section"; label: string };
type NavLink = {
  type: "link";
  id: string;
  icon: React.ElementType;
  label: string;
  href: string;
  exact?: boolean;
  tab?: string;
  tabBase?: string;
};
type NavEntry = NavLink | NavSection;

const DEFAULT_TABS: Record<string, string> = {
  "/admin/vols":     "reservations",
  "/admin/boutique": "vouchers",
};

const NAVIGATION: NavEntry[] = [
  { type: "link", id: "dashboard",      icon: LayoutDashboard, label: "Vue globale",    href: "/admin",           exact: true },
  { type: "section", label: "Vols" },
  { type: "link", id: "reservations",   icon: CalendarCheck,   label: "Réservations",   href: "/admin/vols",                    tab: "reservations",   tabBase: "/admin/vols"     },
  { type: "link", id: "sur-mesure",     icon: Route,           label: "Sur mesure",     href: "/admin/vols?tab=sur-mesure",     tab: "sur-mesure",     tabBase: "/admin/vols"     },
  { type: "link", id: "disponibilites", icon: Clock,           label: "Disponibilités", href: "/admin/vols?tab=disponibilites", tab: "disponibilites", tabBase: "/admin/vols"     },
  { type: "link", id: "itineraires",    icon: Navigation,      label: "Itinéraires",    href: "/admin/itineraires" },
  { type: "section", label: "Boutique" },
  { type: "link", id: "vouchers",  icon: Ticket,  label: "Vouchers",  href: "/admin/boutique",               tab: "vouchers",  tabBase: "/admin/boutique" },
  { type: "link", id: "produits",  icon: Package, label: "Offres",    href: "/admin/boutique?tab=produits",  tab: "produits",  tabBase: "/admin/boutique" },
  { type: "link", id: "coupons",   icon: Tag,     label: "Coupons",   href: "/admin/boutique?tab=coupons",   tab: "coupons",   tabBase: "/admin/boutique" },
  { type: "section", label: "" },
  { type: "link", id: "clients",        icon: Users,         label: "Clients",        href: "/admin/clients"  },
  { type: "link", id: "communications", icon: MessageSquare, label: "Communications", href: "/admin/contacts" },
  { type: "link", id: "settings",       icon: Settings,      label: "Paramètres",     href: "/admin/settings" },
];

function isLinkActive(item: NavLink, pathname: string, currentTab: string | null): boolean {
  if (item.exact) return pathname === item.href;
  if (item.tab && item.tabBase) {
    if (pathname !== item.tabBase) return false;
    const active = currentTab ?? DEFAULT_TABS[item.tabBase] ?? "";
    return active === item.tab;
  }
  return pathname.startsWith(item.href);
}

function openPalette() {
  document.dispatchEvent(new CustomEvent("openCommandPalette"));
}

function NavContentInner({ onClose }: { onClose?: () => void }) {
  const pathname   = usePathname();
  const searchParams = useSearchParams();
  const currentTab = searchParams.get("tab");

  return (
    <div className="flex flex-col h-full bg-card border-r border-border">

      {/* Logo + close */}
      <div className="flex items-center justify-between h-14 lg:h-16 px-5 border-b border-border shrink-0">
        <Link href="/" className="block">
          <Image
            src="/fly-horizons-logo-admin.svg"
            alt="Fly Horizons"
            width={140}
            height={36}
            className="h-8 w-auto object-contain"
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

      {/* CMD+K search trigger */}
      <div className="px-3 py-3 shrink-0">
        <button
          onClick={() => { openPalette(); onClose?.(); }}
          className="w-full flex items-center gap-2.5 px-3 py-2.5 lg:py-2 rounded-lg bg-secondary border border-border text-muted-foreground text-sm hover:border-navy/20 hover:bg-secondary/80 transition-all cursor-pointer"
        >
          <Search size={13} className="shrink-0" />
          <span className="flex-1 text-left text-xs text-muted-foreground/70">Rechercher…</span>
          <kbd className="hidden lg:inline-flex items-center gap-0.5 text-[10px] font-mono bg-background border border-border rounded px-1.5 py-0.5 text-muted-foreground/50">
            ⌘K
          </kbd>
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-1 px-2.5 space-y-0.5">
        {NAVIGATION.map((entry, i) => {
          if (entry.type === "section") {
            return (
              <div key={`section-${i}`} className={entry.label ? "pt-3 pb-1 px-3" : "pt-2"}>
                {entry.label && (
                  <p className="text-[9px] font-bold text-muted-foreground/40 uppercase tracking-[1.5px]">
                    {entry.label}
                  </p>
                )}
              </div>
            );
          }

          const isActive = isLinkActive(entry, pathname, currentTab);
          const Icon = entry.icon;
          return (
            <Link
              key={entry.id}
              href={entry.href}
              onClick={onClose}
              className={`flex items-center gap-2.5 px-3 py-2.5 lg:py-2 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? "bg-navy text-white shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary"
              }`}
            >
              <Icon size={15} className="shrink-0" />
              {entry.label}
            </Link>
          );
        })}
      </nav>

      {/* External tools */}
      <div className="px-2.5 pt-2 pb-1 border-t border-border shrink-0">
        <p className="px-3 mb-1.5 text-[9px] font-bold text-muted-foreground/40 uppercase tracking-[1.5px]">Outils</p>
        {[
          { href: "https://app.netlify.com/teams/rom1dstbrg/projects",             label: "Netlify"  },
          { href: "https://supabase.com/dashboard",                                label: "Supabase" },
          { href: "https://resend.com",                                            label: "Resend"   },
          { href: "https://dashboard.stripe.com/acct_1LMvw92UU7RkMsk7/dashboard", label: "Stripe"   },
        ].map(({ href, label }) => (
          <a
            key={href}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2.5 px-3 py-2 lg:py-1.5 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-secondary transition-all"
          >
            <ExternalLink size={11} className="shrink-0 text-muted-foreground/50" />
            {label}
          </a>
        ))}
      </div>

      {/* Logout */}
      <div className="px-2.5 py-3 border-t border-border shrink-0">
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

function NavContent({ onClose }: { onClose?: () => void }) {
  return (
    <Suspense fallback={null}>
      <NavContentInner onClose={onClose} />
    </Suspense>
  );
}

const BOTTOM_NAV = [
  { id: "dashboard", icon: LayoutDashboard, label: "Accueil",  href: "/admin",          exact: true },
  { id: "vols",      icon: CalendarCheck,   label: "Vols",     href: "/admin/vols",     base: "/admin/vols"     },
  { id: "boutique",  icon: Package,         label: "Boutique", href: "/admin/boutique", base: "/admin/boutique" },
  { id: "clients",   icon: Users,           label: "Clients",  href: "/admin/clients",  base: "/admin/clients"  },
] as const;

function BottomNavInner({ onMenuOpen }: { onMenuOpen: () => void }) {
  const pathname = usePathname();

  function isActive(item: typeof BOTTOM_NAV[number]): boolean {
    if ("exact" in item && item.exact) return pathname === item.href;
    if ("base" in item) return pathname.startsWith(item.base);
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

export function AdminSidebar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:block fixed left-0 top-0 bottom-0 w-64 z-40">
        <NavContent />
      </aside>

      {/* Mobile top bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 h-14 bg-card border-b border-border flex items-center justify-between px-4">
        <Link href="/">
          <Image
            src="/fly-horizons-logo-admin.svg"
            alt="Fly Horizons"
            width={120}
            height={32}
            className="h-8 w-auto object-contain"
            style={{ width: "auto" }}
            unoptimized
          />
        </Link>
        <button
          onClick={openPalette}
          className="p-2 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-colors cursor-pointer"
          aria-label="Rechercher"
        >
          <Search size={18} />
        </button>
      </div>

      {/* Mobile bottom nav */}
      <BottomNavInner onMenuOpen={() => setMobileOpen(true)} />

      {/* Mobile drawer avec animation */}
      <div
        className={`lg:hidden fixed inset-0 z-[60] transition-all duration-300 ${
          mobileOpen ? "pointer-events-auto" : "pointer-events-none"
        }`}
      >
        {/* Backdrop */}
        <div
          className={`absolute inset-0 bg-foreground/30 backdrop-blur-[2px] transition-opacity duration-300 ${
            mobileOpen ? "opacity-100" : "opacity-0"
          }`}
          onClick={() => setMobileOpen(false)}
        />
        {/* Panel glissant */}
        <aside
          className={`absolute left-0 top-0 bottom-0 w-[280px] max-w-[85vw] transition-transform duration-300 ease-out ${
            mobileOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <NavContent onClose={() => setMobileOpen(false)} />
        </aside>
      </div>
    </>
  );
}
