import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { AnnonceCard } from "@/components/vols/AnnonceCard";
import { VolProductLayout } from "@/components/vols/VolProductLayout";
import { jsonLd } from "@/lib/json-ld";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://fly-horizons.com";
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;

function toPublicUrl(path: string) {
  return `${SUPABASE_URL}/storage/v1/object/public/annonces/${path}`;
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("annonces_pilote")
    .select("duree, pilotes(nom)")
    .eq("id", id)
    .eq("statut", "publiee")
    .maybeSingle();
  if (!data) return {};
  const pilote = data.pilotes as unknown as { nom: string } | null;
  const title = `Vol partagé avec ${pilote?.nom ?? "un pilote"} · ${data.duree} min`;
  return {
    title,
    description: `Vol partagé de ${data.duree} min avec ${pilote?.nom ?? "un pilote"} Fly Horizons, au départ de Charleroi (EBCI). Choisissez votre date.`,
    alternates: { canonical: `${siteUrl}/vol/annonce/${id}` },
  };
}

export default async function AnnonceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = createAdminClient();

  const [{ data: annonce }, { data: autresRaw }] = await Promise.all([
    supabase.from("annonces_pilote").select("*, pilotes(id, nom, photo_url, bio)").eq("id", id).single(),
    supabase
      .from("annonces_pilote")
      .select("id, duree, places, prix_total, part_pilote, mode_vente, images, pilotes(nom)")
      .eq("statut", "publiee")
      .neq("id", id)
      .order("created_at", { ascending: false })
      .limit(3),
  ]);

  if (!annonce || annonce.statut !== "publiee") notFound();

  const pilote = annonce.pilotes as unknown as { id: string; nom: string; photo_url: string | null; bio: string | null };
  const modeVente: "avion" | "place" = annonce.mode_vente === "place" ? "place" : "avion";
  const placesLibres = Math.max(0, annonce.places - (annonce.places_reservees ?? 0));
  const prixAvion = Math.round((annonce.prix_total - annonce.part_pilote) * 100) / 100;
  const prixParPlace = Math.round((prixAvion / annonce.places) * 100) / 100;
  const prixClient = modeVente === "place" ? prixParPlace : prixAvion;
  const galleryImages = (annonce.images ?? []).map((path: string, i: number) => ({ url: toPublicUrl(path), position: i }));

  const autres = (autresRaw ?? []).map(a => {
    const remainder = Math.round((a.prix_total - a.part_pilote) * 100) / 100;
    const aMode: "avion" | "place" = a.mode_vente === "place" ? "place" : "avion";
    return {
      id: a.id,
      duree: a.duree,
      places: a.places,
      prix_client: aMode === "place" ? Math.round((remainder / a.places) * 100) / 100 : remainder,
      pilote_nom: (a.pilotes as unknown as { nom: string } | null)?.nom ?? "un pilote",
      cover_image: a.images?.[0] ?? null,
      mode_vente: aMode,
    };
  });

  const productSchema = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: `Vol partagé avec ${pilote.nom}`,
    description: annonce.description ?? `Vol partagé en avion léger depuis Charleroi (EBCI), Belgique. Durée : ${annonce.duree} minutes.`,
    image: galleryImages[0]?.url ?? `${siteUrl}/da-40.webp`,
    brand: { "@type": "Brand", name: "Fly Horizons" },
    offers: {
      "@type": "Offer",
      url: `${siteUrl}/vol/annonce/${annonce.id}`,
      priceCurrency: "EUR",
      price: String(prixClient),
      availability: "https://schema.org/InStock",
      seller: { "@type": "Organization", name: "Fly Horizons" },
    },
  };

  const titre = annonce.titre?.trim() || `Vol partagé avec ${pilote.nom}`;

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(productSchema) }} />
      <VolProductLayout
        title={titre}
        description={annonce.description}
        duree={annonce.duree}
        places={annonce.places}
        pilote={pilote}
        images={galleryImages.map((g: { url: string }) => g.url)}
        route={annonce.route_waypoints}
        price={prixClient}
        mode={modeVente}
        placesLibres={modeVente === "place" ? placesLibres : annonce.places}
        cta={
          modeVente === "place" && placesLibres === 0
            ? { disabled: "Complet" }
            : { href: `/vol/annonce/${annonce.id}/reserver`, label: "Réserver" }
        }
        paiement="Par virement au pilote, avec un QR code à scanner depuis votre app bancaire (ou en espèces s'il l'accepte). Vous recevez ensuite votre reçu."
        others={autres.length > 0 ? autres.map((a) => <AnnonceCard key={a.id} annonce={a} />) : null}
      />
    </>
  );
}
