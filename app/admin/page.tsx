import { createAdminClient } from "@/lib/supabase/admin";
import { Suspense } from "react";
import Link from "next/link";
import {
  AlertTriangle, AlertCircle, CheckCircle2,
  ArrowRight, Route, MessageSquare, Ticket,
  Users, Plus, Package,
  CalendarDays, Tag, ChevronRight, CreditCard,
  PlaneTakeoff, TrendingUp, TrendingDown, WifiOff,
} from "lucide-react";
import { PremiumPlaneIcon } from "@/components/admin/PremiumPlaneIcon";
import { formatPrice } from "@/lib/utils";
import { DashboardCalendar } from "@/components/admin/DashboardCalendar";
import { MetarWidget } from "@/components/admin/MetarWidget";

export const metadata = { title: "Cockpit — Admin" };

// ─── types ────────────────────────────────────────────────────────────────────

type ActionItem = { label: string; href: string; icon: React.ElementType };

// ─── constants ────────────────────────────────────────────────────────────────

const STATUT_BADGE: Record<string, { label: string; cls: string }> = {
  payment_pending: { label: "Paiement att.",   cls: "text-orange-600 bg-orange-50 border-orange-200" },
  en_attente:      { label: "En attente",       cls: "text-yellow-600 bg-yellow-50 border-yellow-200" },
  date_confirmee:  { label: "Date confirmée",   cls: "text-blue-600 bg-blue-50 border-blue-200" },
  heure_confirmee: { label: "Heure confirmée",  cls: "text-green-600 bg-green-50 border-green-200" },
  acompte_recu:    { label: "Provision reçue",   cls: "text-emerald-600 bg-emerald-50 border-emerald-200" },
  vol_effectue:    { label: "Vol effectué",     cls: "text-purple-600 bg-purple-50 border-purple-200" },
  annulee:         { label: "Annulée",          cls: "text-red-500 bg-red-50 border-red-200" },
};

// ─── sub-components ───────────────────────────────────────────────────────────

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-[11px] font-bold text-muted-foreground uppercase tracking-[1.8px] mb-3">
      {children}
    </h2>
  );
}

