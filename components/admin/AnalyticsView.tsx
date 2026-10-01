import Link from "next/link";
import { Info } from "lucide-react";
import { fmtDay, type Analytics, type Rich, type Trend } from "@/lib/analytics-stats";
import { RichText } from "@/components/admin/RichText";
import { AnalyticsDataActions } from "@/components/admin/AnalyticsDataActions";
import { Badge, Card, PageHeader } from "@/components/pilote/studio";
import { cn } from "@/lib/utils";

export const ANALYTICS_PERIODS = [7, 30, 90] as const;
const PERIODS = ANALYTICS_PERIODS;
const fr = (n: number) => n.toLocaleString("fr-BE");

function TrendBadge({ t, unit = "%" }: { t: Trend; unit?: string }) {
  if (t.dir === "none") return null;
  if (t.dir === "new") return <Badge tone="info">nouveau</Badge>;
  if (t.dir === "flat") return <Badge tone="neutral">stable</Badge>;
  return <Badge tone={t.dir === "up" ? "success" : "danger"}>{t.dir === "up" ? "▲" : "▼"} {Math.abs(t.pct ?? 0)} {unit}</Badge>;
}

function Why({ children }: { children: React.ReactNode }) {
  return <p className="mt-1 max-w-[75ch] text-[12.5px] leading-relaxed text-st-muted">{children}</p>;
}

function Insight({ r }: { r: Rich }) {
  return (
    <div className="mt-4 flex items-start gap-2.5 rounded-xl bg-st-surface px-3.5 py-3 text-[13px] leading-relaxed text-st-text-2">
      <Info size={16} className="mt-0.5 shrink-0 text-st-ink" />
      <span><RichText r={r} /></span>
    </div>
  );
}

function Kpi({ label, value, trend, children }: { label: string; value: string; trend?: Trend; children: React.ReactNode }) {
  return (
    <Card className="flex flex-col gap-1 !p-4 sm:!p-[18px]">
      <p className="text-[12.5px] font-medium text-st-muted">{label}</p>
      <p className="st-num text-[26px] font-semibold leading-[1.1] tracking-[-0.035em] sm:text-[30px]">{value}</p>
      {trend && <div><TrendBadge t={trend} /></div>}
      <p className="mt-1 text-[12px] leading-snug text-st-muted">{children}</p>
    </Card>
  );
}

function Bars({ rows, tone = "ink" }: { rows: { label: string; value: string; share: number; hint?: string }[]; tone?: "ink" | "gold" }) {
  return (
    <ul className="mt-3 divide-y divide-st-line-soft">
      {rows.map((r) => (
        <li key={r.label} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1.5 py-2.5">
          <span className="truncate text-[13.5px] font-[550]">{r.label}</span>
          <span className="st-num text-[13px] text-st-text-2">{r.value}</span>
          <span className="col-span-2 h-1.5 overflow-hidden rounded-full bg-st-surface">
            <span className={cn("block h-full rounded-full", tone === "gold" ? "bg-st-gold" : "bg-st-ink")} style={{ width: `${Math.max(r.share, 2)}%` }} />
          </span>
        </li>
      ))}
    </ul>
  );
}

