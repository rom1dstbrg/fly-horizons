import Link from "next/link";
import { ArrowRight } from "lucide-react";

export interface AnnonceCardData {
  id: string;
  date_vol: string;
  heure_vol: string;
  duree: number;
  places: number;
  prix_client: number;
  pilote_nom: string;
}

// ── Card annonce pilote — même langage visuel que PackCard (packs 30/60/90/120
// min), mais sans photo (les annonces n'en ont pas) et avec le nom du pilote
// à la place du titre produit. Pointe vers /vol/annonce/[id], pas un slug texte
// (vol ponctuel daté, pas une offre catalogue réutilisable).
export function AnnonceCard({ annonce }: { annonce: AnnonceCardData }) {
  const dateStr = new Date(annonce.date_vol + "T12:00:00Z").toLocaleDateString("fr-BE", {
    weekday: "short", day: "numeric", month: "short",
  });

  return (
    <Link href={`/vol/annonce/${annonce.id}`} className="group block focus-visible:outline-none">
      <article className="relative overflow-hidden rounded-lg aspect-[4/3] sm:aspect-[3/4]">
        <div className="absolute inset-0 bg-gradient-to-br from-[#0b2238] via-[#0e3060] to-[#1a4a8a]" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/92 via-black/20 to-transparent" />

        {/* Badge durée */}
        <div className="absolute top-4 left-4 right-4 flex items-start justify-between gap-2">
          <div className="inline-flex items-center bg-black/40 backdrop-blur-md border border-white/20 rounded-lg px-3.5 py-2">
            <span className="text-[#F2B705] font-black text-[15px] leading-none">{annonce.duree} min</span>
          </div>
          <div className="inline-flex items-center bg-white/12 backdrop-blur-md border border-white/20 rounded-lg px-3 py-2">
            <span className="text-white text-[12px] font-semibold capitalize">{dateStr}</span>
          </div>
        </div>

        {/* Contenu bas */}
        <div className="absolute inset-0 flex flex-col justify-end p-4 sm:p-5">
          <p className="text-[#F2B705] text-[11px] font-bold uppercase tracking-[2px] mb-1">
            Vol partagé · {annonce.pilote_nom}
          </p>
          <h3 className="text-white font-bold text-[19px] sm:text-[21px] leading-tight mb-1.5">
            {annonce.heure_vol.slice(0, 5)} · {annonce.places} place{annonce.places > 1 ? "s" : ""}
          </h3>
          <div className="flex items-center justify-between gap-2">
            <span className="text-white font-black text-[24px] leading-none">{annonce.prix_client} €</span>
            <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold
              bg-white/12 text-white border border-white/18
              px-3 py-2 rounded-lg backdrop-blur-sm shrink-0
              group-hover:bg-[#F2B705] group-hover:text-[#0b2238] group-hover:border-transparent
              transition-all duration-300">
              Réserver
              <ArrowRight size={11} className="group-hover:translate-x-0.5 transition-transform" />
            </span>
          </div>
        </div>
      </article>
    </Link>
  );
}
