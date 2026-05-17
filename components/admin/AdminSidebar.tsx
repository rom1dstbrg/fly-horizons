"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  CalendarCheck,
  CalendarDays,
  Route,
  Users,
  Ticket,
  Tag,
  MessageSquare,
  Settings,
  LogOut,
  Menu,
  X,
  ExternalLink,
} from "lucide-react";
import { logout } from "@/lib/actions/auth";

const NAV_ITEMS = [
  { href: "/admin",                   label: "Dashboard",       icon: LayoutDashboard },
  { href: "/admin/products",          label: "Produits",        icon: Package },
  { href: "/admin/orders",            label: "Commandes",       icon: ShoppingCart },
  { href: "/admin/reservations",      label: "Réservations",    icon: CalendarCheck },
  { href: "/admin/disponibilites",    label: "Disponibilités",  icon: CalendarDays },
  { href: "/admin/vols-sur-mesure",   label: "Vols sur mesure", icon: Route },
  { href: "/admin/clients",           label: "Clients",         icon: Users },
  { href: "/admin/vouchers",          label: "Vouchers",        icon: Ticket },
  { href: "/admin/coupons",           label: "Coupons",         icon: Tag },
  { href: "/admin/contacts",          label: "Messages",        icon: MessageSquare },
  { href: "/admin/settings",          label: "Paramètres",      icon: Settings },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const NavContent = () => (
    <>
      {/* Logo */}
      <div className="px-6 py-5 border-b border-border">
        <Link href="/" className="block">
          <Image
            src="/logo-sidebar-admin.png"
            alt="Fly Horizons Admin"
            width={160}
            height={40}
            className="h-10 w-auto object-contain"
            unoptimized
          />
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const isActive =
            href === "/admin"
              ? pathname === "/admin"
              : pathname.startsWith(href);

          return (
            <Link
              key={href}
              href={href}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
                isActive
                  ? "bg-primary/10 text-primary border border-primary/20"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              }`}
            >
              <Icon size={17} />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* External tools */}
      <div className="px-3 py-3 border-t border-border space-y-1">
        <a
          href="https://dashboard.stripe.com/acct_1LMvw92UU7RkMsk7/dashboard"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
        >
          <ExternalLink size={15} />
          Stripe
        </a>
        <a
          href="https://supabase.com/dashboard/project"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
        >
          <ExternalLink size={15} />
          Supabase
        </a>
      </div>

      {/* Logout */}
      <div className="px-3 py-3 border-t border-border">
        <form action={logout}>
          <button
            type="submit"
            className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors w-full"
          >
            <LogOut size={17} />
            Déconnexion
          </button>
        </form>
      </div>
    </>
  );

  return (
    <>
      {/* Sidebar desktop */}
      <aside className="hidden lg:flex flex-col fixed left-0 top-0 bottom-0 w-64 bg-card border-r border-border z-40">
        <NavContent />
      </aside>

      {/* Header mobile */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 h-16 bg-card border-b border-border flex items-center justify-between px-4">
        <Link href="/">
          <Image
            src="/logo-sidebar-admin.png"
            alt="Fly Horizons Admin"
            width={120}
            height={32}
            className="h-8 w-auto object-contain"
            unoptimized
          />
        </Link>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          {mobileOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Sidebar mobile */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40">
          <div
            className="absolute inset-0 bg-foreground/20"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="absolute left-0 top-0 bottom-0 w-64 bg-card border-r border-border flex flex-col pt-16">
            <NavContent />
          </aside>
        </div>
      )}
    </>
  );
}
