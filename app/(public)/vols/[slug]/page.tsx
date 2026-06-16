import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Route, ArrowRight, CalendarCheck, Map, Headphones, PlaneTakeoff } from "lucide-react";
import { formatDuration } from "@/lib/vouchers";
import { VolDetailClient } from "@/components/shop/VolDetailClient";
import { VolImageGallery } from "@/components/shop/VolImageGallery";
import { PackCard } from "@/components/shop/PackCard";
import { BackLink } from "@/components/shop/BackLink";
import { VolStickyBar } from "@/components/shop/VolStickyBar";

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
    `${data.title}, baptême de l'air en avion léger depuis Charleroi (Belgique). Jusqu'à 3 passagers, itinéraire libre.`;
  const imageUrl = (data.images as { url: string }[])?.[0]?.url ?? `${siteUrl}/piste.jpg`;

  return {
    title: data.title,
    description,
    alternates: { canonical: `${siteUrl}/vols/${slug}` },
    openGraph: {
      title: `${data.title} | Fly Horizons`,
      description,
      url: `${siteUrl}/vols/${slug}`,
      images: [{ url: imageUrl, alt: data.title }],
    },
  };
}

const STEPS = [
  {
    num: "01",
    icon: <CalendarCheck size={22} />,
    title: "Réservation en ligne",
    desc: "Choisissez votre durée et réglez en sécurité. La confirmation et votre bon de vol arrivent par email dans la minute, pour vous ou pour l'offrir.",
  },
  {
    num: "02",
    icon: <Map size={22} />,
    title: "Votre pilote trace la route",
    desc: "Romain, pilote et fondateur de Fly Horizons, vous contacte pour composer l'itinéraire ensemble. Namur, Bruxelles, les Ardennes... la route s'adapte à vos envies et à la météo du jour.",
  },
  {
    num: "03",
    icon: <Headphones size={22} />,
    title: "Briefing à Charleroi",
    desc: "Rendez-vous sur l'aérodrome de Charleroi (EBCI) : accueil personnalisé, briefing sécurité, casques audio fournis. Vous montez à bord en toute sérénité.",
  },
  {
    num: "04",
    icon: <PlaneTakeoff size={22} />,
    title: "À vous le ciel",
    desc: "Décollage, montée en altitude, panorama sur la Belgique. Votre pilote commente chaque repère tout au long du trajet et répond à toutes vos questions.",
  },
];

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
      .order("voucher_duration_minutes", { ascending: true }),
  ]);

  if (!vol) notFound();

  const duree = vol.voucher_duration_minutes ?? 60;
  const sortedImages = [...(vol.images ?? [])].sort((a: { position?: number }, b: { position?: number }) => (a.position ?? 0) - (b.position ?? 0));
  const image = sortedImages[0]?.url ?? null;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://fly-horizons.com";

  const productSchema = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: vol.title,
    description:
      vol.short_description ??
      `Baptême de l'air en avion léger depuis Charleroi (EBCI), Belgique. Durée : ${duree} minutes.`,
    image: image ?? `${siteUrl}/piste.jpg`,
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

  return (
    <main className="bg-gradient-navy">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productSchema) }}
      />

      {/* ══════ SPLIT — galerie gauche / info droite ══════ */}
      <div className="pt-[98px] bg-gradient-navy">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 xl:px-10 pt-2 sm:pt-12 pb-20">

          <BackLink />

          <div className="grid md:grid-cols-[1fr_380px] lg:grid-cols-[1fr_400px] gap-10 lg:gap-14 items-start">

            {/* ── Gauche : galerie ── */}
            <div>
              <VolImageGallery
                images={sortedImages}
                title={vol.title}
                duree={duree}
              />
            </div>

            {/* ── Droite : info + CTA (sticky) ── */}
            <div className="md:sticky md:top-28 space-y-6">

              <div>
                <p className="text-xs font-bold text-primary uppercase tracking-[3px] mb-3">
                  {formatDuration(duree)} · Vol en avion léger
                </p>
                <h1 className="text-4xl sm:text-5xl font-black text-foreground leading-none tracking-tight">
                  {vol.title}
                </h1>
                {vol.short_description && (
                  <p className="text-foreground/55 text-sm leading-relaxed mt-3">
                    {vol.short_description}
                  </p>
                )}
              </div>

              <VolDetailClient
                id={vol.id} slug={vol.slug} title={vol.title}
                price={vol.price} duree={duree} image_url={image}
              />

            </div>
          </div>
        </div>
      </div>

      {/* ══════ COMMENT ÇA SE PASSE ══════ */}
      <div className="bg-[#f5f5f7] py-20 sm:py-28 overflow-hidden">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 xl:px-10">

          <p className="text-xs font-bold text-primary uppercase tracking-[3px] mb-4">
            Déroulement
          </p>
          <h2 className="text-4xl sm:text-5xl font-black text-foreground leading-none tracking-tight mb-16">
            Comment ça se passe
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-12 lg:gap-8">
            {STEPS.map(({ num, icon, title, desc }) => (
              <div key={num} className="relative flex flex-col gap-5">

                {/* Numéro décoratif en arrière-plan */}
                <span className="absolute -top-3 right-0 text-[96px] font-black leading-none select-none pointer-events-none tabular-nums text-foreground/[0.06]">
                  {num}
                </span>

                {/* Icône gold proéminente */}
                <div className="relative z-10 w-14 h-14 rounded-2xl bg-primary flex items-center justify-center text-[#0b2238] shadow-[0_6px_24px_rgba(242,183,5,0.35)]">
                  {icon}
                </div>

                {/* Texte */}
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-extrabold text-primary/70 uppercase tracking-[2.5px]">
                    Étape {num}
                  </span>
                  <p className="text-foreground font-black text-[17px] leading-snug">
                    {title}
                  </p>
                  <p className="text-foreground/60 text-sm leading-relaxed mt-1">
                    {desc}
                  </p>
                </div>
              </div>
            ))}
          </div>

        </div>
      </div>

      {/* ══════ AUTRES DURÉES — bg-[#f5f5f7] ══════ */}
      {(autres ?? []).length > 0 && (
        <div className="bg-gradient-navy py-20 sm:py-28">
          <div className="max-w-[1400px] mx-auto px-4 sm:px-6 xl:px-10">
            <p className="text-xs font-bold text-primary uppercase tracking-[3px] mb-4">
              Autres durées disponibles
            </p>
            <h2 className="text-4xl sm:text-5xl font-black text-foreground leading-none tracking-tight mb-10">
              Changer de durée
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {(autres ?? []).map((p, index) => (
                <PackCard key={p.id} pack={p} isPopular={p.voucher_duration_minutes === 60} />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ══════ VOL SUR MESURE — blanc ══════ */}
      <div className="bg-card border-t border-border pt-14 pb-[88px]">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 xl:px-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div>
            <p className="text-xs font-bold text-primary uppercase tracking-[3px] mb-3">Vol sur mesure</p>
            <h2 className="text-2xl sm:text-3xl font-black text-foreground leading-tight">
              Vous avez un itinéraire précis en tête ?
            </h2>
            <p className="text-muted-foreground text-sm mt-2 max-w-md leading-relaxed">
              Tracez votre route sur la carte : durée et prix calculés en temps réel, au kilomètre près.
            </p>
          </div>
          <Link
            href="/vol-sur-mesure"
            className="shrink-0 inline-flex items-center gap-2.5 px-6 py-3.5 bg-navy text-white rounded-lg text-sm font-black hover:opacity-90 transition-opacity"
          >
            <Route size={16} />
            Créer mon vol sur mesure
            <ArrowRight size={15} />
          </Link>
        </div>
      </div>

      <VolStickyBar
        id={vol.id} slug={vol.slug} title={vol.title}
        price={vol.price} duree={duree} image_url={image}
      />

    </main>
  );
}
