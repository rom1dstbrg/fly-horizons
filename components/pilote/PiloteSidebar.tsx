"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard, PlaneTakeoff, Plane, CalendarRange, Scale, User,
  ArrowLeftRight, LogOut, Menu, X, AlertCircle, ChevronDown,
} from "lucide-react";
import { logout } from "@/lib/actions/auth";

// ── Chrome de navigation de l'espace pilote ─────────────────────────────────
// Desktop : rail d'icônes replié par défaut (76px), qui se déplie au survol
// (256px, plein libellés) et se referme quand la souris quitte — mélange
// voulu par Romain le 19/09 entre un rail compact et la version en liste
// complète, sans les sections en carte (jugées too much). Mobile : top bar +
// bottom nav + tiroir plein, inchangés (pas de survol au tactile).

export interface PilotIdInfo {
  nom: string;
  licenceNumero: string | null;
  licenceExpiration: string | null;
  medicalExpiration: string | null;
  legalOk: boolean;
  legalWarn: boolean;
  /** Détail des points bloquants/à surveiller — affiché au clic sur la pastille de statut. */
  issues: { label: string; severity: "error" | "warn" }[];
}

function frDate(iso: string | null): string {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return d && m && y ? `${d}/${m}/${y}` : iso;
}

type NavLink = {
  id: string;
  icon: React.ElementType;
  label: string;
  href: string;
  exact?: boolean;
  badgeKey?: string;
};

