"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard, PlaneTakeoff, Plane, CalendarRange, Scale, User,
  ArrowLeftRight, LogOut, AlertCircle, ChevronDown,
} from "lucide-react";
import { logout } from "@/lib/actions/auth";
import { cn } from "@/lib/utils";

// ── Navigation de l'espace pilote (bureau) — style « Studio » (24/09) ────────
// Rail d'icônes de 76 px au repos, qui s'ouvre à 256 px au survol PAR-DESSUS le
// contenu (le contenu réserve seulement les 76 px) et se referme à la sortie de
// la souris — comportement gardé à la demande de Romain. Page active = fond
// gris + texte navy (plus de rail fin). Téléphone : voir PiloteTabBar.

export interface PilotIdInfo {
  nom: string;
  licenceNumero: string | null;
  licenceExpiration: string | null;
  medicalExpiration: string | null;
  legalOk: boolean;
  legalWarn: boolean;
  /** Détail des points bloquants/à surveiller — affiché au clic sur la plaque. */
  issues: { label: string; severity: "error" | "warn" }[];
}

export type PiloteNavItem = {
  id: string;
  icon: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
  label: string;
  /** Libellé court de la barre d'onglets du téléphone. */
  short: string;
  href: string;
  badgeKey?: string;
};

export const PILOTE_NAV: PiloteNavItem[] = [
  { id: "dashboard", icon: LayoutDashboard, label: "Tableau de bord", short: "Accueil", href: "/pilote" },
  { id: "vols", icon: Plane, label: "Mes vols", short: "Vols", href: "/pilote/vols", badgeKey: "/pilote/vols" },
  { id: "annonces", icon: PlaneTakeoff, label: "Mes annonces", short: "Annonces", href: "/pilote/annonces" },
  { id: "dispos", icon: CalendarRange, label: "Disponibilités", short: "Dispos", href: "/pilote/disponibilites" },
  { id: "mb", icon: Scale, label: "Masse & centrage", short: "M&B", href: "/pilote/mass-balance" },
  { id: "profil", icon: User, label: "Mon profil", short: "Profil", href: "/pilote/profil", badgeKey: "/pilote/profil" },
];

export function isPiloteNavActive(item: PiloteNavItem, pathname: string): boolean {
  if (item.href === "/pilote") return pathname === "/pilote";
  // Les pages de création de réservation vivent sous « Mes vols ».
  if (item.id === "vols") return pathname.startsWith("/pilote/vols") || pathname.startsWith("/pilote/reservations");
  if (item.id === "profil") return pathname.startsWith("/pilote/profil") || pathname.startsWith("/pilote/mot-de-passe");
  return pathname.startsWith(item.href);
}

export function frDate(iso: string | null): string {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return d && m && y ? `${d}/${m}/${y}` : iso;
}

export function initialsOf(nom: string): string {
  const parts = nom.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase() || "?";
}

// Avatar navy avec la pastille de statut légal (vert / orange / rouge).
export function PiloteAvatar({ pilot, size = 32 }: { pilot: PilotIdInfo; size?: number }) {
  return (
    <span
      className="relative grid shrink-0 place-items-center rounded-full bg-st-ink text-[12px] font-semibold text-white"
      style={{ width: size, height: size }}
    >
      {initialsOf(pilot.nom)}
      <span
        className={cn(
          "absolute -bottom-px -right-px h-2.5 w-2.5 rounded-full ring-2 ring-white",
          !pilot.legalOk ? "bg-st-bad" : pilot.legalWarn ? "bg-amber-500" : "bg-emerald-500",
        )}
      />
    </span>
  );
}

// Détail des points à corriger sur le profil (plaque pilote, feuille « Plus »).
export function PiloteIssues({ pilot, onNavigate }: { pilot: PilotIdInfo; onNavigate?: () => void }) {
  return (
    <div className="space-y-1">
      {pilot.issues.map((issue, i) => (
        <p key={i} className={cn("flex items-start gap-1.5 text-[12px] leading-snug", issue.severity === "error" ? "text-st-bad" : "text-st-warn")}>
          <AlertCircle size={12} className="mt-0.5 shrink-0" />
          {issue.label}
        </p>
      ))}
      <Link href="/pilote/profil" onClick={onNavigate} className="inline-block pt-0.5 text-[12px] font-semibold text-st-ink hover:underline">
        Corriger dans le profil →
      </Link>
    </div>
  );
}

const rowCls = "group relative flex h-10 w-full shrink-0 items-center gap-3 rounded-[11px] px-[14px] text-[13.5px] outline-none transition-colors focus-visible:ring-2 focus-visible:ring-st-ink/20";
const labelCls = (open: boolean) =>
  cn("min-w-0 flex-1 overflow-hidden whitespace-nowrap text-left transition-[opacity,transform] duration-200 ease-out", open ? "translate-x-0 opacity-100" : "-translate-x-1.5 opacity-0");

