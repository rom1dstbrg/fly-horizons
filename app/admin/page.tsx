import { createAdminClient } from "@/lib/supabase/admin";
import Link from "next/link";
import {
  ShoppingBag, Package, Users, TrendingUp,
  AlertTriangle, Plus, Settings, Tag, ArrowRight,
  CalendarCheck, Route, MessageSquare, Ticket,
  Clock, Plane, Bell,
} from "lucide-react";
import { formatPrice } from "@/lib/utils";

export const metadata = { title: "Dashboard — Admin" };

const RESA_STATUTS: Record<string, { label: string; color: string }> = {
  payment_pending:  { label: "Paiement en att.", color: "bg-orange-100 text-orange-700 border-orange-200" },
  en_attente:       { label: "En attente",        color: "bg-yellow-100 text-yellow-700 border-yellow-200" },
  date_confirmee:   { label: "Date confirmée",    color: "bg-blue-100 text-blue-700 border-blue-200" },
  heure_confirmee:  { label: "Heure confirmée",   color: "bg-green-100 text-green-700 border-green-200" },
  vol_effectue:     { label: "Vol effectué",      color: "bg-purple-100 text-purple-700 border-purple-200" },
  annulee:          { label: "Annulée",           color: "bg-red-100 text-red-700 border-red-200" },
  acompte_recu:     { label: "Acompte reçu",      color: "bg-emerald-100 text-emerald-700 border-emerald-200" },
};

const ORDER_STATUTS: Record<string, { label: string; color: string }> = {
  pending:    { label: "En attente",  color: "text-yellow-600 bg-yellow-50 border-yellow-200" },
  paid:       { label: "Payée",       color: "text-blue-600 bg-blue-50 border-blue-200" },
  processing: { label: "En cours",    color: "text-blue-600 bg-blue-50 border-blue-200" },
  shipped:    { label: "Expédiée",    color: "text-purple-600 bg-purple-50 border-purple-200" },
  delivered:  { label: "Livrée",      color: "text-green-600 bg-green-50 border-green-200" },
  cancelled:  { label: "Annulée",     color: "text-red-600 bg-red-50 border-red-200" },
  refunded:   { label: "Remboursée",  color: "text-muted-foreground bg-muted border-border" },
};

