"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, Route, WifiOff, X } from "lucide-react";

const OPTIONS = [
  { href: "/admin/reservations/new",         icon: Plus,    label: "Nouvelle réservation", desc: "Vol standard payé en ligne" },
  { href: "/admin/reservations/new-mesure",  icon: Route,   label: "Vol sur mesure",        desc: "Itinéraire personnalisé" },
  { href: "/admin/reservations/new-horsite", icon: WifiOff, label: "Hors site",             desc: "Vol déjà effectué, enregistrement rétroactif" },
] as const;

export function VolsPageActions({ activeTab }: { activeTab: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Desktop / tablette : les 3 boutons, comme avant */}
      <div className="hidden sm:flex items-center gap-2">
        <Link
          href="/admin/reservations/new"
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-semibold transition-colors ${
            activeTab === "reservations"
              ? "bg-primary text-primary-foreground hover:bg-primary/90"
              : "border border-border text-muted-foreground hover:text-foreground hover:bg-secondary"
          }`}
        >
          <Plus size={15} />
          Nouvelle réservation
        </Link>
        <Link
          href="/admin/reservations/new-mesure"
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-semibold transition-colors ${
            activeTab === "sur-mesure"
              ? "bg-primary text-primary-foreground hover:bg-primary/90"
              : "border border-border text-muted-foreground hover:text-foreground hover:bg-secondary"
          }`}
        >
          <Route size={15} />
          Nouveau vol sur mesure
        </Link>
        <Link
          href="/admin/reservations/new-horsite"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-semibold border border-border text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
        >
          <WifiOff size={15} />
          Hors site
        </Link>
      </div>

      {/* Mobile : un seul bouton, ouvre un menu avec les 3 options */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Nouvelle réservation"
        className="sm:hidden inline-flex items-center justify-center w-10 h-10 rounded-full bg-primary text-primary-foreground shadow-sm cursor-pointer"
      >
        <Plus size={20} />
      </button>

      {open && (
        <div className="sm:hidden fixed inset-0 z-[100] flex items-end justify-center">
          <div className="absolute inset-0 bg-foreground/30 backdrop-blur-[2px]" onClick={() => setOpen(false)} />
          <div className="relative w-full bg-white rounded-t-2xl shadow-2xl border border-border pb-[calc(1rem+env(safe-area-inset-bottom))]">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <p className="text-sm font-black text-foreground">Nouvelle réservation</p>
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
      )}
    </>
  );
}
