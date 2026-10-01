"use client";

import { uuid } from "@/lib/uuid";

// Identifiant de navigateur anonyme (localStorage, aucun cookie), partagé par le
// suivi des pages et le suivi des événements.
export function getVisitorId(): string {
  const KEY = "fh_vid";
  let id = localStorage.getItem(KEY);
  if (!id) {
    id = uuid();
    localStorage.setItem(KEY, id);
  }
  return id;
}

// Événements de parcours autorisés (liste reprise côté serveur dans /api/track).
export type SiteEvent = "creneau_choisi" | "etape_infos";

/** Envoie un événement de parcours, sans jamais gêner la page si ça échoue. */
export function trackEvent(event: SiteEvent) {
  try {
    fetch("/api/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event, pathname: window.location.pathname, visitor_id: getVisitorId() }),
      keepalive: true,
    }).catch(() => {});
  } catch { /* le suivi ne doit jamais casser la page */ }
}
