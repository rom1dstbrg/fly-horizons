"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { SheetCloseButton } from "./sheet";

type Choice = {
  href: string;
  icon: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
  label: string;
  desc: string;
};

// Un bouton qui ouvre une liste de choix décrits (« Nouveau vol » → réservation,
// sur mesure, hors site). Bureau : petit menu ancré sous le bouton. Téléphone :
// feuille qui monte du bas, avec « Fermer ». Le bouton lui-même est passé par
// l'appelant (trigger) pour rester le composant Button partagé.
export function ChoiceMenu({ title, choices, trigger }: {
  title: string;
  choices: readonly Choice[];
  trigger: (props: { onClick: () => void; "aria-expanded": boolean; "aria-haspopup": "menu" }) => React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const row = (c: Choice, i: number, phone: boolean) => {
    const Icon = c.icon;
    return (
      <Link
        key={c.href}
        href={c.href}
        onClick={() => setOpen(false)}
        className={cn("flex items-start gap-3 bg-white px-3.5 py-3 transition-colors hover:bg-st-surface", i > 0 && "border-t border-st-line")}
      >
        <span className="grid h-[32px] w-[32px] shrink-0 place-items-center rounded-[10px] bg-st-surface text-st-ink">
          <Icon size={16} strokeWidth={1.8} />
        </span>
        <span className="min-w-0">
          <span className="block text-sm font-semibold text-st-text">{c.label}</span>
          <span className={cn("mt-0.5 block text-[12px] leading-snug text-st-muted", phone && "line-clamp-2")}>{c.desc}</span>
        </span>
      </Link>
    );
  };

  return (
    <div className="relative">
      {trigger({ onClick: () => setOpen((v) => !v), "aria-expanded": open, "aria-haspopup": "menu" })}

      {/* Bureau : menu ancré. */}
      {open && (
        <>
          <div className="fixed inset-0 z-[90] hidden sm:block" onClick={() => setOpen(false)} />
          <div role="menu" className="absolute right-0 top-[calc(100%+6px)] z-[91] hidden w-80 overflow-hidden rounded-[16px] border border-st-line bg-white shadow-st-lg sm:block">
            {choices.map((c, i) => row(c, i, false))}
          </div>
        </>
      )}

      {/* Téléphone : feuille, toujours montée pour glisser à la fermeture. */}
      <div className={cn("fixed inset-0 z-[90] flex items-end sm:hidden", !open && "pointer-events-none")} aria-hidden={!open} inert={!open}>
        <button
          type="button"
          aria-label="Fermer"
          tabIndex={open ? 0 : -1}
          onClick={() => setOpen(false)}
          className={cn("absolute inset-0 bg-st-ink/25 backdrop-blur-[1.5px] transition-opacity duration-300", open ? "opacity-100" : "opacity-0")}
        />
        <div
          role="dialog"
          aria-label={title}
          className={cn(
            "relative w-full rounded-t-[26px] bg-white px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-2.5 shadow-[0_-16px_40px_-16px_rgba(15,17,23,0.3)] transition-transform duration-300 ease-[cubic-bezier(0.2,0,0,1)]",
            open ? "translate-y-0" : "translate-y-full",
          )}
        >
          <div className="mx-auto mb-3.5 h-1 w-[38px] rounded-full bg-st-line-strong" />
          <div className="mb-3 flex items-center justify-between">
            <p className="text-base font-semibold text-st-text">{title}</p>
            <SheetCloseButton onClick={() => setOpen(false)} />
          </div>
          <div className="overflow-hidden rounded-[14px] border border-st-line">{choices.map((c, i) => row(c, i, true))}</div>
        </div>
      </div>
    </div>
  );
}
