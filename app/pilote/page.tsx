import { Suspense } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { AlertTriangle, AlertCircle, CheckCircle2, ArrowRight, PlaneTakeoff, Plane, Clock } from "lucide-react";
import { piloteLegalStatus } from "@/lib/pilote/legal";
import { AdminBadge, getResaBadge } from "@/components/admin/ui";
import { MetarWidget } from "@/components/admin/MetarWidget";

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

  const [{ count: demandesEnAttente }, { count: volsNonPayes }, { data: prochainsVols }] = pilote
    ? await Promise.all([
        admin.from("reservations").select("id", { count: "exact", head: true })
          .eq("pilote_id", pilote.id).eq("statut", "demande_recue"),
        admin.from("reservations").select("id", { count: "exact", head: true })
          .eq("pilote_id", pilote.id).eq("type_resa", "annonce_pilote")
          .neq("pilote_paye", true).not("statut", "in", "(vol_effectue,annulee,demande_recue)"),
        admin.from("reservations")
          .select("id, date_vol, heure_vol, duree, statut, type_resa, clients(prenom, nom)")
          .eq("pilote_id", pilote.id).neq("type_resa", "perso")
          .gte("date_vol", today).not("statut", "in", "(vol_effectue,annulee)")
          .order("date_vol", { ascending: true }).order("heure_vol", { ascending: true })
          .limit(6),
      ])
    : [{ count: 0 }, { count: 0 }, { data: [] }];

  const nDemandes = demandesEnAttente ?? 0;
  const nNonPayes = volsNonPayes ?? 0;
  const legalErrors = legal.issues.filter((i) => i.severity === "error");
  const legalWarnings = legal.issues.filter((i) => i.severity !== "error");

  type ActionItem = { label: string; href: string; icon: React.ElementType };
  const urgentItems: ActionItem[] = [
    ...(legalErrors.length > 0 ? [{ label: "Profil incomplet : vous ne pouvez pas recevoir de vols", href: "/pilote/profil", icon: AlertTriangle }] : []),
    ...(nDemandes > 0 ? [{ label: `${nDemandes} demande${nDemandes > 1 ? "s" : ""} reçue${nDemandes > 1 ? "s" : ""} à confirmer`, href: "/pilote/vols", icon: AlertTriangle }] : []),
    ...(nNonPayes > 0 ? [{ label: `${nNonPayes} vol${nNonPayes > 1 ? "s" : ""} à régler par le client`, href: "/pilote/vols", icon: AlertTriangle }] : []),
  ];
  const todayItems: ActionItem[] = [
    ...(legalWarnings.length > 0 ? legalWarnings.map((i) => ({ label: i.label, href: "/pilote/profil", icon: AlertCircle })) : []),
  ];
  const allActionItems = [...urgentItems, ...todayItems];
  const isUrgent = urgentItems.length > 0;

  const now = new Date();
  const greeting = now.getHours() < 12 ? "Bonjour" : now.getHours() < 18 ? "Bon après-midi" : "Bonsoir";
  const dateLabel = now.toLocaleDateString("fr-BE", { weekday: "long", day: "numeric", month: "long" });

  const vols = prochainsVols ?? [];

  return (
    <div className="space-y-6 w-full">

      <div className="flex items-start justify-between gap-3 flex-wrap pb-4 border-b border-border">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">
            {greeting}{prenom ? `, ${prenom}` : ""}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {dateLabel.charAt(0).toUpperCase() + dateLabel.slice(1)}
          </p>
        </div>
        <Link
          href="/pilote/annonces"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-[#e6a800] transition-colors"
        >
          <PlaneTakeoff size={15} />
          Publier un vol
        </Link>
      </div>

      {/* ── À traiter ────────────────────────────────────────────────── */}
      {allActionItems.length === 0 ? (
        <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 flex items-center gap-3">
          <CheckCircle2 size={14} className="text-green-500 shrink-0" />
          <p className="text-sm font-medium text-green-700">Tout est en ordre, rien à traiter.</p>
        </div>
      ) : (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="flex h-[19px] w-[19px] shrink-0 items-center justify-center rounded-full bg-navy text-[10px] font-bold text-white">1</span>
            <h2 className="text-[11px] font-bold text-foreground uppercase tracking-[1.4px]">À traiter</h2>
            <span className={`inline-flex items-center justify-center w-[17px] h-[17px] rounded-full text-[9.5px] font-bold text-white ${isUrgent ? "bg-red-500" : "bg-amber-500"}`}>
              {allActionItems.length}
            </span>
          </div>
          <div className="bg-card rounded-xl border border-navy/15 overflow-hidden">
            {allActionItems.map((item, i) => {
              const Icon = item.icon;
              const urgent = i < urgentItems.length;
              return (
                <Link key={i} href={item.href}
                  className={`flex items-center gap-3 px-4 py-2.5 border-l-[3px] transition-colors group ${
                    i < allActionItems.length - 1 ? "border-b border-border" : ""
                  } ${
                    urgent
                      ? "border-l-red-500 bg-red-50/70 hover:bg-red-50"
                      : "border-l-amber-400 bg-amber-50/50 hover:bg-amber-50"
                  }`}
                >
                  <Icon size={13} className={urgent ? "text-red-500 shrink-0" : "text-amber-500 shrink-0"} />
                  <span className={`text-xs font-medium flex-1 leading-snug ${urgent ? "text-red-900" : "text-amber-900"}`}>
                    {item.label}
                  </span>
                  <ArrowRight size={10} className={`shrink-0 transition-colors ${urgent ? "text-red-300 group-hover:text-red-400" : "text-amber-300 group-hover:text-amber-400"}`} />
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Prochains vols + météo ───────────────────────────────────── */}
      <div className="grid lg:grid-cols-[3fr_2fr] gap-5 items-start">

        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="flex h-[19px] w-[19px] shrink-0 items-center justify-center rounded-full bg-navy text-[10px] font-bold text-white">2</span>
              <h2 className="text-[11px] font-bold text-foreground uppercase tracking-[1.4px]">Prochains vols</h2>
            </div>
            <Link href="/pilote/vols" className="text-xs text-muted-foreground hover:text-navy transition-colors flex items-center gap-1">
              Voir tout <ArrowRight size={11} />
            </Link>
          </div>
          {vols.length === 0 ? (
            <div className="bg-card rounded-xl border border-navy/15 px-4 py-6 flex flex-col items-center justify-center gap-2 text-center">
              <Plane size={18} className="text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">Aucun vol à venir pour l&apos;instant.</p>
            </div>
          ) : (
            <div className="bg-card rounded-xl border border-navy/15 overflow-hidden">
              <div className="grid grid-cols-[64px_1fr_auto] gap-2 px-4 py-1.5 bg-secondary/60 border-b border-border">
                <span className="text-[9px] font-bold text-muted-foreground/60 uppercase tracking-[1px]">Date</span>
                <span className="text-[9px] font-bold text-muted-foreground/60 uppercase tracking-[1px]">Client</span>
                <span className="text-[9px] font-bold text-muted-foreground/60 uppercase tracking-[1px]">Statut</span>
              </div>
              {vols.map((r, i) => {
                const client = r.clients as unknown as { prenom: string; nom: string } | null;
                const name = client ? `${client.prenom} ${client.nom}`.trim() : "—";
                const date = new Date(r.date_vol + "T12:00:00Z").toLocaleDateString("fr-BE", { day: "numeric", month: "short" });
                const statut = getResaBadge(r);
                return (
                  <Link key={r.id} href="/pilote/vols"
                    className={`grid grid-cols-[64px_1fr_auto] items-center gap-2 px-4 py-2.5 hover:bg-secondary transition-colors group ${i < vols.length - 1 ? "border-b border-border" : ""}`}
                  >
                    <span className="font-mono text-xs font-semibold text-foreground">
                      {date}
                      <span className="block font-normal text-muted-foreground">{r.heure_vol ? r.heure_vol.slice(0, 5) : "à confirmer"}</span>
                    </span>
                    <span className="text-sm font-medium text-foreground truncate">
                      {name}
                      {r.type_resa === "annonce_pilote" && <span className="ml-1.5 text-[10px] font-normal text-muted-foreground">(annonce)</span>}
                    </span>
                    <AdminBadge variant={statut.variant} label={statut.label} />
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="flex h-[19px] w-[19px] shrink-0 items-center justify-center rounded-full bg-navy text-[10px] font-bold text-white">3</span>
            <h2 className="text-[11px] font-bold text-foreground uppercase tracking-[1.4px]">Météo</h2>
          </div>
          <Suspense fallback={
            <div className="bg-card rounded-xl border border-navy/15 px-4 py-3 flex items-center gap-2 text-xs text-muted-foreground">
              <Clock size={12} className="animate-pulse" /> Chargement météo...
            </div>
          }>
            <MetarWidget />
          </Suspense>
        </div>

      </div>
    </div>
  );
}
