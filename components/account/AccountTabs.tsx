"use client";

import { useState } from "react";
import {
  User, CalendarDays, Ticket, MapPin, Mails, ShieldCheck, LayoutDashboard, LogOut,
} from "lucide-react";
import Link from "next/link";
import { logout } from "@/lib/actions/auth";
import { AccountOverview } from "@/components/account/AccountOverview";
import { ReservationsSection, type Reservation } from "@/components/account/sections/ReservationsSection";
import { BonsSection, type VoucherCode } from "@/components/account/sections/BonsSection";
import { NewsletterSection } from "@/components/account/sections/NewsletterSection";
import { SecuritySection } from "@/components/account/sections/SecuritySection";
import { AddressBook } from "@/components/account/AddressBook";

type Tab = "apercu" | "reservations" | "bons" | "adresses" | "newsletter" | "securite";

const NAV: { id: Tab; label: string; Icon: React.ElementType }[] = [
  { id: "apercu",        label: "Aperçu",       Icon: User },
  { id: "reservations",  label: "Réservations", Icon: CalendarDays },
  { id: "bons",          label: "Bons de vol",  Icon: Ticket },
  { id: "adresses",      label: "Adresses",     Icon: MapPin },
  { id: "newsletter",    label: "Newsletter",   Icon: Mails },
  { id: "securite",      label: "Sécurité",     Icon: ShieldCheck },
];

function initials(name: string) {
  return name.trim().split(/\s+/).map((w) => w[0]?.toUpperCase() ?? "").slice(0, 2).join("");
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

export interface AccountTabsProps {
  user: {
    email: string;
    full_name: string;
    phone: string | null;
    created_at: string;
    is_admin: boolean;
  };
  stats: { reservations: number; vouchers: number; orders: number };
  addresses: Address[];
  vouchers: VoucherCode[];
  reservations: Reservation[];
  newsletterActive: boolean | null;
}

const SECTION_TITLE: Record<Tab, string> = {
  apercu:       "Aperçu",
  reservations: "Mes réservations",
  bons:         "Mes bons de vol",
  adresses:     "Adresses de livraison",
  newsletter:   "Newsletter",
  securite:     "Sécurité",
};

export function AccountTabs({ user, stats, addresses, vouchers, reservations, newsletterActive }: AccountTabsProps) {
  const [tab, setTab] = useState<Tab>("apercu");

  const nextFlight = reservations
    .filter((r) => new Date(r.date_vol + "T23:59:59") >= new Date() && r.statut !== "annulee")
    .sort((a, b) => a.date_vol.localeCompare(b.date_vol))[0] ?? null;

  return (
    <main className="min-h-screen bg-gradient-navy pt-24 pb-16">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">

        {/* Mobile tab bar */}
        <div className="lg:hidden sticky top-[72px] z-40 -mx-4 sm:-mx-6 px-4 sm:px-6 py-2.5 bg-card/90 backdrop-blur border-b border-border mb-6">
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
            {NAV.map(({ id, label, Icon }) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors shrink-0 cursor-pointer ${
                  tab === id ? "bg-navy text-white" : "bg-secondary border border-border text-muted-foreground"
                }`}
              >
                <Icon size={12} />
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-8 lg:gap-10">

          {/* Desktop sidebar */}
          <aside className="hidden lg:block w-52 shrink-0 sticky top-28 self-start">
            <div className="space-y-1">
              <div className="px-3 pb-4 mb-1">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-navy flex items-center justify-center shrink-0">
                    <span className="text-xs font-bold text-white">{initials(user.full_name || user.email)}</span>
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
                {NAV.map(({ id, label, Icon }) => (
                  <button
                    key={id}
                    onClick={() => setTab(id)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-all text-left cursor-pointer ${
                      tab === id
                        ? "bg-navy text-white shadow-sm"
                        : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                    }`}
                  >
                    <Icon size={15} className={tab === id ? "opacity-100" : "opacity-50"} />
                    <span className="flex-1">{label}</span>
                  </button>
                ))}
              </nav>

              {user.is_admin && (
                <div className="pt-2">
                  <Link href="/admin" className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium text-primary hover:bg-primary/8 transition-all">
                    <LayoutDashboard size={15} className="opacity-70" />
                    Dashboard admin
                  </Link>
                </div>
              )}

              <div className="pt-3 mt-1 border-t border-border">
                <form action={logout}>
                  <button type="submit" className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-red-600 hover:bg-red-50 transition-all text-left cursor-pointer">
                    <LogOut size={15} className="opacity-50" />
                    Déconnexion
                  </button>
                </form>
              </div>
            </div>
          </aside>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {tab !== "apercu" && (
              <h1 className="text-2xl font-bold text-foreground mb-6">{SECTION_TITLE[tab]}</h1>
            )}

            {tab === "apercu" && (
              <AccountOverview user={user} stats={stats} nextFlight={nextFlight} onNavigate={setTab} />
            )}
            {tab === "reservations" && (
              <ReservationsSection reservations={reservations} />
            )}
            {tab === "bons" && (
              <BonsSection vouchers={vouchers} />
            )}
            {tab === "adresses" && (
              <div className="card-premium p-6">
                <AddressBook addresses={addresses} />
              </div>
            )}
            {tab === "newsletter" && (
              <NewsletterSection newsletterActive={newsletterActive} />
            )}
            {tab === "securite" && (
              <SecuritySection />
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
