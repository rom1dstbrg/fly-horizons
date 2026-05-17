import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import { AccountForm } from "@/components/account/AccountForm";
import { AddressBook } from "@/components/account/AddressBook";
import { logout } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { formatPrice } from "@/lib/utils";
import { formatDuration } from "@/lib/vouchers";
import { Package, Ticket, MapPin, ShoppingBag, Plane, CreditCard, CheckCircle } from "lucide-react";

export const metadata = { title: "Mon compte" };

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending:    { label: "En attente",  color: "text-yellow-500 bg-yellow-500/10 border-yellow-500/20" },
  paid:       { label: "Payée",       color: "text-blue-400 bg-blue-400/10 border-blue-400/20" },
  processing: { label: "En cours",    color: "text-blue-400 bg-blue-400/10 border-blue-400/20" },
  shipped:    { label: "Expédiée",    color: "text-purple-400 bg-purple-400/10 border-purple-400/20" },
  delivered:  { label: "Livrée",      color: "text-green-500 bg-green-500/10 border-green-500/20" },
  cancelled:  { label: "Annulée",     color: "text-destructive bg-destructive/10 border-destructive/20" },
  refunded:   { label: "Remboursée",  color: "text-muted-foreground bg-muted/10 border-border" },
};

const RESA_STATUTS: Record<string, { label: string; color: string }> = {
  en_attente:      { label: "En attente",        color: "text-yellow-500 bg-yellow-500/10 border-yellow-500/20" },
  payment_pending: { label: "Paiement en attente", color: "text-yellow-500 bg-yellow-500/10 border-yellow-500/20" },
  acompte_recu:    { label: "Acompte reçu",       color: "text-green-500 bg-green-500/10 border-green-500/20" },
  date_confirmee:  { label: "Date confirmée",     color: "text-blue-400 bg-blue-400/10 border-blue-400/20" },
  heure_confirmee: { label: "Heure confirmée",    color: "text-blue-400 bg-blue-400/10 border-blue-400/20" },
  vol_effectue:    { label: "Vol effectué",       color: "text-purple-400 bg-purple-400/10 border-purple-400/20" },
  annulee:         { label: "Annulée",            color: "text-destructive bg-destructive/10 border-destructive/20" },
};

type ResaRow = {
  id: string;
  date_vol: string;
  heure_vol: string | null;
  duree: number;
  passagers: number;
  statut: string;
  type_resa: string;
  payment_token: string | null;
  acompte: number | null;
  distance_km: number | null;
  created_at: string;
};

type VoucherRow = {
  id: string;
  code: string;
  duration_minutes: number;
  status: string;
  order_id: string;
  product_title: string;
  expires_at: string | null;
};

