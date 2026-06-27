"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

function getVisitorId(): string {
  const KEY = "fh_vid";
  let id = localStorage.getItem(KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(KEY, id);
  }
  return id;
}

export function AnalyticsTracker() {
  const pathname = usePathname();
  const isFirst = useRef(true);
  const prev = useRef("");

  useEffect(() => {
    if (pathname === prev.current) return;
    prev.current = pathname;

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
    }).catch(() => {});
  }, [pathname]);

  return null;
}
