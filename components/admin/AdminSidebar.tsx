"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useSearchParams } from "next/navigation";
import { ArrowLeftRight, LogOut, PanelLeftClose, PanelLeftOpen, Search, Settings } from "lucide-react";
import { logout } from "@/lib/actions/auth";
import { cn } from "@/lib/utils";
import {
  ADMIN_NAV, ADMIN_SETTINGS_HREF, SECTION_LABEL, isAdminNavActive, type AdminBadgeKey, type AdminNavSection,
} from "@/components/admin/admin-nav";

export type AdminCounts = Record<AdminBadgeKey, number>;

export function openPalette() {
  document.dispatchEvent(new CustomEvent("openCommandPalette"));
}

// Marque : l'emblème (inchangé) et un logotype retravaillé : « Fly » en
// regular, « Horizons » en gras, « Administration » en petites capitales dorées.
export function AdminBrand({ size = 34, showText = true }: { size?: number; showText?: boolean }) {
  return (
    <>
      <Image src="/icone.svg" alt="Fly Horizons" width={size} height={size} className="shrink-0" style={{ width: size, height: size }} unoptimized priority />
      {showText && (
        <span className="min-w-0 leading-none">
          <span className="block whitespace-nowrap text-[17px] tracking-[-0.025em] text-st-ink">
            <span className="font-normal">Fly</span> <span className="font-bold">Horizons</span>
          </span>
          <span className="mt-[5px] block whitespace-nowrap text-[10px] font-semibold uppercase tracking-[0.16em] text-st-gold-text">Administration</span>
        </span>
      )}
    </>
  );
}

const rowCls = "group relative flex h-10 w-full shrink-0 items-center gap-3 rounded-[11px] px-[14px] text-[13.5px] outline-none transition-colors focus-visible:ring-2 focus-visible:ring-st-ink/20";
const labelCls = (open: boolean) =>
  cn("min-w-0 flex-1 overflow-hidden whitespace-nowrap text-left transition-[opacity,transform] duration-200 ease-out", open ? "translate-x-0 opacity-100" : "-translate-x-1.5 opacity-0");

