"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PILOTE_NAV, isPiloteNavActive, PiloteAvatar, type PilotIdInfo } from "@/components/pilote/PiloteSidebar";

// Mots de l'URL qui nomment une étape, pour le fil d'Ariane.
const STEPS: Record<string, string> = {
  new: "Nouvelle réservation",
  "new-mesure": "Vol sur mesure",
  "new-horsite": "Hors site",
  "mot-de-passe": "Mot de passe",
};

function crumbOf(pathname: string) {
  const section = PILOTE_NAV.find((item) => isPiloteNavActive(item, pathname));
  const step = pathname.split("/").filter(Boolean).reverse().map((p) => STEPS[p]).find(Boolean) ?? null;
  return { section: section?.label ?? "Espace pilote", step };
}

// Barre blanche en haut de chaque page (bureau) : où l'on est, le METAR de la
// base (passé par le layout serveur) et la plaque pilote. Pas de cloche :
// l'espace pilote n'a pas d'alertes à part.
export function PiloteTopBar({ metar, pilot }: { metar?: React.ReactNode; pilot?: PilotIdInfo | null }) {
  const pathname = usePathname() ?? "";
  const { section, step } = crumbOf(pathname);
  return (
    <header className="sticky top-0 z-30 hidden h-[60px] shrink-0 items-center gap-2.5 border-b border-st-line bg-white/90 px-7 backdrop-blur-xl lg:flex">
      <p className="min-w-0 truncate text-[15px] font-semibold text-st-text">
        {section}
        {step && <span className="font-medium text-st-muted"> / {step}</span>}
      </p>
      <span className="flex-1" />
      {metar}
      {pilot && (
        <Link href="/pilote/profil" aria-label="Mon profil" className="ml-1.5 flex rounded-full">
          <PiloteAvatar pilot={pilot} />
        </Link>
      )}
    </header>
  );
}
