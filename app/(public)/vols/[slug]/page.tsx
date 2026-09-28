import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PackCard } from "@/components/shop/PackCard";
import { VolProductLayout } from "@/components/vols/VolProductLayout";
import { jsonLd } from "@/lib/json-ld";

function shuffle<T>(arr: T[]): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("products")
    .select("title, short_description, price, images:product_images(url)")
    .eq("slug", slug)
    .eq("product_type", "voucher")
    .eq("active", true)
    .single();
  if (!data) return {};

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://fly-horizons.com";
  const description =
    data.short_description ??
    `${data.title}, vol partagé en avion léger depuis Charleroi (Belgique). Jusqu'à 3 passagers, itinéraire libre.`;
  const imageUrl = (data.images as { url: string }[])?.[0]?.url ?? `${siteUrl}/da-40.webp`;

  return {
    title: data.title,
    description,
    alternates: { canonical: `${siteUrl}/vols/${slug}` },
    openGraph: {
      title: `${data.title} · Fly Horizons`,
      description,
      url: `${siteUrl}/vols/${slug}`,
      images: [{ url: imageUrl, alt: data.title }],
    },
  };
}

export default async function VolDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();

  const [{ data: vol }, { data: autres }] = await Promise.all([
    supabase
      .from("products")
      .select("*, images:product_images(*)")
      .eq("slug", slug)
      .eq("product_type", "voucher")
      .eq("active", true)
      .single(),
    supabase
      .from("products")
      .select("*, images:product_images(*)")
      .eq("product_type", "voucher")
      .eq("active", true)
      .neq("slug", slug)
      .or("quantity_available.is.null,quantity_available.gt.0")
      .order("voucher_duration_minutes", { ascending: true }),
  ]);

  if (!vol) notFound();

  const autresVols = shuffle(autres ?? []).slice(0, 3);

  const duree = vol.voucher_duration_minutes ?? 60;
  const sortedImages = [...(vol.images ?? [])].sort((a: { position?: number }, b: { position?: number }) => (a.position ?? 0) - (b.position ?? 0));
  const image = sortedImages[0]?.url ?? null;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://fly-horizons.com";
  const soldOut = vol.quantity_available === 0;

  const productSchema = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: vol.title,
    description:
      vol.short_description ??
      `Vol partagé en avion léger depuis Charleroi (EBCI), Belgique. Durée : ${duree} minutes.`,
    image: image ?? `${siteUrl}/da-40.webp`,
    brand: { "@type": "Brand", name: "Fly Horizons" },
    offers: {
      "@type": "Offer",
      url: `${siteUrl}/vols/${vol.slug}`,
      priceCurrency: "EUR",
      price: String(vol.price),
      availability: "https://schema.org/InStock",
      seller: { "@type": "Organization", name: "Fly Horizons" },
    },
  };

  const escales = (vol.escales ?? []) as { icao: string; nom: string; taxe: number }[];
  const taxes = escales.reduce((t, e) => t + e.taxe, 0);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(productSchema) }} />
      <VolProductLayout
        title={vol.title}
        description={vol.description ?? vol.short_description}
        duree={duree}
        places={3}
        pilote={null}
        images={sortedImages.map((i: { url: string }) => i.url)}
        route={vol.route_waypoints}
        price={vol.price}
        mode="avion"
        placesLibres={3}
        priceNote={taxes > 0 ? `Dont ${taxes} € de taxe${escales.length > 1 ? "s" : ""} d'escale (${escales.map((e) => e.icao).join(", ")}).` : null}
        cta={soldOut ? { disabled: "Offre épuisée" } : { href: `/reservation?produit=${vol.id}&duree=${duree}`, label: "Faire une demande" }}
        paiement="Vous recevez les modalités de paiement par email, avec la confirmation du vol."
        others={autresVols.length > 0 ? autresVols.map((p) => <PackCard key={p.id} pack={p} />) : null}
      />
    </>
  );
}