export function PiloteSidebar({ counts = {}, pilot, isAdmin = false }: {
  counts?: Record<string, number>;
  pilot?: PilotIdInfo | null;
  isAdmin?: boolean;
}) {
  const pathname = usePathname() ?? "";
  const [open, setOpen] = useState(false);
  const [showIssues, setShowIssues] = useState(false);

  return (
    <aside
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => { setOpen(false); setShowIssues(false); }}
      className={cn(
        "fixed inset-y-0 left-0 z-40 hidden flex-col gap-0.5 overflow-hidden border-r border-st-line bg-white px-3 py-3.5 transition-[width,box-shadow] duration-200 ease-out lg:flex",
        open ? "w-64 shadow-[0_24px_60px_-20px_rgba(15,17,23,0.35)]" : "w-[76px]",
      )}
    >
      {/* Marque : l'icône ne bouge jamais ; ouvert, le nom apparaît à côté. (Le
          logotype complet contient déjà l'icône : l'afficher ici la doublait.) */}
      <Link href="/pilote" className="mb-3.5 flex h-10 shrink-0 items-center gap-3 px-[10px]">
        <Image src="/icone.svg" alt="Fly Horizons" width={28} height={28} className="h-7 w-7 shrink-0" unoptimized priority />
        <span className={cn(labelCls(open), "text-[15px] font-semibold tracking-[-0.01em] text-st-ink")}>Fly Horizons</span>
      </Link>

      <nav className="flex flex-col gap-0.5" aria-label="Navigation pilote">
        {PILOTE_NAV.map((item) => {
          const active = isPiloteNavActive(item, pathname);
          const Icon = item.icon;
          const count = item.badgeKey ? counts[item.badgeKey] ?? 0 : 0;
          const alert = item.id === "profil";
          return (
            <Link
              key={item.id}
              href={item.href}
              aria-current={active ? "page" : undefined}
              title={open ? undefined : item.label}
              className={cn(rowCls, active ? "bg-st-surface font-semibold text-st-ink" : "font-medium text-st-text-2 hover:bg-st-surface hover:text-st-text")}
            >
              <Icon size={18} strokeWidth={active ? 2 : 1.8} className={cn("shrink-0", active ? "text-st-ink" : "text-st-muted group-hover:text-st-text-2")} />
              <span className={labelCls(open)}>{item.label}</span>
              {count > 0 && (
                <>
                  {/* Rail replié : un point sur l'icône ; ouvert : le compteur. */}
                  <span className={cn("absolute left-[31px] top-[9px] h-[7px] w-[7px] rounded-full ring-2 ring-white transition-opacity", alert ? "bg-st-bad" : "bg-st-ink", open && "opacity-0")} />
                  <span className={cn("st-num grid h-5 min-w-5 shrink-0 place-items-center rounded-full px-1.5 text-[11px] font-semibold text-white transition-opacity", alert ? "bg-st-bad" : "bg-st-ink", open ? "opacity-100" : "opacity-0")}>
                    {count > 99 ? "99+" : count}
                  </span>
                </>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto flex flex-col gap-0.5">
        {isAdmin && (
          <Link href="/admin" title={open ? undefined : "Vue admin"} className={cn(rowCls, "font-medium text-st-text-2 hover:bg-st-surface hover:text-st-text")}>
            <ArrowLeftRight size={18} strokeWidth={1.8} className="shrink-0 text-st-muted" />
            <span className={labelCls(open)}>Vue admin</span>
          </Link>
        )}
        <form action={logout}>
          <button type="submit" title={open ? undefined : "Déconnexion"} className={cn(rowCls, "cursor-pointer font-medium text-st-text-2 hover:bg-st-bad-soft hover:text-st-bad")}>
            <LogOut size={18} strokeWidth={1.8} className="shrink-0 text-st-muted group-hover:text-st-bad" />
            <span className={labelCls(open)}>Déconnexion</span>
          </button>
        </form>

        {/* Plaque pilote : identité, licence, médical ; au clic, ce qui manque. */}
        {pilot && (
          <div className="mt-1.5 border-t border-st-line pt-2.5">
            <button
              type="button"
              onClick={() => pilot.issues.length > 0 && setShowIssues((v) => !v)}
              className={cn("flex w-full items-center gap-3 rounded-[11px] px-[6px] py-1.5 text-left", pilot.issues.length > 0 && "cursor-pointer hover:bg-st-surface")}
            >
              <PiloteAvatar pilot={pilot} />
              <span className={labelCls(open)}>
                <span className="flex items-center gap-1">
                  <span className="truncate text-[13px] font-semibold text-st-text">{pilot.nom}</span>
                  {pilot.issues.length > 0 && <ChevronDown size={12} className={cn("shrink-0 text-st-muted transition-transform", showIssues && "rotate-180")} />}
                </span>
                <span className="block truncate text-[11px] text-st-muted">
                  Lic. {frDate(pilot.licenceExpiration)} · Méd. {frDate(pilot.medicalExpiration)}
                </span>
              </span>
            </button>
            {showIssues && open && (
              <div className="px-2 pb-1 pt-2">
                <PiloteIssues pilot={pilot} />
              </div>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}
