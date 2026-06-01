import { createAdminClient } from "@/lib/supabase/admin";
import Link from "next/link";
import {
  AlertTriangle, AlertCircle, CheckCircle2,
  ArrowRight, Route, MessageSquare, Ticket,
  ShoppingCart, Users, TrendingUp, Package, Plus,
  CalendarDays, Tag, ChevronRight, CreditCard,
} from "lucide-react";
import { PremiumPlaneIcon } from "@/components/admin/PremiumPlaneIcon";
import { formatPrice } from "@/lib/utils";
import { DashboardCalendar } from "@/components/admin/DashboardCalendar";

export const metadata = { title: "Cockpit — Admin" };

// ─── helpers ──────────────────────────────────────────────────────────────────

const RESA_STATUTS: Record<string, { label: string; dot: string }> = {
  payment_pending: { label: "Paiement att.", dot: "bg-orange-400" },
  en_attente:      { label: "En attente",    dot: "bg-yellow-400" },
  date_confirmee:  { label: "Date confirmée", dot: "bg-blue-400" },
  heure_confirmee: { label: "Heure confirmée", dot: "bg-green-400" },
  vol_effectue:    { label: "Vol effectué",  dot: "bg-purple-400" },
  annulee:         { label: "Annulée",       dot: "bg-red-400" },
  acompte_recu:    { label: "Acompte reçu",  dot: "bg-emerald-400" },
};

type ActionItem = { label: string; href: string; icon: React.ElementType };

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-[11px] font-bold text-muted-foreground uppercase tracking-[1.8px] mb-3">
      {children}
    </h2>
  );
}

