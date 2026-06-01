"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  User,
  CalendarDays,
  Package,
  Ticket,
  ShieldCheck,
  LogOut,
  Pencil,
  Check,
  X as XIcon,
  Eye,
  EyeOff,
  Loader2,
  Clock,
  ChevronRight,
  MapPin,
  CreditCard,
  CheckCircle,
  LayoutDashboard,
  RotateCcw,
  Download,
} from "lucide-react";
import { logout, updateProfile, changePassword } from "@/lib/actions/auth";
import { generateClientRescheduleToken } from "@/lib/actions/reservations";
import { AddressBook } from "@/components/account/AddressBook";
import { formatPrice } from "@/lib/utils";
import { formatDuration } from "@/lib/vouchers";

// ── Types ──────────────────────────────────────────────────────────────────

interface OrderItem {
  id: string;
  title: string;
  quantity: number;
  unit_price: number;
}

interface Order {
  id: string;
  created_at: string;
  status: string;
  total: number;
  discount_amount?: number;
  coupon_code?: string;
  shipping_cost?: number;
  items: OrderItem[];
  shipping_address?: { line1?: string; postal_code?: string; city?: string };
}

interface VoucherCode {
  id: string;
  code: string;
  duration_minutes: number;
  status: string;
  order_id: string;
  product_title?: string;
  expires_at?: string | null;
}

interface Reservation {
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
  route?: string | null;
  route_status?: string | null;
  route_token?: string | null;
}

interface Address {
  id: string;
  full_name: string;
  line1: string;
  line2: string | null;
  city: string;
  postal_code: string;
  country: string;
  is_default: boolean;
}

export interface AccountClientProps {
  user: {
    id: string;
    email: string;
    full_name: string;
    phone: string | null;
    created_at: string;
    is_admin: boolean;
  };
  addresses: Address[];
  orders: Order[];
  vouchersByOrder: Record<string, VoucherCode[]>;
  reservations: Reservation[];
}

// ── Constants ─────────────────────────────────────────────────────────────

const NAV_ITEMS = [
  { id: "apercu",       label: "Aperçu",        Icon: User },
  { id: "reservations", label: "Réservations",  Icon: CalendarDays },
  { id: "commandes",    label: "Bons de vol",   Icon: Ticket },
  { id: "adresses",     label: "Adresses",      Icon: MapPin },
  { id: "securite",     label: "Sécurité",      Icon: ShieldCheck },
] as const;

const RESA_STATUS: Record<string, { label: string; color: string }> = {
  payment_pending:  { label: "Paiement requis",   color: "text-orange-600 bg-orange-50 border-orange-200" },
  en_attente:       { label: "En attente",         color: "text-yellow-600 bg-yellow-50 border-yellow-200" },
  date_confirmee:   { label: "Date confirmée",     color: "text-foreground bg-secondary border-border" },
  heure_confirmee:  { label: "Heure confirmée",    color: "text-green-600 bg-green-50 border-green-200" },
  vol_effectue:     { label: "Vol effectué",       color: "text-purple-600 bg-purple-50 border-purple-200" },
  annulee:          { label: "Annulée",            color: "text-red-600 bg-red-50 border-red-200" },
  en_attente_perso: { label: "Devis en cours",    color: "text-yellow-600 bg-yellow-50 border-yellow-200" },
  acompte_recu:     { label: "Acompte reçu",      color: "text-emerald-600 bg-emerald-50 border-emerald-200" },
};

const ORDER_STATUS: Record<string, { label: string; color: string }> = {
  pending:    { label: "En attente",  color: "text-yellow-600 bg-yellow-50 border-yellow-200" },
  paid:       { label: "Payée",       color: "text-[#b88a00] bg-primary/10 border-primary/30" },
  processing: { label: "En cours",    color: "text-foreground bg-secondary border-border" },
  shipped:    { label: "Expédiée",    color: "text-purple-600 bg-purple-50 border-purple-200" },
  delivered:  { label: "Livrée",      color: "text-green-600 bg-green-50 border-green-200" },
  cancelled:  { label: "Annulée",     color: "text-red-600 bg-red-50 border-red-200" },
  refunded:   { label: "Remboursée",  color: "text-muted-foreground bg-secondary border-border" },
};

