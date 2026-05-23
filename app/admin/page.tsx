import { createAdminClient } from "@/lib/supabase/admin";
import Link from "next/link";
import {
  AlertTriangle, AlertCircle, CheckCircle2, Clock, Plane,
  ArrowRight, CalendarCheck, Route, MessageSquare, Ticket,
  ShoppingCart, Users, TrendingUp, Package, Plus,
  CalendarDays, Tag, ChevronRight, CreditCard, ExternalLink,
} from "lucide-react";
import { formatPrice } from "@/lib/utils";

export const metadata = { title: "Cockpit — Admin" };

// ─── helpers ──────────────────────────────────────────────────────────────────

function daysLabel(dateStr: string) {
  const now = new Date();
  const vol = new Date(dateStr + "T12:00:00Z");
  const diff = Math.ceil((vol.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (diff === 0) return "Aujourd'hui";
  if (diff === 1) return "Demain";
  if (diff < 0) return null;
  return `J-${diff}`;
}

const RESA_STATUTS: Record<string, { label: string; dot: string }> = {
  payment_pending: { label: "Paiement att.", dot: "bg-orange-400" },
  en_attente:      { label: "En attente",    dot: "bg-yellow-400" },
  date_confirmee:  { label: "Date confirmée", dot: "bg-blue-400" },
  heure_confirmee: { label: "Heure confirmée", dot: "bg-green-400" },
  vol_effectue:    { label: "Vol effectué",  dot: "bg-purple-400" },
  annulee:         { label: "Annulée",       dot: "bg-red-400" },
  acompte_recu:    { label: "Acompte reçu",  dot: "bg-emerald-400" },
};

// ─── sub-components ───────────────────────────────────────────────────────────

function KPICard({
  label, value, sub, icon: Icon, accent = "navy", href,
}: {
  label: string; value: string; sub?: string;
  icon: React.ElementType; accent?: "navy" | "gold" | "green" | "purple";
  href?: string;
}) {
  const colors = {
    navy:   "bg-navy/8 text-navy",
    gold:   "bg-gold/10 text-gold-700",
    green:  "bg-green-500/10 text-green-600",
    purple: "bg-purple-500/10 text-purple-600",
  };
  const content = (
    <div className="bg-card rounded-xl border border-border p-5 hover:shadow-[0_4px_20px_rgba(17,51,86,.08)] transition-all group">
      <div className="flex items-start justify-between mb-3">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${colors[accent]}`}>
          <Icon size={16} />
        </div>
        {href && <ChevronRight size={14} className="text-muted-foreground/30 group-hover:text-muted-foreground/60 transition-colors mt-0.5" />}
      </div>
      <p className="text-2xl font-bold text-foreground tracking-tight">{value}</p>
      <p className="text-xs font-medium text-muted-foreground mt-0.5">{label}</p>
      {sub && <p className="text-[10px] text-muted-foreground/50 mt-1">{sub}</p>}
    </div>
  );
  return href ? <Link href={href}>{content}</Link> : content;
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-[11px] font-bold text-muted-foreground/50 uppercase tracking-[1.8px] mb-3">
      {children}
    </h2>
  );
}

// ─── page ─────────────────────────────────────────────────────────────────────

export default async function AdminDashboardPage() {
  const supabase = createAdminClient();
  const now = new Date();
  const todayStr  = now.toISOString().split("T")[0];
  const tomorrowStr = new Date(now.getTime() + 86400000).toISOString().split("T")[0];
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const [
    { data: orders },
    { data: products },
    { data: allClients },
    { data: reservations },
    { count: vouchersDispoCount },
    { data: newContacts },
  ] = await Promise.all([
    supabase.from("orders").select("id, total, status, created_at, shipping_address").order("created_at", { ascending: false }),
    supabase.from("products").select("id, title, stock, active, price, product_type, voucher_duration_minutes").order("stock", { ascending: true }),
    supabase.from("clients").select("email"),
    supabase.from("reservations").select("id, date_vol, heure_vol, duree, statut, type_resa, created_at, clients(prenom, nom, email)").order("created_at", { ascending: false }),
    supabase.from("voucher_codes").select("id", { count: "exact", head: true }).eq("status", "unused"),
    supabase.from("contacts").select("id, prenom, nom, message, created_at").eq("statut", "nouveau").order("created_at", { ascending: false }).limit(5),
  ]);

  const allResas  = reservations ?? [];
  const resaStd   = allResas.filter(r => r.type_resa === "standard");
  const resaPerso = allResas.filter(r => r.type_resa === "perso");

  // ── KPIs ──
  const validOrders = (orders ?? []).filter(o => o.status !== "cancelled" && o.status !== "refunded");
  const caTotal  = validOrders.reduce((s, o) => s + (o.total ?? 0), 0);
  const caMonth  = validOrders.filter(o => o.created_at >= monthStart).reduce((s, o) => s + (o.total ?? 0), 0);
  const resasThisMonth = allResas.filter(r => r.created_at >= monthStart).length;
  const clientsUniques = new Set((allClients ?? []).map(c => c.email.toLowerCase())).size;
  const pendingOrders  = (orders ?? []).filter(o => ["pending", "paid"].includes(o.status)).length;
  const lowStock = (products ?? []).filter(p => p.stock <= 5 && p.product_type !== "voucher" && !p.voucher_duration_minutes);

  // ── Urgences ──
  const paymentPending  = resaStd.filter(r => r.statut === "payment_pending").length;
  const enAttenteStd    = resaStd.filter(r => r.statut === "en_attente").length;
  const enAttentePerso  = resaPerso.filter(r => r.statut === "en_attente").length;
  const volsDemainSansH = allResas.filter(r =>
    r.date_vol === tomorrowStr && !r.heure_vol && ["en_attente", "date_confirmee"].includes(r.statut)
  ).length;
  const newContactsCount = newContacts?.length ?? 0;

  const urgentItems: { label: string; href: string }[] = [
    ...(paymentPending  > 0 ? [{ label: `${paymentPending} paiement${paymentPending > 1 ? "s" : ""} en attente de confirmation`, href: "/admin/reservations" }] : []),
    ...(volsDemainSansH > 0 ? [{ label: `${volsDemainSansH} vol${volsDemainSansH > 1 ? "s" : ""} demain sans heure confirmée`, href: "/admin/reservations" }] : []),
  ];

  const todayItems: { label: string; href: string }[] = [
    ...(enAttenteStd   > 0 ? [{ label: `${enAttenteStd} réservation${enAttenteStd > 1 ? "s" : ""} standard sans date`, href: "/admin/reservations" }] : []),
    ...(enAttentePerso > 0 ? [{ label: `${enAttentePerso} vol${enAttentePerso > 1 ? "s" : ""} sur mesure en attente`, href: "/admin/vols-sur-mesure" }] : []),
    ...(newContactsCount > 0 ? [{ label: `${newContactsCount} message${newContactsCount > 1 ? "s" : ""} non lu${newContactsCount > 1 ? "s" : ""}`, href: "/admin/contacts" }] : []),
    ...(pendingOrders  > 0 ? [{ label: `${pendingOrders} commande${pendingOrders > 1 ? "s" : ""} à traiter`, href: "/admin/orders" }] : []),
  ];

  const isUrgent = urgentItems.length > 0;
  const isToday  = todayItems.length > 0;

  // ── Prochains vols ──
  const prochainsVols = allResas
    .filter(r => r.date_vol >= todayStr && ["date_confirmee", "heure_confirmee"].includes(r.statut))
    .sort((a, b) => a.date_vol.localeCompare(b.date_vol))
    .slice(0, 7);

  // ── Activité récente ──
  const recentResas = allResas.slice(0, 6);
  const recentOrders = (orders ?? []).slice(0, 5);

  const greeting = now.getHours() < 12 ? "Bonjour" : now.getHours() < 18 ? "Bon après-midi" : "Bonsoir";
  const dateLabel = now.toLocaleDateString("fr-BE", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  return (
    <div className="space-y-7 max-w-[1400px]">

      {/* ── Header ───────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">
            {greeting} 👋
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5 capitalize">{dateLabel}</p>
        </div>
        <Link
          href="/admin/reservations/new"
          className="hidden sm:inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-navy text-white text-sm font-semibold hover:bg-navy-dk transition-colors shadow-sm"
        >
          <Plus size={15} />
          Nouvelle réservation
        </Link>
      </div>

      {/* ── Priority command bar ──────────────────────────────────────── */}
      {isUrgent ? (
        <div className="rounded-xl border border-red-200 bg-red-50 overflow-hidden">
          <div className="flex items-center gap-3 px-5 py-3 border-b border-red-200/60 bg-red-500/5">
            <AlertTriangle size={15} className="text-red-500 shrink-0" />
            <p className="text-sm font-semibold text-red-700">
              {urgentItems.length} élément{urgentItems.length > 1 ? "s" : ""} urgent{urgentItems.length > 1 ? "s" : ""}, action requise
            </p>
          </div>
          <div className="px-5 py-3 space-y-2">
            {urgentItems.map((item, i) => (
              <Link key={i} href={item.href} className="flex items-center gap-2 text-sm text-red-700 hover:text-red-900 transition-colors group">
                <span className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />
                {item.label}
                <ArrowRight size={12} className="opacity-0 group-hover:opacity-100 transition-opacity ml-1" />
              </Link>
            ))}
          </div>
          {isToday && (
            <div className="px-5 py-2.5 border-t border-red-200/60 flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-semibold text-red-500/60 uppercase tracking-wider">Aussi :</span>
              {todayItems.map((item, i) => (
                <Link key={i} href={item.href} className="text-xs text-red-600/70 hover:text-red-700 underline-offset-2 hover:underline transition-colors">
                  {item.label}
                </Link>
              ))}
            </div>
          )}
        </div>
      ) : isToday ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 overflow-hidden">
          <div className="flex items-center gap-3 px-5 py-3 border-b border-amber-200/60 bg-amber-500/5">
            <AlertCircle size={15} className="text-amber-500 shrink-0" />
            <p className="text-sm font-semibold text-amber-700">
              {todayItems.length} élément{todayItems.length > 1 ? "s" : ""} à traiter aujourd'hui
            </p>
          </div>
          <div className="px-5 py-3 space-y-2">
            {todayItems.map((item, i) => (
              <Link key={i} href={item.href} className="flex items-center gap-2 text-sm text-amber-700 hover:text-amber-900 transition-colors group">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                {item.label}
                <ArrowRight size={12} className="opacity-0 group-hover:opacity-100 transition-opacity ml-1" />
              </Link>
            ))}
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-green-200 bg-green-50 px-5 py-3.5 flex items-center gap-3">
          <CheckCircle2 size={15} className="text-green-500 shrink-0" />
          <p className="text-sm font-medium text-green-700">Tout est en ordre, aucune action requise</p>
        </div>
      )}

      {/* ── KPI Grid ─────────────────────────────────────────────────── */}
      <div>
        <SectionTitle>Indicateurs clés</SectionTitle>
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
          <KPICard label="CA total" value={formatPrice(caTotal)} icon={TrendingUp} accent="navy" href="/admin/orders" />
          <KPICard label="CA ce mois" value={formatPrice(caMonth)} sub={now.toLocaleDateString("fr-BE", { month: "long" })} icon={CreditCard} accent="navy" />
          <KPICard label="Vols ce mois" value={String(resasThisMonth)} sub="réservations reçues" icon={Plane} accent="gold" href="/admin/reservations" />
          <KPICard label="Clients" value={String(clientsUniques)} sub="uniques" icon={Users} accent="green" href="/admin/clients" />
          <KPICard label="Vouchers actifs" value={String(vouchersDispoCount ?? 0)} sub="disponibles" icon={Ticket} accent="purple" href="/admin/vouchers" />
          <KPICard label="Commandes" value={String(pendingOrders)} sub="à traiter" icon={ShoppingCart} accent={pendingOrders > 0 ? "gold" : "navy"} href="/admin/orders" />
        </div>
      </div>

      {/* ── Main grid ────────────────────────────────────────────────── */}
      <div className="grid lg:grid-cols-3 gap-5">

        {/* Left col — 2/3 */}
        <div className="lg:col-span-2 space-y-5">

          {/* Prochains vols */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <SectionTitle>Prochains vols confirmés</SectionTitle>
              <Link href="/admin/reservations" className="text-xs text-muted-foreground hover:text-navy transition-colors flex items-center gap-1">
                Voir tout <ArrowRight size={11} />
              </Link>
            </div>
            <div className="bg-card rounded-xl border border-border overflow-hidden">
              {prochainsVols.length === 0 ? (
                <div className="px-6 py-10 text-center">
                  <Plane size={20} className="text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Aucun vol confirmé à venir</p>
                </div>
              ) : (
                <div>
                  {prochainsVols.map((r, idx) => {
                    const client = (r.clients as unknown) as { prenom: string; nom: string } | null;
                    const dateStr = new Date(r.date_vol + "T12:00:00Z").toLocaleDateString("fr-BE", { weekday: "short", day: "numeric", month: "short" });
                    const statut = RESA_STATUTS[r.statut];
                    const dl = daysLabel(r.date_vol);
                    const isClose = dl === "Aujourd'hui" || dl === "Demain";
                    return (
                      <div key={r.id} className={`flex items-center gap-4 px-5 py-3.5 hover:bg-secondary/40 transition-colors ${idx < prochainsVols.length - 1 ? "border-b border-border" : ""}`}>
                        <div className="shrink-0 w-24">
                          <p className="text-sm font-semibold text-foreground capitalize">{dateStr}</p>
                          {r.heure_vol
                            ? <p className="text-xs text-muted-foreground">{r.heure_vol.slice(0, 5)}</p>
                            : <p className="text-xs text-orange-400">Heure à confirmer</p>
                          }
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{client?.prenom} {client?.nom}</p>
                          <p className="text-xs text-muted-foreground">{r.duree} min · {r.type_resa === "standard" ? "Standard" : "Sur mesure"}</p>
                        </div>
                        <div className="shrink-0 flex items-center gap-2.5">
                          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <span className={`w-1.5 h-1.5 rounded-full ${statut?.dot ?? "bg-gray-300"}`} />
                            {statut?.label}
                          </span>
                          {dl && (
                            <span className={`text-xs font-bold min-w-[48px] text-right ${isClose ? "text-orange-500" : "text-muted-foreground/50"}`}>
                              {dl}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Activité récente — réservations */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <SectionTitle>Activité récente</SectionTitle>
              <Link href="/admin/reservations" className="text-xs text-muted-foreground hover:text-navy transition-colors flex items-center gap-1">
                Voir tout <ArrowRight size={11} />
              </Link>
            </div>
            <div className="bg-card rounded-xl border border-border overflow-hidden">
              {recentResas.length === 0 ? (
                <div className="px-6 py-10 text-center">
                  <p className="text-sm text-muted-foreground">Aucune réservation</p>
                </div>
              ) : recentResas.map((r, idx) => {
                const client = (r.clients as unknown) as { prenom: string; nom: string } | null;
                const dateVol = new Date(r.date_vol + "T12:00:00Z").toLocaleDateString("fr-BE", { day: "numeric", month: "short", year: "numeric" });
                const createdAt = new Date(r.created_at).toLocaleDateString("fr-BE", { day: "numeric", month: "short" });
                const statut = RESA_STATUTS[r.statut] ?? { label: r.statut, dot: "bg-gray-300" };
                return (
                  <div key={r.id} className={`flex items-center gap-4 px-5 py-3 hover:bg-secondary/40 transition-colors ${idx < recentResas.length - 1 ? "border-b border-border" : ""}`}>
                    <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: undefined }}>
                      <span className={`block w-1.5 h-1.5 rounded-full ${statut.dot}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{client?.prenom} {client?.nom}</p>
                        <span className="text-[10px] text-muted-foreground/50 bg-secondary px-1.5 py-0.5 rounded shrink-0">
                          {r.type_resa === "standard" ? "Standard" : "Sur mesure"}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">{dateVol} · {r.duree} min</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-xs font-medium text-muted-foreground">{statut.label}</p>
                      <p className="text-[10px] text-muted-foreground/50">Reçu {createdAt}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Commandes récentes */}
          {recentOrders.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <SectionTitle>Dernières commandes boutique</SectionTitle>
                <Link href="/admin/orders" className="text-xs text-muted-foreground hover:text-navy transition-colors flex items-center gap-1">
                  Voir tout <ArrowRight size={11} />
                </Link>
              </div>
              <div className="bg-card rounded-xl border border-border overflow-hidden">
                {recentOrders.map((order, idx) => {
                  const name = (order.shipping_address as { full_name?: string } | null)?.full_name ?? "—";
                  const date = new Date(order.created_at).toLocaleDateString("fr-BE", { day: "numeric", month: "short" });
                  const STATUS_STYLE: Record<string, string> = {
                    paid: "text-blue-600 bg-blue-50 border-blue-200",
                    pending: "text-yellow-600 bg-yellow-50 border-yellow-200",
                    delivered: "text-green-600 bg-green-50 border-green-200",
                    cancelled: "text-red-500 bg-red-50 border-red-200",
                  };
                  const STATUS_LABEL: Record<string, string> = {
                    paid: "Payée", pending: "En attente", processing: "En cours",
                    shipped: "Expédiée", delivered: "Livrée", cancelled: "Annulée", refunded: "Remboursée",
                  };
                  return (
                    <div key={order.id} className={`flex items-center gap-4 px-5 py-3 hover:bg-secondary/40 transition-colors ${idx < recentOrders.length - 1 ? "border-b border-border" : ""}`}>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{name}</p>
                        <p className="text-xs text-muted-foreground font-mono">#{order.id.slice(0, 8).toUpperCase()} · {date}</p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${STATUS_STYLE[order.status] ?? "text-muted-foreground bg-muted border-border"}`}>
                          {STATUS_LABEL[order.status] ?? order.status}
                        </span>
                        <span className="text-sm font-bold text-foreground">{formatPrice(order.total)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Right col — 1/3 */}
        <div className="space-y-5">

          {/* Actions rapides */}
          <div>
            <SectionTitle>Actions rapides</SectionTitle>
            <div className="bg-card rounded-xl border border-border overflow-hidden">
              {[
                { href: "/admin/reservations/new", icon: Plus,         label: "Nouvelle réservation", color: "text-navy" },
                { href: "/admin/vouchers",         icon: Ticket,       label: "Nouveau voucher",      color: "text-purple-600" },
                { href: "/admin/vols-sur-mesure",  icon: Route,        label: "Vol sur mesure",       color: "text-emerald-600" },
                { href: "/admin/products/new",     icon: Package,      label: "Nouveau produit",      color: "text-amber-600" },
                { href: "/admin/coupons",          icon: Tag,          label: "Nouveau coupon",       color: "text-blue-600" },
                { href: "/admin/clients",          icon: Users,        label: "Voir les clients",     color: "text-muted-foreground" },
                { href: "/admin/disponibilites",   icon: CalendarDays, label: "Disponibilités",       color: "text-muted-foreground" },
              ].map(({ href, icon: Icon, label, color }, idx, arr) => (
                <Link key={href} href={href}
                  className={`flex items-center gap-3 px-4 py-3 hover:bg-secondary/50 transition-colors text-sm text-foreground hover:text-navy ${idx < arr.length - 1 ? "border-b border-border" : ""}`}
                >
                  <Icon size={14} className={`shrink-0 ${color}`} />
                  {label}
                  <ArrowRight size={12} className="ml-auto text-muted-foreground/30" />
                </Link>
              ))}
            </div>
          </div>

          {/* Messages non lus */}
          {newContactsCount > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <SectionTitle>Messages non lus</SectionTitle>
                <Link href="/admin/contacts" className="text-xs text-muted-foreground hover:text-navy transition-colors flex items-center gap-1">
                  Tout voir <ArrowRight size={11} />
                </Link>
              </div>
              <div className="bg-card rounded-xl border border-border overflow-hidden">
                {(newContacts ?? []).slice(0, 4).map((c, idx, arr) => (
                  <Link key={c.id} href="/admin/contacts"
                    className={`block px-4 py-3 hover:bg-secondary/50 transition-colors ${idx < arr.length - 1 ? "border-b border-border" : ""}`}
                  >
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />
                      <p className="text-sm font-medium text-foreground">{c.prenom} {c.nom}</p>
                      <p className="text-[10px] text-muted-foreground ml-auto">
                        {new Date(c.created_at).toLocaleDateString("fr-BE", { day: "numeric", month: "short" })}
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2 pl-3.5">{c.message}</p>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Stats vols — mini */}
          <div>
            <SectionTitle>Pipeline vols</SectionTitle>
            <div className="bg-card rounded-xl border border-border overflow-hidden">
              {[
                { label: "Paiement att.",   value: resaStd.filter(r => r.statut === "payment_pending").length,  color: "bg-orange-400", href: "/admin/reservations" },
                { label: "Sans date",       value: resaStd.filter(r => r.statut === "en_attente").length,       color: "bg-yellow-400", href: "/admin/reservations" },
                { label: "Date confirmée",  value: resaStd.filter(r => r.statut === "date_confirmee").length,   color: "bg-blue-400",   href: "/admin/reservations" },
                { label: "Heure confirmée", value: resaStd.filter(r => r.statut === "heure_confirmee").length,  color: "bg-green-400",  href: "/admin/reservations" },
                { label: "Vols effectués",  value: resaStd.filter(r => r.statut === "vol_effectue").length,     color: "bg-purple-400", href: "/admin/reservations" },
              ].map(({ label, value, color, href }, idx, arr) => (
                <Link key={label} href={href}
                  className={`flex items-center gap-3 px-4 py-2.5 hover:bg-secondary/50 transition-colors ${idx < arr.length - 1 ? "border-b border-border" : ""}`}
                >
                  <span className={`w-2 h-2 rounded-full shrink-0 ${color}`} />
                  <span className="text-sm text-muted-foreground flex-1">{label}</span>
                  <span className={`text-sm font-bold ${value > 0 ? "text-foreground" : "text-muted-foreground/30"}`}>{value}</span>
                </Link>
              ))}
            </div>
          </div>

          {/* Stock faible */}
          {lowStock.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <SectionTitle>Stock faible</SectionTitle>
                <Link href="/admin/products" className="text-xs text-muted-foreground hover:text-navy transition-colors flex items-center gap-1">
                  Gérer <ArrowRight size={11} />
                </Link>
              </div>
              <div className="bg-card rounded-xl border border-border overflow-hidden">
                {lowStock.slice(0, 5).map((p, idx, arr) => (
                  <div key={p.id} className={`flex items-center justify-between px-4 py-2.5 ${idx < arr.length - 1 ? "border-b border-border" : ""}`}>
                    <p className="text-sm text-foreground truncate mr-3">{p.title}</p>
                    <span className={`text-sm font-bold shrink-0 ${p.stock === 0 ? "text-destructive" : "text-amber-500"}`}>
                      {p.stock === 0 ? "Épuisé" : p.stock}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Clients */}
          <div className="bg-card rounded-xl border border-border p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Clients uniques</p>
                <p className="text-3xl font-bold text-foreground">{clientsUniques}</p>
              </div>
              <div className="w-9 h-9 rounded-lg bg-navy/8 flex items-center justify-center">
                <Users size={16} className="text-navy" />
              </div>
            </div>
            <Link href="/admin/clients" className="mt-3 text-xs text-muted-foreground hover:text-navy flex items-center gap-1 transition-colors">
              Voir les fiches clients <ArrowRight size={11} />
            </Link>
          </div>

          {/* Services externes */}
          <div>
            <SectionTitle>Services</SectionTitle>
            <div className="bg-card rounded-xl border border-border overflow-hidden">
              {[
                { href: "https://supabase.com/dashboard", label: "Supabase", sub: "Base de données" },
                { href: "https://resend.com",             label: "Resend",   sub: "Emails transactionnels" },
                { href: "https://app.netlify.com/teams/rom1dstbrg/projects", label: "Netlify", sub: "Déploiement" },
              ].map(({ href, label, sub }, idx, arr) => (
                <a
                  key={href}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`flex items-center gap-3 px-4 py-3 hover:bg-secondary/50 transition-colors ${idx < arr.length - 1 ? "border-b border-border" : ""}`}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{label}</p>
                    <p className="text-xs text-muted-foreground">{sub}</p>
                  </div>
                  <ExternalLink size={13} className="text-muted-foreground/40 shrink-0" />
                </a>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