function KPICard({ label, value, icon: Icon, accent = "navy", href }: {
  label: string; value: string;
  icon: React.ElementType; accent?: "navy" | "gold" | "green" | "purple" | "red";
  href?: string;
}) {
  const c = {
    navy:   { bg: "bg-navy/8",        val: "text-navy" },
    gold:   { bg: "bg-[#F2B705]/10",  val: "text-[#b88c00]" },
    green:  { bg: "bg-green-500/10",  val: "text-green-600" },
    purple: { bg: "bg-purple-500/10", val: "text-purple-600" },
    red:    { bg: "bg-red-500/10",    val: "text-red-600" },
  }[accent];

  const inner = (
    <div className={`bg-card rounded-xl border border-border p-4 flex items-center gap-3 ${href ? "hover:shadow-sm transition-all group" : ""}`}>
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${c.bg}`}>
        <Icon size={15} className={c.val} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider leading-none">{label}</p>
        <p className={`text-xl font-black tracking-tight mt-1 ${c.val}`}>{value}</p>
      </div>
      {href && <ChevronRight size={12} className="text-muted-foreground/30 group-hover:text-muted-foreground/60 shrink-0 transition-colors" />}
    </div>
  );
  return href ? <Link href={href} className="block">{inner}</Link> : inner;
}

// ─── page ─────────────────────────────────────────────────────────────────────

export default async function AdminDashboardPage() {
  const supabase = createAdminClient();
  const now         = new Date();
  const todayStr    = now.toISOString().split("T")[0];
  const tomorrowStr = new Date(now.getTime() + 86400000).toISOString().split("T")[0];
  const monthStart  = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const thirtyDaysFromNow = new Date(now.getTime() + 30 * 86400000).toISOString();

  const [
    { data: monthOrders },
    { data: reservations },
    { data: allClients },
    { count: vouchersDispoCount },
    { data: newContacts },
    { data: vouchersExpiring },
  ] = await Promise.all([
    // CA du mois uniquement (pas besoin de tout l'historique)
    supabase.from("orders").select("id, total, status, created_at")
      .gte("created_at", monthStart)
      .not("status", "in", "(cancelled,refunded)"),
    // Réservations — tous les champs requis par DrawerReservation
    supabase.from("reservations").select(
      `id, date_vol, heure_vol, duree, statut, type_resa, created_at,
       voucher_code, coupon_code, payment_status, commentaire, acompte, paye, remboursement, payment_token,
       route, route_token, route_status, route_feedback, passagers, poids_total, avion_reserve,
       clients(id, prenom, nom, email, telephone)`
    ).order("created_at", { ascending: false }),
    supabase.from("clients").select("id, email"),
    supabase.from("voucher_codes").select("id", { count: "exact", head: true }).eq("status", "unused"),
    supabase.from("contacts").select("id, prenom, nom, created_at")
      .eq("statut", "nouveau").order("created_at", { ascending: false }).limit(5),
    supabase.from("voucher_codes")
      .select("id, code, recipient_name, product_title, expires_at")
      .eq("status", "unused")
      .not("expires_at", "is", null)
      .gte("expires_at", now.toISOString())
      .lte("expires_at", thirtyDaysFromNow)
      .order("expires_at", { ascending: true }),
  ]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const allResas  = (reservations ?? []) as any[];
  const resaStd   = allResas.filter(r => r.type_resa === "standard");
  const resaPerso = allResas.filter(r => r.type_resa === "perso");

  // ── KPIs
  const caMonthOrders   = (monthOrders ?? []).reduce((s, o) => s + (o.total ?? 0), 0);
  const caMonthResas    = allResas
    .filter(r => r.created_at >= monthStart && r.statut !== "annulee" && r.paye)
    .reduce((s: number, r: { paye: number | null; remboursement?: number | null }) => s + (r.paye ?? 0) - (r.remboursement ?? 0), 0);
  const caMonth         = caMonthOrders + caMonthResas;
  const resasThisMonth  = allResas.filter(r => r.created_at >= monthStart && r.statut !== "annulee").length;
  const clientsUniques  = new Set((allClients ?? []).map(c => c.email?.toLowerCase() ?? c.id)).size;

  // ── Net encaissé vols (même logique que /admin/transactions)
  const soldeGlobal = allResas
    .filter((r: { statut: string }) => r.statut !== "annulee")
    .reduce(
      (s: number, r: { paye: number | null; remboursement: number | null }) =>
        s + (r.paye ?? 0) - (r.remboursement ?? 0),
      0
    );

  // ── Actionnables
  const paymentPending   = resaStd.filter(r => r.statut === "payment_pending").length;
  const enAttenteStd     = resaStd.filter(r => r.statut === "en_attente").length;
  const enAttentePerso   = resaPerso.filter(r => r.statut === "en_attente").length;
  const volsDemainSansH  = allResas.filter(r =>
    r.date_vol === tomorrowStr && !r.heure_vol && ["en_attente", "date_confirmee"].includes(r.statut)
  ).length;
  const newContactsCount = newContacts?.length ?? 0;

  const expiringList = vouchersExpiring ?? [];
  const expiringCritical = expiringList.filter(v => {
    const days = Math.ceil((new Date(v.expires_at).getTime() - now.getTime()) / 86400000);
    return days <= 7;
  }).length;
  const expiringCount = expiringList.length;

  const urgentItems: ActionItem[] = [
    ...(paymentPending    > 0 ? [{ label: `${paymentPending} paiement${paymentPending > 1 ? "s" : ""} en attente de confirmation`,                         href: "/admin/vols",           icon: AlertTriangle }] : []),
    ...(volsDemainSansH   > 0 ? [{ label: `${volsDemainSansH} vol${volsDemainSansH > 1 ? "s" : ""} demain sans heure confirmée`,                           href: "/admin/vols",           icon: AlertTriangle }] : []),
    ...(expiringCritical  > 0 ? [{ label: `${expiringCritical} voucher${expiringCritical > 1 ? "s" : ""} expirent dans moins de 7 jours`,                  href: "/admin/boutique?tab=vouchers", icon: AlertTriangle }] : []),
  ];
  const todayItems: ActionItem[] = [
    ...(enAttenteStd    > 0 ? [{ label: `${enAttenteStd} réservation${enAttenteStd > 1 ? "s" : ""} standard sans date`,                                    href: "/admin/vols",           icon: AlertCircle   }] : []),
    ...(enAttentePerso  > 0 ? [{ label: `${enAttentePerso} vol${enAttentePerso > 1 ? "s" : ""} sur mesure en attente`,                                     href: "/admin/vols",           icon: AlertCircle   }] : []),
    ...(newContactsCount > 0 ? [{ label: `${newContactsCount} message${newContactsCount > 1 ? "s" : ""} non lu${newContactsCount > 1 ? "s" : ""}`,         href: "/admin/contacts",       icon: MessageSquare }] : []),
    ...(!expiringCritical && expiringCount > 0 ? [{ label: `${expiringCount} voucher${expiringCount > 1 ? "s" : ""} expirent dans moins de 30 jours`,      href: "/admin/boutique?tab=vouchers", icon: AlertCircle }] : []),
  ];
  const allActionItems = [...urgentItems, ...todayItems];
  const isUrgent = urgentItems.length > 0;

  // ── Vols du jour / demain
  const volsToday    = allResas
    .filter(r => r.date_vol === todayStr    && r.statut !== "annulee")
    .sort((a, b) => (a.heure_vol ?? "99:99").localeCompare(b.heure_vol ?? "99:99"));
  const volsTomorrow = allResas
    .filter(r => r.date_vol === tomorrowStr && r.statut !== "annulee")
    .sort((a, b) => (a.heure_vol ?? "99:99").localeCompare(b.heure_vol ?? "99:99"));

  // ── Dernières réservations
  const recentResas = allResas.slice(0, 6);

  const greeting  = now.getHours() < 12 ? "Bonjour" : now.getHours() < 18 ? "Bon après-midi" : "Bonsoir";
  const dateLabel = now.toLocaleDateString("fr-BE", { weekday: "long", day: "numeric", month: "long" });

  return (
    <div className="space-y-6 w-full">

      {/* ── HEADER ───────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">{greeting}, Romain</h1>
          <p className="text-sm text-muted-foreground mt-0.5 capitalize">{dateLabel}</p>
        </div>
        <div className="hidden sm:flex items-center gap-2 shrink-0">
          <Link
            href="/admin/reservations/new"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-border text-sm font-semibold text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          >
            <Plus size={15} />
            Nouvelle réservation
          </Link>
          <Link
            href="/admin/reservations/new-mesure"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-border text-sm font-semibold text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          >
            <Route size={15} />
            Nouveau vol sur mesure
          </Link>
          <Link
            href="/admin/reservations/new-horsite"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-border text-sm font-semibold text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          >
            <WifiOff size={15} />
            Hors site
          </Link>
        </div>
      </div>

      {/* ── KPIs ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KPICard label="CA ce mois"  value={formatPrice(caMonth)}                                                            icon={CreditCard}                                   accent="navy"                              />
        <KPICard label="Solde vols"  value={`${soldeGlobal >= 0 ? "+" : ""}${formatPrice(soldeGlobal)}`}                     icon={soldeGlobal >= 0 ? TrendingUp : TrendingDown} accent={soldeGlobal >= 0 ? "green" : "red"} />
        <KPICard label="Vols ce mois" value={String(resasThisMonth)}                                                          icon={PremiumPlaneIcon}                             accent="gold"                              href="/admin/vols" />
        <KPICard label="Clients"     value={String(clientsUniques)}                                                            icon={Users}                                        accent="green"                             href="/admin/clients" />
      </div>

      {/* ── MAIN GRID ────────────────────────────────────────────────── */}
      <div className="grid lg:grid-cols-[7fr_3fr] gap-5 items-start">

        {/* ── GAUCHE : À traiter + Calendrier ──────────────────────── */}
        <div className="space-y-5">

          {/* À traiter */}
          {allActionItems.length === 0 ? (
            <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 flex items-center gap-3">
              <CheckCircle2 size={14} className="text-green-500 shrink-0" />
              <p className="text-sm font-medium text-green-700">Tout est en ordre, rien à traiter.</p>
            </div>
          ) : (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <h2 className="text-[11px] font-bold text-muted-foreground uppercase tracking-[1.8px]">À traiter</h2>
                <span className={`inline-flex items-center justify-center w-4 h-4 rounded-full text-[9px] font-bold text-white ${isUrgent ? "bg-red-500" : "bg-amber-500"}`}>
                  {allActionItems.length}
                </span>
              </div>
              <div className="bg-card rounded-xl border border-border overflow-hidden">
                {urgentItems.length > 0 && (
                  <>
                    <div className="px-4 py-1.5 bg-red-50 border-b border-red-100/80">
                      <span className="text-[9px] font-bold text-red-400 uppercase tracking-[1.5px]">Urgent</span>
                    </div>
                    {urgentItems.map((item, i) => {
                      const Icon = item.icon;
                      return (
                        <Link key={`u${i}`} href={item.href}
                          className="flex items-center gap-3 px-4 py-3 bg-red-50/40 hover:bg-red-50/80 transition-colors group border-b border-red-100/60"
                        >
                          <Icon size={12} className="text-red-500 shrink-0" />
                          <span className="text-xs font-medium text-red-800 flex-1 leading-snug">{item.label}</span>
                          <ArrowRight size={10} className="text-red-300 group-hover:text-red-400 transition-colors shrink-0" />
                        </Link>
                      );
                    })}
                  </>
                )}
                {todayItems.length > 0 && (
                  <>
                    {urgentItems.length > 0 && (
                      <div className="px-4 py-1.5 bg-amber-50/60 border-b border-amber-100/80">
                        <span className="text-[9px] font-bold text-amber-400 uppercase tracking-[1.5px]">Aussi</span>
                      </div>
                    )}
                    {todayItems.map((item, i) => {
                      const Icon = item.icon;
                      return (
                        <Link key={`t${i}`} href={item.href}
                          className={`flex items-center gap-3 px-4 py-3 hover:bg-secondary transition-colors group ${i < todayItems.length - 1 ? "border-b border-border" : ""}`}
                        >
                          <Icon size={12} className="text-amber-500 shrink-0" />
                          <span className="text-xs text-foreground flex-1 leading-snug">{item.label}</span>
                          <ArrowRight size={10} className="text-muted-foreground/30 group-hover:text-muted-foreground transition-colors shrink-0" />
                        </Link>
                      );
                    })}
                  </>
                )}
              </div>
            </div>
          )}

          {/* Calendrier */}
          <div>
            <SectionTitle>Calendrier des vols</SectionTitle>
            <DashboardCalendar reservations={allResas as never} />
          </div>
        </div>

        {/* ── DROITE : Vols du jour + Demain + Actions rapides ─────── */}
        <div className="space-y-4">

          {/* Vols aujourd'hui */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-[11px] font-bold text-muted-foreground uppercase tracking-[1.8px]">Aujourd&apos;hui</h2>
              <Link href="/admin/vols" className="text-xs text-muted-foreground hover:text-navy transition-colors flex items-center gap-1">
                Tous <ArrowRight size={11} />
              </Link>
            </div>
            <div className="bg-card rounded-xl border border-border overflow-hidden">
              {volsToday.length === 0 ? (
                <div className="px-4 py-3 flex items-center gap-2.5">
                  <span className="w-2 h-2 rounded-full bg-muted-foreground/20 shrink-0" />
                  <p className="text-xs text-muted-foreground">Aucun vol aujourd&apos;hui</p>
                </div>
              ) : (
                volsToday.map((r, i) => {
                  const client = r.clients as { prenom: string; nom: string } | null;
                  const name   = client ? `${client.prenom} ${client.nom}`.trim() : "—";
                  const badge  = STATUT_BADGE[r.statut] ?? { label: r.statut, cls: "text-muted-foreground bg-muted border-border" };
                  return (
                    <Link key={r.id} href="/admin/vols"
                      className={`flex items-center gap-3 px-3.5 py-2.5 hover:bg-secondary transition-colors group ${i < volsToday.length - 1 ? "border-b border-border" : ""}`}
                    >
                      {r.type_resa === "perso"
                        ? <Route size={12} className="text-emerald-500 shrink-0" />
                        : <PlaneTakeoff size={12} className="text-navy shrink-0" />
                      }
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-foreground truncate">{name}</p>
                        <p className="text-[10px] text-muted-foreground">{r.heure_vol ?? "Heure à confirmer"}</p>
                      </div>
                      <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full border shrink-0 ${badge.cls}`}>
                        {badge.label}
                      </span>
                    </Link>
                  );
                })
              )}
            </div>
          </div>

          {/* Vols demain — affiché seulement s'il y en a */}
          {volsTomorrow.length > 0 && (
            <div>
              <SectionTitle>Demain</SectionTitle>
              <div className="bg-card rounded-xl border border-border overflow-hidden">
                {volsTomorrow.map((r, i) => {
                  const client = r.clients as { prenom: string; nom: string } | null;
                  const name   = client ? `${client.prenom} ${client.nom}`.trim() : "—";
                  const badge  = STATUT_BADGE[r.statut] ?? { label: r.statut, cls: "text-muted-foreground bg-muted border-border" };
                  return (
                    <Link key={r.id} href="/admin/vols"
                      className={`flex items-center gap-3 px-3.5 py-2.5 hover:bg-secondary transition-colors group ${i < volsTomorrow.length - 1 ? "border-b border-border" : ""}`}
                    >
                      {r.type_resa === "perso"
                        ? <Route size={12} className="text-emerald-500 shrink-0" />
                        : <PlaneTakeoff size={12} className="text-navy shrink-0" />
                      }
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-foreground truncate">{name}</p>
                        <p className="text-[10px] text-muted-foreground">{r.heure_vol ?? "Heure à confirmer"}</p>
                      </div>
                      <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full border shrink-0 ${badge.cls}`}>
                        {badge.label}
                      </span>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

          {/* METAR / TAF */}
          <div>
            <SectionTitle>Météo · EBCI</SectionTitle>
            <Suspense fallback={
              <div className="bg-card rounded-xl border border-border px-4 py-3">
                <p className="text-xs text-muted-foreground">Chargement météo...</p>
              </div>
            }>
              <MetarWidget />
            </Suspense>
          </div>

          {/* Actions rapides */}
          <div>
            <SectionTitle>Actions rapides</SectionTitle>
            <div className="bg-card rounded-xl border border-border overflow-hidden">
              {([
                { href: "/admin/reservations/new",          icon: Plus,    label: "Nouvelle réservation",   color: "text-navy" },
                { href: "/admin/reservations/new-mesure",  icon: Route,   label: "Nouveau vol sur mesure", color: "text-emerald-600" },
                { href: "/admin/reservations/new-horsite", icon: WifiOff, label: "Vol hors-site",          color: "text-slate-500" },
                { href: "/admin/boutique?tab=vouchers",   icon: Ticket,       label: "Nouveau voucher",      color: "text-purple-600" },
                { href: "/admin/boutique?tab=produits",   icon: Package,      label: "Nouvelle offre",       color: "text-amber-600" },
                { href: "/admin/boutique?tab=coupons",    icon: Tag,          label: "Nouveau coupon",       color: "text-blue-600" },
                { href: "/admin/vols?tab=disponibilites", icon: CalendarDays, label: "Disponibilités",       color: "text-muted-foreground" },
              ] as { href: string; icon: React.ElementType; label: string; color: string }[]).map(({ href, icon: Icon, label, color }, idx, arr) => (
                <Link key={href} href={href}
                  className={`flex items-center gap-3 px-4 py-2.5 hover:bg-secondary transition-colors ${idx < arr.length - 1 ? "border-b border-border" : ""}`}
                >
                  <Icon size={13} className={`shrink-0 ${color}`} />
                  <span className="flex-1 text-xs text-foreground">{label}</span>
                  <ArrowRight size={10} className="text-muted-foreground/30 shrink-0" />
                </Link>
              ))}
            </div>
          </div>

        </div>
      </div>

      {/* ── DERNIÈRES RÉSERVATIONS ────────────────────────────────────── */}
      {recentResas.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <SectionTitle>Dernières réservations</SectionTitle>
            <Link href="/admin/vols" className="text-xs text-muted-foreground hover:text-navy transition-colors flex items-center gap-1">
              Voir tout <ArrowRight size={11} />
            </Link>
          </div>
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            {recentResas.map((r, idx) => {
              const client = r.clients as { prenom: string; nom: string } | null;
              const name   = client ? `${client.prenom} ${client.nom}`.trim() || "—" : "—";
              const date   = r.date_vol
                ? new Date(r.date_vol + "T12:00:00Z").toLocaleDateString("fr-BE", { day: "numeric", month: "short" })
                : new Date(r.created_at).toLocaleDateString("fr-BE", { day: "numeric", month: "short" });
              const badge  = STATUT_BADGE[r.statut] ?? { label: r.statut, cls: "text-muted-foreground bg-muted border-border" };
              return (
                <div key={r.id} className={`flex items-center gap-4 px-5 py-3 hover:bg-secondary transition-colors ${idx < recentResas.length - 1 ? "border-b border-border" : ""}`}>
                  {r.type_resa === "perso"
                    ? <Route size={13} className="text-emerald-500 shrink-0" />
                    : <PlaneTakeoff size={13} className="text-navy shrink-0" />
                  }
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{name}</p>
                    <p className="text-xs text-muted-foreground">
                      {date}{r.heure_vol ? ` · ${r.heure_vol}` : ""}
                      {r.type_resa === "perso" ? " · Vol sur mesure" : ""}
                    </p>
                  </div>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border shrink-0 ${badge.cls}`}>
                    {badge.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

    </div>
  );
}
