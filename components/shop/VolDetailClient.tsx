import Link from "next/link";
import { CalendarCheck, AlertCircle } from "lucide-react";

interface VolDetailClientProps {
  id: string;
  slug: string;
  title: string;
  price: number;
  duree: number;
  image_url: string | null;
  soldOut?: boolean;
  escales?: { icao: string; nom: string; taxe: number }[] | null;
}

// Bouton "Offrir ce vol en cadeau" (ajout panier) retiré le 30/07/2026 — arrêt de la vente publique
// de vouchers, voir audit-legal-fly-horizons.html point critique n°1. Ne reste que la réservation directe.
export function VolDetailClient({ id, price, duree, soldOut, escales }: VolDetailClientProps) {
  const taxesTotal = (escales ?? []).reduce((a, e) => a + e.taxe, 0);

  return (
    <div id="vol-cta" className="space-y-5">

      {/* Prix */}
      <div className="pb-5 border-b border-border">
        <p className="text-[10px] font-bold text-primary uppercase tracking-[2px] mb-2">Participation aux frais</p>
        <div className="flex items-baseline gap-1.5">
          <span className="text-[44px] font-black text-foreground leading-none">{price}&nbsp;€</span>
          <span className="text-muted-foreground text-sm">/ avion</span>
        </div>
        {taxesTotal > 0 && (
          <p className="text-xs text-muted-foreground mt-1.5">
            Dont {taxesTotal} € de taxe{taxesTotal > 1 && (escales?.length ?? 0) > 1 ? "s" : ""} d&apos;escale
            ({escales?.map(e => e.icao).join(", ")}).
          </p>
        )}
      </div>

      {/* Bouton */}
      {soldOut ? (
        <div className="w-full h-12 flex items-center justify-center gap-2 bg-secondary text-muted-foreground rounded-lg font-black text-sm">
          Offre épuisée
        </div>
      ) : (
        <Link
          href={`/reservation?produit=${id}&duree=${duree}`}
          className="w-full h-12 flex items-center justify-center gap-2 bg-primary text-primary-foreground rounded-lg font-black text-sm hover:bg-[#e6a800] transition-colors shadow-gold"
        >
          <CalendarCheck size={16} />
          Faire une demande
        </Link>
      )}

      {/* Notes */}
      <div className="space-y-1">
        <p className="text-xs text-foreground/70 flex items-start gap-1.5 leading-relaxed">
          <AlertCircle size={12} className="shrink-0 mt-0.5 text-primary" />
          Créneau souhaité, pas garanti : le vol étant partagé, une autre date ou heure peut vous être proposée. Confirmation sous 72h, sans paiement avant.
        </p>
        <p className="text-[10px] text-muted-foreground leading-relaxed pl-[18px]">
          Demande possible jusqu&apos;à 48 h avant le vol. Urgent ?{" "}
          <Link href="/contact" className="underline underline-offset-2 hover:text-foreground transition-colors">Contactez-nous</Link>.
        </p>
      </div>

      {/* Partage de coûts */}
      <div className="p-4 bg-primary/10 border border-primary/30 rounded-lg">
        <p className="text-[10px] font-bold text-foreground uppercase tracking-[2px] mb-1">
          Vol en partage de coûts · NCO.GEN.104
        </p>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Fly Horizons n&apos;est pas un service de transport aérien commercial. Nous partageons un vol que nous organisons déjà : votre participation couvre une quote-part des frais réels (avion, carburant, taxes d&apos;aérodrome), sans marge commerciale.
        </p>
      </div>

    </div>
  );
}
