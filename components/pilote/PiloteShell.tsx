"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { PiloteSidebar, type PilotIdInfo } from "@/components/pilote/PiloteSidebar";
import { PILOTE_NAV_COOKIE } from "@/components/pilote/pilote-nav";

// Coque bureau de l'espace pilote : barre latérale flottante (comme l'admin),
// ouverte ou réduite en rail d'icônes. Le choix est lu dans un cookie par le
// layout serveur (aucun saut au chargement) et réécrit à chaque bascule.
export function PiloteShell({ initialCollapsed, counts, pilot, isAdmin, children }: {
  initialCollapsed: boolean;
  counts: Record<string, number>;
  pilot: PilotIdInfo;
  isAdmin: boolean;
  children: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(initialCollapsed);

  function toggle() {
    const next = !collapsed;
    setCollapsed(next);
    document.cookie = `${PILOTE_NAV_COOKIE}=${next ? "collapsed" : "open"}; path=/; max-age=31536000; samesite=lax`;
  }

  return (
    <>
      <PiloteSidebar counts={counts} pilot={pilot} isAdmin={isAdmin} collapsed={collapsed} onToggle={toggle} />
      <div className={cn("flex min-h-screen min-w-0 flex-1 flex-col transition-[padding] duration-200 ease-out", collapsed ? "lg:pl-[100px]" : "lg:pl-[280px]")}>
        {children}
      </div>
    </>
  );
}