function daysLabel(dateStr: string): string {
  const now = new Date();
  const vol = new Date(dateStr + "T12:00:00Z");
  const diff = Math.ceil((vol.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (diff === 0) return "Aujourd'hui";
  if (diff === 1) return "Demain";
  return `J-${diff}`;
}

export default async function AdminDashboardPage() {
  const supabase = createAdminClient();
  const now = new Date();
  const todayStr = now.toISOString().split("T")[0];

  const [
    { data: orders },
    { data: products },
    { data: allClients },
    { data: reservations },
    { count: vouchersDispoCount },
    { data: newContacts },
  ] = await Promise.all([
    supabase
      .from("orders")
      .select("id, total, status, created_at, shipping_address")
      .order("created_at", { ascending: false }),
    supabase
      .from("products")
      .select("id, title, stock, active, price, product_type, voucher_duration_minutes")
      .order("stock", { ascending: true }),
    supabase.from("clients").select("email"),
    supabase
      .from("reservations")
      .select("id, date_vol, heure_vol, duree, statut, type_resa, created_at, clients(prenom, nom, email)")
      .order("created_at", { ascending: false }),
    supabase
      .from("voucher_codes")
      .select("id", { count: "exact", head: true })
      .eq("status", "unused"),
    supabase
      .from("contacts")
      .select("id, prenom, nom, message, created_at")
      .eq("statut", "nouveau")
      .order("created_at", { ascending: false })
      .limit(4),
  ]);

  // --- KPIs boutique ---
  const caTotal = orders
    ?.filter(o => o.status !== "cancelled" && o.status !== "refunded")
    .reduce((sum, o) => sum + (o.total ?? 0), 0) ?? 0;
  const pendingOrders = orders?.filter(o => o.status === "pending" || o.status === "paid").length ?? 0;
  const uniqueClients = new Set(allClients?.map(c => c.email.toLowerCase())).size;

  // --- Réservations ---
  const allResas = reservations ?? [];
  const resaStd   = allResas.filter(r => r.type_resa === "standard");
  const resaPerso = allResas.filter(r => r.type_resa === "perso");

  const statsStd = {
    payment_pending: resaStd.filter(r => r.statut === "payment_pending").length,
    en_attente:      resaStd.filter(r => r.statut === "en_attente").length,
    date_confirmee:  resaStd.filter(r => r.statut === "date_confirmee").length,
    heure_confirmee: resaStd.filter(r => r.statut === "heure_confirmee").length,
    vol_effectue:    resaStd.filter(r => r.statut === "vol_effectue").length,
    annulee:         resaStd.filter(r => r.statut === "annulee").length,
  };
  const statsPerso = {
    en_attente:      resaPerso.filter(r => r.statut === "en_attente").length,
    acompte_recu:    resaPerso.filter(r => r.statut === "acompte_recu").length,
    date_confirmee:  resaPerso.filter(r => r.statut === "date_confirmee").length,
    heure_confirmee: resaPerso.filter(r => r.statut === "heure_confirmee").length,
    vol_effectue:    resaPerso.filter(r => r.statut === "vol_effectue").length,
    annulee:         resaPerso.filter(r => r.statut === "annulee").length,
  };

  // --- Alertes ---
  const alertPayment   = statsStd.payment_pending;
  const alertStd       = statsStd.en_attente;
  const alertPerso     = statsPerso.en_attente;
  const alertContacts  = newContacts?.length ?? 0;
  const totalUrgences  = alertPayment + alertStd + alertPerso + alertContacts;

  // --- Prochains vols confirmés ---
  const prochainsVols = allResas
    .filter(r => r.date_vol >= todayStr && (r.statut === "date_confirmee" || r.statut === "heure_confirmee"))
    .sort((a, b) => a.date_vol.localeCompare(b.date_vol))
    .slice(0, 8);

  // --- Activité récente ---
  const recentActivity = allResas.slice(0, 8);

  // --- Boutique ---
  const recentOrders = orders?.slice(0, 5) ?? [];
  const lowStock = products?.filter(p => p.stock <= 5 && p.product_type !== "voucher" && !p.voucher_duration_minutes) ?? [];

  return (
    <div className="space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">
          {now.toLocaleDateString("fr-BE", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
        </p>
      </div>

      {/* Alertes urgentes */}
      {totalUrgences > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {alertPayment > 0 && (
            <Link href="/admin/reservations"
              className="flex items-center gap-3 p-3 rounded-lg bg-orange-50 border border-orange-200 hover:bg-orange-100 transition-colors">
              <AlertTriangle size={16} className="text-orange-500 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-orange-700">{alertPayment} paiement{alertPayment > 1 ? "s" : ""}</p>
                <p className="text-xs text-orange-600">en attente</p>
              </div>
            </Link>
          )}
          {alertStd > 0 && (
            <Link href="/admin/reservations"
              className="flex items-center gap-3 p-3 rounded-lg bg-yellow-50 border border-yellow-200 hover:bg-yellow-100 transition-colors">
              <Clock size={16} className="text-yellow-600 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-yellow-700">{alertStd} résa{alertStd > 1 ? "s" : ""} standard</p>
                <p className="text-xs text-yellow-600">sans date confirmée</p>
              </div>
            </Link>
          )}
          {alertPerso > 0 && (
            <Link href="/admin/vols-sur-mesure"
              className="flex items-center gap-3 p-3 rounded-lg bg-yellow-50 border border-yellow-200 hover:bg-yellow-100 transition-colors">
              <Route size={16} className="text-yellow-600 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-yellow-700">{alertPerso} vol{alertPerso > 1 ? "s" : ""} sur mesure</p>
                <p className="text-xs text-yellow-600">en attente</p>
              </div>
            </Link>
          )}
          {alertContacts > 0 && (
            <Link href="/admin/contacts"
              className="flex items-center gap-3 p-3 rounded-lg bg-blue-50 border border-blue-200 hover:bg-blue-100 transition-colors">
              <MessageSquare size={16} className="text-blue-600 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-blue-700">{alertContacts} message{alertContacts > 1 ? "s" : ""}</p>
                <p className="text-xs text-blue-600">non lu{alertContacts > 1 ? "s" : ""}</p>
              </div>
            </Link>
          )}
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="card-premium p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">CA boutique</span>
            <TrendingUp size={14} className="text-primary" />
          </div>
          <p className="text-xl font-bold text-foreground">{formatPrice(caTotal)}</p>
          <p className="text-[10px] text-muted-foreground mt-1">{orders?.filter(o => o.status !== "cancelled" && o.status !== "refunded").length ?? 0} commandes</p>
        </div>

        <div className="card-premium p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Commandes</span>
            <ShoppingBag size={14} className="text-primary" />
          </div>
          <p className="text-xl font-bold text-foreground">{orders?.length ?? 0}</p>
          {pendingOrders > 0
            ? <p className="text-[10px] text-yellow-600 mt-1 font-medium">{pendingOrders} en attente</p>
            : <p className="text-[10px] text-muted-foreground mt-1">boutique</p>
          }
        </div>

        <div className="card-premium p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Réservations</span>
            <CalendarCheck size={14} className="text-primary" />
          </div>
          <p className="text-xl font-bold text-foreground">{resaStd.length}</p>
          <p className="text-[10px] text-muted-foreground mt-1">{statsStd.vol_effectue} effectués</p>
        </div>

        <div className="card-premium p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Sur mesure</span>
            <Route size={14} className="text-primary" />
          </div>
          <p className="text-xl font-bold text-foreground">{resaPerso.length}</p>
          <p className="text-[10px] text-muted-foreground mt-1">{statsPerso.vol_effectue} effectués</p>
        </div>

        <div className="card-premium p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Clients</span>
            <Users size={14} className="text-primary" />
          </div>
          <p className="text-xl font-bold text-foreground">{uniqueClients}</p>
          <p className="text-[10px] text-muted-foreground mt-1">uniques</p>
        </div>

        <div className="card-premium p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Vouchers</span>
            <Ticket size={14} className="text-primary" />
          </div>
          <p className="text-xl font-bold text-foreground">{vouchersDispoCount ?? 0}</p>
          <p className="text-[10px] text-muted-foreground mt-1">disponibles</p>
        </div>
      </div>

      {/* Stats breakdown réservations */}
      <div className="grid lg:grid-cols-2 gap-4">
        <div className="card-premium overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b border-border">
            <h2 className="font-semibold text-foreground text-sm flex items-center gap-2">
              <CalendarCheck size={13} className="text-primary" /> Réservations standard
            </h2>
            <Link href="/admin/reservations" className="text-xs text-primary flex items-center gap-1 hover:opacity-70 transition-opacity">
              Gérer <ArrowRight size={12} />
            </Link>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-6 divide-x divide-border">
            {[
              { label: "Pmt. att.", value: statsStd.payment_pending, color: "text-orange-500" },
              { label: "En att.",   value: statsStd.en_attente,      color: "text-yellow-600" },
              { label: "Date ✓",    value: statsStd.date_confirmee,  color: "text-blue-600" },
              { label: "Heure ✓",   value: statsStd.heure_confirmee, color: "text-green-600" },
              { label: "Effectués", value: statsStd.vol_effectue,    color: "text-purple-600" },
              { label: "Annulés",   value: statsStd.annulee,         color: "text-red-500" },
            ].map(({ label, value, color }) => (
              <div key={label} className="p-3 text-center">
                <p className={`text-lg font-bold ${color}`}>{value}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">{label}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="card-premium overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b border-border">
            <h2 className="font-semibold text-foreground text-sm flex items-center gap-2">
              <Route size={13} className="text-primary" /> Vols sur mesure
            </h2>
            <Link href="/admin/vols-sur-mesure" className="text-xs text-primary flex items-center gap-1 hover:opacity-70 transition-opacity">
              Gérer <ArrowRight size={12} />
            </Link>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-6 divide-x divide-border">
            {[
              { label: "En att.",    value: statsPerso.en_attente,      color: "text-yellow-600" },
              { label: "Acompte ✓",  value: statsPerso.acompte_recu,    color: "text-emerald-600" },
              { label: "Date ✓",     value: statsPerso.date_confirmee,  color: "text-blue-600" },
              { label: "Heure ✓",    value: statsPerso.heure_confirmee, color: "text-green-600" },
              { label: "Effectués",  value: statsPerso.vol_effectue,    color: "text-purple-600" },
              { label: "Annulés",    value: statsPerso.annulee,         color: "text-red-500" },
            ].map(({ label, value, color }) => (
              <div key={label} className="p-3 text-center">
                <p className={`text-lg font-bold ${color}`}>{value}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Grille principale */}
      <div className="grid lg:grid-cols-3 gap-6">

        {/* Colonne gauche 2/3 */}
        <div className="lg:col-span-2 space-y-6">

          {/* Prochains vols */}
          <div className="card-premium overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h2 className="font-semibold text-foreground text-sm flex items-center gap-2">
                <Plane size={14} className="text-primary" /> Prochains vols confirmés
              </h2>
              <Link href="/admin/reservations" className="text-xs text-primary flex items-center gap-1 hover:opacity-70 transition-opacity">
                Voir tout <ArrowRight size={12} />
              </Link>
            </div>
            {prochainsVols.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground text-sm">Aucun vol confirmé à venir.</div>
            ) : (
              <div className="divide-y divide-border">
                {prochainsVols.map(r => {
                  const client = (r.clients as unknown) as { prenom: string; nom: string; email: string } | null;
                  const dateStr = new Date(r.date_vol + "T12:00:00Z").toLocaleDateString("fr-BE", { weekday: "short", day: "numeric", month: "short" });
                  const statut = RESA_STATUTS[r.statut];
                  const dl = daysLabel(r.date_vol);
                  const isUrgent = dl === "Aujourd'hui" || dl === "Demain";
                  return (
                    <div key={r.id} className="flex items-center gap-4 px-5 py-3 hover:bg-secondary/30 transition-colors">
                      <div className="shrink-0 w-24">
                        <p className="text-sm font-semibold text-foreground capitalize">{dateStr}</p>
                        {r.heure_vol && (
                          <p className="text-xs text-muted-foreground">{r.heure_vol.slice(0, 5)}</p>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {client?.prenom} {client?.nom}
                        </p>
                        <p className="text-xs text-muted-foreground">{r.duree} min · {r.type_resa === "standard" ? "Standard" : "Sur mesure"}</p>
                      </div>
                      <div className="shrink-0 flex items-center gap-2">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${statut?.color}`}>
                          {statut?.label}
                        </span>
                        <span className={`text-xs font-semibold min-w-[48px] text-right ${isUrgent ? "text-orange-500" : "text-muted-foreground"}`}>
                          {dl}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Activité récente */}
          <div className="card-premium overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h2 className="font-semibold text-foreground text-sm">Dernières demandes reçues</h2>
              <Link href="/admin/reservations" className="text-xs text-primary flex items-center gap-1 hover:opacity-70 transition-opacity">
                Voir tout <ArrowRight size={12} />
              </Link>
            </div>
            {recentActivity.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground text-sm">Aucune réservation.</div>
            ) : (
              <div className="divide-y divide-border">
                {recentActivity.map(r => {
                  const client = (r.clients as unknown) as { prenom: string; nom: string; email: string } | null;
                  const dateVol = new Date(r.date_vol + "T12:00:00Z").toLocaleDateString("fr-BE", { day: "numeric", month: "short", year: "numeric" });
                  const createdAt = new Date(r.created_at).toLocaleDateString("fr-BE", { day: "numeric", month: "short" });
                  const statut = RESA_STATUTS[r.statut] ?? { label: r.statut, color: "bg-gray-100 text-gray-600 border-gray-200" };
                  return (
                    <div key={r.id} className="flex items-center gap-4 px-5 py-3 hover:bg-secondary/30 transition-colors">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-medium text-foreground">{client?.prenom} {client?.nom}</p>
                          <span className="text-[10px] text-muted-foreground/50 italic">
                            {r.type_resa === "standard" ? "Standard" : "Sur mesure"}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">{dateVol} · {r.duree} min</p>
                      </div>
                      <div className="shrink-0 text-right">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${statut.color}`}>
                          {statut.label}
                        </span>
                        <p className="text-[10px] text-muted-foreground mt-1">Reçu {createdAt}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>

        {/* Colonne droite 1/3 */}
        <div className="space-y-6">

          {/* Actions rapides */}
          <div className="card-premium overflow-hidden">
            <div className="px-5 py-4 border-b border-border">
              <h2 className="font-semibold text-foreground text-sm">Actions rapides</h2>
            </div>
            <div className="divide-y divide-border">
              {[
                { href: "/admin/reservations/new", icon: Plus,          label: "Nouvelle réservation" },
                { href: "/admin/reservations",     icon: CalendarCheck, label: "Réservations standard" },
                { href: "/admin/vols-sur-mesure",  icon: Route,         label: "Vols sur mesure" },
                { href: "/admin/clients",          icon: Users,         label: "Clients" },
                { href: "/admin/vouchers",         icon: Ticket,        label: "Vouchers" },
                { href: "/admin/contacts",         icon: MessageSquare, label: "Messages" },
                { href: "/admin/orders",           icon: ShoppingBag,   label: "Commandes boutique" },
                { href: "/admin/products",         icon: Package,       label: "Produits" },
                { href: "/admin/coupons",          icon: Tag,           label: "Coupons" },
                { href: "/admin/settings",         icon: Settings,      label: "Paramètres" },
              ].map(({ href, icon: Icon, label }) => (
                <Link key={href} href={href}
                  className="flex items-center gap-3 px-5 py-2.5 hover:bg-secondary/30 transition-colors text-sm text-foreground hover:text-primary">
                  <Icon size={14} className="text-muted-foreground shrink-0" />
                  {label}
                </Link>
              ))}
            </div>
          </div>

          {/* Messages non lus */}
          {newContacts && newContacts.length > 0 && (
            <div className="card-premium overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                <h2 className="font-semibold text-foreground text-sm flex items-center gap-2">
                  <Bell size={13} className="text-blue-500" /> Messages non lus
                </h2>
                <Link href="/admin/contacts" className="text-xs text-primary flex items-center gap-1 hover:opacity-70 transition-opacity">
                  Voir tout <ArrowRight size={12} />
                </Link>
              </div>
              <div className="divide-y divide-border">
                {newContacts.map(c => (
                  <Link key={c.id} href="/admin/contacts"
                    className="block px-5 py-3 hover:bg-secondary/30 transition-colors">
                    <p className="text-sm font-medium text-foreground">{c.prenom} {c.nom}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{c.message}</p>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {new Date(c.created_at).toLocaleDateString("fr-BE", { day: "numeric", month: "short" })}
                    </p>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Stock faible */}
          {lowStock.length > 0 && (
            <div className="card-premium overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                <h2 className="font-semibold text-foreground text-sm flex items-center gap-2">
                  <AlertTriangle size={13} className="text-yellow-500" /> Stock faible
                </h2>
                <Link href="/admin/products" className="text-xs text-primary flex items-center gap-1 hover:opacity-70 transition-opacity">
                  Gérer <ArrowRight size={12} />
                </Link>
              </div>
              <div className="divide-y divide-border">
                {lowStock.slice(0, 5).map(p => (
                  <div key={p.id} className="flex items-center justify-between px-5 py-2.5">
                    <p className="text-sm text-foreground truncate mr-3">{p.title}</p>
                    <span className={`text-sm font-bold shrink-0 ${p.stock === 0 ? "text-destructive" : "text-yellow-500"}`}>
                      {p.stock === 0 ? "Épuisé" : p.stock}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Commandes boutique récentes */}
      {recentOrders.length > 0 && (
        <div className="card-premium overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <h2 className="font-semibold text-foreground text-sm flex items-center gap-2">
              <ShoppingBag size={14} className="text-primary" /> Commandes boutique récentes
            </h2>
            <Link href="/admin/orders" className="text-xs text-primary flex items-center gap-1 hover:opacity-70 transition-opacity">
              Voir tout <ArrowRight size={12} />
            </Link>
          </div>
          <div className="divide-y divide-border">
            {recentOrders.map(order => {
              const status = ORDER_STATUTS[order.status] ?? { label: order.status, color: "text-muted-foreground bg-muted border-border" };
              const date = new Date(order.created_at).toLocaleDateString("fr-BE", { day: "numeric", month: "short" });
              const name = (order.shipping_address as { full_name?: string } | null)?.full_name ?? "—";
              return (
                <div key={order.id} className="flex items-center justify-between px-5 py-3 hover:bg-secondary/30 transition-colors">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{name}</p>
                    <p className="text-xs text-muted-foreground font-mono">#{order.id.slice(0, 8).toUpperCase()} · {date}</p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0 ml-4">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${status.color}`}>
                      {status.label}
                    </span>
                    <span className="text-sm font-bold text-primary">{formatPrice(order.total)}</span>
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
