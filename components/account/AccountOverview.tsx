"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Pencil,
  Check,
  X,
  Loader2,
  LayoutDashboard,
  CalendarDays,
  Ticket,
  Package,
} from "lucide-react";
import { updateProfile } from "@/lib/actions/auth";

type Tab = "apercu" | "reservations" | "bons" | "adresses" | "newsletter" | "securite";

function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .slice(0, 2)
    .join("");
}

interface Props {
  user: {
    email: string;
    full_name: string;
    phone: string | null;
    created_at: string;
    is_admin: boolean;
  };
  stats: {
    reservations: number;
    vouchers: number;
    orders: number;
  };
  onNavigate?: (tab: Tab) => void;
}

export function AccountOverview({ user, stats, onNavigate }: Props) {
  const router = useRouter();
  const [editing, setEditing]     = useState(false);
  const [loading, setLoading]     = useState(false);
  const [form, setForm]           = useState({ full_name: user.full_name, phone: user.phone ?? "" });

  const memberSince = new Date(user.created_at).toLocaleDateString("fr-BE", {
    month: "long",
    year: "numeric",
  });

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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Aperçu</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Membre depuis {memberSince}</p>
      </div>

      {/* Profile card */}
      <div className="card-premium p-6">
        <div className="flex items-start justify-between gap-4 mb-5">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-navy flex items-center justify-center shrink-0">
              <span className="text-xl font-bold text-white tracking-tight">
                {initials(user.full_name || user.email)}
              </span>
            </div>
            <div className="min-w-0">
              {editing ? (
                <input
                  value={form.full_name}
                  onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
                  className="text-base font-semibold bg-secondary border border-border rounded-lg px-3 py-1.5 text-foreground focus:outline-none focus:border-foreground w-full max-w-[220px]"
                  placeholder="Prénom Nom"
                  autoFocus
                />
              ) : (
                <p className="text-base font-semibold text-foreground">
                  {user.full_name || (
                    <span className="text-muted-foreground/60 italic text-sm">Nom non défini</span>
                  )}
                </p>
              )}
              <p className="text-sm text-muted-foreground mt-0.5">{user.email}</p>
            </div>
          </div>

          {!editing ? (
            <button
              onClick={() => setEditing(true)}
              className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors shrink-0 cursor-pointer"
              aria-label="Modifier le profil"
            >
              <Pencil size={15} />
            </button>
          ) : (
            <div className="flex items-center gap-1.5 shrink-0">
              <button onClick={cancel} className="p-2 rounded-lg text-muted-foreground hover:bg-secondary transition-colors cursor-pointer">
                <X size={15} />
              </button>
              <button
                onClick={save}
                disabled={loading}
                className="p-2 rounded-lg bg-navy text-white hover:bg-navy/90 transition-colors disabled:opacity-50 cursor-pointer"
              >
                {loading ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
              </button>
            </div>
          )}
        </div>

        {/* Phone */}
        <div className="flex items-center gap-3 mb-5 py-3 border-t border-b border-border">
          <span className="text-xs font-medium text-muted-foreground w-20 shrink-0">Téléphone</span>
          {editing ? (
            <input
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
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
          {[
            { tab: "reservations" as Tab, count: stats.reservations, label: ["Réservation", "Réservations"], Icon: CalendarDays, highlight: false },
            { tab: "bons" as Tab,         count: stats.vouchers,     label: ["Bon de vol",   "Bons de vol"],  Icon: Ticket,       highlight: true  },
            { tab: "bons" as Tab,         count: stats.orders,       label: ["Commande",     "Commandes"],    Icon: Package,      highlight: false },
          ].map(({ tab, count, label, Icon, highlight }, i) => (
            <button
              key={i}
              onClick={() => onNavigate?.(tab)}
              className={`text-center py-3 px-2 rounded-lg transition-colors cursor-pointer ${
                highlight ? "bg-primary/8 hover:bg-primary/12" : "bg-secondary hover:bg-secondary/80"
              }`}
            >
              <div className="flex items-center justify-center mb-1">
                <Icon size={12} className={highlight ? "text-primary" : "text-muted-foreground"} />
              </div>
              <p className={`text-2xl font-bold ${highlight ? "text-primary" : "text-foreground"}`}>{count}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {count !== 1 ? label[1] : label[0]}
              </p>
            </button>
          ))}
        </div>

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
    </div>
  );
}
