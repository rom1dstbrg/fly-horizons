import {
  CalendarCheck, Clock, Flag, LayoutDashboard, LayoutGrid, MessageSquare, Receipt, UserCog, Users,
  type LucideIcon,
} from "lucide-react";

// Navigation de l'admin (maquette validée le 01/10) : une seule liste pour la
// barre latérale du bureau et la barre du bas du téléphone. Module neutre (pas
// de "use client") : lisible côté serveur comme côté client.

export type AdminNavSection = "pilotage" | "relation" | "gestion";
export type AdminBadgeKey = "contacts" | "retours";

export type AdminNavItem = {
  id: string;
  icon: LucideIcon;
  label: string;
  /** Libellé de la barre du bas (téléphone). */
  short: string;
  href: string;
  section: AdminNavSection;
  badgeKey?: AdminBadgeKey;
};

export const SECTION_LABEL: Record<AdminNavSection, string> = {
  pilotage: "Pilotage",
  relation: "Relation",
  gestion: "Gestion",
};

export const ADMIN_NAV: AdminNavItem[] = [
  { id: "dashboard", icon: LayoutDashboard, label: "Dashboard", short: "Accueil", href: "/admin", section: "pilotage" },
  { id: "reservations", icon: CalendarCheck, label: "Réservations", short: "Réservations", href: "/admin/vols", section: "pilotage" },
  { id: "dispos", icon: Clock, label: "Disponibilités", short: "Dispos", href: "/admin/vols?tab=disponibilites", section: "pilotage" },
  { id: "clients", icon: Users, label: "Clients", short: "Clients", href: "/admin/clients", section: "relation" },
  { id: "contacts", icon: MessageSquare, label: "Contacts", short: "Contacts", href: "/admin/contacts", section: "relation", badgeKey: "contacts" },
  { id: "retours", icon: Flag, label: "Retours pilotes", short: "Retours", href: "/admin/retours", section: "relation", badgeKey: "retours" },
  { id: "equipe", icon: UserCog, label: "Équipe", short: "Équipe", href: "/admin/pilotes", section: "relation" },
  { id: "transactions", icon: Receipt, label: "Transactions", short: "Transactions", href: "/admin/transactions", section: "gestion" },
  { id: "plus", icon: LayoutGrid, label: "Plus", short: "Plus", href: "/admin/plus", section: "gestion" },
];

// Pages rangées sous « Plus ».
const PLUS_PREFIXES = [
  "/admin/plus", "/admin/satisfaction", "/admin/newsletter", "/admin/chat",
  "/admin/analytics", "/admin/galerie",
];

export function isAdminNavActive(item: AdminNavItem, pathname: string, tab: string | null): boolean {
  switch (item.id) {
    case "dashboard": return pathname === "/admin";
    case "reservations": return (pathname.startsWith("/admin/vols") && tab !== "disponibilites") || pathname.startsWith("/admin/reservations");
    case "dispos": return pathname.startsWith("/admin/vols") && tab === "disponibilites";
    case "plus": return PLUS_PREFIXES.some((p) => pathname.startsWith(p));
    default: return pathname.startsWith(item.href);
  }
}

export const ADMIN_SETTINGS_HREF = "/admin/settings";
export const ADMIN_NAV_COOKIE = "fh_admin_nav";

/** Onglets de la barre du bas ; le reste vit sous « Plus ». */
export const ADMIN_TAB_IDS = ["dashboard", "reservations", "clients", "contacts"];
