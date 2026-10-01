"use client";

import { ArrowDown } from "lucide-react";

// Lien d'ancre à défilement fluide (respecte « réduire les animations »). Le défilement fluide n'est pas
// global sur le site : on le déclenche ici, uniquement pour ce lien, avec la marge du header (scroll-mt de la cible).
export function ScrollLink({ targetId, children, className }: { targetId: string; children: React.ReactNode; className?: string }) {
  return (
    <a
      href={`#${targetId}`}
      onClick={(e) => {
        const el = document.getElementById(targetId);
        if (!el) return;
        e.preventDefault();
        const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        el.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
        history.replaceState(null, "", `#${targetId}`);
      }}
      className={className}
    >
      {children}
      <ArrowDown size={14} />
    </a>
  );
}
