import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { AnnonceReserveClient } from "@/components/vols/AnnonceReserveClient";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;

function toPublicUrl(path: string) {
  return `${SUPABASE_URL}/storage/v1/object/public/annonces/${path}`;
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = createAdminClient();
  const { data } = await supabase.from("annonces_pilote").select("duree, pilotes(nom)").eq("id", id).maybeSingle();
  if (!data) return {};
  const pilote = data.pilotes as unknown as { nom: string } | null;
  return {
    title: `Réserver · Vol avec ${pilote?.nom ?? "un pilote"} · ${data.duree} min`,
    // Étape de formulaire, pas une page de contenu : ne doit pas concurrencer
    // /vol/annonce/[id] dans les résultats de recherche.
    robots: { index: false, follow: true },
  };
}

export default async function AnnonceReserverPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = createAdminClient();

  const { data: annonce } = await supabase
    .from("annonces_pilote")
    .select("*, pilotes(nom)")
    .eq("id", id)
    .single();

  if (!annonce || annonce.statut !== "publiee") notFound();

  const pilote = annonce.pilotes as unknown as { nom: string };
  const modeVente: "avion" | "place" = annonce.mode_vente === "place" ? "place" : "avion";
  const placesLibres = Math.max(0, annonce.places - (annonce.places_reservees ?? 0));
  if (modeVente === "place" && placesLibres === 0) notFound();

  const prixAvion = Math.round((annonce.prix_total - annonce.part_pilote) * 100) / 100;
  const prixParPlace = Math.round((prixAvion / annonce.places) * 100) / 100;
  const prixClient = modeVente === "place" ? prixParPlace : prixAvion;

  return (
    <AnnonceReserveClient
      annonce={{
        id: annonce.id,
        titre: annonce.titre?.trim() || `Vol partagé avec ${pilote.nom}`,
        duree: annonce.duree,
        places: modeVente === "place" ? placesLibres : annonce.places,
        prixClient,
        modeVente,
        piloteNom: pilote.nom,
        coverImage: annonce.images?.[0] ? toPublicUrl(annonce.images[0]) : null,
      }}
    />
  );
}
