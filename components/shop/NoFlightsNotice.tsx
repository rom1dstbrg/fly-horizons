import Link from "next/link";
import { PlaneTakeoff, ArrowRight } from "lucide-react";

// Affiché à la place d'une grille de vols vide — jamais une section qui
// disparaît sans explication (ex. Romain désactive tous les produits depuis
// /admin/boutique). Renvoie vers la page contact.
export function NoFlightsNotice() {
  return (
    <div className="text-center py-16 px-4">
      <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center mx-auto mb-4">
        <PlaneTakeoff size={18} className="text-muted-foreground" />
      </div>
      <p className="text-foreground font-bold text-lg mb-2">Aucun vol disponible pour le moment</p>
      <p className="text-muted-foreground text-sm max-w-md mx-auto mb-6 leading-relaxed">
        Nous sommes en pause sur les réservations en ligne. Contactez-nous directement,
        nous regarderons ensemble ce qui est possible.
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        <Link
          href="/contact"
          className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#F2B705] text-[#0b2238] font-black text-sm rounded-lg hover:bg-[#e6a800] transition-colors shadow-gold-sm"
        >
          Nous contacter
          <ArrowRight size={15} />
        </Link>
      </div>
    </div>
  );
}
