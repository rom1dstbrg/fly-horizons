"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  CalendarDays, User as UserIcon, Ticket, LayoutDashboard, LogOut, Clock, PlaneTakeoff,
} from "lucide-react";
import { logout } from "@/lib/actions/auth";
import { WeatherWidget } from "@/components/account/WeatherWidget";
import { ReservationsSection, type Reservation } from "@/components/account/sections/ReservationsSection";
import { BonsSection, type VoucherCode } from "@/components/account/sections/BonsSection";
import { ProfileSection } from "@/components/account/sections/ProfileSection";
import { formatDuration } from "@/lib/vouchers";

// Nouvelle DA (28/09, maquette « mon compte » v2 validée par Romain) :
// - Des onglets (la v1 sans onglet, en une seule page qui défile, a été jugée
//   pas assez structurée), mais 3 au lieu de 6 : Réservations, Profil (infos +
//   notifications + sécurité regroupées), Bons de vol (seulement s'il y en a
//   un — 0 en base au 28/09). « Adresses » retirée (liée aux anciens bons
//   physiques, 0 en base ; la page /account/adresses a été supprimée le 28/09,
//   plus aucune référence nulle part — voir Changelog).
// - Le prochain vol reste affiché au-dessus des onglets, quel que soit l'onglet ouvert.
// - Ordinateur : sidebar d'onglets + contenu large. Téléphone : bandeau scrollable.
// - Tous les boutons d'action ont un texte à côté de l'icône (retour de Romain
//   sur la v1 : une icône seule laisse deviner).

type Tab = "resa" | "profil" | "bons";

const HASH_TO_TAB: Record<string, Tab> = {
  reservations: "resa", resa: "resa",
  profil: "profil", apercu: "profil", securite: "profil", newsletter: "profil",
  bons: "bons",
};

export interface AccountTabsProps {
  user: {
    email: string;
    full_name: string;
    phone: string | null;
    created_at: string;
    is_admin: boolean;
  };
  vouchers: VoucherCode[];
  reservations: Reservation[];
  newsletterActive: boolean | null;
}

const EYEBROW = "text-[11px] font-bold text-primary uppercase tracking-[3px] mb-2.5";
const SIDE_LINK = "flex items-center gap-2.5 px-3 py-2.5 rounded-[10px] text-[13.5px] font-semibold transition-colors";

function formatHeure(h: string | null | undefined) {
  if (!h) return null;
  const [hh, mm] = h.split(":");
  return `${hh}h${mm}`;
}

