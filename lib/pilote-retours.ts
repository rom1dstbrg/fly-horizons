// Retours des pilotes (27/09) : types et libellés partagés entre l'espace
// pilote (envoi), l'admin (liste, tiroir, page) et l'export pour Claude.

export type RetourType = "bug" | "idee" | "question";
export type RetourStatut = "a_traiter" | "traite";

/** Erreur JavaScript attrapée dans le navigateur du pilote avant l'envoi. */
export type ClientError = { at: string; message: string; stack?: string; page: string };

export interface PiloteRetour {
  id: string;
  pilote_id: string;
  type: RetourType;
  message: string;
  page: string | null;
  page_titre: string | null;
  user_agent: string | null;
  viewport: string | null;
  app_version: string | null;
  erreurs: ClientError[];
  captures: string[];
  statut: RetourStatut;
  traite_at: string | null;
  created_at: string;
  pilotes?: { nom: string; email: string | null; photo_url?: string | null } | null;
}

export const RETOUR_TYPES: Record<RetourType, { label: string; tone: "danger" | "info" | "gold" }> = {
  bug: { label: "Bug", tone: "danger" },
  idee: { label: "Idée", tone: "info" },
  question: { label: "Question", tone: "gold" },
};

export const RETOUR_BUCKET = "pilote-retours";
export const MAX_CAPTURES = 3;

/** « Chrome 140, Windows » à partir du user-agent (lecture rapide, pas exhaustive). */
export function appareil(ua: string | null): string {
  if (!ua) return "Inconnu";
  const os = /iPhone/.test(ua) ? "iPhone" : /iPad/.test(ua) ? "iPad" : /Android/.test(ua) ? "Android"
    : /Windows/.test(ua) ? "Windows" : /Mac OS X/.test(ua) ? "Mac" : /Linux/.test(ua) ? "Linux" : "Autre";
  const m = ua.match(/Edg\/(\d+)/) ?? ua.match(/OPR\/(\d+)/) ?? ua.match(/Firefox\/(\d+)/) ?? ua.match(/Chrome\/(\d+)/) ?? ua.match(/Version\/(\d+).*Safari/);
  const nav = /Edg\//.test(ua) ? "Edge" : /OPR\//.test(ua) ? "Opera" : /Firefox\//.test(ua) ? "Firefox"
    : /CriOS|Chrome\//.test(ua) ? "Chrome" : /Safari\//.test(ua) ? "Safari" : "Navigateur";
  return `${nav}${m ? ` ${m[1]}` : ""}, ${os}`;
}

/** Route Next probable d'une page : segments d'identifiant remplacés par [id]. */
export function routeProbable(page: string | null): string | null {
  if (!page) return null;
  const path = page.split(/[?#]/)[0];
  const segs = path.split("/").filter(Boolean).map((s) =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s) || /^[A-Za-z0-9_-]{20,}$/.test(s) || /^\d+$/.test(s) ? "[id]" : s,
  );
  return `app/${segs.join("/")}${segs.length ? "/" : ""}page.tsx`;
}

export function fmtDateBrussels(iso: string): string {
  return new Date(iso).toLocaleString("fr-BE", {
    timeZone: "Europe/Brussels", weekday: "short", day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}
