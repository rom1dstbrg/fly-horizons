import { createAdminClient } from "@/lib/supabase/admin";
import { computeAnalytics, dayKey, type Ev, type View } from "@/lib/analytics-stats";
import { AnalyticsView, ANALYTICS_PERIODS } from "@/components/admin/AnalyticsView";

export const metadata = { title: "Analytiques — Admin" };

// Analytiques (maquette validée le 01/10) : les chiffres sont expliqués. Les
// calculs sont dans lib/analytics-stats.ts (visites de page_views, étapes du
// formulaire de site_events), l'affichage dans components/admin/AnalyticsView.tsx.

// PostgREST plafonne à 1000 lignes par requête : on lit par tranches.
async function fetchAll<T>(table: "page_views" | "site_events", cols: string, since: string): Promise<T[]> {
  const db = createAdminClient();
  const out: T[] = [];
  for (let page = 0; page < 60; page++) {
    const { data, error } = await db.from(table).select(cols).gte("created_at", since)
      .order("created_at", { ascending: true }).range(page * 1000, page * 1000 + 999);
    if (error || !data) break; // table absente (migration pas passée) : on continue sans
    out.push(...(data as unknown as T[]));
    if (data.length < 1000) break;
  }
  return out;
}

// Jours belges de la période et de celle d'avant (de même durée), et début de la lecture.
function windows(period: number) {
  const now = Date.now();
  const dayMs = 86_400_000;
  const keys: string[] = [];
  const prevKeys: string[] = [];
  for (let i = period - 1; i >= 0; i--) keys.push(dayKey(now - i * dayMs));
  for (let i = 2 * period - 1; i >= period; i--) prevKeys.push(dayKey(now - i * dayMs));
  // Un jour de marge pour couvrir le décalage UTC / heure belge
  return { keys, prevKeys, since: new Date(now - (2 * period + 1) * dayMs).toISOString() };
}

export default async function AnalyticsPage({ searchParams }: { searchParams: Promise<{ period?: string }> }) {
  const { period: p } = await searchParams;
  const period = (ANALYTICS_PERIODS as readonly number[]).includes(Number(p)) ? Number(p) : 30;

  const { keys, prevKeys, since } = windows(period);

  const [views, events] = await Promise.all([
    fetchAll<View>("page_views", "pathname, referrer, device, created_at, visitor_id", since),
    fetchAll<Ev>("site_events", "name, visitor_id, created_at", since),
  ]);

  return <AnalyticsView a={computeAnalytics({ views, events, keys, prevKeys })} period={period} />;
}
