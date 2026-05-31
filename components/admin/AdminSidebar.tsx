"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useSearchParams } from "next/navigation";
import { useState, useEffect, Suspense } from "react";
import {
  LayoutDashboard, Users, MessageSquare, Settings, LogOut,
  Menu, X, ExternalLink, ShoppingBag, Search, ChevronRight,
  CalendarCheck, Route, Clock,
  ShoppingCart, Package, Ticket, Tag,
} from "lucide-react";
import { PremiumPlaneIcon } from "@/components/admin/PremiumPlaneIcon";
import { logout } from "@/lib/actions/auth";

type NavItem  = { label: string; href: string; icon: React.ElementType; tab?: string };
type NavLink  = { type: "link";  id: string; icon: React.ElementType; label: string; href: string; exact?: boolean };
type NavGroup = { type: "group"; id: string; icon: React.ElementType; label: string; items: NavItem[]; activePrefix: string };
type NavEntry = NavLink | NavGroup;

const NAVIGATION: NavEntry[] = [
  { type: "link",  id: "dashboard", icon: LayoutDashboard, label: "Vue globale", href: "/admin", exact: true },
  {
    type: "group", id: "vols", icon: PremiumPlaneIcon, label: "Activité Vols", activePrefix: "/admin/vols",
    items: [
      { label: "Réservations",   href: "/admin/vols",                    icon: CalendarCheck, tab: "reservations" },
      { label: "Sur mesure",     href: "/admin/vols?tab=sur-mesure",     icon: Route,         tab: "sur-mesure" },
      { label: "Disponibilités", href: "/admin/vols?tab=disponibilites", icon: Clock,         tab: "disponibilites" },
    ],
  },
  {
    type: "group", id: "boutique", icon: ShoppingBag, label: "Boutique", activePrefix: "/admin/boutique",
    items: [
      { label: "Commandes", href: "/admin/boutique",              icon: ShoppingCart, tab: "commandes" },
      { label: "Produits",  href: "/admin/boutique?tab=produits", icon: Package,      tab: "produits" },
      { label: "Vouchers",  href: "/admin/boutique?tab=vouchers", icon: Ticket,       tab: "vouchers" },
      { label: "Coupons",   href: "/admin/boutique?tab=coupons",  icon: Tag,          tab: "coupons" },
    ],
  },
  { type: "link", id: "clients",        icon: Users,         label: "Clients",        href: "/admin/clients" },
  { type: "link", id: "communications", icon: MessageSquare, label: "Communications", href: "/admin/contacts" },
  { type: "link", id: "settings",       icon: Settings,      label: "Paramètres",     href: "/admin/settings" },
];

function isGroupActive(group: NavGroup, pathname: string) {
  return pathname.startsWith(group.activePrefix);
}

function openPalette() {
  document.dispatchEvent(new CustomEvent("openCommandPalette"));
}

