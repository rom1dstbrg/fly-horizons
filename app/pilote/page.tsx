import { Suspense } from "react";
import Link from "next/link";
import { AlertTriangle, AlertCircle, ChevronRight, PlaneTakeoff, Plane, Scale, Phone, CheckCircle2 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { piloteLegalStatus } from "@/lib/pilote/legal";
import {
  Card, CardSplit, Metric, PageHeader, SectionHeader, LinkButton, ButtonLabel, DateTile, Badge,
} from "@/components/pilote/studio";
import { ResaBadge, AnnonceTag } from "@/components/pilote/ResaBadge";
import { PiloteVolsActions } from "@/components/pilote/PiloteVolsActions";
import { MetarChip } from "@/components/pilote/MetarChip";
import { cn } from "@/lib/utils";

type Wp = { nom?: string | null };
type NextFlight = {
  id: string;
  date_vol: string;
  heure_vol: string | null;
  duree: number;
  statut: string;
  type_resa: string;
  payment_status: string | null;
  passagers: number | null;
  poids_total: number | null;
  final_waypoints: Wp[] | null;
  clients: { prenom: string; nom: string; telephone: string | null } | null;
  products: { route_waypoints: Wp[] | null } | null;
};

const routeOf = (f: NextFlight) => {
  const wps = f.final_waypoints?.length ? f.final_waypoints : f.products?.route_waypoints;
  return wps?.length ? wps.map((w) => w.nom?.trim() || "?").join(" → ") : null;
};

function inDays(date: string, today: string): string {
  const n = Math.round((new Date(date + "T12:00:00Z").getTime() - new Date(today + "T12:00:00Z").getTime()) / 86400000);
  return n <= 0 ? "aujourd'hui" : n === 1 ? "demain" : `dans ${n} jours`;
}

export default async function PiloteDashboard() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", user!.id).single();
  const prenom = profile?.full_name?.split(" ")[0] ?? "";

  const admin = createAdminClient();
  const { data: pilote } = await admin
    .from("pilotes")
    .select("id, licence_numero, licence_expiration, medical_expiration, conditions_accepted_at")
    .eq("user_id", user!.id)
    .maybeSingle();
  const legal = piloteLegalStatus(pilote);
  const today = new Date().toISOString().slice(0, 10);

  const [{ data: demandes }, { data: nonPayes }, { data: prochains }] = pilote
    ? await Promise.all([
        admin.from("reservations").select("id, date_vol, statut, clients(prenom, nom)")
          .eq("pilote_id", pilote.id).in("statut", ["demande_recue", "en_attente"])
          .order("date_vol", { ascending: true }),
        admin.from("reservations").select("id, date_vol, clients(prenom, nom)")
          .eq("pilote_id", pilote.id).eq("type_resa", "annonce_pilote")
          .neq("pilote_paye", true).not("statut", "in", "(vol_effectue,annulee,demande_recue)")
          .order("date_vol", { ascending: true }),
        admin.from("reservations")
          .select("id, date_vol, heure_vol, duree, statut, type_resa, payment_status, passagers, poids_total, final_waypoints, clients(prenom, nom, telephone), products(route_waypoints)")
          .eq("pilote_id", pilote.id).neq("type_resa", "perso")
          .gte("date_vol", today).not("statut", "in", "(vol_effectue,annulee)")
          .order("date_vol", { ascending: true }).order("heure_vol", { ascending: true })
          .limit(6),
      ])
    : [{ data: [] }, { data: [] }, { data: [] }];

  type Row = { id: string; date_vol: string; statut?: string; clients: { prenom: string; nom: string } | null };
  const nameOf = (r: Row) => (r.clients ? `${r.clients.prenom} ${r.clients.nom}`.trim() : "Client");
  const dateOf = (d: string) => new Date(d + "T12:00:00Z").toLocaleDateString("fr-BE", { weekday: "short", day: "numeric", month: "short", timeZone: "Europe/Brussels" });

  // Ce qui attend une action du pilote, le plus bloquant d'abord.
  type Todo = { tone: "bad" | "warn"; label: string; detail?: string; href: string };
  const todos: Todo[] = [
    ...legal.issues.filter((i) => i.severity === "error").map((i) => ({ tone: "bad" as const, label: i.label, detail: "Vous ne pouvez pas recevoir de vols", href: "/pilote/profil" })),
    ...((demandes ?? []) as unknown as Row[]).map((r) => ({
      tone: "warn" as const,
      label: r.statut === "demande_recue" ? "Nouvelle demande à confirmer" : "Heure à confirmer",
      detail: `${nameOf(r)} · ${dateOf(r.date_vol)}`,
      href: "/pilote/vols",
    })),
    ...((nonPayes ?? []) as unknown as Row[]).map((r) => ({ tone: "bad" as const, label: "Vol à régler par le client", detail: `${nameOf(r)} · ${dateOf(r.date_vol)}`, href: "/pilote/vols" })),
    ...legal.issues.filter((i) => i.severity !== "error").map((i) => ({ tone: "warn" as const, label: i.label, href: "/pilote/profil" })),
  ];

  const vols = (prochains ?? []) as unknown as NextFlight[];
  const next = vols[0] ?? null;

  const now = new Date();
  const hour = Number(now.toLocaleTimeString("fr-BE", { hour: "2-digit", hour12: false, timeZone: "Europe/Brussels" }));
  const greeting = hour < 12 ? "Bonjour" : hour < 18 ? "Bon après-midi" : "Bonsoir";
  const dateLabel = now.toLocaleDateString("fr-BE", { weekday: "long", day: "numeric", month: "long", timeZone: "Europe/Brussels" });

  return (
    <div className="space-y-5">
      <PageHeader
        title={`${greeting}${prenom ? `, ${prenom}` : ""}`}
        description={dateLabel.charAt(0).toUpperCase() + dateLabel.slice(1)}
        actions={
          <>
            <div className="max-sm:hidden"><PiloteVolsActions variant="secondary" /></div>
            <LinkButton href="/pilote/annonces">
              <PlaneTakeoff />
              <ButtonLabel full="Publier un vol" short="Publier" />
            </LinkButton>
          </>
        }
      />

      {/* Téléphone : pas de barre du haut, le METAR vient ici. */}
      <div className="lg:hidden">
        <Suspense fallback={null}><MetarChip /></Suspense>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        {/* Prochain vol — carte composée : l'heure en grand, puis une rangée de cellules. */}
        {next ? (
          <Card padded={false} className="overflow-hidden">
            <div className="p-4 sm:p-5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[12.5px] text-st-muted">Prochain vol</span>
                <ResaBadge reservation={next} />
              </div>
              <div className="mt-2 flex flex-wrap items-end gap-x-5 gap-y-1">
                <p className="st-num text-[40px] font-medium leading-none tracking-[-0.035em] text-st-text">
                  {next.heure_vol ? next.heure_vol.slice(0, 5) : "--:--"}
                </p>
                <div className="pb-0.5">
                  <p className="text-[15px] font-semibold capitalize text-st-text">
                    {new Date(next.date_vol + "T12:00:00Z").toLocaleDateString("fr-BE", { weekday: "long", day: "numeric", month: "long", timeZone: "Europe/Brussels" })}
                  </p>
                  <p className="text-[12.5px] text-st-muted">{next.heure_vol ? inDays(next.date_vol, today) : `heure à confirmer · ${inDays(next.date_vol, today)}`}</p>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <LinkButton href={`/pilote/mass-balance?resa=${next.id}`} size="sm">
                  <Scale />
                  Préparer la M&amp;B
                </LinkButton>
                {next.clients?.telephone && (
                  <LinkButton href={`tel:${next.clients.telephone.replace(/\s+/g, "")}`} variant="secondary" size="sm">
                    <Phone />
                    Appeler
                  </LinkButton>
                )}
                <LinkButton href="/pilote/vols" variant="secondary" size="sm">
                  Ouvrir le vol
                </LinkButton>
              </div>
            </div>
            <CardSplit>
              <Metric
                label="Client"
                value={<span className="flex items-center gap-1.5 text-[15px] font-semibold tracking-normal sm:text-[15px]">{next.clients ? `${next.clients.prenom} ${next.clients.nom}` : "—"}{next.type_resa === "annonce_pilote" && <AnnonceTag />}</span>}
              />
              <Metric label="Route" value={<span className="text-[15px] font-[550] tracking-normal sm:text-[15px]">{routeOf(next) ?? "À tracer"}</span>} />
              <Metric label="Durée" value={`${next.duree} min`} />
              <Metric
                label="Passagers"
                value={`${next.passagers ?? "—"}`}
                hint={next.poids_total != null ? `${next.poids_total} kg au total` : "poids non renseigné"}
              />
            </CardSplit>
          </Card>
        ) : (
          <Card className="flex flex-col items-center justify-center gap-2 py-10 text-center">
            <span className="grid h-11 w-11 place-items-center rounded-full bg-st-surface text-st-muted"><Plane size={20} /></span>
            <p className="font-semibold text-st-text">Aucun vol à venir</p>
            <Link href="/pilote/annonces" className="text-[13px] font-semibold text-st-ink hover:underline">Publier une annonce</Link>
          </Card>
        )}

        {/* À traiter */}
        <Card className="flex flex-col">
          <SectionHeader
            title="À traiter"
            action={todos.length > 0 ? <Badge tone={todos.some((t) => t.tone === "bad") ? "danger" : "warning"}>{todos.length}</Badge> : undefined}
          />
          {todos.length === 0 ? (
            <p className="mt-3 flex items-center gap-2 text-sm text-st-ok">
              <CheckCircle2 size={16} /> Tout est en ordre, rien à traiter.
            </p>
          ) : (
            <ul className="mt-2 divide-y divide-st-line-soft">
              {todos.slice(0, 6).map((t, i) => (
                <li key={i}>
                  <Link href={t.href} className="group flex items-center gap-3 py-2.5">
                    <span className={cn("grid h-[30px] w-[30px] shrink-0 place-items-center rounded-[10px]", t.tone === "bad" ? "bg-st-bad-soft text-st-bad" : "bg-st-warn-soft text-st-warn")}>
                      {t.tone === "bad" ? <AlertTriangle size={15} /> : <AlertCircle size={15} />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13.5px] font-[550] text-st-text">{t.label}</span>
                      {t.detail && <span className="block truncate text-xs text-st-muted">{t.detail}</span>}
                    </span>
                    <ChevronRight size={16} className="shrink-0 text-st-muted transition-colors group-hover:text-st-text" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {/* Les vols suivants */}
      {vols.length > 1 && (
        <Card>
          <SectionHeader
            title="Ensuite"
            action={<Link href="/pilote/vols" className="text-[12.5px] font-semibold text-st-ink hover:underline">Tous mes vols</Link>}
          />
          <ul className="mt-2 divide-y divide-st-line-soft">
            {vols.slice(1).map((v) => (
              <li key={v.id}>
                <Link href="/pilote/vols" className="flex items-center gap-3 py-2.5">
                  <DateTile date={v.date_vol} today={v.date_vol === today} />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5 text-[13.5px] font-[550] text-st-text">
                      <span className="truncate">{v.clients ? `${v.clients.prenom} ${v.clients.nom}` : "—"}</span>
                      {v.type_resa === "annonce_pilote" && <AnnonceTag />}
                    </span>
                    <span className="block truncate text-xs text-st-muted">
                      {v.heure_vol ? v.heure_vol.slice(0, 5) : "heure à fixer"} · {v.duree} min{routeOf(v) ? ` · ${routeOf(v)}` : ""}
                    </span>
                  </span>
                  <span className="max-sm:hidden"><ResaBadge reservation={v} /></span>
                  <ChevronRight size={16} className="shrink-0 text-st-muted" />
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
