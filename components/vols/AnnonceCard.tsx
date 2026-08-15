import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";

export interface AnnonceCardData {
  id: string;
  duree: number;
  places: number;
  prix_client: number;
  pilote_nom: string;
  cover_image: string | null;
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;

// ── Card annonce pilote — même langage visuel que PackCard (packs 30/60/90/120
// min), avec la photo de couverture du pilote (1ère image de l'annonce) à la
// place du dégradé de secours, et le nom du pilote à la place du titre produit.
// Pointe vers /vol/annonce/[id], pas un slug texte (une annonce reste un
// vol ponctuel à usage unique, pas une offre catalogue réutilisable).
export function AnnonceCard({ annonce }: { annonce: AnnonceCardData }) {
  const image = annonce.cover_image
    ? `${SUPABASE_URL}/storage/v1/object/public/annonces/${annonce.cover_image}`
    : null;

  return (
    <Link href={`/vol/annonce/${annonce.id}`} className="group block focus-visible:outline-none">
      <article className="relative overflow-hidden rounded-lg aspect-[4/3] sm:aspect-[3/4]">
        {image ? (
          <Image
            src={image}
            alt={`Vol partagé avec ${annonce.pilote_nom}`}
            fill
            className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.06]"
            sizes="(max-width:640px) 100vw, (max-width:1280px) 50vw, 25vw"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-[#0b2238] via-[#0e3060] to-[#1a4a8a]" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/92 via-black/20 to-transparent" />

        {/* Badge durée */}
        <div className="absolute top-4 left-4 right-4 flex items-start">
          <div className="inline-flex items-center bg-black/40 backdrop-blur-md border border-white/20 rounded-lg px-3.5 py-2">
            <span className="text-[#F2B705] font-black text-[15px] leading-none">{annonce.duree} min</span>
          </div>
        </div>

        {/* Contenu bas */}
        <div className="absolute inset-0 flex flex-col justify-end p-4 sm:p-5">
          <p className="text-[#F2B705] text-[11px] font-bold uppercase tracking-[2px] mb-1">
            Vol partagé · {annonce.pilote_nom}
          </p>
          <h3 className="text-white font-bold text-[19px] sm:text-[21px] leading-tight mb-1.5">
            Jusqu&apos;à {annonce.places} passager{annonce.places > 1 ? "s" : ""}
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
