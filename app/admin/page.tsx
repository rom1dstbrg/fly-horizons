import { Suspense } from "react";
import Link from "next/link";
import { CheckCircle2, ChevronRight } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAppSettings } from "@/lib/app-settings-server";
import { getSignals, signalConfigFrom, type Signal, type SignalInput } from "@/lib/reservation-signals";
import { MetarWidget } from "@/components/admin/MetarWidget";
import { ResaBadge } from "@/components/pilote/ResaBadge";
import { Card, PageHeader } from "@/components/pilote/studio";
import { cn } from "@/lib/utils";

export const metadata = { title: "Dashboard — Admin" };

// Dashboard de l'admin (maquette validée le 01/10) : ce qui traîne (mêmes signaux
// que la page Réservations, seuils réglés dans Paramètres), les 7 prochains
// jours, la météo d'EBCI et les dernières demandes. Le calendrier complet reste
// dans Réservations.

type Resa = SignalInput & {
  id: string;
  duree: number | null;
  passagers: number | null;
  payment_status: string | null;
  clients: { prenom: string | null; nom: string | null } | { prenom: string | null; nom: string | null }[] | null;
  pilotes: { nom: string } | { nom: string }[] | null;
};

const COLS = `id, statut, type_resa, date_vol, heure_vol, duree, passagers, created_at, payment_status,
  pilote_id, pilote_assigned_at, pilote_paye, paiement_demande_at, client_paiement_declare_at,
  reschedule_token, slot_proposal_token, clients(prenom, nom), pilotes(nom)`;

const one = <T,>(v: T | T[] | null): T | null => (Array.isArray(v) ? v[0] ?? null : v);
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const brusselsDay = (d: Date) => d.toLocaleDateString("en-CA", { timeZone: "Europe/Brussels" });
const addDays = (iso: string, n: number) => new Date(new Date(`${iso}T12:00:00Z`).getTime() + n * 86_400_000).toISOString().slice(0, 10);
const fmtShort = (iso: string) => new Date(`${iso}T12:00:00Z`).toLocaleDateString("fr-BE", { weekday: "short", day: "numeric", month: "short" });

function clientName(r: Resa) {
  const c = one(r.clients);
  return [c?.prenom, c?.nom ? `${c.nom[0]}.` : ""].filter(Boolean).join(" ") || "Client";
}
const piloteName = (r: Resa) => one(r.pilotes)?.nom ?? "Sans pilote";

function ilYa(iso: string): string {
  const min = Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 60_000));
  if (min < 60) return `il y a ${min} min`;
  const h = Math.round(min / 60);
  return h < 48 ? `il y a ${h} h` : `il y a ${Math.round(h / 24)} j`;
}

function Section({ title, count, href, link, children }: { title: string; count?: number; href?: string; link?: string; children: React.ReactNode }) {
  return (
    <Card padded={false}>
      <div className="flex items-center justify-between gap-3 px-5 pb-1 pt-4">
        <h2 className="flex items-center text-[11px] font-semibold uppercase tracking-[0.06em] text-st-muted">
          {title}
          {!!count && <span className="ml-2 grid h-5 min-w-5 place-items-center rounded-full bg-st-bad px-1.5 text-[11px] font-bold normal-case tracking-normal text-white">{count}</span>}
        </h2>
        {href && link && <Link href={href} className="text-[12.5px] font-semibold text-st-info hover:underline">{link}</Link>}
      </div>
      {children}
    </Card>
  );
}

type Todo = { key: string; level: Signal["level"] | "info"; title: string; sub: string; href: string };

