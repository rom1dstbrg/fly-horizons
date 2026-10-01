"use client";

import { useLayoutEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { ArrowLeftRight, LogOut, MoreHorizontal, Settings } from "lucide-react";
import { logout } from "@/lib/actions/auth";
import { cn } from "@/lib/utils";
import { Button, SheetList, SheetListButton, SheetListLink } from "@/components/pilote/studio";
import { useScrollLock, useSwipeToClose } from "@/components/pilote/studio/sheet-gestures";
import { ADMIN_NAV, ADMIN_SETTINGS_HREF, ADMIN_TAB_IDS, isAdminNavActive } from "@/components/admin/admin-nav";
import type { AdminCounts } from "@/components/admin/AdminSidebar";

const TABS = ADMIN_TAB_IDS.map((id) => ADMIN_NAV.find((n) => n.id === id)!);
const MORE = ADMIN_NAV.filter((n) => !ADMIN_TAB_IDS.includes(n.id));

// Même courbe que la barre du pilote : départ vif, arrivée douce, sans rebond.
const EASE = "cubic-bezier(0.22, 1, 0.36, 1)";
const DURATION = 380;

// Barre d'onglets flottante (téléphone), copie du fonctionnement de PiloteTabBar
// (maquette validée le 01/10) : UNE pastille navy qui glisse vers l'onglet actif,
// dont le libellé apparaît en fondu. Elle vit dans le layout, donc elle ne dépend
// pas du chargement des pages : la pastille part dès le toucher (état « pending »)
// sans attendre le serveur. Sur une page rangée sous « Plus », elle se pose sur « Plus ».
export function AdminTabBar({ counts }: { counts: AdminCounts }) {
  const pathname = usePathname() ?? "";
  const tab = useSearchParams().get("tab");
  const here = `${pathname}?${tab ?? ""}`;
  const [moreOpen, setMoreOpen] = useState(false);
  useScrollLock(moreOpen);
  const moreSwipeRef = useSwipeToClose(() => setMoreOpen(false), { enabled: moreOpen });
  const barRef = useRef<HTMLElement>(null);
  const lastLefts = useRef<Map<string, number>>(new Map());
  const [pill, setPill] = useState<{ left: number; width: number; animate: boolean } | null>(null);

  // Onglet touché mais page pas encore affichée : la pastille part tout de suite.
  // Oubliée dès que l'URL change (l'onglet réel reprend la main).
  const [pending, setPending] = useState<{ id: string; from: string } | null>(null);
  const [lastHere, setLastHere] = useState(here);
  if (lastHere !== here) {
    setLastHere(here);
    setPending(null);
  }
  const pendingId = pending && pending.from === here ? pending.id : null;

  const routeTab = TABS.find((t) => isAdminNavActive(t, pathname, tab));
  const activeTab = pendingId ? TABS.find((t) => t.id === pendingId) : routeTab;
  const moreActive = !activeTab && (
    MORE.some((n) => isAdminNavActive(n, pathname, tab)) || pathname.startsWith(ADMIN_SETTINGS_HREF)
  );
  const activeKey = activeTab?.id ?? (moreActive ? "more" : null);

  useLayoutEffect(() => {
    const bar = barRef.current;
    if (!bar) return;
    const items = Array.from(bar.querySelectorAll<HTMLElement>("[data-tab]"));
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const first = lastLefts.current.size === 0;
    for (const el of items) {
      const key = el.dataset.tab!;
      const before = lastLefts.current.get(key);
      const after = el.offsetLeft;
      lastLefts.current.set(key, after);
      if (first || reduce || before === undefined || before === after) continue;
      el.style.transition = "none";
      el.style.transform = `translateX(${before - after}px)`;
      void el.offsetWidth;
      el.style.transition = `transform ${DURATION}ms ${EASE}`;
      el.style.transform = "";
    }
    const active = activeKey ? items.find((el) => el.dataset.tab === activeKey) : null;
    setPill(active ? { left: active.offsetLeft, width: active.offsetWidth, animate: !first && !reduce } : null);
  }, [activeKey]);

  // Rotation ou redimensionnement : on replace la pastille sans animer.
  useLayoutEffect(() => {
    function onResize() {
      const bar = barRef.current;
      const active = activeKey ? bar?.querySelector<HTMLElement>(`[data-tab="${activeKey}"]`) : null;
      bar?.querySelectorAll<HTMLElement>("[data-tab]").forEach((el) => lastLefts.current.set(el.dataset.tab!, el.offsetLeft));
      setPill(active ? { left: active.offsetLeft, width: active.offsetWidth, animate: false } : null);
    }
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [activeKey]);

  const itemCls = (active: boolean, iconOnly = false) =>
    cn(
      "relative z-10 flex h-[46px] cursor-pointer items-center justify-center rounded-full transition-colors duration-200",
      active && !iconOnly ? "gap-2 pl-4 pr-5" : "px-3.5",
      active ? "text-white" : "text-st-muted",
    );

  return (
    <div className="pilote-studio font-sans lg:hidden">
      <div className="pointer-events-none fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+0.75rem)] z-50 flex justify-center px-4">
        <nav
          ref={barRef}
          aria-label="Navigation admin"
          className="pointer-events-auto relative flex w-full max-w-md items-center justify-between rounded-full border border-st-line bg-white/90 p-1.5 shadow-st-lg backdrop-blur-xl"
        >
          <span
            aria-hidden="true"
            className={cn("absolute left-0 top-1.5 h-[46px] rounded-full bg-st-ink shadow-st-sm", !pill && "opacity-0")}
            style={pill ? {
              width: pill.width,
              transform: `translateX(${pill.left}px)`,
              transition: pill.animate ? `transform ${DURATION}ms ${EASE}, width ${DURATION}ms ${EASE}` : "none",
            } : undefined}
          />
          {TABS.map((t) => {
            const active = t.id === activeTab?.id;
            const Icon = t.icon;
            const dot = !active && !!t.badgeKey && counts[t.badgeKey] > 0;
            return (
              <Link
                key={t.id}
                href={t.href}
                data-tab={t.id}
                aria-label={t.label}
                aria-current={active ? "page" : undefined}
                className={itemCls(active)}
                onClick={(e) => {
                  if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
                  if (!isAdminNavActive(t, pathname, tab)) setPending({ id: t.id, from: here });
                }}
              >
                <span className="relative">
                  <Icon size={21} strokeWidth={active ? 2 : 1.8} />
                  {dot && <span className="absolute -right-1 -top-0.5 size-[7px] rounded-full bg-st-gold ring-2 ring-white" />}
                </span>
                {active && (
                  <span className="whitespace-nowrap text-[13px] font-semibold motion-safe:animate-[st-tab-label-in_240ms_ease-out_120ms_both]">{t.short}</span>
                )}
              </Link>
            );
          })}
          <button
            type="button"
            data-tab="more"
            onClick={() => setMoreOpen((v) => !v)}
            aria-label="Plus"
            aria-haspopup="dialog"
            aria-expanded={moreOpen}
            className={itemCls(moreActive, true)}
          >
            <span className="relative">
              <MoreHorizontal size={21} strokeWidth={moreActive ? 2 : 1.8} className={cn("transition-transform duration-300", moreOpen && "rotate-90")} />
              {counts.retours > 0 && <span className="absolute -right-1 -top-0.5 size-[7px] rounded-full bg-st-bad ring-2 ring-white" />}
            </span>
          </button>
        </nav>
      </div>

      {/* Feuille « Plus » : toujours montée, pour glisser à la fermeture aussi. */}
      <div className={cn("fixed inset-0 z-[60] flex items-end", !moreOpen && "pointer-events-none")} aria-hidden={!moreOpen} inert={!moreOpen}>
        <button
          type="button"
          aria-label="Fermer"
          tabIndex={moreOpen ? 0 : -1}
          onClick={() => setMoreOpen(false)}
          className={cn("absolute inset-0 bg-st-ink/25 backdrop-blur-[1.5px] transition-opacity duration-300", moreOpen ? "opacity-100" : "opacity-0")}
        />
        <div
          ref={moreSwipeRef}
          role="dialog"
          aria-label="Plus"
          className={cn(
            "relative max-h-[88dvh] w-full overflow-y-auto rounded-t-[26px] bg-white px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-2.5 shadow-[0_-16px_40px_-16px_rgba(15,17,23,0.3)] transition-transform duration-300 ease-[cubic-bezier(0.2,0,0,1)]",
            moreOpen ? "translate-y-0" : "translate-y-full",
          )}
        >
          <div className="mx-auto mb-3.5 h-1 w-[38px] rounded-full bg-st-line-strong" />
          <div className="flex min-w-0 items-center gap-3 px-1.5 pb-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-st-ink text-[13px] font-semibold text-white">RD</span>
            <div className="min-w-0">
              <p className="truncate font-semibold text-st-text">Romain</p>
              <p className="truncate text-[12.5px] text-st-muted">Admin</p>
            </div>
          </div>
          <SheetList>
            {MORE.map((item) => {
              const n = item.badgeKey ? counts[item.badgeKey] : 0;
              return (
                <SheetListLink
                  key={item.id}
                  href={item.href}
                  onClick={() => setMoreOpen(false)}
                  icon={item.icon}
                  label={item.label}
                  active={isAdminNavActive(item, pathname, tab)}
                  trailing={n > 0 ? (
                    <span className="st-num grid h-5 min-w-5 place-items-center rounded-full bg-st-bad px-1.5 text-[11px] font-semibold text-white">{n}</span>
                  ) : undefined}
                />
              );
            })}
            <SheetListLink href={ADMIN_SETTINGS_HREF} onClick={() => setMoreOpen(false)} icon={Settings} label="Paramètres" active={pathname.startsWith(ADMIN_SETTINGS_HREF)} />
            <SheetListLink href="/pilote" onClick={() => setMoreOpen(false)} icon={ArrowLeftRight} label="Espace pilote" />
            <form action={logout}>
              <SheetListButton type="submit" icon={LogOut} label="Déconnexion" danger />
            </form>
          </SheetList>
          <Button variant="ghost" fullWidth size="lg" onClick={() => setMoreOpen(false)} className="mt-3 bg-st-surface text-st-text-2 hover:bg-st-line">
            Fermer
          </Button>
        </div>
      </div>
    </div>
  );
}
