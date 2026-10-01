"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { getVisitorId, isInternalBrowser, markInternalIfTold } from "@/lib/track-event";

export function AnalyticsTracker() {
  const pathname = usePathname();
  const isFirst = useRef(true);
  const prev = useRef("");

  useEffect(() => {
    if (pathname === prev.current) return;
    prev.current = pathname;
    if (isInternalBrowser()) return;

    const referrer = isFirst.current ? document.referrer : undefined;
    isFirst.current = false;

    fetch("/api/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        pathname,
        referrer: referrer || undefined,
        screen_width: window.innerWidth,
        visitor_id: getVisitorId(),
      }),
    }).then(markInternalIfTold).catch(() => {});
  }, [pathname]);

  return null;
}