// Compact horizontal KPI card — sidebar instrument panel
function MiniKPICard({
  label, value, icon: Icon, accent = "navy", href,
}: {
  label: string; value: string;
  icon: React.ElementType; accent?: "navy" | "gold" | "green" | "purple";
  href?: string;
}) {
  const iconColors = {
    navy:   "bg-navy/8 text-navy",
    gold:   "bg-gold/10 text-gold-700",
    green:  "bg-green-500/10 text-green-600",
    purple: "bg-purple-500/10 text-purple-600",
  };
  const content = (
    <div className="bg-card rounded-xl border border-border px-3.5 py-3 flex items-center gap-3 hover:shadow-[0_2px_10px_rgba(17,51,86,.07)] transition-all group">
      <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${iconColors[accent]}`}>
        <Icon size={12} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide leading-none">{label}</p>
        <p className="text-sm font-bold text-foreground tracking-tight mt-0.5">{value}</p>
      </div>
      {href && <ChevronRight size={11} className="text-muted-foreground/30 group-hover:text-muted-foreground transition-colors shrink-0" />}
    </div>
  );
  return href ? <Link href={href} className="block">{content}</Link> : content;
}

// ─── page ─────────────────────────────────────────────────────────────────────

export default async function AdminDashboardPage() {
  const supabase = createAdminClient();
  const now = new Date();
  const todayStr     = now.toISOString().split("T")[0];
  const tomorrowStr  = new Date(now.getTime() + 86400000).toISOString().split("T")[0];
  const monthStart   = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

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
    supabase.from("reservations").select("id, date_vol, heure_vol, duree, statut, type_resa, created_at, voucher_code, acompte, payment_token, route, route_token, route_status, route_feedback, passagers, poids_total, clients(id, prenom, nom, email, telephone)").order("created_at", { ascending: false }),
    supabase.from("voucher_codes").select("id", { count: "exact", head: true }).eq("status", "unused"),
    supabase.from("contacts").select("id, prenom, nom, message, created_at").eq("statut", "nouveau").order("created_at", { ascending: false }).limit(5),
  ]);

  const allResas  = reservations ?? [];
  const resaStd   = allResas.filter(r => r.type_resa === "standard");
  const resaPerso = allResas.filter(r => r.type_resa === "perso");

  // ── KPIs ──
  const validOrders    = (orders ?? []).filter(o => o.status !== "cancelled" && o.status !== "refunded");
  const caTotal        = validOrders.reduce((s, o) => s + (o.total ?? 0), 0);
  const caMonth        = validOrders.filter(o => o.created_at >= monthStart).reduce((s, o) => s + (o.total ?? 0), 0);
  const resasThisMonth = allResas.filter(r => r.created_at >= monthStart).length;
  const clientsUniques = new Set((allClients ?? []).map(c => c.email.toLowerCase())).size;
  const pendingOrders  = (orders ?? []).filter(o => ["pending", "paid"].includes(o.status)).length;
  const lowStock       = (products ?? []).filter(p => p.stock <= 5 && p.product_type !== "voucher" && !p.voucher_duration_minutes);

  // ── Items actionnables ──
  const paymentPending  = resaStd.filter(r => r.statut === "payment_pending").length;
  const enAttenteStd    = resaStd.filter(r => r.statut === "en_attente").length;
  const enAttentePerso  = resaPerso.filter(r => r.statut === "en_attente").length;
  const volsDemainSansH = allResas.filter(r =>
    r.date_vol === tomorrowStr && !r.heure_vol && ["en_attente", "date_confirmee"].includes(r.statut)
  ).length;
  const newContactsCount = newContacts?.length ?? 0;

  // urgent = action immédiate requise
  const urgentItems: ActionItem[] = [
    ...(paymentPending  > 0 ? [{ label: `${paymentPending} paiement${paymentPending > 1 ? "s" : ""} en attente de confirmation`, href: "/admin/vols",   icon: AlertTriangle }] : []),
    ...(volsDemainSansH > 0 ? [{ label: `${volsDemainSansH} vol${volsDemainSansH > 1 ? "s" : ""} demain sans heure confirmée`,    href: "/admin/vols",   icon: AlertTriangle }] : []),
  ];

  // à traiter = à gérer dans la journée
  const todayItems: ActionItem[] = [
    ...(enAttenteStd   > 0 ? [{ label: `${enAttenteStd} réservation${enAttenteStd > 1 ? "s" : ""} standard sans date`,                                             href: "/admin/vols",   icon: AlertCircle   }] : []),
    ...(enAttentePerso > 0 ? [{ label: `${enAttentePerso} vol${enAttentePerso > 1 ? "s" : ""} sur mesure en attente`,                                               href: "/admin/vols",           icon: AlertCircle   }] : []),
    ...(newContactsCount > 0 ? [{ label: `${newContactsCount} message${newContactsCount > 1 ? "s" : ""} non lu${newContactsCount > 1 ? "s" : ""}`,                  href: "/admin/contacts",       icon: MessageSquare }] : []),
    ...(pendingOrders  > 0 ? [{ label: `${pendingOrders} commande${pendingOrders > 1 ? "s" : ""} à traiter`,                                                        href: "/admin/boutique",       icon: ShoppingCart  }] : []),
    ...(lowStock.length > 0 ? [{ label: `${lowStock.length} produit${lowStock.length > 1 ? "s" : ""} en stock faible ou épuisé`,                                    href: "/admin/boutique",       icon: Package       }] : []),
  ];

  const allActionItems = [...urgentItems, ...todayItems];
  const isUrgent = urgentItems.length > 0;

  const recentOrders = (orders ?? []).slice(0, 5);

  const greeting  = now.getHours() < 12 ? "Bonjour" : now.getHours() < 18 ? "Bon après-midi" : "Bonsoir";
  const dateLabel = now.toLocaleDateString("fr-BE", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  return (
    <div className="space-y-6 w-full">

      {/* ── HEADER ──────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">
            {greeting} 👋
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5 capitalize">{dateLabel}</p>
        </div>
        <Link
          href="/admin/reservations/new"
          className="hidden sm:inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-navy text-white text-sm font-semibold hover:brightness-90 transition-colors shadow-sm"
        >
          <Plus size={15} />
          Nouvelle réservation
        </Link>
      </div>

      {/* ── GRILLE PRINCIPALE : Calendrier | Sidebar opérationnelle ─── */}
      <div className="grid lg:grid-cols-[3fr_1fr] gap-5 items-start">

        {/* ── GAUCHE : Calendrier ────────────────────────────────────── */}
        <div>
          <SectionTitle>Calendrier des vols</SectionTitle>
          <DashboardCalendar reservations={allResas as never} />
        </div>

        {/* ── DROITE : À traiter + Actions rapides + Stock ───────────── */}
        <div className="space-y-4">

          {/* À traiter */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <h2 className="text-[11px] font-bold text-muted-foreground uppercase tracking-[1.8px]">À traiter</h2>
              {allActionItems.length > 0 && (
                <span className={`inline-flex items-center justify-center w-4 h-4 rounded-full text-[9px] font-bold text-white ${isUrgent ? "bg-red-500" : "bg-amber-500"}`}>
                  {allActionItems.length}
                </span>
              )}
            </div>
            <div className="bg-card rounded-xl border border-border overflow-hidden">
              {allActionItems.length === 0 ? (
                <div className="flex items-center gap-3 px-4 py-3">
                  <CheckCircle2 size={13} className="text-green-500 shrink-0" />
                  <p className="text-sm font-medium text-green-700">Tout est en ordre</p>
                </div>
              ) : (
                <>
                  {urgentItems.length > 0 && (
                    <>
                      <div className="px-4 py-1.5 bg-red-50 border-b border-red-100/80">
                        <span className="text-[9px] font-bold text-red-400 uppercase tracking-[1.5px]">Urgent</span>
                      </div>
                      {urgentItems.map((item, i) => {
                        const Icon = item.icon;
                        return (
                          <Link key={`u${i}`} href={item.href}
                            className="flex items-center gap-3 px-4 py-2.5 bg-red-50/40 hover:bg-red-50/80 transition-colors group border-b border-red-100/60"
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
                      <div className={`px-4 py-1.5 border-b border-amber-100/80 ${urgentItems.length > 0 ? "bg-amber-50/60" : "bg-amber-50"}`}>
                        <span className="text-[9px] font-bold text-amber-400 uppercase tracking-[1.5px]">
                          {urgentItems.length > 0 ? "Aussi" : "Aujourd'hui"}
                        </span>
                      </div>
                      {todayItems.map((item, i) => {
                        const Icon = item.icon;
                        return (
                          <Link key={`t${i}`} href={item.href}
                            className={`flex items-center gap-3 px-4 py-2.5 hover:bg-secondary transition-colors group ${i < todayItems.length - 1 ? "border-b border-border" : ""}`}
                          >
                            <Icon size={12} className="text-amber-500 shrink-0" />
                            <span className="text-xs text-foreground flex-1 leading-snug">{item.label}</span>
                            <ArrowRight size={10} className="text-muted-foreground/30 group-hover:text-muted-foreground transition-colors shrink-0" />
                          </Link>
                        );
                      })}
                    </>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Actions rapides */}
          <div>
            <SectionTitle>Actions rapides</SectionTitle>
            <div className="bg-card rounded-xl border border-border overflow-hidden">
              {[
                { href: "/admin/reservations/new",        icon: Plus,         label: "Nouvelle réservation", color: "text-navy" },
                { href: "/admin/boutique?tab=vouchers",   icon: Ticket,       label: "Nouveau voucher",      color: "text-purple-600" },
                { href: "/admin/vols?tab=sur-mesure",     icon: Route,        label: "Vol sur mesure",       color: "text-emerald-600" },
                { href: "/admin/boutique?tab=produits",   icon: Package,      label: "Nouveau produit",      color: "text-amber-600" },
                { href: "/admin/boutique?tab=coupons",    icon: Tag,          label: "Nouveau coupon",       color: "text-blue-600" },
                { href: "/admin/clients",                 icon: Users,        label: "Voir les clients",     color: "text-muted-foreground" },
                { href: "/admin/vols?tab=disponibilites", icon: CalendarDays, label: "Disponibilités",       color: "text-muted-foreground" },
              ].map(({ href, icon: Icon, label, color }, idx, arr) => (
                <Link key={href} href={href}
                  className={`flex items-center gap-3 px-4 py-2.5 hover:bg-secondary transition-colors text-sm text-foreground hover:text-navy ${idx < arr.length - 1 ? "border-b border-border" : ""}`}
                >
                  <Icon size={13} className={`shrink-0 ${color}`} />
                  {label}
                  <ArrowRight size={11} className="ml-auto text-muted-foreground/30" />
                </Link>
              ))}
            </div>
          </div>

          {/* Stock faible */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-[11px] font-bold text-muted-foreground uppercase tracking-[1.8px]">Stock faible</h2>
              {lowStock.length > 0 && (
                <Link href="/admin/boutique" className="text-xs text-muted-foreground hover:text-navy transition-colors flex items-center gap-1">
                  Gérer <ArrowRight size={11} />
                </Link>
              )}
            </div>
            <div className="bg-card rounded-xl border border-border overflow-hidden">
              {lowStock.length === 0 ? (
                <div className="flex items-center gap-3 px-4 py-3">
                  <CheckCircle2 size={12} className="text-green-500 shrink-0" />
                  <p className="text-xs text-green-700">Aucun produit en stock faible</p>
                </div>
              ) : (
                lowStock.slice(0, 6).map((p, idx, arr) => (
                  <div key={p.id} className={`flex items-center justify-between px-4 py-2 ${idx < arr.length - 1 ? "border-b border-border" : ""}`}>
                    <p className="text-xs text-foreground truncate mr-2">{p.title}</p>
                    <span className={`text-xs font-bold shrink-0 ${p.stock === 0 ? "text-destructive" : "text-amber-500"}`}>
                      {p.stock === 0 ? "Épuisé" : p.stock}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>
      </div>

      {/* ── INDICATEURS : bande pleine largeur ───────────────────────── */}
      <div>
        <SectionTitle>Indicateurs</SectionTitle>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <MiniKPICard label="CA total"      value={formatPrice(caTotal)}            icon={TrendingUp}       accent="navy"   href="/admin/boutique" />
          <MiniKPICard label="CA ce mois"    value={formatPrice(caMonth)}            icon={CreditCard}       accent="navy" />
          <MiniKPICard label="Vols ce mois"  value={String(resasThisMonth)}          icon={PremiumPlaneIcon} accent="gold"   href="/admin/vols" />
          <MiniKPICard label="Clients"       value={String(clientsUniques)}          icon={Users}            accent="green"  href="/admin/clients" />
          <MiniKPICard label="Vouchers"      value={String(vouchersDispoCount ?? 0)} icon={Ticket}           accent="purple" href="/admin/boutique?tab=vouchers" />
          <MiniKPICard label="Commandes"     value={String(pendingOrders)}           icon={ShoppingCart}     accent={pendingOrders > 0 ? "gold" : "navy"} href="/admin/boutique" />
        </div>
      </div>

      {/* ── DERNIÈRES COMMANDES : pleine largeur ──────────────────────── */}
      {recentOrders.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <SectionTitle>Dernières commandes boutique</SectionTitle>
            <Link href="/admin/boutique" className="text-xs text-muted-foreground hover:text-navy transition-colors flex items-center gap-1">
              Voir tout <ArrowRight size={11} />
            </Link>
          </div>
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            {recentOrders.map((order, idx) => {
              const name = (order.shipping_address as { full_name?: string } | null)?.full_name ?? "—";
              const date = new Date(order.created_at).toLocaleDateString("fr-BE", { day: "numeric", month: "short" });
              const STATUS_STYLE: Record<string, string> = {
                paid:      "text-blue-600 bg-blue-50 border-blue-200",
                pending:   "text-yellow-600 bg-yellow-50 border-yellow-200",
                delivered: "text-green-600 bg-green-50 border-green-200",
                cancelled: "text-red-500 bg-red-50 border-red-200",
              };
              const STATUS_LABEL: Record<string, string> = {
                paid: "Payée", pending: "En attente", processing: "En cours",
                shipped: "Expédiée", delivered: "Livrée", cancelled: "Annulée", refunded: "Remboursée",
              };
              return (
                <div key={order.id} className={`flex items-center gap-4 px-5 py-3 hover:bg-secondary transition-colors ${idx < recentOrders.length - 1 ? "border-b border-border" : ""}`}>
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
  );
}
