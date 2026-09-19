"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, Route, WifiOff, X, ChevronDown } from "lucide-react";

// Les 3 façons de créer un vol ne se distinguaient que par une icône + un mot
// (aucune description) — le point le plus confus de l'espace pilote pour
// quelqu'un qui découvre (audit UX du 19/09). Un seul bouton qui ouvre un
// menu décrit, plutôt que 3 boutons nus côte à côte : rien n'est caché,
// juste un clic de plus pour un choix éclairé. Libellés/descriptions repris
// tels quels de components/admin/VolsPageActions.tsx (référence admin déjà
// validée) pour garder un seul vocabulaire entre les deux espaces.
const OPTIONS = [
  { href: "/pilote/reservations/new",         icon: Plus,    label: "Nouvelle réservation", desc: "Un client vous a contacté (téléphone, email) pour un vol standard." },
  { href: "/pilote/reservations/new-mesure",  icon: Route,   label: "Vol sur mesure",        desc: "Itinéraire et prix que vous construisez vous-même pour un client." },
  { href: "/pilote/reservations/new-horsite", icon: WifiOff, label: "Hors site",             desc: "Vol déjà convenu ailleurs (Messenger, téléphone...) — à enregistrer pour votre historique." },
] as const;

export function PiloteVolsActions() {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-[#e6a800] transition-colors cursor-pointer"
      >
        <Plus size={15} />
        Nouveau vol
        <ChevronDown size={13} className={`transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <>
          {/* Desktop/tablette : petit menu ancré sous le bouton */}
          <div className="hidden sm:block absolute right-0 top-[calc(100%+6px)] z-[100] w-80 bg-card rounded-xl border border-navy/15 shadow-lg overflow-hidden">
            <div className="absolute inset-0 -z-10" onClick={() => setOpen(false)} />
            {OPTIONS.map(({ href, icon: Icon, label, desc }, i) => (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                className={`flex items-start gap-3 px-4 py-3 hover:bg-secondary transition-colors ${i > 0 ? "border-t border-border" : ""}`}
              >
                <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
                  <Icon size={15} />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground">{label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{desc}</p>
                </div>
              </Link>
            ))}
          </div>

          {/* Mobile : bottom sheet */}
          <div className="sm:hidden fixed inset-0 z-[100] flex items-end justify-center">
            <div className="absolute inset-0 bg-foreground/30 backdrop-blur-[2px]" onClick={() => setOpen(false)} />
            <div className="relative w-full bg-white rounded-t-2xl shadow-2xl border border-border pb-[calc(1rem+env(safe-area-inset-bottom))]">
              <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                <p className="text-sm font-black text-foreground">Nouveau vol</p>
                <button onClick={() => setOpen(false)} className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer" aria-label="Fermer">
                  <X size={16} />
                </button>
              </div>
              <div className="py-2">
                {OPTIONS.map(({ href, icon: Icon, label, desc }) => (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-3 px-5 py-3.5 active:bg-secondary transition-colors"
                  >
                    <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                      <Icon size={16} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground">{label}</p>
                      <p className="text-xs text-muted-foreground truncate">{desc}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