// ── Helpers ────────────────────────────────────────────────────────────────

function formatHeure(h: string | null | undefined): string {
  if (!h) return "En attente";
  const [hh, mm] = h.split(":");
  return `${hh}h${mm}`;
}

function getInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .slice(0, 2)
    .join("");
}

function SectionHeader({
  icon: Icon,
  title,
  subtitle,
}: {
  icon: React.ElementType;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
        <Icon size={16} className="text-primary" />
      </div>
      <div>
        <h2 className="text-base font-bold text-foreground leading-tight">{title}</h2>
        {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
      </div>
    </div>
  );
}

// ── Main Component ──────────────────────────────────────────────────────────

export function AccountClient({
  user,
  addresses,
  orders,
  vouchersByOrder,
  reservations,
}: AccountClientProps) {
  const router = useRouter();

  const [activeSection, setActiveSection] = useState<string>("apercu");

  // Profile edit
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({
    full_name: user.full_name,
    phone: user.phone ?? "",
  });
  const [profileLoading, setProfileLoading] = useState(false);

  // Password change
  const [pwForm, setPwForm] = useState({ password: "", confirm: "" });
  const [pwLoading, setPwLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Reschedule
  const [reschedulingId, setReschedulingId] = useState<string | null>(null);

  // Derived
  const allVouchers = Object.values(vouchersByOrder).flat();
  const activeVouchers = allVouchers.filter((v) => v.status === "unused").length;
  const memberSince = new Date(user.created_at).toLocaleDateString("fr-BE", {
    month: "long",
    year: "numeric",
  });

  // Scrollspy
  useEffect(() => {
    function onScroll() {
      const nearBottom =
        window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 80;
      if (nearBottom) {
        setActiveSection(NAV_ITEMS[NAV_ITEMS.length - 1].id);
        return;
      }
      const threshold = 130;
      let active: string = NAV_ITEMS[0].id;
      for (const { id } of NAV_ITEMS) {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top <= threshold) active = id;
      }
      setActiveSection(active);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  function scrollTo(id: string) {
    const el = document.getElementById(id);
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY - 100;
    window.scrollTo({ top, behavior: "smooth" });
    setActiveSection(id);
  }

  async function handleProfileSave() {
    setProfileLoading(true);
    const fd = new FormData();
    fd.set("full_name", profileForm.full_name);
    fd.set("phone", profileForm.phone);
    const res = await updateProfile(fd);
    setProfileLoading(false);
    if (res?.error) {
      toast.error(res.error);
    } else {
      toast.success("Profil mis à jour");
      setEditingProfile(false);
      router.refresh();
    }
  }

  async function handlePasswordSave(e: React.FormEvent) {
    e.preventDefault();
    if (pwForm.password !== pwForm.confirm) {
      toast.error("Les mots de passe ne correspondent pas");
      return;
    }
    setPwLoading(true);
    const fd = new FormData();
    fd.set("password", pwForm.password);
    fd.set("confirm", pwForm.confirm);
    const res = await changePassword(fd);
    setPwLoading(false);
    if (res?.error) {
      toast.error(res.error);
    } else {
      toast.success("Mot de passe modifié avec succès");
      setPwForm({ password: "", confirm: "" });
    }
  }

  async function handleReschedule(reservationId: string) {
    setReschedulingId(reservationId);
    const result = await generateClientRescheduleToken(reservationId);
    setReschedulingId(null);
    if (result.error) {
      toast.error(result.error);
    } else if (result.token) {
      router.push(`/reservation/reporter/${result.token}`);
    }
  }

  function badgeCount(id: string) {
    if (id === "reservations") return reservations.length || null;
    if (id === "commandes") return allVouchers.length || null;
    if (id === "adresses") return addresses.length || null;
    return null;
  }

  return (
    <main className="min-h-screen bg-gradient-navy pt-24 pb-16">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">

        {/* ── Mobile sticky tab bar ─────────────────────────────────── */}
        <div className="lg:hidden sticky top-[72px] z-40 -mx-4 sm:-mx-6 px-4 sm:px-6 py-2.5 bg-card/90 backdrop-blur border-b border-border mb-6">
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
            {NAV_ITEMS.map(({ id, label, Icon }) => (
              <button
                key={id}
                onClick={() => scrollTo(id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors shrink-0 cursor-pointer ${
                  activeSection === id
                    ? "bg-navy text-white"
                    : "bg-secondary border border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon size={12} />
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-8 lg:gap-10">

          {/* ── Desktop sidebar ──────────────────────────────────────── */}
          <aside className="hidden lg:block w-52 shrink-0 sticky top-28 self-start">
            <div className="space-y-1">

              {/* User summary */}
              <div className="px-3 pb-4 mb-1">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-navy flex items-center justify-center shrink-0">
                    <span className="text-xs font-bold text-white">
                      {getInitials(user.full_name || user.email)}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate leading-tight">
                      {user.full_name || "Mon compte"}
                    </p>
                    <p className="text-[10px] text-muted-foreground truncate">{user.email}</p>
                  </div>
                </div>
              </div>

              <nav className="space-y-0.5">
                {NAV_ITEMS.map(({ id, label, Icon }) => {
                  const count = badgeCount(id);
                  return (
                    <button
                      key={id}
                      onClick={() => scrollTo(id)}
                      className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-all text-left group cursor-pointer ${
                        activeSection === id
                          ? "bg-navy text-white shadow-sm"
                          : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                      }`}
                    >
                      <Icon
                        size={15}
                        className={
                          activeSection === id ? "opacity-100" : "opacity-50 group-hover:opacity-70"
                        }
                      />
                      <span className="flex-1">{label}</span>
                      {count !== null && (
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center ${
                            activeSection === id
                              ? "bg-white/20 text-white"
                              : "bg-secondary text-muted-foreground"
                          }`}
                        >
                          {count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </nav>

              {user.is_admin && (
                <div className="pt-2">
                  <Link
                    href="/admin"
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium text-primary hover:bg-primary/8 transition-all group"
                  >
                    <LayoutDashboard size={15} className="opacity-70 group-hover:opacity-100" />
                    <span className="flex-1">Dashboard admin</span>
                  </Link>
                </div>
              )}

              <div className="pt-3 mt-1 border-t border-border">
                <form action={logout}>
                  <button
                    type="submit"
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-red-600 hover:bg-red-50 transition-all text-left group"
                  >
                    <LogOut size={15} className="opacity-50 group-hover:opacity-100" />
                    Déconnexion
                  </button>
                </form>
              </div>
            </div>
          </aside>

          {/* ── Main content ──────────────────────────────────────────── */}
          <div className="flex-1 min-w-0 space-y-8">

            {/* ───────────────────────────────────────────────────────── */}
            {/* APERÇU                                                    */}
            {/* ───────────────────────────────────────────────────────── */}
            <section id="apercu">
              <div className="card-premium p-6">
                {/* Header */}
                <div className="flex items-start justify-between gap-4 mb-5">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-xl bg-navy flex items-center justify-center shrink-0">
                      <span className="text-xl font-bold text-white tracking-tight">
                        {getInitials(user.full_name || user.email)}
                      </span>
                    </div>
                    <div className="min-w-0">
                      {editingProfile ? (
                        <input
                          value={profileForm.full_name}
                          onChange={(e) =>
                            setProfileForm((f) => ({ ...f, full_name: e.target.value }))
                          }
                          className="text-base font-semibold bg-secondary border border-border rounded-lg px-3 py-1.5 text-foreground focus:outline-none focus:border-foreground w-full max-w-[220px]"
                          placeholder="Prénom Nom"
                        />
                      ) : (
                        <p className="text-base font-semibold text-foreground">
                          {user.full_name || (
                            <span className="text-muted-foreground/60 italic text-sm">Nom non défini</span>
                          )}
                        </p>
                      )}
                      <p className="text-sm text-muted-foreground mt-0.5">{user.email}</p>
                      <p className="text-xs text-muted-foreground/70 mt-0.5">
                        Membre depuis {memberSince}
                      </p>
                    </div>
                  </div>

                  {!editingProfile ? (
                    <button
                      onClick={() => setEditingProfile(true)}
                      className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors shrink-0 cursor-pointer"
                      title="Modifier le profil"
                    >
                      <Pencil size={15} />
                    </button>
                  ) : (
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => {
                          setEditingProfile(false);
                          setProfileForm({ full_name: user.full_name, phone: user.phone ?? "" });
                        }}
                        className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer"
                        title="Annuler"
                      >
                        <XIcon size={15} />
                      </button>
                      <button
                        onClick={handleProfileSave}
                        disabled={profileLoading}
                        className="p-2 rounded-lg bg-navy text-white hover:bg-navy/90 transition-colors disabled:opacity-50 cursor-pointer"
                        title="Enregistrer"
                      >
                        {profileLoading ? (
                          <Loader2 size={15} className="animate-spin" />
                        ) : (
                          <Check size={15} />
                        )}
                      </button>
                    </div>
                  )}
                </div>

                {/* Phone */}
                <div className="flex items-center gap-3 mb-5 py-3 border-t border-b border-border">
                  <span className="text-xs font-medium text-muted-foreground w-20 shrink-0">
                    Téléphone
                  </span>
                  {editingProfile ? (
                    <input
                      value={profileForm.phone}
                      onChange={(e) =>
                        setProfileForm((f) => ({ ...f, phone: e.target.value }))
                      }
                      className="text-sm bg-secondary border border-border rounded-lg px-3 py-1.5 text-foreground focus:outline-none focus:border-foreground flex-1 max-w-[220px]"
                      placeholder="+32 4XX XX XX XX"
                      type="tel"
                    />
                  ) : (
                    <span className="text-sm text-foreground">
                      {user.phone || (
                        <span className="text-muted-foreground/50 italic text-xs">Non renseigné</span>
                      )}
                    </span>
                  )}
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="text-center py-3 px-2 rounded-lg bg-secondary">
                    <p className="text-2xl font-bold text-foreground">{reservations.length}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {reservations.length !== 1 ? "Réservations" : "Réservation"}
                    </p>
                  </div>
                  <div className="text-center py-3 px-2 rounded-lg bg-secondary">
                    <p className="text-2xl font-bold text-foreground">{orders.length}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {orders.length !== 1 ? "Commandes" : "Commande"}
                    </p>
                  </div>
                  <div className="text-center py-3 px-2 rounded-lg bg-primary/8">
                    <p className="text-2xl font-bold text-primary">{activeVouchers}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {activeVouchers !== 1 ? "Codes actifs" : "Code actif"}
                    </p>
                  </div>
                </div>

                {/* Admin shortcut */}
                {user.is_admin && (
                  <div className="mt-4 pt-4 border-t border-border">
                    <Link
                      href="/admin"
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
                    >
                      <LayoutDashboard size={13} />
                      Accéder au dashboard admin →
                    </Link>
                  </div>
                )}
              </div>
            </section>

            {/* ───────────────────────────────────────────────────────── */}
            {/* RÉSERVATIONS                                              */}
            {/* ───────────────────────────────────────────────────────── */}
            <section id="reservations">
              <SectionHeader
                icon={CalendarDays}
                title="Mes réservations"
                subtitle={`${reservations.length} réservation${reservations.length !== 1 ? "s" : ""}`}
              />

              {reservations.length === 0 ? (
                <div className="card-premium p-10 text-center">
                  <div className="w-12 h-12 rounded-full bg-secondary border border-border flex items-center justify-center mx-auto mb-3">
                    <CalendarDays size={20} className="text-muted-foreground" />
                  </div>
                  <p className="text-sm font-medium text-foreground">Aucune réservation</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Vos vols réservés apparaîtront ici.
                  </p>
                  <Link
                    href="/reservation"
                    className="inline-flex items-center gap-1 mt-4 text-xs text-foreground font-semibold hover:text-primary transition-colors"
                  >
                    Réserver un vol <ChevronRight size={12} />
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {reservations.map((resa) => {
                    const status = RESA_STATUS[resa.statut] ?? RESA_STATUS.en_attente;
                    const dateFormatted = new Date(
                      resa.date_vol + "T12:00:00Z"
                    ).toLocaleDateString("fr-BE", {
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    });
                    const isUpcoming =
                      new Date(resa.date_vol + "T23:59:59") >= new Date();
                    const isPaid = !["en_attente", "payment_pending"].includes(resa.statut);
                    const isPerso = resa.type_resa === "perso";
                    const hasPaymentLink = resa.payment_token && !isPaid;
                    const paymentUrl = isPerso
                      ? `/api/vol-sur-mesure/pay/${resa.payment_token}`
                      : `/api/reservation/pay/${resa.payment_token}`;

                    return (
                      <div
                        key={resa.id}
                        className={`card-premium p-5 ${
                          isUpcoming ? "border-l-[3px] border-l-navy" : ""
                        }`}
                      >
                        <div className="flex items-start justify-between gap-4 mb-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1.5">
                              <span
                                className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${status.color}`}
                              >
                                {status.label}
                              </span>
                              {isUpcoming && (
                                <span className="text-[11px] font-medium text-foreground bg-secondary px-2 py-0.5 rounded-full">
                                  À venir
                                </span>
                              )}
                              {isPerso && (
                                <span className="text-[11px] text-muted-foreground bg-secondary px-2 py-0.5 rounded-full border border-border">
                                  Sur mesure
                                </span>
                              )}
                            </div>
                            <p className="text-sm font-semibold text-foreground capitalize">
                              {dateFormatted}
                            </p>
                            {resa.heure_vol && (
                              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                                <Clock size={11} className="opacity-60" />
                                {formatHeure(resa.heure_vol)}
                              </p>
                            )}
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-sm font-bold text-foreground">
                              {formatDuration(resa.duree)}
                            </p>
                            <p className="text-xs text-muted-foreground">de vol</p>
                            {resa.passagers > 1 && (
                              <p className="text-xs text-muted-foreground">{resa.passagers} pass.</p>
                            )}
                          </div>
                        </div>

                        {/* Route proposée */}
                        {resa.route && (
                          <div className="mt-3 flex items-start gap-2">
                            <MapPin size={12} className="text-foreground shrink-0 mt-0.5" />
                            <div className="flex-1 min-w-0 space-y-0.5">
                              <p className="text-[10px] font-bold text-foreground uppercase tracking-wider">
                                Itinéraire proposé
                              </p>
                              <p className="text-xs text-muted-foreground leading-snug">{resa.route}</p>
                              {resa.route_status === "sent" && resa.route_token && (
                                <Link
                                  href={`/vol/itineraire/${resa.route_token}`}
                                  className="inline-flex items-center gap-1 pt-0.5 text-[10px] font-bold text-amber-600 hover:text-amber-700 transition-colors"
                                  onClick={e => e.stopPropagation()}
                                >
                                  Valider ou modifier →
                                </Link>
                              )}
                              {resa.route_status === "modification_requested" && (
                                <span className="inline-flex items-center gap-1 pt-0.5 text-[10px] font-semibold text-orange-600">
                                  Modification en cours de traitement
                                </span>
                              )}
                            </div>
                            {resa.route_status === "validated" && (
                              <CheckCircle size={13} className="text-green-500 shrink-0 mt-0.5" />
                            )}
                          </div>
                        )}

                        {/* Lien de paiement acompte */}
                        {hasPaymentLink && (
                          <div className="flex items-center gap-2 pt-3 border-t border-border">
                            <CreditCard size={13} className="text-primary shrink-0" />
                            <Link
                              href={paymentUrl}
                              className="text-xs font-semibold text-foreground hover:text-primary transition-colors"
                            >
                              {isPerso ? "Payer l'acompte" : "Finaliser le paiement"}{resa.acompte != null ? ` (${resa.acompte} €)` : ""} →
                            </Link>
                          </div>
                        )}

                        {/* Acompte payé */}
                        {isPaid && resa.acompte != null && (
                          <div className="flex items-center gap-2 pt-3 border-t border-border">
                            <CheckCircle size={13} className="text-green-500 shrink-0" />
                            <span className="text-xs text-green-600 font-medium">
                              Acompte payé : {resa.acompte} €
                            </span>
                          </div>
                        )}

                        {/* Lien suivi + reporter */}
                        {(() => {
                          const canReschedule =
                            !["annulee", "vol_effectue", "payment_pending"].includes(resa.statut) &&
                            (new Date(resa.date_vol + "T23:59:59Z").getTime() - Date.now()) > 48 * 60 * 60 * 1000;
                          const hasBorder = hasPaymentLink || (isPaid && resa.acompte != null) || !!resa.route;
                          return (
                            <div className={`flex items-center justify-between gap-3 flex-wrap ${hasBorder ? "mt-2" : "pt-3 border-t border-border mt-0"}`}>
                              {canReschedule ? (
                                <button
                                  type="button"
                                  onClick={() => handleReschedule(resa.id)}
                                  disabled={reschedulingId === resa.id}
                                  className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50 cursor-pointer"
                                >
                                  {reschedulingId === resa.id
                                    ? <Loader2 size={11} className="animate-spin" />
                                    : <RotateCcw size={11} />}
                                  Reporter mon vol
                                </button>
                              ) : <div />}
                              <Link
                                href={`/account/reservations/${resa.id}`}
                                className="text-xs font-medium text-foreground hover:text-primary transition-colors"
                              >
                                Suivre la réservation →
                              </Link>
                            </div>
                          );
                        })()}
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* ───────────────────────────────────────────────────────── */}
            {/* BONS DE VOL (commandes + codes fusionnés)                 */}
            {/* ───────────────────────────────────────────────────────── */}
            <section id="commandes">
              <SectionHeader
                icon={Ticket}
                title="Mes bons de vol"
                subtitle={
                  allVouchers.length === 0
                    ? "Aucun bon"
                    : `${allVouchers.length} bon${allVouchers.length !== 1 ? "s" : ""}${
                        activeVouchers > 0
                          ? ` · ${activeVouchers} disponible${activeVouchers !== 1 ? "s" : ""}`
                          : ""
                      }`
                }
              />

              {orders.length === 0 ? (
                <div className="card-premium p-10 text-center">
                  <div className="w-12 h-12 rounded-full bg-secondary border border-border flex items-center justify-center mx-auto mb-3">
                    <Ticket size={20} className="text-muted-foreground" />
                  </div>
                  <p className="text-sm font-medium text-foreground">Aucun bon de vol</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Achetez une offre pour recevoir votre bon.
                  </p>
                  <Link
                    href="/nos-offres"
                    className="inline-flex items-center gap-1 mt-4 text-xs text-foreground font-semibold hover:text-primary transition-colors"
                  >
                    Voir les offres <ChevronRight size={12} />
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {orders.map((order) => {
                    const status = ORDER_STATUS[order.status] ?? ORDER_STATUS.pending;
                    const date = new Date(order.created_at).toLocaleDateString("fr-BE", {
                      day: "numeric", month: "long", year: "numeric",
                    });
                    const vouchers = vouchersByOrder[order.id] ?? [];

                    return (
                      <div key={order.id} className="card-premium overflow-hidden">
                        {/* En-tête commande */}
                        <div className="flex items-center justify-between gap-3 px-5 py-3 border-b border-border bg-secondary/40">
                          <div className="flex items-center gap-3 min-w-0">
                            <span className="text-xs text-muted-foreground shrink-0">{date}</span>
                            <span className="text-[10px] font-mono text-muted-foreground/50 shrink-0">
                              #{order.id.slice(0, 8).toUpperCase()}
                            </span>
                            {(order.discount_amount ?? 0) > 0 && (
                              <span className="text-[10px] text-green-600 font-medium truncate">
                                -{formatPrice(order.discount_amount!)}
                                {order.coupon_code && ` · ${order.coupon_code}`}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${status.color}`}>
                              {status.label}
                            </span>
                            <span className="text-sm font-bold text-foreground">
                              {formatPrice(order.total)}
                            </span>
                          </div>
                        </div>

                        {/* Bons de vol */}
                        <div className="divide-y divide-border">
                          {vouchers.length === 0 ? (
                            <p className="px-5 py-4 text-xs text-muted-foreground italic">Aucun bon associé.</p>
                          ) : (
                            vouchers.map((v) => {
                              const vStatusColor =
                                v.status === "unused"   ? "bg-green-50 text-green-600 border-green-200" :
                                v.status === "reserved" ? "bg-yellow-50 text-yellow-600 border-yellow-200" :
                                v.status === "used"     ? "bg-secondary text-muted-foreground border-border" :
                                                          "bg-red-50 text-red-600 border-red-200";
                              const vStatusLabel =
                                v.status === "unused"   ? "Disponible" :
                                v.status === "used"     ? "Utilisé" :
                                v.status === "reserved" ? "Réservé" : "Expiré";

                              return (
                                <div key={v.id} className={`p-5 ${v.status !== "unused" ? "opacity-60" : ""}`}>
                                  <div className="flex items-start justify-between gap-3 mb-4">
                                    <div>
                                      <p className="font-mono text-sm font-bold tracking-widest text-foreground">
                                        {v.code}
                                      </p>
                                      <p className="text-xs text-muted-foreground mt-1">
                                        {formatDuration(v.duration_minutes)} de vol
                                        {v.product_title ? ` · ${v.product_title}` : ""}
                                      </p>
                                      {v.expires_at && v.status === "unused" && (
                                        <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                                          Expire le {new Date(v.expires_at).toLocaleDateString("fr-BE")}
                                        </p>
                                      )}
                                    </div>
                                    <span className={`text-[11px] px-2 py-0.5 rounded-full border font-semibold shrink-0 ${vStatusColor}`}>
                                      {vStatusLabel}
                                    </span>
                                  </div>

                                  <div className="flex flex-col gap-2">
                                    {v.status === "unused" && (
                                      <Link
                                        href={`/reservation?duree=${v.duration_minutes}&code=${encodeURIComponent(v.code)}`}
                                        className="flex items-center justify-center gap-1.5 w-full py-2 px-4 rounded-lg bg-primary text-primary-foreground text-xs font-black hover:bg-[#e6a800] transition-colors cursor-pointer"
                                      >
                                        Utiliser ce bon →
                                      </Link>
                                    )}
                                    <a
                                      href={`/api/voucher/pdf?code=${encodeURIComponent(v.code)}`}
                                      download
                                      className="flex items-center justify-center gap-1.5 w-full py-2 px-4 rounded-lg border border-border bg-secondary text-foreground hover:border-foreground text-xs font-semibold transition-colors cursor-pointer"
                                    >
                                      <Download size={13} />
                                      Imprimer le bon cadeau
                                    </a>
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* ───────────────────────────────────────────────────────── */}
            {/* ADRESSES                                                  */}
            {/* ───────────────────────────────────────────────────────── */}
            <section id="adresses">
              <SectionHeader
                icon={MapPin}
                title="Adresses de livraison"
                subtitle={
                  addresses.length === 0
                    ? "Aucune adresse"
                    : `${addresses.length} adresse${addresses.length !== 1 ? "s" : ""}`
                }
              />
              <div className="card-premium p-6">
                <AddressBook addresses={addresses} />
              </div>
            </section>

            {/* ───────────────────────────────────────────────────────── */}
            {/* SÉCURITÉ                                                  */}
            {/* ───────────────────────────────────────────────────────── */}
            <section id="securite">
              <SectionHeader icon={ShieldCheck} title="Sécurité" />

              <div className="card-premium p-6 space-y-8">
                {/* Mot de passe */}
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-1">
                    Modifier le mot de passe
                  </h3>
                  <p className="text-xs text-muted-foreground mb-5">
                    Choisissez un mot de passe fort d'au moins 8 caractères.
                  </p>

                  <form onSubmit={handlePasswordSave} className="space-y-4 max-w-sm">
                    <div>
                      <label className="block text-xs font-semibold text-foreground mb-1.5">
                        Nouveau mot de passe
                      </label>
                      <div className="relative">
                        <input
                          type={showPw ? "text" : "password"}
                          value={pwForm.password}
                          onChange={(e) =>
                            setPwForm((f) => ({ ...f, password: e.target.value }))
                          }
                          className="w-full bg-input border border-border rounded-lg px-3.5 py-2.5 pr-10 text-sm text-foreground focus:outline-none focus:border-foreground focus:bg-card transition-colors placeholder:text-muted-foreground/40"
                          placeholder="••••••••"
                          required
                          minLength={8}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPw((s) => !s)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                        >
                          {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-foreground mb-1.5">
                        Confirmer le mot de passe
                      </label>
                      <div className="relative">
                        <input
                          type={showConfirm ? "text" : "password"}
                          value={pwForm.confirm}
                          onChange={(e) =>
                            setPwForm((f) => ({ ...f, confirm: e.target.value }))
                          }
                          className="w-full bg-input border border-border rounded-lg px-3.5 py-2.5 pr-10 text-sm text-foreground focus:outline-none focus:border-foreground focus:bg-card transition-colors placeholder:text-muted-foreground/40"
                          placeholder="••••••••"
                          required
                          minLength={8}
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirm((s) => !s)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                        >
                          {showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
                        </button>
                      </div>
                    </div>

                    {pwForm.password &&
                      pwForm.confirm &&
                      pwForm.password !== pwForm.confirm && (
                        <p className="text-xs text-red-600">
                          Les mots de passe ne correspondent pas
                        </p>
                      )}

                    <button
                      type="submit"
                      disabled={
                        pwLoading ||
                        !pwForm.password ||
                        !pwForm.confirm ||
                        pwForm.password !== pwForm.confirm
                      }
                      className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-black hover:bg-[#e6a800] transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {pwLoading && <Loader2 size={14} className="animate-spin" />}
                      Enregistrer le mot de passe
                    </button>
                  </form>
                </div>

                {/* Déconnexion */}
                <div className="pt-6 border-t border-border">
                  <h3 className="text-sm font-semibold text-foreground mb-1">Session</h3>
                  <p className="text-xs text-muted-foreground mb-4">
                    Déconnectez-vous de votre compte Fly Horizons.
                  </p>
                  <form action={logout}>
                    <button
                      type="submit"
                      className="flex items-center gap-2 px-5 py-2.5 bg-red-50 text-red-600 rounded-lg text-sm font-semibold hover:bg-red-100 transition-colors border border-red-200 cursor-pointer"
                    >
                      <LogOut size={14} />
                      Se déconnecter
                    </button>
                  </form>
                </div>
              </div>
            </section>

          </div>
        </div>
      </div>
    </main>
  );
}
