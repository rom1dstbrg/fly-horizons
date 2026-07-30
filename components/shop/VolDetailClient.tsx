import Link from "next/link";
import { CalendarCheck, Lock } from "lucide-react";

interface VolDetailClientProps {
  id: string;
  slug: string;
  title: string;
  price: number;
  duree: number;
  image_url: string | null;
}

// Bouton "Offrir ce vol en cadeau" (ajout panier) retiré le 30/07/2026 — arrêt de la vente publique
// de vouchers, voir audit-legal-fly-horizons.html point critique n°1. Ne reste que la réservation directe.
export function VolDetailClient({ price, duree }: VolDetailClientProps) {
  return (
    <div id="vol-cta" className="space-y-5">

      {/* Prix */}
      <div className="pb-5 border-b border-border">
        <p className="text-[10px] font-bold text-primary uppercase tracking-[2px] mb-2">Prix du vol</p>
        <div className="flex items-baseline gap-1.5">
          <span className="text-[44px] font-black text-foreground leading-none">{price}&nbsp;€</span>
          <span className="text-muted-foreground text-sm">/ avion</span>
        </div>
      </div>

      {/* Bouton */}
      <Link
        href={`/reservation?duree=${duree}`}
        className="w-full h-12 flex items-center justify-center gap-2 bg-primary text-primary-foreground rounded-lg font-black text-sm hover:bg-[#e6a800] transition-colors shadow-gold"
      >
        <CalendarCheck size={16} />
        Réserver une date
      </Link>

      {/* Notes */}
      <div className="space-y-1.5">
        <p className="text-[10px] text-muted-foreground leading-relaxed">
          Confirmation envoyée par email immédiatement après paiement.
        </p>
        <p className="text-[10px] text-[#0b2238]/40 flex items-start gap-1.5 leading-relaxed">
          <Lock size={9} className="shrink-0 mt-0.5" />
          <span>
            Réservation jusqu'à <strong className="text-foreground/60">48 h avant le vol</strong>. Demande urgente ?{" "}
            <Link href="/contact" className="underline underline-offset-2 hover:text-foreground transition-colors">Contactez-nous</Link>.
          </span>
        </p>
      </div>

    </div>
  );
}
