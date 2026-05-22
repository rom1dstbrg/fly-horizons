"use client";

import { useLayoutEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * Remet la page en haut instantanément à chaque changement de route.
 * useLayoutEffect garantit que le scroll se fait avant le premier paint,
 * évitant l'effet "scroll visible vers le haut".
 */
export function ScrollToTop() {
  const pathname = usePathname();

  useLayoutEffect(() => {
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, [pathname]);

  return null;
}