export function AccountTabs({ user, vouchers, reservations, newsletterActive }: AccountTabsProps) {
  const [tab, setTab] = useState<Tab>("resa");

  // Un lien externe (email de confirmation, page de report…) pointe vers
  // /account#reservations : on ouvre le bon onglet au chargement.
  useEffect(() => {
    const h = window.location.hash.replace("#", "");
    if (h && HASH_TO_TAB[h]) setTab(HASH_TO_TAB[h]);
  }, []);

  const hasVouchers = vouchers.length > 0;
  // Onglet "bons" demandé (hash) mais plus rien à y montrer : on retombe sur
  // Réservations sans passer par un second rendu (pas de setState en effet).
  const activeTab: Tab = tab === "bons" && !hasVouchers ? "resa" : tab;

  const nextFlight = useMemo(() => reservations
    .filter((r) => new Date(r.date_vol + "T23:59:59") >= new Date() && r.statut !== "annulee")
    .sort((a, b) => a.date_vol.localeCompare(b.date_vol))[0] ?? null, [reservations]);

  const memberSince = new Date(user.created_at).toLocaleDateString("fr-BE", { month: "long", year: "numeric" });
  const firstName = user.full_name?.split(" ")[0] || null;

  const nextFlightDate = nextFlight
    ? new Date(nextFlight.date_vol + "T12:00:00Z").toLocaleDateString("fr-BE", { weekday: "long", day: "numeric", month: "long" })
    : null;
  const daysUntil = nextFlight
    ? Math.ceil((new Date(nextFlight.date_vol + "T23:59:59").getTime() - Date.now()) / 86400000)
    : null;

  const TABS: { id: Tab; label: string; Icon: React.ElementType; count?: number }[] = [
    { id: "resa", label: "Réservations", Icon: CalendarDays, count: reservations.length || undefined },
    { id: "profil", label: "Profil", Icon: UserIcon },
    ...(hasVouchers ? [{ id: "bons" as Tab, label: "Bons de vol", Icon: Ticket, count: vouchers.length }] : []),
  ];

  return (
    <main className="bg-white pt-page pb-20">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 xl:px-10">

        <p className={EYEBROW}>Mon espace</p>
        <h1 className="text-[28px] lg:text-[40px] font-black text-foreground leading-[1.05] tracking-[-0.02em]">
          {firstName ? `Bonjour, ${firstName}.` : "Mon compte"}
        </h1>
        <p className="mt-2 text-[13.5px] text-muted-foreground">Membre depuis {memberSince}</p>

        {/* Prochain vol : fond léger, visible quel que soit l'onglet ouvert */}
        {nextFlight && nextFlightDate && (
          <div className="mt-6 rounded-2xl bg-secondary/70 px-5 py-4 sm:px-6 sm:py-5">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <p className="text-[10px] font-bold text-[#0b2238]/45 uppercase tracking-[2px] mb-1">Prochain vol</p>
                <p className="text-[17px] font-black text-[#0b2238] capitalize">{nextFlightDate}</p>
                <p className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12.5px] text-[#0b2238]/65">
                  {nextFlight.heure_vol && <span className="flex items-center gap-1.5"><Clock size={13} />{formatHeure(nextFlight.heure_vol)}</span>}
                  <span className="flex items-center gap-1.5"><PlaneTakeoff size={13} />{formatDuration(nextFlight.duree)}</span>
                  {nextFlight.pilote_nom && <span>Avec {nextFlight.pilote_nom}</span>}
                </p>
              </div>
              {daysUntil !== null && (
                <span className={`shrink-0 text-[13px] font-bold px-3 py-1.5 rounded-[10px] ${
                  daysUntil <= 0 ? "bg-green-100 text-green-700" : daysUntil <= 7 ? "bg-primary/25 text-[#0b2238]" : "bg-white text-[#0b2238]/70"
                }`}>
                  {daysUntil <= 0 ? "Aujourd'hui !" : daysUntil === 1 ? "Demain" : `J-${daysUntil}`}
                </span>
              )}
            </div>
            {/* bordered : le composant ajoute lui-même son filet, seulement s'il a des données à montrer */}
            <WeatherWidget date={nextFlight.date_vol} bordered />
          </div>
        )}

        <div className="mt-7 pt-6 lg:mt-9 lg:pt-8 border-t border-border lg:grid lg:grid-cols-[196px_minmax(0,1fr)] lg:gap-11">

          {/* Onglets — téléphone : bandeau scrollable */}
          <div className="lg:hidden -mx-4 sm:-mx-6 px-4 sm:px-6 mb-6 flex gap-1.5 overflow-x-auto [scrollbar-width:none]">
            {TABS.map(({ id, label, Icon, count }) => (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                className={`shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-full text-[12.5px] font-semibold whitespace-nowrap border cursor-pointer transition-colors ${
                  activeTab === id ? "bg-[#0b2238] text-white border-[#0b2238]" : "bg-white text-muted-foreground border-border"
                }`}
              >
                <Icon size={13} /> {label}
                {count != null && (
                  <span className={`text-[10px] font-bold px-1.5 rounded-full ${activeTab === id ? "bg-white/20" : "bg-secondary"}`}>{count}</span>
                )}
              </button>
            ))}
          </div>

          {/* Onglets — ordinateur : sidebar */}
          <nav className="hidden lg:flex lg:flex-col lg:sticky lg:top-[110px] lg:self-start gap-0.5">
            {TABS.map(({ id, label, Icon, count }) => (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                className={`${SIDE_LINK} text-left cursor-pointer ${activeTab === id ? "bg-[#0b2238] text-white" : "text-muted-foreground hover:text-foreground hover:bg-secondary"}`}
              >
                <Icon size={15} className={activeTab === id ? "opacity-100" : "opacity-60"} />
                <span className="flex-1">{label}</span>
                {count != null && (
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${activeTab === id ? "bg-white/20" : "bg-secondary text-muted-foreground"}`}>{count}</span>
                )}
              </button>
            ))}

            {user.is_admin && (
              <Link href="/admin" className={`${SIDE_LINK} text-[#8a6400] hover:bg-primary/10 mt-2.5`}>
                <LayoutDashboard size={15} className="opacity-70" /> Dashboard admin
              </Link>
            )}
            <form action={logout} className="mt-1.5 pt-1.5 border-t border-border">
              <button type="submit" className={`${SIDE_LINK} w-full text-muted-foreground hover:text-red-600 hover:bg-red-50 cursor-pointer`}>
                <LogOut size={15} className="opacity-60" /> Déconnexion
              </button>
            </form>
          </nav>

          {/* Contenu */}
          <div className="min-w-0">
            {activeTab === "resa" && <ReservationsSection reservations={reservations} />}
            {activeTab === "profil" && <ProfileSection user={user} newsletterActive={newsletterActive} />}
            {activeTab === "bons" && hasVouchers && <BonsSection vouchers={vouchers} />}
          </div>
        </div>

        {/* Téléphone : admin + déconnexion, en bas de page */}
        <div className="lg:hidden mt-10 pt-6 border-t border-border flex flex-col gap-1">
          {user.is_admin && (
            <Link href="/admin" className="flex items-center gap-2.5 py-2 text-[13.5px] font-semibold text-[#8a6400]">
              <LayoutDashboard size={15} className="opacity-70" /> Dashboard admin
            </Link>
          )}
          <form action={logout}>
            <button type="submit" className="flex items-center gap-2.5 py-2 text-[13.5px] font-semibold text-muted-foreground cursor-pointer">
              <LogOut size={15} className="opacity-60" /> Déconnexion
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