export default async function AdminDashboardPage() {
  const db = createAdminClient();
  const settings = await getAppSettings();
  const cfg = signalConfigFrom(settings);
  const now = new Date();
  const today = brusselsDay(now);

  const [{ data: actives }, { data: recentes }, { count: contactsNonLus }, { count: retoursATraiter }] = await Promise.all([
    db.from("reservations").select(COLS).neq("type_resa", "perso").not("statut", "in", "(annulee,vol_effectue)").gte("date_vol", addDays(today, -30)).order("date_vol", { ascending: true }),
    db.from("reservations").select(COLS).neq("type_resa", "perso").order("created_at", { ascending: false }).limit(5),
    db.from("contacts").select("id", { count: "exact", head: true }).eq("statut", "nouveau"),
    db.from("pilote_retours").select("id", { count: "exact", head: true }).eq("statut", "a_traiter"),
  ]);
  const resas = (actives ?? []) as unknown as Resa[];

  // ── À traiter : le signal le plus grave de chaque réservation, puis contacts et retours
  const signalees = resas
    .map((r) => ({ r, s: getSignals(r, now.getTime(), cfg)[0] }))
    .filter((x): x is { r: Resa; s: Signal } => !!x.s)
    .sort((a, b) => (a.s.level === b.s.level ? a.r.date_vol.localeCompare(b.r.date_vol) : a.s.level === "bad" ? -1 : 1));
  const todos: Todo[] = signalees.map(({ r, s }) => ({
    key: r.id, level: s.level, title: s.label,
    sub: `${clientName(r)} · ${fmtShort(r.date_vol)} · ${piloteName(r)}`,
    href: `/admin/vols?ouvrir=${r.id}`,
  }));
  if (contactsNonLus) todos.push({ key: "contacts", level: "info", title: `${contactsNonLus} message${contactsNonLus > 1 ? "s" : ""} non lu${contactsNonLus > 1 ? "s" : ""}`, sub: "Contacts", href: "/admin/contacts" });
  if (retoursATraiter) todos.push({ key: "retours", level: "info", title: `${retoursATraiter} retour${retoursATraiter > 1 ? "s" : ""} pilote à traiter`, sub: "Retours pilotes", href: "/admin/retours" });
  const MAX = 8;

  // ── 7 prochains jours
  const jours = Array.from({ length: 7 }, (_, i) => addDays(today, i)).map((d, i) => ({
    d,
    label: i === 0 ? "Aujourd'hui" : i === 1 ? "Demain" : cap(new Date(`${d}T12:00:00Z`).toLocaleDateString("fr-BE", { weekday: "long" })),
    vols: resas.filter((r) => r.date_vol === d).sort((a, b) => (a.heure_vol ?? "99:99").localeCompare(b.heure_vol ?? "99:99")),
  })).filter((j) => j.vols.length > 0);
  const nbVols = jours.reduce((n, j) => n + j.vols.length, 0);

  const hour = Number(new Intl.DateTimeFormat("fr-BE", { hour: "numeric", hour12: false, timeZone: "Europe/Brussels" }).format(now));
  const greeting = hour < 12 ? "Bonjour" : hour < 18 ? "Bon après-midi" : "Bonsoir";
  const dateLabel = cap(now.toLocaleDateString("fr-BE", { weekday: "long", day: "numeric", month: "long", timeZone: "Europe/Brussels" }));
  const recents = (recentes ?? []) as unknown as Resa[];

  return (
    <div className="pilote-studio space-y-5 font-sans text-st-text">
      <PageHeader title={`${greeting}, Romain`} description={dateLabel} />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:items-start">
        <div className="space-y-5">
          <Section title="À traiter" count={todos.length} href="/admin/vols" link="Ouvrir les réservations">
            {todos.length === 0 ? (
              <p className="flex items-center gap-2.5 px-5 pb-5 pt-3 text-sm font-medium text-st-ok">
                <CheckCircle2 size={16} /> Tout est en ordre, rien à traiter.
              </p>
            ) : (
              <ul className="px-5 pb-2 pt-1">
                {todos.slice(0, MAX).map((t) => (
                  <li key={t.key} className="border-t border-st-line-soft first:border-t-0">
                    <Link href={t.href} className="-mx-2 flex items-center gap-3 rounded-xl px-2 py-3 transition-colors hover:bg-st-surface">
                      <i className={cn("size-[9px] shrink-0 rounded-full", t.level === "bad" ? "bg-st-bad" : t.level === "warn" ? "bg-[#e08a00]" : "bg-st-info")} />
                      <span className="min-w-0 flex-1">
                        <span className="block text-[13.5px] font-semibold">{t.title}</span>
                        <span className="block truncate text-[12.5px] text-st-muted">{t.sub}</span>
                      </span>
                      <ChevronRight size={17} className="shrink-0 text-st-muted" />
                    </Link>
                  </li>
                ))}
                {todos.length > MAX && (
                  <li className="border-t border-st-line-soft py-3 text-center">
                    <Link href="/admin/vols" className="text-[12.5px] font-semibold text-st-info hover:underline">+ {todos.length - MAX} autres dans Réservations</Link>
                  </li>
                )}
              </ul>
            )}
          </Section>

          <Section title="Les 7 prochains jours" href="/admin/vols" link="Réservations">
            {nbVols === 0 ? (
              <p className="px-5 pb-5 pt-3 text-sm text-st-muted">Aucun vol prévu cette semaine.</p>
            ) : (
              <div className="pb-2">
                {jours.map((j) => (
                  <div key={j.d}>
                    <p className="px-5 pb-1 pt-3 text-xs font-semibold text-st-muted">
                      <span className="text-st-text">{j.label}</span> · {new Date(`${j.d}T12:00:00Z`).toLocaleDateString("fr-BE", { day: "numeric", month: "long" })}
                    </p>
                    {j.vols.map((r) => (
                      <Link key={r.id} href={`/admin/vols?ouvrir=${r.id}`} className="grid grid-cols-[3.2rem_minmax(0,1fr)_auto] items-center gap-3 border-t border-st-line-soft px-5 py-2.5 transition-colors hover:bg-st-surface">
                        <span className="st-num text-[15px] font-semibold">{r.heure_vol ? r.heure_vol.slice(0, 5) : "—"}</span>
                        <span className="min-w-0">
                          <span className="block truncate text-[13.5px] font-semibold">{clientName(r)}{r.duree ? ` · ${r.duree} min` : ""}</span>
                          <span className="block truncate text-[12.5px] text-st-muted">
                            {piloteName(r)}{r.passagers ? ` · ${r.passagers} passager${r.passagers > 1 ? "s" : ""}` : ""}{r.heure_vol ? "" : " · heure à confirmer"}
                          </span>
                        </span>
                        <ResaBadge reservation={{ ...r, type_resa: r.type_resa ?? "annonce_pilote" }} />
                      </Link>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </Section>
        </div>

        <div className="space-y-5">
          <Suspense fallback={<Card><p className="text-sm text-st-muted">Chargement de la météo…</p></Card>}>
            <MetarWidget />
          </Suspense>

          {recents.length > 0 && (
            <Section title="Dernières demandes" href="/admin/vols" link="Voir tout">
              <ul className="px-5 pb-2 pt-1">
                {recents.map((r) => (
                  <li key={r.id} className="border-t border-st-line-soft first:border-t-0">
                    <Link href={`/admin/vols?ouvrir=${r.id}`} className="-mx-2 flex items-center justify-between gap-3 rounded-xl px-2 py-3 transition-colors hover:bg-st-surface">
                      <span className="min-w-0">
                        <span className="block truncate text-[13.5px] font-semibold">{clientName(r)}</span>
                        <span className="block truncate text-[12.5px] text-st-muted">{fmtShort(r.date_vol)} · {ilYa(r.created_at)}</span>
                      </span>
                      <ResaBadge reservation={{ ...r, type_resa: r.type_resa ?? "annonce_pilote" }} />
                    </Link>
                  </li>
                ))}
              </ul>
            </Section>
          )}
        </div>
      </div>
    </div>
  );
}