// Plus de groupes "Vols"/"Réglages" ni de séparateurs (demande du 19/09) —
// une seule liste continue.
const NAVIGATION: NavLink[] = [
  { id: "dashboard", icon: LayoutDashboard, label: "Tableau de bord", href: "/pilote", exact: true },
  { id: "vols",      icon: Plane,         label: "Mes vols",         href: "/pilote/vols",           badgeKey: "/pilote/vols" },
  { id: "annonces",  icon: PlaneTakeoff,  label: "Mes annonces",     href: "/pilote/annonces" },
  { id: "dispos",    icon: CalendarRange, label: "Disponibilités",   href: "/pilote/disponibilites" },
  { id: "mb",        icon: Scale,         label: "Masse & centrage", href: "/pilote/mass-balance" },
  { id: "profil",    icon: User,          label: "Mon profil",       href: "/pilote/profil",         badgeKey: "/pilote/profil" },
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
  collapsed = false,
}: {
  counts: Record<string, number>;
  pilot?: PilotIdInfo | null;
  isAdmin?: boolean;
  onClose?: () => void;
  /** Rail d'icônes replié (desktop seulement) — le tiroir mobile ne l'utilise jamais. */
  collapsed?: boolean;
}) {
  const pathname = usePathname();
  const [showIssues, setShowIssues] = useState(false);
  const initial = pilot?.nom?.trim()?.charAt(0)?.toUpperCase() || "?";

  return (
    <div className="flex flex-col h-full bg-card border-r border-border">
      {/* Logo — icône seule replié, logotype complet déplié. "Vue admin" est
          redescendu en bas avec la déconnexion (demande du 19/09) : dans le
          nouveau rail, l'en-tête ne porte plus que la marque. */}
      <div className={`flex items-center h-14 lg:h-16 border-b border-border shrink-0 ${collapsed ? "justify-center px-2" : "justify-between gap-2 px-5"}`}>
        {collapsed ? (
          <Link href="/pilote" className="flex items-center justify-center shrink-0" onClick={onClose}>
            <Image src="/icone.svg" alt="Fly Horizons" width={28} height={28} className="w-7 h-7" unoptimized priority />
          </Link>
        ) : (
          <>
            <Link href="/pilote" className="flex items-center shrink-0" onClick={onClose}>
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
          </>
        )}
      </div>

      {/* Nav — liste continue, sans groupes ni séparateurs (demande du 19/09).
          L'actif se lit sur le TEXTE (navy + gras), jamais un fond plein — pas
          de "card". Le survol garde un fond gris neutre, c'est juste un
          retour d'interaction, pas l'indicateur de page active. */}
      {/* Padding constant (pas de conditionnel replié/déplié) : c'est ce qui garantit
          que les icônes ne bougent jamais horizontalement pendant la transition —
          seule la largeur de l'aside change, jamais l'inset de la nav elle-même. */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden py-1 px-2.5 space-y-0.5">
        {NAVIGATION.map((entry) => {
          const isActive = isLinkActive(entry, pathname);
          const Icon = entry.icon;
          const badgeCount = entry.badgeKey ? counts[entry.badgeKey] ?? 0 : 0;
          const textColor = isActive ? "text-navy font-semibold" : "text-muted-foreground font-medium hover:text-foreground";

          return (
            <Link
              key={entry.id}
              href={entry.href}
              onClick={onClose}
              title={collapsed ? entry.label : undefined}
              className={`group flex items-center w-full gap-2.5 h-9 px-3 rounded-lg text-sm transition-colors ${textColor} ${
                !isActive ? "hover:bg-secondary" : ""
              }`}
            >
              {/* La pastille repliée est ancrée à CETTE enveloppe (relative,
                  taille de l'icône), jamais à la ligne entière — sinon elle se
                  retrouve collée au bord droit de la ligne, loin de l'icône,
                  dès que la ligne est en w-full. */}
              <span className="relative shrink-0 flex items-center justify-center h-8 w-8">
                <Icon size={16} />
                {collapsed && badgeCount > 0 && (
                  <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full ring-2 ring-card bg-primary" />
                )}
              </span>
              <span
                className={`flex-1 min-w-0 whitespace-nowrap overflow-hidden transition-[opacity,transform] duration-200 ease-out ${
                  collapsed ? "opacity-0 -translate-x-2" : "opacity-100 translate-x-0"
                }`}
              >
                {entry.label}
              </span>
              {!collapsed && badgeCount > 0 && (
                <span
                  className={`shrink-0 min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold flex items-center justify-center ${
                    isActive ? "bg-primary text-[#0b2238]" : "bg-primary/15 text-primary"
                  }`}
                >
                  {badgeCount > 99 ? "99+" : badgeCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Plaque pilote — identité, licence, medical. En bas, au-dessus de "Vue
          admin"/déconnexion. Même principe que les items de nav : l'avatar est
          fixe (position + taille), seul le bloc de texte à sa droite glisse/se
          cache — pas deux blocs différents comme avant (source du glissement
          vertical constaté). Contraste du texte remonté (plus de /70 presque
          invisible) : demande du 19/09. */}
      {pilot && (
        <div className="border-t border-border shrink-0">
          {(() => {
            const hasIssues = pilot.issues.length > 0;
            const Wrapper = hasIssues ? "button" : "div";
            return (
              <Wrapper
                type={hasIssues ? "button" : undefined}
                onClick={hasIssues ? () => setShowIssues((v) => !v) : undefined}
                title={collapsed ? pilot.nom : undefined}
                className={`w-full flex items-center gap-2.5 px-3 py-3 text-left ${
                  hasIssues && !collapsed ? "cursor-pointer hover:bg-secondary/40" : ""
                }`}
              >
                <div className="relative shrink-0 w-8 h-8 rounded-full bg-navy text-white text-xs font-bold flex items-center justify-center">
                  {initial}
                  <span
                    className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full ring-2 ring-card ${
                      !pilot.legalOk ? "bg-red-500" : pilot.legalWarn ? "bg-amber-500" : "bg-emerald-500"
                    }`}
                  />
                </div>
                <div
                  className={`flex-1 min-w-0 transition-[opacity,transform] duration-200 ease-out ${
                    collapsed ? "opacity-0 -translate-x-2" : "opacity-100 translate-x-0"
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-semibold text-foreground truncate">{pilot.nom}</span>
                    {hasIssues && (
                      <ChevronDown size={12} className={`shrink-0 text-muted-foreground transition-transform ${showIssues ? "rotate-180" : ""}`} />
                    )}
                  </div>
                  <p className="mt-0.5 text-[11px] text-muted-foreground truncate">
                    {pilot.licenceNumero || "—"} · lic. {frDate(pilot.licenceExpiration)} · med. {frDate(pilot.medicalExpiration)}
                  </p>
                </div>
              </Wrapper>
            );
          })()}
          {showIssues && !collapsed && pilot.issues.length > 0 && (
            <div className="px-3 pb-3 pl-[54px] space-y-1">
              {pilot.issues.map((issue, i) => (
                <p
                  key={i}
                  className={`flex items-start gap-1.5 text-[11px] leading-snug ${
                    issue.severity === "error" ? "text-red-600" : "text-amber-600"
                  }`}
                >
                  <AlertCircle size={11} className="shrink-0 mt-0.5" />
                  {issue.label}
                </p>
              ))}
              <Link
                href="/pilote/profil"
                onClick={onClose}
                className="inline-block text-[11px] font-semibold text-navy hover:underline pt-0.5"
              >
                Corriger dans le profil →
              </Link>
            </div>
          )}
        </div>
      )}

      {/* Vue admin + déconnexion — même principe que les items de nav : padding
          fixe, l'icône ne bouge jamais, seul le libellé glisse/se cache. "Vue
          admin" redescendu ici depuis l'en-tête (demande du 19/09). */}
      <div className="pt-2 pb-[calc(0.75rem+env(safe-area-inset-bottom))] px-2.5 border-t border-border shrink-0 space-y-0.5">
        {isAdmin && (
          <Link
            href="/admin"
            onClick={onClose}
            title="Basculer vers l'espace admin"
            className="flex items-center w-full gap-2.5 h-9 px-3 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          >
            <ArrowLeftRight size={16} className="shrink-0" />
            <span
              className={`whitespace-nowrap overflow-hidden transition-[opacity,transform] duration-200 ease-out ${
                collapsed ? "opacity-0 -translate-x-2" : "opacity-100 translate-x-0"
              }`}
            >
              Vue admin
            </span>
          </Link>
        )}
        <form action={logout}>
          <button
            type="submit"
            title="Déconnexion"
            className="flex items-center w-full gap-2.5 h-9 px-3 rounded-lg text-sm text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-colors cursor-pointer"
          >
            <LogOut size={14} className="shrink-0" />
            <span
              className={`whitespace-nowrap overflow-hidden transition-[opacity,transform] duration-200 ease-out ${
                collapsed ? "opacity-0 -translate-x-2" : "opacity-100 translate-x-0"
              }`}
            >
              Déconnexion
            </span>
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

function BottomNavInner({ onMenuOpen, alertDot }: { onMenuOpen: () => void; alertDot: "red" | "amber" | null }) {
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
        className="relative flex-1 flex flex-col items-center justify-center gap-0.5 text-[10px] font-semibold text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
      >
        <span className="relative">
          <Menu size={20} strokeWidth={1.75} />
          {alertDot && (
            <span
              className={`absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full ring-2 ring-card ${
                alertDot === "red" ? "bg-red-500" : "bg-amber-500"
              }`}
            />
          )}
        </span>
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
  // Rail replié par défaut (76px) — se déplie au survol (256px), se referme
  // à la sortie de la souris. N'affecte que le desktop : le tactile n'a pas
  // de survol, donc pas de sens sur mobile (tiroir plein inchangé).
  const [hovering, setHovering] = useState(false);

  // Signal d'alerte pour le mobile — avant : la pastille de statut légal et les
  // badges de nav n'existaient que dans le tiroir complet (NavContent), donc
  // invisibles tant qu'on n'avait pas tapé "Plus". Un pilote qui checke vite
  // fait sur son téléphone ne voyait jamais rien.
  const nVolsAlerts = counts["/pilote/vols"] ?? 0;
  const nProfilAlerts = counts["/pilote/profil"] ?? 0;
  const alertDot: "red" | "amber" | null =
    pilot && !pilot.legalOk ? "red"
    : nVolsAlerts > 0 || nProfilAlerts > 0 || pilot?.legalWarn ? "amber"
    : null;

  return (
    <>
      {/* Desktop sidebar — rail replié (76px), déplié (256px) au survol. Le
          contenu principal réserve l'espace du rail replié (cf. app/pilote/layout.tsx
          lg:ml-[76px]) : le déplié se pose PAR-DESSUS, ne pousse rien. */}
      <aside
        onMouseEnter={() => setHovering(true)}
        onMouseLeave={() => setHovering(false)}
        className={`peer hidden lg:block fixed left-0 top-0 bottom-0 z-40 overflow-hidden transition-[width] duration-200 ease-out ${
          hovering ? "w-64 shadow-xl" : "w-[76px]"
        }`}
      >
        <NavContent counts={counts} pilot={pilot} isAdmin={isAdmin} collapsed={!hovering} />
      </aside>

      {/* Mobile top bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 h-14 bg-card border-b border-border flex items-center justify-between px-4">
        <Link href="/pilote" className="flex items-center relative">
          <Image
            src="/fly-horizons-logo-navy.svg"
            alt="Fly Horizons"
            width={110}
            height={28}
            className="h-6 w-auto object-contain"
            style={{ width: "auto" }}
            unoptimized
          />
          {alertDot && (
            <span
              className={`absolute -top-1 -right-2 h-2 w-2 rounded-full ring-2 ring-card ${
                alertDot === "red" ? "bg-red-500" : "bg-amber-500"
              }`}
            />
          )}
        </Link>
      </div>

      {/* Mobile bottom nav */}
      <BottomNavInner onMenuOpen={() => setMobileOpen(true)} alertDot={alertDot} />

      {/* Mobile drawer — toujours en version dépliée, pas de rail replié au tactile */}
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