export function AnalyticsView({ a, period }: { a: Analytics; period: number }) {
  const maxDay = Math.max(1, ...a.daily.map((d) => d.count));
  const topMax = a.topPages[0]?.count ?? 0;
  const periodWord = period === 7 ? "7 derniers jours" : `${period} derniers jours`;

  return (
    <div className="pilote-studio space-y-5 font-sans text-st-text">
      <PageHeader
        title="Analytiques"
        description="Visites du site public, sans cookie"
        actions={
          <div className="inline-flex gap-0.5 rounded-[11px] bg-st-surface-hover p-[3px]">
            {PERIODS.map((d) => (
              <Link
                key={d}
                href={`/admin/analytics?period=${d}`}
                aria-current={d === period ? "page" : undefined}
                className={cn("rounded-[9px] px-3 py-1.5 text-[12.5px] font-[550] transition-colors", d === period ? "bg-white text-st-text shadow-st-sm" : "text-st-text-2 hover:text-st-text")}
              >
                {d} j
              </Link>
            ))}
          </div>
        }
      />

      {/* En bref */}
      <Card className="space-y-3">
        <h2 className="text-[15px] font-semibold tracking-[-0.01em]">En bref</h2>
        <p className="max-w-[80ch] text-[16px] font-medium leading-relaxed tracking-[-0.01em] text-st-text-2 sm:text-[17px]">
          <RichText r={a.brief.lead} />
        </p>
        {a.brief.points.length > 0 && (
          <ul className="space-y-2">
            {a.brief.points.map((pt, i) => (
              <li key={i} className="flex gap-2.5 text-[13.5px] leading-relaxed text-st-text-2">
                <i className="mt-[7px] size-1.5 shrink-0 rounded-full bg-st-gold" />
                <span><RichText r={pt} /></span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* Chiffres clés */}
      <div data-xs-grid className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Visiteurs" value={fr(a.visitors)} trend={a.tVisitors}>
          Navigateurs différents venus sur le site. Un même appareil qui revient compte une seule fois.
        </Kpi>
        <Kpi label="Visites" value={fr(a.visits)} trend={a.tVisits}>
          Une visite = une série de pages ouvertes d&apos;affilée. Elle se termine après 30 minutes sans activité.
        </Kpi>
        <Kpi label="Pages par visite" value={a.pagesPerVisit.toLocaleString("fr-BE")} trend={a.tPagesPerVisit}>
          {fr(a.pages)} pages vues au total. Plus ce nombre est haut, plus les gens explorent ; sous 2, ils repartent vite.
        </Kpi>
        <Kpi label="Nouveaux visiteurs" value={a.visitors && a.hasPrev ? `${a.newShare} %` : "—"}>
          {a.hasPrev ? "Pas venus pendant la période d'avant. Les autres reviennent." : "Il faut une période d'avant pour savoir qui revient : disponible dès que le site a assez d'historique."}
        </Kpi>
      </div>

      {/* Visites par jour */}
      <Card>
        <h2 className="text-[15px] font-semibold tracking-[-0.01em]">Visites par jour</h2>
        <Why>Combien de visites commencent chaque jour. Les pics suivent en général une annonce publiée, un post ou une newsletter.</Why>
        {a.empty ? (
          <p className="py-10 text-center text-sm text-st-muted">Aucune visite sur les {periodWord}.</p>
        ) : (
          <>
            <div className="mt-4 flex h-[150px] items-end gap-[3px] border-b border-st-line">
              {a.daily.map((d) => (
                <div
                  key={d.day}
                  title={`${d.count} visite${d.count > 1 ? "s" : ""} · ${fmtDay(d.day)}`}
                  className={cn("min-h-[3px] flex-1 rounded-t-[4px]", d.peak ? "bg-st-gold" : d.weekend ? "bg-st-ink/45" : "bg-st-ink/80")}
                  style={{ height: `${Math.max((d.count / maxDay) * 100, 2)}%` }}
                />
              ))}
            </div>
            <div className="mt-1.5 flex justify-between text-[11.5px] text-st-muted">
              <span>{fmtDay(a.daily[0].day)}</span>
              {a.daily.length > 14 && <span>{fmtDay(a.daily[Math.floor(a.daily.length / 2)].day)}</span>}
              <span>{fmtDay(a.daily[a.daily.length - 1].day)}</span>
            </div>
            <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-st-muted">
              <span className="flex items-center gap-1.5"><i className="size-2.5 rounded-[3px] bg-st-ink/80" />Jour de semaine</span>
              <span className="flex items-center gap-1.5"><i className="size-2.5 rounded-[3px] bg-st-ink/45" />Week-end</span>
              <span className="flex items-center gap-1.5"><i className="size-2.5 rounded-[3px] bg-st-gold" />Jour le plus chargé</span>
            </div>
            {a.dailyInsight && <Insight r={a.dailyInsight} />}
          </>
        )}
      </Card>

      {/* Parcours */}
      <Card>
        <h2 className="text-[15px] font-semibold tracking-[-0.01em]">De la visite à la demande</h2>
        <Why>Pour chaque étape, le nombre de visiteurs qui l&apos;ont atteinte au moins une fois pendant la période. À partir de l&apos;annonce, chaque étape ne garde que ceux qui ont franchi la précédente. Cela montre où les gens s&apos;arrêtent.</Why>
        {a.empty ? (
          <p className="py-8 text-center text-sm text-st-muted">Aucune donnée sur cette période.</p>
        ) : (
          <>
            <div className="mt-4 space-y-3.5">
              {a.funnel.map((f, i) => {
                const top = a.funnel[0].count || 1;
                const width = f.pending ? 0 : Math.max((f.count / top) * 100, f.count > 0 ? 2 : 0);
                const last = f.key === "sent";
                return (
                  <div key={f.key} className={cn("grid items-center gap-x-4 gap-y-1.5 sm:grid-cols-[210px_minmax(0,1fr)_150px]", i === 3 && "mt-5 border-t border-st-line-soft pt-4")}>
                    <div className="min-w-0">
                      <p className="text-[13.5px] font-semibold">{f.label}</p>
                      <p className="truncate text-[12px] text-st-muted">{f.hint}</p>
                    </div>
                    <div className={cn("h-[26px] overflow-hidden rounded-lg bg-st-surface", f.pending && "border border-dashed border-st-line-strong bg-transparent")}>
                      {!f.pending && <div className={cn("h-full rounded-lg", last ? "bg-st-gold" : "bg-st-ink")} style={{ width: `${width}%` }} />}
                    </div>
                    <div className="st-num text-[13px] sm:text-right">
                      {f.pending ? (
                        <span className="text-[12px] text-st-muted">En attente des premières visites</span>
                      ) : (
                        <>
                          <b className="text-[15px] font-semibold">{fr(f.count)}</b>
                          <span className="block text-[12px] text-st-muted">
                            {f.ofPrev !== null ? `${f.ofPrev} % de l'étape d'avant` : f.key === "visite" ? "" : `${f.ofVisitors} % des visiteurs`}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            {a.funnelInsight && <Insight r={a.funnelInsight} />}
          </>
        )}
      </Card>

      <div className="grid gap-5 lg:grid-cols-2 lg:items-start">
        <Card>
          <h2 className="text-[15px] font-semibold tracking-[-0.01em]">Pages les plus vues</h2>
          <Why>Ce qui intéresse vraiment les visiteurs. Le pourcentage est la part de toutes les pages vues.</Why>
          {a.topPages.length === 0
            ? <p className="py-8 text-center text-sm text-st-muted">Aucune donnée.</p>
            : <Bars rows={a.topPages.map((t) => ({ label: t.label, value: `${fr(t.count)} · ${t.share} %`, share: topMax ? Math.round((t.count / topMax) * 100) : 0 }))} />}
        </Card>

        <div className="space-y-5">
          <Card>
            <h2 className="text-[15px] font-semibold tracking-[-0.01em]">D&apos;où viennent les visiteurs</h2>
            <Why>Le site d&apos;où la personne arrive au début de sa visite. <b className="font-semibold text-st-text-2">Direct</b> = adresse tapée, favori, ou lien sans origine (WhatsApp, email).</Why>
            {a.sources.length === 0
              ? <p className="py-6 text-center text-sm text-st-muted">Aucune donnée.</p>
              : <Bars tone="gold" rows={a.sources.map((s) => ({ label: s.label, value: `${s.share} %`, share: s.share }))} />}
          </Card>

          <Card>
            <h2 className="text-[15px] font-semibold tracking-[-0.01em]">Appareils</h2>
            <Why>Le type d&apos;écran utilisé pendant la visite, d&apos;après la largeur de la fenêtre.</Why>
            <div data-xs-grid className="mt-3.5 grid grid-cols-3 gap-2.5">
              {([["mobile", "Mobile"], ["desktop", "Ordinateur"], ["tablet", "Tablette"]] as const).map(([k, l]) => (
                <div key={k} className="rounded-[14px] bg-st-surface p-3.5 text-center">
                  <p className="st-num text-[24px] font-semibold tracking-[-0.03em]">{a.devices[k]} %</p>
                  <p className="text-[12.5px] text-st-muted">{l}</p>
                </div>
              ))}
            </div>
            {a.deviceInsight && <Insight r={a.deviceInsight} />}
          </Card>
        </div>
      </div>

      {/* Mode d'emploi */}
      <Card>
        <h2 className="text-[15px] font-semibold tracking-[-0.01em]">Comment lire ces chiffres</h2>
        <dl className="mt-3.5 grid gap-x-8 gap-y-4 sm:grid-cols-2">
          {[
            ["Un visiteur n'est pas une personne", "C'est un navigateur sur un appareil. Quelqu'un qui vient sur son téléphone puis sur son ordinateur compte pour deux."],
            ["Ce qui n'est pas compté", "Les robots des moteurs de recherche, les visites de ton compte admin et les pages d'administration."],
            ["Aucun cookie, aucune donnée personnelle", "Un identifiant aléatoire est gardé dans le navigateur. On ne sait ni qui est la personne, ni son adresse IP."],
            ["Conservation", "Les visites sont supprimées automatiquement après 13 mois."],
          ].map(([t, d]) => (
            <div key={t}>
              <dt className="text-[13.5px] font-semibold">{t}</dt>
              <dd className="mt-0.5 text-[12.5px] leading-relaxed text-st-muted">{d}</dd>
            </div>
          ))}
        </dl>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-st-line pt-4">
          <p className="max-w-[60ch] text-[12.5px] text-st-muted">Exporter les données brutes pour les ouvrir dans un tableur, ou tout effacer pour repartir de zéro (irréversible).</p>
          <AnalyticsDataActions />
        </div>
      </Card>
    </div>
  );
}
