import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { ChevronDown, Users, ArrowRight, Eye, HandCoins, BadgeCheck, Scale } from "lucide-react";
import { HeroContent } from "@/components/HeroContent";
import { ChatWidget } from "@/components/chat/ChatWidget";
import { PackCard } from "@/components/shop/PackCard";
import { AnnonceCard } from "@/components/vols/AnnonceCard";
import { NewsletterForm } from "@/components/NewsletterForm";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { jsonLd } from "@/lib/json-ld";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://fly-horizons.com";

export const metadata: Metadata = {
  title: {
    absolute: "Fly Horizons, vol partagé en Belgique · Vols en avion léger depuis Charleroi",
  },
  description:
    "Des pilotes privés partagent leurs vols en avion léger au départ de Charleroi (Belgique). Vous ne payez que votre part des frais, jusqu'à 3 passagers.",
  alternates: { canonical: siteUrl },
  openGraph: {
    title: "Fly Horizons, vol partagé en Belgique · Vols en avion léger depuis Charleroi",
    description:
      "Des pilotes privés partagent leurs vols en avion léger au départ de Charleroi. Vous ne payez que votre part des frais.",
    url: siteUrl,
    images: [{ url: `${siteUrl}/da-40.webp`, width: 1600, height: 1068, alt: "Fly Horizons, vol partagé en Belgique" }],
  },
};

const localBusinessSchema = {
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  name: "Fly Horizons",
  description:
    "Mise en relation de passagers et de pilotes privés pour des vols en avion léger en partage de frais, au départ de l'aérodrome de Charleroi (EBCI), Belgique. Jusqu'à 3 passagers.",
  url: siteUrl,
  logo: "https://fly-horizons.com/logo-email.png",
  image: `${siteUrl}/da-40.webp`,
  address: {
    "@type": "PostalAddress",
    addressLocality: "Charleroi",
    addressCountry: "BE",
  },
  geo: {
    "@type": "GeoCoordinates",
    latitude: 50.4592,
    longitude: 4.4528,
  },
  areaServed: { "@type": "Country", name: "Belgique" },
  priceRange: "€€",
  currenciesAccepted: "EUR",
  paymentAccepted: "Virement bancaire",
  openingHoursSpecification: {
    "@type": "OpeningHoursSpecification",
    dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
    opens: "00:00",
    closes: "23:59",
  },
};

// Nouvelle DA (maquette-accueil.html, 28/09). Hero gardé (vidéo plein écran), textes corrigés.
// Écarts communs à toutes les sections : py-16 / lg:py-28 ; H2 28 / 40 px ; eyebrow 11 px.
const WRAP = "max-w-[1400px] mx-auto px-4 sm:px-6 xl:px-10";
const SECTION = "py-16 lg:py-28";
const EYEBROW = "text-[11px] font-bold text-primary uppercase tracking-[3px] mb-3";
const H2 = "text-[28px] lg:text-[40px] font-black text-foreground leading-[1.05] tracking-[-0.02em]";
const MORE = "inline-flex items-center gap-1.5 text-sm font-bold text-[#0b2238] hover:text-[#e6a800] whitespace-nowrap transition-colors";

const TRUST = [
  { Icon: HandCoins,  title: "Rien à payer d'avance", desc: "Seulement après confirmation" },
  { Icon: BadgeCheck, title: "Pilotes vérifiés",      desc: "Licence et médical contrôlés" },
  { Icon: Scale,      title: "Frais partagés",        desc: "Sans marge commerciale" },
  { Icon: Users,      title: "Jusqu'à 3 passagers",   desc: "Au départ de Charleroi" },
];

const ETAPES = [
  { titre: "Un pilote publie son vol",               texte: "Durée, itinéraire, dates possibles et participation aux frais : tout est affiché sur la fiche du vol." },
  { titre: "Vous demandez à le rejoindre",           texte: "Vous choisissez une date parmi ses disponibilités. Le pilote confirme sous 72 h, rien à payer avant." },
  { titre: "Vous partagez les frais, et vous volez", texte: "Vous réglez votre part au pilote, puis rendez-vous à l'aérodrome de Charleroi pour le décollage." },
];

const AVIS = [
  {
    nom: "Sophie M.",
    lieu: "Namur",
    texte: "J'avais un peu le trac avant de monter. Romain a pris le temps d'expliquer chaque étape, on s'est senti en confiance dès le départ. La vue sur la vallée de la Sambre était à couper le souffle. Un souvenir que je garderai longtemps.",
  },
  {
    nom: "Laurent & Valérie",
    lieu: "Liège",
    texte: "Offert à notre fils pour ses 18 ans. Il en parle encore. Le briefing était sérieux sans être intimidant, et Romain lui a même laissé tenir les commandes quelques minutes. Une expérience vraiment unique.",
  },
];

export const revalidate = 300;

