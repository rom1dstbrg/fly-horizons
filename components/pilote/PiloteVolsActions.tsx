import Link from "next/link";
import { Plus, Route, WifiOff } from "lucide-react";

/** Entrées de création directement depuis l'espace pilote — pendant de
 * VolsPageActions côté admin, mais sans le système d'onglets (pas d'équivalent
 * ici, /pilote/vols est une liste unique). */
export function PiloteVolsActions() {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Link
        href="/pilote/reservations/new"
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-[#e6a800] transition-colors cursor-pointer"
      >
        <Plus size={15} />
        Nouvelle réservation
      </Link>
      <Link
        href="/pilote/reservations/new-mesure"
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-border text-sm font-semibold text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer"
      >
        <Route size={15} />
        Vol sur mesure
      </Link>
      <Link
        href="/pilote/reservations/new-horsite"
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-border text-sm font-semibold text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer"
      >
        <WifiOff size={15} />
        Hors site
      </Link>
    </div>
  );
}
