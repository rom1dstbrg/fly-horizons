"use client";

import { useLayoutEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeftRight, LogOut, MoreHorizontal } from "lucide-react";
import { logout } from "@/lib/actions/auth";
import { cn } from "@/lib/utils";
import { SheetCloseButton, SheetList, SheetListLink } from "@/components/pilote/studio";
import {
  PILOTE_NAV, isPiloteNavActive, PiloteAvatar, PiloteIssues, frDate, type PilotIdInfo,
} from "@/components/pilote/PiloteSidebar";

// Onglets du téléphone, choisis le 24/09 : Accueil, Vols, M&B, Annonces ; le
// reste (Disponibilités, Profil, Vue admin, Déconnexion) vit sous « Plus ».
const TAB_IDS = ["dashboard", "vols", "mb", "annonces"];
const TABS = TAB_IDS.map((id) => PILOTE_NAV.find((n) => n.id === id)!);
const MORE = PILOTE_NAV.filter((n) => !TAB_IDS.includes(n.id));

// Une seule courbe pour tout ce qui bouge dans la barre : départ vif, arrivée
// douce, sans rebond.
const EASE = "cubic-bezier(0.22, 1, 0.36, 1)";
const DURATION = 380;

// Barre d'onglets flottante (téléphone) : UNE pastille navy qui glisse vers
// l'onglet actif, dont le libellé apparaît en fondu. Sur une page rangée sous
// « Plus », la pastille se pose sur « Plus ».
//
// Animation (FLIP) : au changement d'onglet, la barre passe tout de suite à sa
// disposition finale ; chaque onglet glisse de son ancienne place à la nouvelle
// et la pastille va d'un seul mouvement de l'ancienne boîte à la nouvelle.
export function PiloteTabBar({ pilot, isAdmin = false, badges = {} }: {
  pilot?: PilotIdInfo | null;
  isAdmin?: boolean;
  /** Point d'attention par onglet (href → nombre), ex. vols à traiter. */
  badges?: Record<string, number>;
}) {
  const pathname = usePathname() ?? "";
  const [moreOpen, setMoreOpen] = useState(false);
  const barRef = useRef<HTMLElement>(null);
  const lastLefts = useRef<Map<string, number>>(new Map());
  const [pill, setPill] = useState<{ left: number; width: number; animate: boolean } | null>(null);

  const activeTab = TABS.find((t) => isPiloteNavActive(t, pathname));
  const moreActive = !activeTab && MORE.some((n) => isPiloteNavActive(n, pathname));
  const activeKey = activeTab?.id ?? (moreActive ? "more" : null);
  const profilAlerts = badges["/pilote/profil"] ?? 0;

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
    <>
      <div className="pointer-events-none fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+0.75rem)] z-50 flex justify-center px-4 lg:hidden">
        <nav
          ref={barRef}
          aria-label="Navigation pilote"
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
          {TABS.map((tab) => {
            const active = tab.id === activeTab?.id;
            const Icon = tab.icon;
            const dot = (badges[tab.href] ?? 0) > 0;
            return (
              <Link key={tab.id} href={tab.href} data-tab={tab.id} aria-label={tab.label} aria-current={active ? "page" : undefined} className={itemCls(active)}>
                <span className="relative">
                  <Icon size={21} strokeWidth={active ? 2 : 1.8} />
                  {dot && !active && <span className="absolute -right-1 -top-0.5 h-[7px] w-[7px] rounded-full bg-st-gold ring-2 ring-white" />}
                </span>
                {active && (
                  <span className="whitespace-nowrap text-[13px] font-semibold motion-safe:animate-[st-tab-label-in_240ms_ease-out_120ms_both]">{tab.short}</span>
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
              {(profilAlerts > 0 || (pilot && !pilot.legalOk)) && (
                <span className="absolute -right-1 -top-0.5 h-[7px] w-[7px] rounded-full bg-st-bad ring-2 ring-white" />
              )}
            </span>
          </button>
        </nav>
      </div>

      {/* Feuille « Plus » : toujours montée, pour glisser à la fermeture aussi. */}
      <div className={cn("fixed inset-0 z-[60] flex items-end lg:hidden", !moreOpen && "pointer-events-none")} aria-hidden={!moreOpen} inert={!moreOpen}>
        <button
          type="button"
          aria-label="Fermer"
          tabIndex={moreOpen ? 0 : -1}
          onClick={() => setMoreOpen(false)}
          className={cn("absolute inset-0 bg-st-ink/25 backdrop-blur-[1.5px] transition-opacity duration-300", moreOpen ? "opacity-100" : "opacity-0")}
        />
        <div
          role="dialog"
          aria-label="Plus"
          className={cn(
            "relative max-h-[88dvh] w-full overflow-y-auto rounded-t-[26px] bg-white px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-2.5 shadow-[0_-16px_40px_-16px_rgba(15,17,23,0.3)] transition-transform duration-300 ease-[cubic-bezier(0.2,0,0,1)]",
            moreOpen ? "translate-y-0" : "translate-y-full",
          )}
        >
          <div className="mx-auto mb-3.5 h-1 w-[38px] rounded-full bg-st-line-strong" />
          <div className="flex items-center justify-between gap-3">
            {pilot ? (
              <div className="flex min-w-0 items-center gap-3">
                <PiloteAvatar pilot={pilot} size={40} />
                <div className="min-w-0">
                  <p className="truncate font-semibold text-st-text">{pilot.nom}</p>
                  <p className="truncate text-[12px] text-st-muted">
                    {pilot.legalOk ? "Profil en règle" : "Profil à compléter"} · lic. {frDate(pilot.licenceExpiration)} · méd. {frDate(pilot.medicalExpiration)}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-base font-semibold text-st-text">Plus</p>
            )}
            <SheetCloseButton onClick={() => setMoreOpen(false)} />
          </div>
          {pilot && pilot.issues.length > 0 && (
            <div className="mt-3 rounded-[14px] bg-st-surface p-3">
              <PiloteIssues pilot={pilot} onNavigate={() => setMoreOpen(false)} />
            </div>
          )}
          <div className="mt-4 space-y-3">
            <SheetList>
              {MORE.map((item) => (
                <SheetListLink
                  key={item.id}
                  href={item.href}
                  onClick={() => setMoreOpen(false)}
                  icon={item.icon}
                  label={item.label}
                  trailing={item.badgeKey && (badges[item.badgeKey] ?? 0) > 0 ? (
                    <span className="st-num grid h-5 min-w-5 place-items-center rounded-full bg-st-bad px-1.5 text-[11px] font-semibold text-white">{badges[item.badgeKey]}</span>
                  ) : undefined}
                />
              ))}
              {isAdmin && <SheetListLink href="/admin" onClick={() => setMoreOpen(false)} icon={ArrowLeftRight} label="Vue admin" />}
            </SheetList>
            <form action={logout}>
              <button type="submit" className="flex w-full cursor-pointer items-center gap-3 rounded-[14px] border border-st-line bg-white px-4 py-3 text-sm font-[550] text-st-bad transition-colors hover:bg-st-bad-soft">
                <LogOut size={17} strokeWidth={1.8} />
                Déconnexion
              </button>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}