// Barre latérale flottante (bureau) : détachée des bords et arrondie comme les
// tiroirs. Ouverte en permanence (256 px) ; le bouton en haut la réduit en rail
// d'icônes (76 px), choix mémorisé par AdminShell.
export function AdminSidebar({ collapsed, onToggle, counts }: { collapsed: boolean; onToggle: () => void; counts: AdminCounts }) {
  const pathname = usePathname() ?? "";
  const tab = useSearchParams().get("tab");
  const open = !collapsed;
  const settingsActive = pathname.startsWith(ADMIN_SETTINGS_HREF);

  const sections: AdminNavSection[] = ["pilotage", "relation", "gestion"];

  return (
    <aside
      aria-label="Navigation admin"
      className={cn(
        "pilote-studio fixed bottom-3 left-3 top-3 z-40 hidden flex-col overflow-hidden rounded-[22px] border border-st-line bg-white px-3 py-3.5 font-sans shadow-st-lg transition-[width] duration-200 ease-out lg:flex",
        open ? "w-64" : "w-[76px]",
      )}
    >
      <div className="mb-2 flex h-11 shrink-0 items-center gap-3 pl-[6px]">
        <Link href="/admin" aria-label="Dashboard" className="flex min-w-0 flex-1 items-center gap-3 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-st-ink/20">
          <AdminBrand showText={open} />
        </Link>
        {open && (
          <button
            type="button"
            onClick={onToggle}
            title="Réduire la barre"
            aria-label="Réduire la barre latérale"
            className="grid size-8 shrink-0 cursor-pointer place-items-center rounded-[9px] text-st-muted transition-colors hover:bg-st-surface hover:text-st-text"
          >
            <PanelLeftClose size={17} strokeWidth={1.8} />
          </button>
        )}
      </div>
      {!open && (
        <button type="button" onClick={onToggle} title="Ouvrir la barre" aria-label="Ouvrir la barre latérale" className={cn(rowCls, "cursor-pointer font-medium text-st-text-2 hover:bg-st-surface hover:text-st-text")}>
          <PanelLeftOpen size={18} strokeWidth={1.8} className="shrink-0 text-st-muted" />
        </button>
      )}

      <nav className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto [scrollbar-width:none]">
        {sections.map((section, si) => (
          <div key={section} className="flex flex-col gap-0.5">
            {open
              ? <p className="px-3.5 pb-1 pt-3 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-st-muted">{SECTION_LABEL[section]}</p>
              : si > 0 && <hr className="mx-2.5 my-2 border-0 border-t border-st-line" />}
            {ADMIN_NAV.filter((n) => n.section === section).map((item) => {
              const active = isAdminNavActive(item, pathname, tab);
              const Icon = item.icon;
              const count = item.badgeKey ? counts[item.badgeKey] : 0;
              const tone = item.badgeKey === "retours" ? "bg-st-bad" : "bg-st-ink";
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
                  {count > 0 && (open ? (
                    <span className={cn("st-num grid h-5 min-w-5 shrink-0 place-items-center rounded-full px-1.5 text-[11px] font-semibold text-white", tone)}>{count > 99 ? "99+" : count}</span>
                  ) : (
                    <span className={cn("absolute left-[31px] top-[9px] size-[7px] rounded-full ring-2 ring-white", tone)} />
                  ))}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="mt-2 flex shrink-0 flex-col gap-0.5">
        <button type="button" onClick={openPalette} title={open ? undefined : "Rechercher"} className={cn(rowCls, "cursor-pointer font-medium text-st-text-2 hover:bg-st-surface hover:text-st-text")}>
          <Search size={18} strokeWidth={1.8} className="shrink-0 text-st-muted" />
          <span className={labelCls(open)}>Rechercher</span>
          {open && <kbd className="rounded-md border border-st-line px-1.5 py-0.5 font-mono text-[10px] text-st-muted">⌘K</kbd>}
        </button>
        <Link
          href={ADMIN_SETTINGS_HREF}
          aria-current={settingsActive ? "page" : undefined}
          title={open ? undefined : "Paramètres"}
          className={cn(rowCls, settingsActive ? "bg-st-surface font-semibold text-st-ink" : "font-medium text-st-text-2 hover:bg-st-surface hover:text-st-text")}
        >
          <Settings size={18} strokeWidth={settingsActive ? 2 : 1.8} className={cn("shrink-0", settingsActive ? "text-st-ink" : "text-st-muted")} />
          <span className={labelCls(open)}>Paramètres</span>
        </Link>
        <Link href="/pilote" title={open ? undefined : "Espace pilote"} className={cn(rowCls, "font-medium text-st-text-2 hover:bg-st-surface hover:text-st-text")}>
          <ArrowLeftRight size={18} strokeWidth={1.8} className="shrink-0 text-st-muted" />
          <span className={labelCls(open)}>Espace pilote</span>
        </Link>
        <form action={logout}>
          <button type="submit" title={open ? undefined : "Déconnexion"} className={cn(rowCls, "cursor-pointer font-medium text-st-text-2 hover:bg-st-bad-soft hover:text-st-bad")}>
            <LogOut size={18} strokeWidth={1.8} className="shrink-0 text-st-muted group-hover:text-st-bad" />
            <span className={labelCls(open)}>Déconnexion</span>
          </button>
        </form>

        <div className="mt-1.5 flex items-center gap-3 border-t border-st-line px-[6px] pt-2.5">
          <span className="grid size-[34px] shrink-0 place-items-center rounded-full bg-st-ink text-[12px] font-semibold text-white">RD</span>
          {open && (
            <span className="min-w-0 leading-tight">
              <span className="block truncate text-[13px] font-semibold text-st-text">Romain</span>
              <span className="block truncate text-[11.5px] text-st-muted">Admin</span>
            </span>
          )}
        </div>
      </div>
    </aside>
  );
}