export default async function HomePage() {
  const supabase = await createClient();

  // Même source que /nos-offres : flag crm_settings.catalogue_source (annonces des pilotes,
  // ou anciens produits voucher en repli). Voir projet.html § Décisions (13/09).
  const [
    { data: sourceSetting },
    { data: packs },
    { data: rawAnnonces },
    { data: galleryRows },
  ] = await Promise.all([
    supabase.from("crm_settings").select("value").eq("key", "catalogue_source").maybeSingle(),
    supabase.from("products")
      .select("*, images:product_images(*)")
      .eq("active", true).eq("product_type", "voucher")
      .or("quantity_available.is.null,quantity_available.gt.0")
      .order("voucher_duration_minutes", { ascending: true }),
    // annonces_pilote/pilotes verrouillées service_role (IBAN, email pilote) —
    // lecture via le client admin, filtrée statut='publiee' uniquement.
    createAdminClient()
      .from("annonces_pilote")
      .select("id, titre, duree, places, prix_total, part_pilote, mode_vente, images, route_waypoints, pilotes(nom)")
      .eq("statut", "publiee")
      .order("created_at", { ascending: false }),
    supabase.from("gallery_images")
      .select("storage_path, alt")
      .order("display_order", { ascending: true })
      .limit(5),
  ]);
  const catalogueSource = sourceSetting?.value === "annonces" ? "annonces" : "products";

  const annonces = (rawAnnonces ?? []).map(a => {
    const remainder = Math.round((a.prix_total - a.part_pilote) * 100) / 100;
    const aMode: "avion" | "place" = a.mode_vente === "place" ? "place" : "avion";
    return {
      id: a.id,
      titre: a.titre,
      duree: a.duree,
      places: a.places,
      prix_client: aMode === "place" ? Math.round((remainder / a.places) * 100) / 100 : remainder,
      pilote_nom: (a.pilotes as unknown as { nom: string } | null)?.nom ?? "un pilote",
      cover_image: a.images?.[0] ?? null,
      mode_vente: aMode,
    };
  });

  // Une seule section « Les prochains vols » (durée fixe et itinéraires mêlés), 4 vols max.
  const vols = catalogueSource === "annonces" ? annonces.slice(0, 4) : [];
  const packsVisibles = catalogueSource === "annonces" ? [] : (packs ?? []).slice(0, 4);
  const noFlights = vols.length === 0 && packsVisibles.length === 0;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const galleryPreview = (galleryRows ?? []).map(row => ({
    src: `${supabaseUrl}/storage/v1/object/public/gallery/${row.storage_path}`,
    alt: row.alt,
  }));

  return (
    <main className="bg-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd(localBusinessSchema) }}
      />

      {/* ═══ HERO (gardé) ═══ */}
      <section className="relative h-screen min-h-[580px] overflow-hidden">
        <video
          autoPlay loop muted playsInline
          preload="none"
          poster="/hero-section.png"
          className="absolute inset-0 w-full h-full object-cover"
        >
          <source src="/vol-rev%202.2.mp4" type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/35 to-black/65" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/40 via-transparent to-transparent" />

        <HeroContent />

        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-white/50 z-10">
          <span className="text-xs font-medium tracking-widest uppercase">Découvrir</span>
          <ChevronDown size={18} className="animate-bounce" />
        </div>
      </section>

      {/* ═══ BANDEAU DE CONFIANCE : lignes à filets, sans cartes ═══ */}
      <section className="border-b border-border">
        {/* data-xs-grid : garde le 2×2 sur petit téléphone (globals.css force sinon grid-cols-2 à 1 colonne) */}
        <div data-xs-grid className={`${WRAP} grid grid-cols-2 lg:grid-cols-4`}>
          {TRUST.map(({ Icon, title, desc }, i) => (
            <div
              key={title}
              className={`flex items-start gap-2.5 py-[18px] lg:py-6 ${
                i % 2 === 0 ? "pr-3 border-r border-border" : "pl-3.5"
              } ${i < 2 ? "border-b lg:border-b-0 border-border" : ""} ${
                i > 0 ? "lg:pl-6" : ""
              } ${i < 3 ? "lg:pr-6 lg:border-r lg:border-border" : "lg:border-r-0"}`}
            >
              <Icon size={18} className="text-[#e6a800] shrink-0 mt-px" />
              <p className="text-[13px] lg:text-sm font-bold leading-snug text-foreground">
                {title}
                <span className="block text-xs font-medium text-muted-foreground mt-0.5">{desc}</span>
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ═══ LES PROCHAINS VOLS ═══ */}
      <section id="nos-vols" className={`${SECTION} scroll-mt-20`}>
        <div className={WRAP}>
          <div className="flex items-end justify-between gap-4 mb-7 lg:mb-10">
            <div>
              <p className={EYEBROW}>Au départ de Charleroi</p>
              <h2 className={H2}>Les prochains vols</h2>
            </div>
            {!noFlights && (
              <Link href="/nos-offres" className={`${MORE} mb-1.5`}>
                Tous les vols <ArrowRight size={15} />
              </Link>
            )}
          </div>

          {noFlights ? (
            <div className="max-w-[620px]">
              <p className="text-xl font-extrabold text-foreground mb-2">Aucun vol publié pour le moment.</p>
              <p className="text-[15px] leading-[1.7] text-foreground/70 mb-[18px]">
                Les pilotes publient leurs vols au fil de la saison. Laissez votre email : nous vous prévenons dès
                qu&apos;un vol est en ligne.
              </p>
              <NewsletterForm compact variant="light" submitLabel="Me prévenir" />
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              {catalogueSource === "annonces"
                ? vols.map((a) => <AnnonceCard key={a.id} annonce={a} />)
                : packsVisibles.map((pack) => <PackCard key={pack.id} pack={pack} />)}
            </div>
          )}
        </div>
      </section>

      {/* ═══ LE PRINCIPE : frise horizontale en 3 temps ═══ */}
      <section id="principe" className={`${SECTION} bg-[#f5f5f7] scroll-mt-20`}>
        <div className={WRAP}>
          <div className="grid gap-3.5 lg:grid-cols-2 lg:gap-x-[72px] lg:items-end mb-9 lg:mb-14">
            <div>
              <p className={EYEBROW}>Le principe</p>
              <h2 className={H2}>Un vol partagé, comment ça marche&nbsp;?</h2>
            </div>
            <div>
              <p className="max-w-[520px] text-[15px] lg:text-base leading-[1.7] text-foreground/70">
                Un pilote privé vole de toute façon. Il partage les places libres de son avion et les frais réels
                du vol avec ses passagers.
              </p>
              <Link href="/about" className={`${MORE} mt-3`}>
                En savoir plus sur Fly Horizons <ArrowRight size={15} />
              </Link>
            </div>
          </div>

          <ol className="grid lg:grid-cols-3 lg:gap-10">
            {ETAPES.map(({ titre, texte }, i) => (
              <li key={titre} className="relative pl-9 pb-7 lg:pl-0 lg:pb-0 lg:pt-9">
                {/* trait vers l'étape suivante : vertical (téléphone), horizontal (ordinateur) */}
                {i < ETAPES.length - 1 && (
                  <span
                    aria-hidden
                    className="absolute bg-[#0b2238]/12 left-[7px] top-[22px] bottom-0 w-0.5 lg:left-4 lg:-right-10 lg:top-[7px] lg:bottom-auto lg:w-auto lg:h-0.5"
                  />
                )}
                <span aria-hidden className="absolute left-0 top-1 lg:top-0 w-4 h-4 rounded-full bg-primary ring-4 ring-[#f5f5f7]" />
                <p className="text-[17px] lg:text-xl font-black text-foreground mb-1.5">{titre}</p>
                <p className="text-sm lg:text-[15px] leading-[1.65] text-foreground/70">{texte}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ═══ GALERIE ═══ */}
      {galleryPreview.length > 0 && (
        <section className={SECTION}>
          <div className={WRAP}>
            <div className="flex items-end justify-between gap-4 mb-7 lg:mb-10">
              <div>
                <p className={EYEBROW}>Galerie</p>
                <h2 className={H2}>Vols en images</h2>
              </div>
              <Link href="/galerie" className={`${MORE} mb-1.5`}>
                Voir la galerie <ArrowRight size={15} />
              </Link>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-3 lg:grid-rows-2 gap-3 lg:h-[540px]">
              {galleryPreview.map((img, i) => (
                <Link
                  key={img.src}
                  href="/galerie"
                  className={`relative overflow-hidden rounded-[10px] group cursor-pointer ${
                    i === 0
                      ? "col-span-2 aspect-video lg:col-span-1 lg:row-span-2 lg:aspect-auto"
                      : "aspect-video lg:aspect-auto"
                  } ${i >= 3 ? "hidden lg:block" : ""}`}
                >
                  <Image
                    src={img.src}
                    alt={img.alt}
                    fill
                    sizes="(max-width: 1024px) 100vw, 33vw"
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300" />
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <span className="w-11 h-11 rounded-full bg-white/12 border border-white/18 backdrop-blur-md flex items-center justify-center">
                      <Eye size={17} className="text-white" />
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ═══ AVIS : citations, sans cartes ═══ */}
      <section className={`${SECTION} border-t border-border`}>
        <div className={WRAP}>
          <div className="mb-7 lg:mb-10">
            <p className={EYEBROW}>Ils ont volé avec nous</p>
            <h2 className={H2}>Ce qu&apos;ils en disent</h2>
          </div>
          <div className="grid gap-9 lg:grid-cols-2 lg:gap-[72px]">
            {AVIS.map(({ nom, lieu, texte }) => (
              <figure key={nom} className="m-0">
                <span aria-hidden className="block text-[56px] leading-[0.6] font-black text-primary mb-2.5">&ldquo;</span>
                <blockquote className="m-0 text-lg lg:text-xl leading-[1.6] font-medium text-foreground">{texte}</blockquote>
                <figcaption className="mt-3.5 text-sm font-bold text-foreground">
                  {nom} <span className="font-medium text-muted-foreground">· {lieu}</span>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      <ChatWidget />
    </main>
  );
}