export default async function AccountPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const adminSupabase = createAdminClient();

  const [{ data: profile }, { data: addresses }, { data: orders }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).single(),
    supabase.from("addresses").select("*").eq("user_id", user.id).order("is_default", { ascending: false }),
    supabase.from("orders").select("*, items:order_items(*)").eq("user_id", user.id).neq("status", "pending").order("created_at", { ascending: false }),
  ]);

  // Fetch reservations linked to this email via the clients table
  // Use .in() to handle cases where the same email has multiple client rows
  let reservations: ResaRow[] = [];
  if (user.email) {
    const { data: clients } = await adminSupabase
      .from("clients")
      .select("id")
      .eq("email", user.email.toLowerCase());
    const clientIds = (clients ?? []).map(c => c.id);
    if (clientIds.length > 0) {
      const { data: resas } = await adminSupabase
        .from("reservations")
        .select("id, date_vol, heure_vol, duree, passagers, statut, type_resa, payment_token, acompte, distance_km, created_at")
        .in("client_id", clientIds)
        .order("created_at", { ascending: false });
      reservations = resas ?? [];
    }
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://fly-horizons.com";

  const orderIds = orders?.map((o) => o.id) ?? [];
  let vouchersByOrder: Record<string, VoucherRow[]> = {};
  if (orderIds.length > 0) {
    const { data: voucherCodes } = await adminSupabase
      .from("voucher_codes")
      .select("id, code, duration_minutes, status, order_id, product_title, expires_at")
      .in("order_id", orderIds);
    vouchersByOrder = (voucherCodes ?? []).reduce((acc: Record<string, VoucherRow[]>, v: VoucherRow) => {
      if (!acc[v.order_id]) acc[v.order_id] = [];
      acc[v.order_id].push(v);
      return acc;
    }, {});
  }

  const allVouchers = Object.values(vouchersByOrder).flat();
  const activeVouchers = allVouchers.filter((v) => v.status === "unused");

  return (
    <main className="min-h-screen bg-gradient-navy pt-24 pb-16">
      <div className="container-shop max-w-3xl space-y-6">

        {/* ── En-tête ── */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Mon compte</h1>
            <p className="text-muted-foreground text-sm mt-1">
              {profile?.full_name ? `${profile.full_name} · ` : ""}
              {user.email}
            </p>
          </div>
          <form action={logout}>
            <Button
              type="submit"
              variant="outline"
              size="sm"
              className="border-border text-foreground hover:bg-secondary text-xs"
            >
              Déconnexion
            </Button>
          </form>
        </div>

        {/* ── Vouchers actifs ── */}
        {activeVouchers.length > 0 && (
          <div className="card-premium p-6">
            <div className="flex items-center gap-2 mb-5">
              <Ticket size={16} className="text-primary" />
              <h2 className="font-semibold text-foreground">
                {activeVouchers.length > 1 ? "Vos codes de vol" : "Votre code de vol"}
              </h2>
            </div>
            <div className="space-y-3">
              {activeVouchers.map((v) => (
                <div
                  key={v.id}
                  className="flex items-center justify-between gap-4 bg-[#F2B705]/5 border border-[#F2B705]/20 rounded-xl px-4 py-3"
                >
                  <div>
                    <p className="font-mono text-sm font-bold text-foreground tracking-widest">{v.code}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {formatDuration(v.duration_minutes)} · {v.product_title}
                      {v.expires_at && (
                        <> · expire le {new Date(v.expires_at).toLocaleDateString("fr-BE")}</>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/10 text-green-500 border border-green-500/30 font-medium">
                      Disponible
                    </span>
                    <Link
                      href={`/reservation?duree=${v.duration_minutes}&code=${encodeURIComponent(v.code)}`}
                      className="text-xs text-primary hover:text-gold-400 font-semibold transition-colors whitespace-nowrap"
                    >
                      Réserver →
                    </Link>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-4">
              Entrez votre code à l&apos;étape &ldquo;Détails&rdquo; sur la page de réservation.
            </p>
          </div>
        )}

        {/* ── Réservations ── */}
        {reservations.length > 0 && (
          <div className="card-premium p-6">
            <div className="flex items-center gap-2 mb-5">
              <Plane size={16} className="text-primary" />
              <h2 className="font-semibold text-foreground">Mes réservations</h2>
            </div>
            <div className="space-y-3">
              {reservations.map((r) => {
                const resaStatut = RESA_STATUTS[r.statut] ?? RESA_STATUTS.en_attente;
                const dateStr = new Date(r.date_vol + "T12:00:00Z").toLocaleDateString("fr-BE", {
                  day: "numeric", month: "long", year: "numeric",
                });
                const isPaid = !["en_attente", "payment_pending"].includes(r.statut);
                const isPerso = r.type_resa === "perso";
                const hasPaymentLink = r.payment_token && !isPaid;
                const paymentUrl = isPerso
                  ? `${siteUrl}/api/vol-sur-mesure/pay/${r.payment_token}`
                  : `${siteUrl}/api/reservation/pay/${r.payment_token}`;

                return (
                  <div key={r.id} className="border border-border rounded-xl p-4 space-y-2">
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                      <div>
                        <p className="text-sm font-semibold text-foreground">
                          {isPerso ? "Vol sur mesure" : "Réservation"} — {dateStr}
                          {r.heure_vol ? ` à ${r.heure_vol}` : ""}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {r.duree} min
                          {r.distance_km ? ` · ${r.distance_km} km` : ""}
                          {r.passagers > 1 ? ` · ${r.passagers} passagers` : ""}
                          {r.acompte != null ? ` · Acompte : ${r.acompte} €` : ""}
                        </p>
                      </div>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full border shrink-0 ${resaStatut.color}`}>
                        {resaStatut.label}
                      </span>
                    </div>

                    {hasPaymentLink && (
                      <div className="flex items-center gap-2 pt-1">
                        <CreditCard size={13} className="text-primary shrink-0" />
                        <Link
                          href={paymentUrl}
                          className="text-xs font-semibold text-primary hover:text-[#e6a800] transition-colors"
                        >
                          Payer l&apos;acompte ({r.acompte} €) →
                        </Link>
                      </div>
                    )}

                    {isPaid && r.acompte != null && (
                      <div className="flex items-center gap-2 pt-1">
                        <CheckCircle size={13} className="text-green-500 shrink-0" />
                        <span className="text-xs text-green-500 font-medium">Acompte payé</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Informations personnelles ── */}
        <div className="card-premium p-6">
          <h2 className="font-semibold text-foreground mb-5">Informations personnelles</h2>
          <AccountForm profile={profile} />
        </div>

        {/* ── Adresses de livraison ── */}
        <div className="card-premium p-6">
          <div className="flex items-center gap-2 mb-5">
            <MapPin size={16} className="text-primary" />
            <h2 className="font-semibold text-foreground">Adresses de livraison</h2>
          </div>
          <AddressBook addresses={addresses ?? []} />
        </div>

        {/* ── Historique des commandes ── */}
        <div className="card-premium p-6">
          <div className="flex items-center gap-2 mb-5">
            <ShoppingBag size={16} className="text-primary" />
            <h2 className="font-semibold text-foreground">Historique des commandes</h2>
          </div>

          {(orders?.length ?? 0) === 0 ? (
            <div className="text-center py-8 space-y-3">
              <Package size={32} className="text-muted-foreground mx-auto" />
              <p className="text-sm text-muted-foreground">Aucune commande pour le moment.</p>
              <Link
                href="/shop"
                className="inline-flex items-center gap-1 text-sm text-primary hover:text-gold-400 transition-colors"
              >
                Découvrir la boutique →
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {orders!.map((order) => {
                const status = STATUS_LABELS[order.status] ?? STATUS_LABELS.paid;
                const date = new Date(order.created_at).toLocaleDateString("fr-BE", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                });
                const vouchers = vouchersByOrder[order.id] ?? [];

                return (
                  <div key={order.id} className="border border-border rounded-xl p-4 space-y-3">

                    {/* Ligne supérieure */}
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-xs text-muted-foreground">{date}</p>
                        <p className="text-xs font-mono text-foreground/50 mt-0.5">
                          #{order.id.slice(0, 8).toUpperCase()}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${status.color}`}>
                          {status.label}
                        </span>
                        <span className="text-primary font-bold text-sm">{formatPrice(order.total)}</span>
                      </div>
                    </div>

                    {/* Articles */}
                    <div className="space-y-0.5">
                      {(order.items ?? []).map((item: {
                        id: string;
                        title: string;
                        quantity: number;
                        unit_price: number;
                      }) => (
                        <p key={item.id} className="text-xs text-muted-foreground">
                          {item.title} ×{item.quantity}
                          {" — "}
                          {formatPrice(item.unit_price * item.quantity)}
                        </p>
                      ))}
                    </div>

                    {/* Réduction */}
                    {order.discount_amount > 0 && (
                      <p className="text-xs text-green-500">
                        Réduction appliquée : -{formatPrice(order.discount_amount)}
                        {order.coupon_code && ` · code ${order.coupon_code}`}
                      </p>
                    )}

                    {/* Frais de livraison */}
                    {order.shipping_cost > 0 && (
                      <p className="text-xs text-muted-foreground">
                        Livraison : {formatPrice(order.shipping_cost)}
                      </p>
                    )}

                    {/* Codes de vol liés */}
                    {vouchers.length > 0 && (
                      <div className="pt-3 border-t border-border space-y-2">
                        <p className="text-xs font-semibold text-[#F2B705] uppercase tracking-wider">
                          {vouchers.length > 1 ? "Codes de vol" : "Code de vol"}
                        </p>
                        {vouchers.map((v) => (
                          <div key={v.id} className="flex items-center justify-between gap-2">
                            <div>
                              <span className="font-mono text-xs font-bold text-foreground tracking-widest">
                                {v.code}
                              </span>
                              <span className="text-xs text-muted-foreground ml-2">
                                {formatDuration(v.duration_minutes)}
                              </span>
                            </div>
                            <span className={`text-xs px-1.5 py-0.5 rounded-full border font-medium ${
                              v.status === "unused"
                                ? "bg-green-500/10 text-green-500 border-green-500/30"
                                : v.status === "reserved"
                                ? "bg-yellow-500/10 text-yellow-500 border-yellow-500/30"
                                : "bg-muted text-muted-foreground border-border"
                            }`}>
                              {v.status === "unused" ? "Disponible" : v.status === "used" ? "Utilisé" : v.status === "reserved" ? "En cours" : "Expiré"}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Adresse de livraison (produits physiques) */}
                    {order.shipping_address?.city && vouchers.length === 0 && (
                      <p className="text-xs text-muted-foreground pt-2 border-t border-border">
                        Livré à : {order.shipping_address.line1}, {order.shipping_address.postal_code} {order.shipping_address.city}
                      </p>
                    )}

                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Accès admin ── */}
        {profile?.role === "admin" && (
          <div className="card-premium p-4">
            <Link
              href="/admin"
              className="text-sm text-primary hover:text-gold-400 font-medium transition-colors"
            >
              Accéder au dashboard admin →
            </Link>
          </div>
        )}

      </div>
    </main>
  );
}
