"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Pencil, Check, X, Loader2, LayoutDashboard,
  CalendarDays, Ticket, Clock, ChevronRight, Phone, Mail,
} from "lucide-react";
import { updateProfile } from "@/lib/actions/auth";
import { WeatherWidget } from "@/components/account/WeatherWidget";
import { formatDuration } from "@/lib/vouchers";

type Tab = "apercu" | "reservations" | "bons" | "adresses" | "newsletter" | "securite";

interface NextFlight {
  id: string;
  date_vol: string;
  heure_vol: string | null;
  duree: number;
  statut: string;
  type_resa: string;
}

function initials(name: string) {
  return name.trim().split(/\s+/).map((w) => w[0]?.toUpperCase() ?? "").slice(0, 2).join("");
}

interface Props {
  user: {
    email: string;
    full_name: string;
    phone: string | null;
    created_at: string;
    is_admin: boolean;
  };
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
    if (res?.error) {
      toast.error(res.error);
    } else {
      toast.success("Profil mis à jour");
      setEditing(false);
      router.refresh();
    }
  }

  function cancel() {
    setEditing(false);
    setForm({ full_name: user.full_name, phone: user.phone ?? "" });
  }

  const nextFlightDate = nextFlight
    ? new Date(nextFlight.date_vol + "T12:00:00Z").toLocaleDateString("fr-BE", {
        weekday: "long", day: "numeric", month: "long",
      })
    : null;

  const nextFlightHour = nextFlight?.heure_vol
    ? nextFlight.heure_vol.slice(0, 5).replace(":", "h")
    : null;

  const daysUntilFlight = nextFlight
    ? Math.ceil((new Date(nextFlight.date_vol + "T23:59:59").getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  return (
    <div className="space-y-4">

      {/* Prochain vol — priorité haute si présent */}
      {nextFlight && nextFlightDate && (
        <div className="card-premium overflow-hidden">
          <div className="px-5 pt-4 pb-4 bg-[#eef2f8] border-b border-border">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-bold text-navy/40 uppercase tracking-widest mb-1.5">
                  Prochain vol
                </p>
                <p className="text-sm font-bold text-navy capitalize">{nextFlightDate}</p>
                <p className="text-xs text-navy/60 mt-1 flex items-center gap-2 flex-wrap">
                  {nextFlightHour && (
                    <span className="flex items-center gap-1">
                      <Clock size={11} />
                      {nextFlightHour}
                    </span>
                  )}
                  <span>{formatDuration(nextFlight.duree)} de vol</span>
                  {nextFlight.type_resa === "perso" && (
                    <span className="border border-navy/20 rounded-full px-1.5 py-0.5 text-[10px]">
                      Sur mesure
                    </span>
                  )}
                </p>
              </div>
              {daysUntilFlight !== null && (
                <div className={`shrink-0 text-xs font-black px-2.5 py-1 rounded-lg border ${
                  daysUntilFlight === 0
                    ? "bg-green-50 text-green-700 border-green-200"
                    : daysUntilFlight <= 7
                    ? "bg-gold/15 text-navy border-gold/30"
                    : "bg-secondary text-muted-foreground border-border"
                }`}>
                  {daysUntilFlight === 0 ? "Aujourd'hui" : daysUntilFlight === 1 ? "Demain" : `J-${daysUntilFlight}`}
                </div>
              )}
            </div>
          </div>
          <div className="px-5 py-4">
            <WeatherWidget date={nextFlight.date_vol} bordered={false} />
            <div className="mt-3 pt-3 border-t border-border">
              <button
                onClick={() => onNavigate?.("reservations")}
                className="inline-flex items-center gap-1 text-xs font-semibold text-foreground hover:text-navy transition-colors cursor-pointer"
              >
                Voir mes réservations <ChevronRight size={12} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Profil */}
      <div className="card-premium p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-navy flex items-center justify-center shrink-0 mt-0.5">
              <span className="text-sm font-bold text-white tracking-tight">
                {initials(user.full_name || user.email)}
              </span>
            </div>
            <div className="min-w-0 space-y-1">
              {editing ? (
                <input
                  value={form.full_name}
                  onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
                  className="text-sm font-semibold bg-secondary border border-border rounded-lg px-3 py-1.5 text-foreground focus:outline-none focus:border-foreground w-full max-w-[200px]"
                  placeholder="Prénom Nom"
                  autoFocus
                />
              ) : (
                <p className="text-sm font-semibold text-foreground">
                  {user.full_name || (
                    <span className="text-muted-foreground/60 italic">Nom non défini</span>
                  )}
                </p>
              )}
              <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Mail size={11} className="opacity-50 shrink-0" />
                {user.email}
              </p>
              {editing ? (
                <input
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  className="text-xs bg-secondary border border-border rounded-lg px-3 py-1.5 text-foreground focus:outline-none focus:border-foreground w-full max-w-[180px]"
                  placeholder="+32 4XX XX XX XX"
                  type="tel"
                />
              ) : user.phone ? (
                <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <Phone size={11} className="opacity-50 shrink-0" />
                  {user.phone}
                </p>
              ) : (
                <button
                  onClick={() => setEditing(true)}
                  className="text-xs text-muted-foreground/50 hover:text-muted-foreground transition-colors cursor-pointer flex items-center gap-1"
                >
                  <Phone size={11} />
                  Ajouter un téléphone
                </button>
              )}
            </div>
          </div>

          {!editing ? (
            <button
              onClick={() => setEditing(true)}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors shrink-0 cursor-pointer"
              aria-label="Modifier le profil"
            >
              <Pencil size={14} />
            </button>
          ) : (
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={cancel}
                className="p-1.5 rounded-lg text-muted-foreground hover:bg-secondary transition-colors cursor-pointer"
              >
                <X size={14} />
              </button>
              <button
                onClick={save}
                disabled={loading}
                className="p-1.5 rounded-lg bg-navy text-white hover:bg-navy/90 transition-colors disabled:opacity-50 cursor-pointer"
              >
                {loading ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
              </button>
            </div>
          )}
        </div>

        {user.is_admin && (
          <div className="mt-4 pt-4 border-t border-border">
            <Link
              href="/admin"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
            >
              <LayoutDashboard size={13} />
              Dashboard admin →
            </Link>
          </div>
        )}
      </div>

      {/* Accès rapides */}
      <div className="card-premium p-5">
        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-3">
          Accès rapides
        </p>
        <div className="divide-y divide-border">
          <div className="flex items-center gap-3 py-2.5">
            <div className="w-7 h-7 rounded-lg bg-secondary flex items-center justify-center shrink-0">
              <CalendarDays size={13} className="text-muted-foreground" />
            </div>
            <span className="flex-1 text-sm text-foreground">
              {stats.reservations === 0
                ? "Aucune réservation"
                : `${stats.reservations} réservation${stats.reservations !== 1 ? "s" : ""}`}
            </span>
            {stats.reservations > 0 ? (
              <button
                onClick={() => onNavigate?.("reservations")}
                className="text-xs font-semibold text-primary hover:text-primary/80 transition-colors flex items-center gap-0.5 cursor-pointer shrink-0"
              >
                Voir <ChevronRight size={12} />
              </button>
            ) : (
              <Link
                href="/reservation"
                className="text-xs font-semibold text-primary hover:text-primary/80 transition-colors flex items-center gap-0.5 shrink-0"
              >
                Réserver <ChevronRight size={12} />
              </Link>
            )}
          </div>

          <div className="flex items-center gap-3 py-2.5">
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
              stats.vouchers > 0 ? "bg-primary/10" : "bg-secondary"
            }`}>
              <Ticket size={13} className={stats.vouchers > 0 ? "text-primary" : "text-muted-foreground"} />
            </div>
            <span className={`flex-1 text-sm ${stats.vouchers > 0 ? "text-foreground font-medium" : "text-muted-foreground"}`}>
              {stats.vouchers === 0
                ? "Aucun bon disponible"
                : `${stats.vouchers} bon${stats.vouchers !== 1 ? "s" : ""} disponible${stats.vouchers !== 1 ? "s" : ""}`}
            </span>
            {stats.vouchers > 0 ? (
              <button
                onClick={() => onNavigate?.("bons")}
                className="text-xs font-semibold text-primary hover:text-primary/80 transition-colors flex items-center gap-0.5 cursor-pointer shrink-0"
              >
                Utiliser <ChevronRight size={12} />
              </button>
            ) : (
              <Link
                href="/nos-offres"
                className="text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors flex items-center gap-0.5 shrink-0"
              >
                Nos offres <ChevronRight size={12} />
              </Link>
            )}
          </div>
        </div>
      </div>

    </div>
  );
}
