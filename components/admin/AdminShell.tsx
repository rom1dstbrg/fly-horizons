"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { AdminBrand, AdminSidebar, openPalette, type AdminCounts } from "@/components/admin/AdminSidebar";
import { AdminTabBar } from "@/components/admin/AdminTabBar";
import { ADMIN_NAV_COOKIE } from "@/components/admin/admin-nav";

// Compteurs de la navigation (contacts non lus, retours à traiter), rafraîchis
// toutes les 45 s ; gardent leur dernière valeur si l'appel échoue.
function useCounts(): AdminCounts {
  const [counts, setCounts] = useState<AdminCounts>({ contacts: 0, retours: 0 });
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const r = await fetch("/api/admin/pending-counts");
        if (!r.ok) return;
        const d = await r.json();
        if (!cancelled) setCounts({ contacts: d.contacts ?? 0, retours: d.retours ?? 0 });
      } catch { /* garde la dernière valeur */ }
    }
    load();
    const interval = setInterval(load, 45_000);
    return () => { cancelled = true; clearInterval(interval); };
  }, []);
  return counts;
}

// Coque de l'admin : barre latérale flottante (bureau), barre du haut et barre
// d'onglets flottante (téléphone), et le contenu qui laisse la place à la barre.
// L'état réduit/ouvert est lu dans un cookie par le layout serveur (aucun saut au
// chargement) et réécrit à chaque bascule.
export function AdminShell({ initialCollapsed, children }: { initialCollapsed: boolean; children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(initialCollapsed);
  const counts = useCounts();

  function toggle() {
    const next = !collapsed;
    setCollapsed(next);
    document.cookie = `${ADMIN_NAV_COOKIE}=${next ? "collapsed" : "open"}; path=/; max-age=31536000; samesite=lax`;
  }

  return (
    <div className="min-h-screen bg-background">
      <Suspense fallback={null}>
        <AdminSidebar collapsed={collapsed} onToggle={toggle} counts={counts} />
        <AdminTabBar counts={counts} />
      </Suspense>

      {/* Barre du haut (téléphone) */}
      <div className="pilote-studio fixed inset-x-0 top-0 z-40 flex h-[calc(3.5rem+env(safe-area-inset-top))] items-end justify-between border-b border-st-line bg-white/90 px-4 pb-2.5 font-sans backdrop-blur lg:hidden">
        <Link href="/admin" className="flex items-center gap-2.5">
          <AdminBrand size={32} wordHeight={11} />
        </Link>
        <button type="button" onClick={openPalette} aria-label="Rechercher" className="grid size-9 cursor-pointer place-items-center rounded-full text-st-text-2 transition-colors hover:bg-st-surface">
          <Search size={19} />
        </button>
      </div>

      <main className={cn("min-h-screen min-w-0 transition-[margin] duration-200 ease-out", collapsed ? "lg:ml-[104px]" : "lg:ml-[284px]")}>
        <div className="px-4 pb-[calc(7rem+env(safe-area-inset-bottom))] pt-[calc(4.5rem+env(safe-area-inset-top))] sm:px-6 lg:px-8 lg:pb-8 lg:pt-8">
          {children}
        </div>
      </main>
    </div>
  );
}
