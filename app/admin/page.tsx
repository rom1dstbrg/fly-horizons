import { createAdminClient } from "@/lib/supabase/admin";
import { Suspense } from "react";
import Link from "next/link";
import {
  AlertTriangle, AlertCircle, CheckCircle2,
  ArrowRight, Route, MessageSquare,
  Plus, PlaneTakeoff, WifiOff,
} from "lucide-react";
import { DashboardCalendar } from "@/components/admin/DashboardCalendar";
import { MetarWidget } from "@/components/admin/MetarWidget";
import { PageHeader } from "@/components/admin/PageHeader";
import { FormSection, AdminBadge, getResaBadge } from "@/components/admin/ui";

export const metadata = { title: "Cockpit — Admin" };

// ─── types ────────────────────────────────────────────────────────────────────

type ActionItem = { label: string; href: string; icon: React.ElementType };

// ─── page ─────────────────────────────────────────────────────────────────────

export default async function AdminDashboardPage() {
  const supabase = createAdminClient();
  const now         = new Date();
  const tomorrowStr = new Date(now.getTime() + 86400000).toISOString().split("T")[0];

  const thirtyDaysFromNow = new Date(now.getTime() + 30 * 86400000).toISOString();

  const [
    { data: reservations },
    { data: newContacts },
    { data: vouchersExpiring },
  ] = await Promise.all([
    // Réservations — tous les champs requis par DrawerReservation
    supabase.from("reservations").select(
      `id, date_vol, heure_vol, duree, statut, type_resa, created_at,
       voucher_code, coupon_code, payment_status, commentaire, acompte, paye, remboursement, payment_token,
       route, route_token, route_status, route_feedback, passagers, poids_total, avion_reserve,
       clients(id, prenom, nom, email, telephone)`
    ).order("created_at", { ascending: false }),
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

  // ── Actionnables
  const demandeRecue     = resaStd.filter(r => r.statut === "demande_recue").length;
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
    ...(demandeRecue      > 0 ? [{ label: `${demandeRecue} nouvelle${demandeRecue > 1 ? "s" : ""} demande${demandeRecue > 1 ? "s" : ""} à traiter sous 72h`,   href: "/admin/vols",           icon: AlertTriangle }] : []),
    ...(paymentPending    > 0 ? [{ label: `${paymentPending} paiement${paymentPending > 1 ? "s" : ""} en attente de confirmation`,                         href: "/admin/vols",           icon: AlertTriangle }] : []),
    ...(volsDemainSansH   > 0 ? [{ label: `${volsDemainSansH} vol${volsDemainSansH > 1 ? "s" : ""} demain sans heure confirmée`,                           href: "/admin/vols",           icon: AlertTriangle }] : []),
    ...(expiringCritical  > 0 ? [{ label: `${expiringCritical} voucher${expiringCritical > 1 ? "s" : ""} expirent dans moins de 7 jours`,                  href: "/admin/boutique?tab=vouchers", icon: AlertTriangle }] : []),
  ];
  const todayItems: ActionItem[] = [
    ...(enAttenteStd    > 0 ? [{ label: `${enAttenteStd} réservation${enAttenteStd > 1 ? "s" : ""} standard en attente de confirmation`,                    href: "/admin/vols",           icon: AlertCircle   }] : []),
    ...(enAttentePerso  > 0 ? [{ label: `${enAttentePerso} vol${enAttentePerso > 1 ? "s" : ""} sur mesure en attente`,                                     href: "/admin/vols",           icon: AlertCircle   }] : []),
    ...(newContactsCount > 0 ? [{ label: `${newContactsCount} message${newContactsCount > 1 ? "s" : ""} non lu${newContactsCount > 1 ? "s" : ""}`,         href: "/admin/contacts",       icon: MessageSquare }] : []),
    ...(!expiringCritical && expiringCount > 0 ? [{ label: `${expiringCount} voucher${expiringCount > 1 ? "s" : ""} expirent dans moins de 30 jours`,      href: "/admin/boutique?tab=vouchers", icon: AlertCircle }] : []),
  ];
  const allActionItems = [...urgentItems, ...todayItems];
  const isUrgent = urgentItems.length > 0;

  // ── Vols de demain
  const volsTomorrow = allResas
    .filter(r => r.date_vol === tomorrowStr && r.statut !== "annulee")
    .sort((a, b) => (a.heure_vol ?? "99:99").localeCompare(b.heure_vol ?? "99:99"));

  // ── Dernières réservations
  const recentResas = allResas.slice(0, 6);

  const greeting  = now.getHours() < 12 ? "Bonjour" : now.getHours() < 18 ? "Bon après-midi" : "Bonsoir";
  const dateLabel = now.toLocaleDateString("fr-BE", { weekday: "long", day: "numeric", month: "long" });

  return (
    <div className="space-y-6 w-full">

      <PageHeader
        title={`${greeting}, Romain`}
        subtitle={dateLabel.charAt(0).toUpperCase() + dateLabel.slice(1)}
        action={
          <div className="hidden sm:flex items-center gap-2">
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
        }
      />

      {/* ── À traiter ────────────────────────────────────────────────── */}
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

      {/* ── CALENDRIER + Demain/Météo ────────────────────────────────── */}
      <div className="grid lg:grid-cols-[3fr_2fr] gap-5 items-start">

        <div>
          <FormSection title="Calendrier des vols" />
          <DashboardCalendar reservations={allResas as never} />
        </div>

        <div className="space-y-4">

          {/* Vols demain — affiché seulement s'il y en a */}
          {volsTomorrow.length > 0 && (
            <div>
              <FormSection title="Demain" />
              <div className="bg-card rounded-xl border border-border overflow-hidden">
                {volsTomorrow.map((r, i) => {
                  const client = r.clients as { prenom: string; nom: string } | null;
                  const name   = client ? `${client.prenom} ${client.nom}`.trim() : "—";
                  const statut = getResaBadge(r);
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
                      <AdminBadge variant={statut.variant} label={statut.label} />
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

          {/* METAR / TAF */}
          <div>
            <FormSection title="Météo · EBCI" />
            <Suspense fallback={
              <div className="bg-card rounded-xl border border-border px-4 py-3">
                <p className="text-xs text-muted-foreground">Chargement météo...</p>
              </div>
            }>
              <MetarWidget />
            </Suspense>
          </div>

        </div>
      </div>

      {/* ── DERNIÈRES RÉSERVATIONS ────────────────────────────────────── */}
      {recentResas.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <FormSection title="Dernières réservations" />
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
              const statut = getResaBadge(r);
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
                  <AdminBadge variant={statut.variant} label={statut.label} />
                </div>
              );
            })}
          </div>
        </div>
      )}

    </div>
  );
}
