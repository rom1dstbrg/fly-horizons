import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ChevronLeft, Users, Headphones, MapPin, Route, ArrowRight } from "lucide-react";
import { formatDuration } from "@/lib/vouchers";
import { VolDetailClient } from "@/components/shop/VolDetailClient";
import { VolImageGallery } from "@/components/shop/VolImageGallery";

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

const INCLUS = [
  { icon: <Users size={14} className="text-[#F2B705] shrink-0" />,     label: "Jusqu'à 3 passagers" },
  { icon: <MapPin size={14} className="text-[#F2B705] shrink-0" />,     label: "Départ depuis Charleroi (EBCI)" },
  { icon: <Route size={14} className="text-[#F2B705] shrink-0" />,      label: "Itinéraire personnalisé" },
  { icon: <Headphones size={14} className="text-[#F2B705] shrink-0" />, label: "Casques audio fournis" },
];

const STEPS = [
  {
    num: "01",
    title: "Réservation en ligne",
    desc: "Choisissez votre durée et réglez en sécurité. Votre bon de réservation arrive immédiatement par email.",
  },
  {
    num: "02",
    title: "Le pilote trace la route",
    desc: "Votre pilote vous contacte et propose un itinéraire adapté à la météo et à vos envies.",
  },
  {
    num: "03",
    title: "Briefing & équipement",
    desc: "À Charleroi (EBCI) : briefing sécurité complet, casques audio fournis, toutes vos questions répondues.",
  },
  {
    num: "04",
    title: "À vous le ciel",
    desc: "Décollage, montée, panorama. Votre pilote commente le vol tout au long du trajet.",
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
  const image = vol.images?.[0]?.url ?? null;
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
    <main className="bg-[#f5f5f7]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productSchema) }}
      />

      {/* ── Navigation ── */}
      <div className="pt-[98px] px-4 sm:px-6">
        <div className="max-w-6xl mx-auto pt-5">
          <Link href="/nos-offres" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ChevronLeft size={15} />
            Tous les vols
          </Link>
        </div>
      </div>

      {/* ── Hero ── */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-5 pb-10 lg:pb-14">
        {/*
          Mobile : titre → image → description → CTA → inclus
          Desktop : col gauche = image + inclus (même div) | col droite = titre + CTA
        */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-x-6 gap-y-5 lg:gap-x-14 lg:gap-y-6 items-start">

          {/* ── 1 · Titre — mobile: 1er ; desktop: col droite ligne 1 ── */}
          <div className="order-1 lg:col-start-2 lg:row-start-1 space-y-3 lg:pt-1">
            <h1 className="text-[40px] sm:text-[50px] font-black text-[#0b2238] leading-[1.0] tracking-tight">
              {vol.title}
            </h1>
            {vol.short_description && (
              <p className="hidden lg:block text-[#0b2238]/65 text-[15px] leading-relaxed">
                {vol.short_description}
              </p>
            )}
            <p className="hidden lg:block text-muted-foreground/55 text-[12px]">
              Au départ de Charleroi · EBCI
            </p>
          </div>

          {/* ── 2 · Galerie + INCLUS desktop — mobile: 2e ; desktop: col gauche lignes 1-2 ── */}
          <div className="order-2 lg:col-start-1 lg:row-start-1 lg:row-span-2 space-y-5">
            <VolImageGallery
              images={vol.images ?? []}
              title={vol.title}
              duree={duree}
            />
            {/* INCLUS visible uniquement sur desktop, dans la même colonne que la galerie */}
            <div className="hidden lg:block border-t border-border/60 pt-5">
              <p className="text-[10px] font-bold text-foreground/40 uppercase tracking-[2px] mb-3">Ce qui est inclus</p>
              <div className="grid grid-cols-2 gap-x-4">
                {INCLUS.map(({ icon, label }) => (
                  <div key={label} className="flex items-center gap-2.5 py-2.5 border-b border-border/50">
                    {icon}
                    <span className="text-xs text-foreground/70">{label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── 3 · Description — mobile uniquement ── */}
          <div className="order-3 lg:hidden space-y-1">
            {vol.short_description && (
              <p className="text-[#0b2238]/65 text-[15px] leading-relaxed">{vol.short_description}</p>
            )}
            <p className="text-muted-foreground/55 text-[12px]">
              Au départ de Charleroi · EBCI
            </p>
          </div>

          {/* ── 4 · CTA — mobile: 4e ; desktop: col droite ligne 2 ── */}
          <div className="order-4 lg:col-start-2 lg:row-start-2">
            <VolDetailClient
              id={vol.id}
              slug={vol.slug}
              title={vol.title}
              price={vol.price}
              duree={duree}
              image_url={image}
            />
          </div>

          {/* ── 5 · INCLUS mobile uniquement — après CTA ── */}
          <div className="order-5 lg:hidden border-t border-border/60 pt-5">
            <p className="text-[10px] font-bold text-foreground/40 uppercase tracking-[2px] mb-3">Ce qui est inclus</p>
            <div className="grid grid-cols-2 gap-x-4">
              {INCLUS.map(({ icon, label }) => (
                <div key={label} className="flex items-center gap-2.5 py-2.5 border-b border-border/50">
                  {icon}
                  <span className="text-xs text-foreground/70">{label}</span>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>

      {/* ── Déroulé ── */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 pb-10">
        <div className="border-t border-border pt-10">
          <p className="text-[10px] font-bold text-[#F2B705] uppercase tracking-[3px] mb-3">Comment ça se passe</p>
          <h2 className="text-2xl font-extrabold text-[#0b2238] mb-10">De la réservation au vol</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-8">
            {STEPS.map(({ num, title, desc }) => (
              <div key={num} className="flex flex-col gap-2.5">
                <span className="text-[#F2B705]/35 text-3xl font-black leading-none">{num}</span>
                <div className="w-6 h-0.5 bg-[#F2B705]" />
                <p className="text-[#0b2238] font-bold text-sm">{title}</p>
                <p className="text-foreground/55 text-xs leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Autres durées ── */}
      {(autres ?? []).length > 0 && (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 pb-10">
          <div className="border-t border-border pt-10">
            <p className="text-[10px] font-bold text-[#F2B705] uppercase tracking-[3px] mb-3">Autres durées disponibles</p>
            <h2 className="text-2xl font-extrabold text-[#0b2238] mb-6">Changer de durée</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {(autres ?? []).map((p) => {
                const d = p.voucher_duration_minutes ?? 60;
                const img = p.images?.[0]?.url ?? null;
                return (
                  <Link key={p.id} href={`/vols/${p.slug}`} className="group flex items-center gap-4 p-3 rounded-xl bg-white border border-border hover:border-[#F2B705]/40 hover:shadow-sm transition-all">
                    <div className="relative w-16 h-16 shrink-0 rounded-lg overflow-hidden bg-[#0b2238]">
                      {img
                        ? <Image src={img} alt={p.title} fill className="object-cover" sizes="64px" />
                        : <div className="absolute inset-0 bg-gradient-to-br from-[#0b2238] to-[#113356] flex items-center justify-center">
                            <span className="text-[#F2B705] text-xs font-black">{formatDuration(d)}</span>
                          </div>
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-bold text-[#F2B705] mb-0.5">{formatDuration(d)}</p>
                      <p className="text-sm font-semibold text-[#0b2238] truncate">{p.title}</p>
                      <p className="text-sm text-muted-foreground font-medium">{p.price} €</p>
                    </div>
                    <ArrowRight size={15} className="shrink-0 text-muted-foreground/40 group-hover:text-[#F2B705] group-hover:translate-x-0.5 transition-all" />
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── Vol sur mesure ── */}
      <div className="border-t border-border bg-white py-8 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <p className="font-bold text-foreground text-sm">Vous avez un itinéraire précis en tête ?</p>
            <p className="text-xs text-muted-foreground mt-0.5">Tracez votre route sur la carte : durée et prix calculés en temps réel.</p>
          </div>
          <Link href="/vol-sur-mesure" className="shrink-0 inline-flex items-center gap-2 px-5 py-2.5 bg-[#f5f8ff] border border-[#dce8ff] text-[#113356] rounded-xl text-sm font-semibold hover:bg-[#113356] hover:text-white hover:border-[#113356] transition-all cursor-pointer">
            <Route size={14} />
            Vol sur mesure
          </Link>
        </div>
      </div>

    </main>
  );
}
