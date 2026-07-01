"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Pencil, Check, X, Loader2, LayoutDashboard, Clock, Phone, Mail, PlaneTakeoff } from "lucide-react";
import { updateProfile } from "@/lib/actions/auth";
import { WeatherWidget } from "@/components/account/WeatherWidget";
import { formatDuration } from "@/lib/vouchers";

type Tab = "apercu" | "reservations" | "bons" | "adresses" | "newsletter" | "securite";

interface NextFlight {
  id: string; date_vol: string; heure_vol: string | null;
  duree: number; statut: string; type_resa: string;
}

function initials(name: string) {
  return name.trim().split(/\s+/).map((w) => w[0]?.toUpperCase() ?? "").slice(0, 2).join("");
}

interface Props {
  user: { email: string; full_name: string; phone: string | null; created_at: string; is_admin: boolean };
  stats: { reservations: number; vouchers: number; orders: number };
  nextFlight?: NextFlight | null;
  onNavigate?: (tab: Tab) => void;
}

export function AccountOverview({ user, stats, nextFlight, onNavigate }: Props) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ full_name: user.full_name, phone: user.phone ?? "" });

  async function save() {
    setLoading(true);
    const fd = new FormData();
    fd.set("full_name", form.full_name);
    fd.set("phone", form.phone);
    const res = await updateProfile(fd);
    setLoading(false);
    if (res?.error) toast.error(res.error);
    else { toast.success("Profil mis à jour"); setEditing(false); router.refresh(); }
  }

  function cancel() {
    setEditing(false);
    setForm({ full_name: user.full_name, phone: user.phone ?? "" });
  }

  const memberSince = new Date(user.created_at).toLocaleDateString("fr-BE", { month: "long", year: "numeric" });
  const firstName = user.full_name?.split(" ")[0] || null;

  const nextFlightDate = nextFlight
    ? new Date(nextFlight.date_vol + "T12:00:00Z").toLocaleDateString("fr-BE", { weekday: "long", day: "numeric", month: "long" })
    : null;
  const nextFlightHour = nextFlight?.heure_vol ? nextFlight.heure_vol.slice(0, 5).replace(":", "h") : null;
  const daysUntil = nextFlight
    ? Math.ceil((new Date(nextFlight.date_vol + "T23:59:59").getTime() - Date.now()) / 86400000)
    : null;

  return (
    <div className="space-y-10">

      {/* ── Hero ───────────────────────────────────────── */}
      <div>
        <p className="text-xs font-bold text-primary uppercase tracking-[3px] mb-3">Mon espace</p>
        <h1 className="text-3xl sm:text-4xl font-black text-foreground leading-none tracking-tight">
          {firstName ? `Bonjour, ${firstName}` : "Mon compte"}
        </h1>
        <p className="text-sm text-muted-foreground mt-2">Membre depuis {memberSince}</p>
      </div>

      {/* ── Prochain vol ───────────────────────────────── */}
      {nextFlight && nextFlightDate && (
        <div className="card-premium overflow-hidden">
          <div className="bg-[#eef2f8] px-5 pt-5 pb-4 border-b border-border">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-black text-navy/40 uppercase tracking-[3px] mb-2">Prochain vol</p>
                <p className="text-lg font-black text-navy capitalize">{nextFlightDate}</p>
                <p className="text-xs text-navy/60 mt-1.5 flex items-center gap-3 flex-wrap">
                  {nextFlightHour && <span className="flex items-center gap-1"><Clock size={11} />{nextFlightHour}</span>}
                  <span className="flex items-center gap-1"><PlaneTakeoff size={11} />{formatDuration(nextFlight.duree)}</span>
                  {nextFlight.type_resa === "perso" && <span className="border border-navy/20 rounded-full px-1.5 py-0.5 text-[10px]">Sur mesure</span>}
                </p>
              </div>
              {daysUntil !== null && (
                <div className={`shrink-0 text-sm font-black px-3 py-1.5 rounded-lg border ${
                  daysUntil === 0 ? "bg-green-50 text-green-700 border-green-200" :
                  daysUntil <= 7  ? "bg-gold/15 text-navy border-gold/30" :
                                    "bg-white/60 text-navy/70 border-navy/10"
                }`}>
                  {daysUntil === 0 ? "Aujourd'hui !" : daysUntil === 1 ? "Demain" : `J-${daysUntil}`}
                </div>
              )}
            </div>
          </div>
          <div className="px-5 py-4">
            <WeatherWidget date={nextFlight.date_vol} bordered={false} />
            {onNavigate && (
              <div className="mt-3 pt-3 border-t border-border">
                <button onClick={() => onNavigate("reservations")} className="text-xs font-semibold text-foreground hover:text-navy transition-colors cursor-pointer">
                  Voir mes réservations →
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="card-premium p-4 text-center">
          <p className="text-2xl font-black text-foreground">{stats.reservations}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">{stats.reservations !== 1 ? "Réservations" : "Réservation"}</p>
        </div>
        <div className={`card-premium p-4 text-center ${stats.vouchers > 0 ? "border-primary/20" : ""}`}>
          <p className={`text-2xl font-black ${stats.vouchers > 0 ? "text-primary" : "text-foreground"}`}>{stats.vouchers}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">{stats.vouchers !== 1 ? "Bons actifs" : "Bon actif"}</p>
        </div>
        <div className="card-premium p-4 text-center">
          <p className="text-2xl font-black text-foreground">{stats.orders}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">{stats.orders !== 1 ? "Commandes" : "Commande"}</p>
        </div>
      </div>

      {user.is_admin && (
        <div className="pt-2">
          <Link href="/admin" className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:text-primary/80 transition-colors">
            <LayoutDashboard size={13} />Dashboard admin →
          </Link>
        </div>
      )}

    </div>
  );
}
