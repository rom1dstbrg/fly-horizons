import { createAdminClient } from "@/lib/supabase/admin";
import { Monitor, Smartphone, Tablet, Download } from "lucide-react";

export const metadata = { title: "Analytiques — Admin" };

// ─── helpers ──────────────────────────────────────────────────────────────────

const PATH_LABELS: Record<string, string> = {
  "/":                                   "Accueil",
  "/nos-offres":                         "Nos offres",
  "/about":                              "À propos",
  "/contact":                            "Contact",
  "/galerie":                            "Galerie",
  "/faq":                                "FAQ",
  "/vol-sur-mesure":                     "Vol sur mesure",
  "/reservation":                        "Réservation",
  "/cart":                               "Panier",
  "/checkout":                           "Paiement",
  "/orders":                             "Commandes",
  "/orders/success":                     "Commande confirmée",
  "/reservation/success":                "Réservation confirmée",
  "/vol-sur-mesure/success":             "Demande envoyée",
  "/cgp":                                "Conditions générales",
  "/guide":                              "Guide",
  "/politique-de-confidentialite":       "Politique de confidentialité",
  "/access-ebci":                        "Accès EBCI",
  "/login":                              "Connexion",
  "/register":                           "Inscription",
};

function pageLabel(pathname: string): string {
  if (PATH_LABELS[pathname]) return PATH_LABELS[pathname];
  if (pathname.startsWith("/vols/")) return `Offre : ${pathname.replace("/vols/", "").replace(/-/g, " ")}`;
  if (pathname.startsWith("/vol/itineraire/")) return "Itinéraire partagé";
  if (pathname.startsWith("/vol/proposition/")) return "Proposition de vol";
  if (pathname.startsWith("/reservation/reporter/")) return "Reporter réservation";
  return pathname;
}

function parseReferrer(ref: string | null): string {
  if (!ref) return "Direct";
  try {
    const h = new URL(ref).hostname.replace(/^www\./, "");
    if (h.includes("google"))              return "Google";
    if (h.includes("bing"))               return "Bing";
    if (h.includes("facebook") || h.includes("fb.com")) return "Facebook";
    if (h.includes("instagram"))          return "Instagram";
    if (h.includes("fly-horizons"))       return "Interne";
    return h;
  } catch {
    return "Autre";
  }
}

function fmt(d: Date) {
  return d.toLocaleDateString("fr-BE", { day: "2-digit", month: "2-digit" });
}