function NavContentInner({ onClose }: { onClose?: () => void }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentTab = searchParams.get("tab");

  const initialOpen = NAVIGATION
    .filter((e): e is NavGroup => e.type === "group")
    .filter(g => isGroupActive(g, pathname))
    .map(g => g.id);

  const [openGroups, setOpenGroups] = useState<string[]>(initialOpen);

  useEffect(() => {
    const active = NAVIGATION
      .filter((e): e is NavGroup => e.type === "group")
      .filter(g => isGroupActive(g, pathname))
      .map(g => g.id);
    setOpenGroups(prev => [...new Set([...prev, ...active])]);
  }, [pathname]);

  function toggleGroup(id: string) {
    setOpenGroups(prev => prev.includes(id) ? prev.filter(g => g !== id) : [...prev, id]);
  }

  function isSubItemActive(item: NavItem, groupPrefix: string): boolean {
    const base = groupPrefix; // e.g. "/admin/vols" or "/admin/boutique"
    if (pathname !== base) return false;
    const defaultTabs: Record<string, string> = {
      "/admin/vols": "reservations",
      "/admin/boutique": "commandes",
    };
    const activeTab = currentTab ?? defaultTabs[base] ?? "";
    return activeTab === item.tab;
  }

  return (
    <div className="flex flex-col h-full bg-card border-r border-border">

      {/* Logo */}
      <div className="flex items-center h-16 px-5 border-b border-border shrink-0">
        <Link href="/" className="block">
          <Image
            src="/fly-horizons-logo-admin.svg"
            alt="Fly Horizons"
            width={140}
            height={36}
            className="h-9 w-auto object-contain"
            style={{ width: "auto" }}
            priority
            unoptimized
          />
        </Link>
      </div>

      {/* CMD+K search trigger */}
      <div className="px-3 py-3 shrink-0">
        <button
          onClick={openPalette}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg bg-secondary border border-border text-muted-foreground text-sm hover:border-navy/20 hover:bg-secondary/80 transition-all"
        >
          <Search size={13} className="shrink-0" />
          <span className="flex-1 text-left text-xs text-muted-foreground/70">Rechercher…</span>
          <kbd className="hidden sm:inline-flex items-center gap-0.5 text-[10px] font-mono bg-background border border-border rounded px-1.5 py-0.5 text-muted-foreground/50">
            ⌘K
          </kbd>
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-1 px-2.5 space-y-0.5">
        {NAVIGATION.map(entry => {

          if (entry.type === "link") {
            const isActive = entry.exact ? pathname === entry.href : pathname.startsWith(entry.href);
            const Icon = entry.icon;
            return (
              <Link
                key={entry.id}
                href={entry.href}
                onClick={onClose}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? "bg-navy text-white shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                }`}
              >
                <Icon size={15} className="shrink-0" />
                {entry.label}
              </Link>
            );
          }

          // Group
          const isOpen = openGroups.includes(entry.id);
          const activeGroup = isGroupActive(entry, pathname);
          const Icon = entry.icon;

          return (
            <div key={entry.id}>
              <button
                onClick={() => toggleGroup(entry.id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeGroup && !isOpen
                    ? "text-navy bg-navy/5"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                }`}
              >
                <Icon size={15} className="shrink-0" />
                <span className="flex-1 text-left">{entry.label}</span>
                <ChevronRight
                  size={13}
                  className={`shrink-0 transition-transform duration-200 ${isOpen ? "rotate-90" : ""}`}
                />
              </button>

              {isOpen && (
                <div className="ml-3.5 mt-0.5 mb-1 pl-3 border-l-2 border-border space-y-0.5">
                  {entry.items.map(item => {
                    const SubIcon = item.icon;
                    const isActive = isSubItemActive(item, entry.activePrefix);
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={onClose}
                        className={`flex items-center gap-2 px-2.5 py-1.5 rounded-md text-sm transition-all ${
                          isActive
                            ? "text-navy font-semibold bg-navy/8"
                            : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                        }`}
                      >
                        <SubIcon size={13} className="shrink-0" />
                        {item.label}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* External tools */}
      <div className="px-2.5 pt-2 pb-1 border-t border-border shrink-0">
        <p className="px-3 mb-1.5 text-[9px] font-bold text-muted-foreground/40 uppercase tracking-[1.5px]">Outils</p>
        {[
          { href: "https://app.netlify.com/teams/rom1dstbrg/projects", label: "Netlify" },
          { href: "https://supabase.com/dashboard",                    label: "Supabase" },
          { href: "https://resend.com",                                label: "Resend" },
          { href: "https://dashboard.stripe.com/acct_1LMvw92UU7RkMsk7/dashboard", label: "Stripe" },
        ].map(({ href, label }) => (
          <a
            key={href}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-secondary transition-all"
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
            className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-all w-full"
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

export function AdminSidebar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:block fixed left-0 top-0 bottom-0 w-64 z-40">
        <NavContent />
      </aside>

      {/* Mobile top bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 h-16 bg-card border-b border-border flex items-center justify-between px-4">
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
        <div className="flex items-center gap-2">
          <button
            onClick={openPalette}
            className="p-2 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-colors"
          >
            <Search size={18} />
          </button>
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="p-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40">
          <div className="absolute inset-0 bg-foreground/20 backdrop-blur-[1px]" onClick={() => setMobileOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-64 pt-16">
            <NavContent onClose={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}
    </>
  );
}