// ─── page ─────────────────────────────────────────────────────────────────────

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const { period: p } = await searchParams;
  const period = p === "7" ? 7 : 30;

  const supabase = createAdminClient();

  const since = new Date();
  since.setDate(since.getDate() - period);
  since.setHours(0, 0, 0, 0);

  const { data } = await supabase
    .from("page_views")
    .select("pathname, referrer, device, created_at")
    .gte("created_at", since.toISOString())
    .order("created_at", { ascending: false });

  const views = data ?? [];

  function uniqueVisitors(subset: typeof views) {
    return new Set(subset.map(v => (v as Record<string, unknown>).visitor_id).filter(Boolean)).size;
  }

  // KPIs
  const now = new Date();
  const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);
  const weekStart  = new Date(now); weekStart.setDate(now.getDate() - 7); weekStart.setHours(0, 0, 0, 0);

  const todayViews    = views.filter(v => new Date(v.created_at) >= todayStart);
  const weekViews     = views.filter(v => new Date(v.created_at) >= weekStart);
  const total         = views.length;
  const todayCount    = todayViews.length;
  const weekCount     = weekViews.length;
  const todayUniq     = uniqueVisitors(todayViews);
  const weekUniq      = uniqueVisitors(weekViews);
  const totalUniq     = uniqueVisitors(views);

  // Top pages
  const pageCounts: Record<string, number> = {};
  views.forEach(v => { pageCounts[v.pathname] = (pageCounts[v.pathname] ?? 0) + 1; });
  const topPages = Object.entries(pageCounts).sort(([, a], [, b]) => b - a).slice(0, 10);
  const maxPage  = topPages[0]?.[1] ?? 1;

  // Daily visits
  const dayMap: Record<string, number> = {};
  for (let i = period - 1; i >= 0; i--) {
    const d = new Date(now); d.setDate(d.getDate() - i); d.setHours(0, 0, 0, 0);
    dayMap[d.toISOString().slice(0, 10)] = 0;
  }
  views.forEach(v => {
    const day = v.created_at.slice(0, 10);
    if (day in dayMap) dayMap[day]++;
  });
  const dailyData = Object.entries(dayMap).map(([date, count]) => ({ date, count }));
  const maxDay    = Math.max(...dailyData.map(d => d.count), 1);

  // Referrers
  const refCounts: Record<string, number> = {};
  views.forEach(v => {
    const label = parseReferrer(v.referrer);
    refCounts[label] = (refCounts[label] ?? 0) + 1;
  });
  const topRefs = Object.entries(refCounts).sort(([, a], [, b]) => b - a).slice(0, 6);

  // Devices
  const devCounts: Record<string, number> = { desktop: 0, mobile: 0, tablet: 0 };
  views.forEach(v => { if (v.device) devCounts[v.device] = (devCounts[v.device] ?? 0) + 1; });

  return (
    <div className="p-4 lg:p-6 max-w-5xl mx-auto space-y-5">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-foreground">Analytiques</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Visites du site public · sans cookie</p>
        </div>
        <div className="flex items-center gap-2">
        <a
          href="/api/analytics/export"
          download
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-border bg-white text-muted-foreground hover:text-foreground hover:border-navy/30 transition-all"
        >
          <Download size={12} />
          Exporter CSV
        </a>
        <div className="flex items-center gap-1 bg-secondary rounded-lg p-1 shrink-0">
          <a
            href="/admin/analytics?period=7"
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
              period === 7 ? "bg-white shadow-sm text-navy" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            7 jours
          </a>
          <a
            href="/admin/analytics?period=30"
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
              period === 30 ? "bg-white shadow-sm text-navy" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            30 jours
          </a>
        </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Aujourd'hui",      uniq: todayUniq, visits: todayCount },
          { label: "7 derniers jours", uniq: weekUniq,  visits: weekCount  },
          { label: `${period} jours`,  uniq: totalUniq, visits: total      },
        ].map(({ label, uniq, visits }) => (
          <div key={label} className="bg-white rounded-xl border border-border p-4">
            <p className="text-[11px] text-muted-foreground">{label}</p>
            <p className="text-2xl font-bold text-navy mt-1">{uniq.toLocaleString("fr-BE")}</p>
            <p className="text-[10px] text-muted-foreground">
              visiteur{uniq !== 1 ? "s" : ""} unique{uniq !== 1 ? "s" : ""}
            </p>
            <p className="text-[10px] text-muted-foreground/50 mt-0.5">
              {visits.toLocaleString("fr-BE")} page{visits !== 1 ? "s" : ""} vues
            </p>
          </div>
        ))}
      </div>

      {/* Daily chart */}
      <div className="bg-white rounded-xl border border-border p-5">
        <h2 className="text-sm font-semibold text-foreground mb-4">Visites par jour</h2>
        {total === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">Aucune donnée pour cette période.</p>
        ) : (
          <div className="flex items-end gap-[2px] h-28 px-1">
            {dailyData.map(({ date, count }) => {
              const barH = Math.round((count / maxDay) * 96);
              const d = new Date(date + "T12:00:00");
              const showLabel =
                period <= 7 ||
                d.getDate() === 1 ||
                d.getDay() === 1;
              return (
                <div key={date} className="flex-1 flex flex-col items-center justify-end gap-0.5 group">
                  <span className="hidden group-hover:block text-[9px] text-muted-foreground absolute -mt-5 bg-white border border-border rounded px-1 py-0.5 shadow-sm whitespace-nowrap z-10">
                    {count} · {fmt(d)}
                  </span>
                  <div
                    className="w-full bg-navy/75 hover:bg-navy rounded-sm transition-colors cursor-default"
                    style={{ height: `${Math.max(barH, 2)}px` }}
                    title={`${count} visite${count !== 1 ? "s" : ""} — ${fmt(d)}`}
                  />
                  {showLabel && (
                    <span className="text-[8px] text-muted-foreground/60 whitespace-nowrap leading-tight">
                      {period <= 7
                        ? d.toLocaleDateString("fr-BE", { weekday: "short" })
                        : fmt(d)}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Top pages + Sources & Devices */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Top pages */}
        <div className="bg-white rounded-xl border border-border p-5">
          <h2 className="text-sm font-semibold text-foreground mb-4">Pages les plus visitées</h2>
          {topPages.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">Aucune donnée</p>
          ) : (
            <div className="space-y-3">
              {topPages.map(([pathname, count]) => (
                <div key={pathname}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-foreground truncate max-w-[200px]" title={pathname}>
                      {pageLabel(pathname)}
                    </span>
                    <span className="text-xs font-semibold text-muted-foreground shrink-0 ml-2">
                      {count.toLocaleString("fr-BE")}
                    </span>
                  </div>
                  <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                    <div
                      className="h-full bg-navy rounded-full transition-all"
                      style={{ width: `${Math.round((count / maxPage) * 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Sources + Appareils */}
        <div className="space-y-4">

          {/* Sources */}
          <div className="bg-white rounded-xl border border-border p-5">
            <h2 className="text-sm font-semibold text-foreground mb-4">Sources de trafic</h2>
            {topRefs.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Aucune donnée</p>
            ) : (
              <div className="space-y-2.5">
                {topRefs.map(([label, count]) => {
                  const pct = total ? Math.round((count / total) * 100) : 0;
                  return (
                    <div key={label} className="flex items-center gap-3">
                      <span className="text-xs text-foreground w-20 shrink-0 truncate">{label}</span>
                      <div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#c9a84c] rounded-full"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground w-8 text-right shrink-0">{pct}%</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Appareils */}
          <div className="bg-white rounded-xl border border-border p-5">
            <h2 className="text-sm font-semibold text-foreground mb-4">Appareils</h2>
            <div className="flex items-center gap-4">
              {(
                [
                  { key: "desktop", Icon: Monitor,    label: "Ordinateur" },
                  { key: "mobile",  Icon: Smartphone, label: "Mobile"     },
                  { key: "tablet",  Icon: Tablet,     label: "Tablette"   },
                ] as const
              ).map(({ key, Icon, label }) => {
                const count = devCounts[key] ?? 0;
                const pct   = total ? Math.round((count / total) * 100) : 0;
                return (
                  <div key={key} className="flex-1 text-center">
                    <Icon size={20} className="mx-auto text-navy mb-1.5" />
                    <p className="text-xl font-bold text-foreground">{pct}%</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{label}</p>
                    <p className="text-[10px] text-muted-foreground/60">{count.toLocaleString("fr-BE")} vis.</p>
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      </div>

    </div>
  );
}
