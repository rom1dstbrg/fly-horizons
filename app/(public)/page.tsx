import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { ChevronDown, Route, Lock, Users, Clock, PlaneTakeoff, Zap, ArrowRight, MousePointerClick } from "lucide-react";
import { ChatWidget } from "@/components/chat/ChatWidget";
import { createClient } from "@/lib/supabase/server";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://fly-horizons.com";

export const metadata: Metadata = {
  title: {
    absolute: "Fly Horizons, baptême de l'air en Belgique | Vols en avion léger depuis Charleroi",
  },
  description:
    "Offrez ou vivez un baptême de l'air inoubliable en avion léger au départ de Charleroi (Belgique). Vols de 30 à 120 min, itinéraire libre, jusqu'à 3 passagers.",
  alternates: { canonical: siteUrl },
  openGraph: {
    title: "Fly Horizons, baptême de l'air en Belgique | Vols en avion léger depuis Charleroi",
    description:
      "Offrez ou vivez un baptême de l'air inoubliable en avion léger au départ de Charleroi (Belgique). Vols de 30 à 120 min, itinéraire libre.",
    url: siteUrl,
    images: [{ url: `${siteUrl}/piste.jpg`, width: 1200, height: 630, alt: "Fly Horizons, baptême de l'air en Belgique" }],
  },
};

const localBusinessSchema = {
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  name: "Fly Horizons",
  description:
    "Baptêmes de l'air et vols en avion léger depuis l'aéroport de Charleroi (EBCI), Belgique. Itinéraire 100 % libre, jusqu'à 3 passagers.",
  url: siteUrl,
  logo: "https://fly-horizons.com/logo-email.png",
  image: `${siteUrl}/piste.jpg`,
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
  paymentAccepted: "Carte bancaire",
  openingHoursSpecification: {
    "@type": "OpeningHoursSpecification",
    dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
    opens: "00:00",
    closes: "23:59",
  },
};

export const revalidate = 300;

export default async function HomePage() {
  const supabase = await createClient();

  const [
    { data: packs },
    { data: crmSettings },
    { data: galleryRows },
  ] = await Promise.all([
    supabase.from("products")
      .select("*, images:product_images(*)")
      .eq("active", true).eq("product_type", "voucher")
      .order("voucher_duration_minutes", { ascending: true }),
    supabase.from("crm_settings")
      .select("key, value")
      .in("key", ["welcome_code", "welcome_discount_type", "welcome_discount_value"]),
    supabase.from("gallery_images")
      .select("storage_path, alt")
      .order("display_order", { ascending: true })
      .limit(5),
  ]);

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const galleryPreview = (galleryRows ?? []).map(row => ({
    src: `${supabaseUrl}/storage/v1/object/public/gallery/${row.storage_path}`,
    alt: row.alt,
  }));

  const welcomeCode          = crmSettings?.find(s => s.key === "welcome_code")?.value ?? "WELCOME2026";
  const welcomeDiscountType  = crmSettings?.find(s => s.key === "welcome_discount_type")?.value ?? "percentage";
  const welcomeDiscountRaw   = crmSettings?.find(s => s.key === "welcome_discount_value")?.value ?? "10";
  const welcomeDiscountLabel = welcomeDiscountType === "percentage" ? `−${welcomeDiscountRaw}%` : `−${welcomeDiscountRaw} €`;

  return (
    <main className="bg-gradient-navy">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessSchema) }}
      />

      {/* ═══ HERO ═══ */}
      <section className="relative h-screen min-h-[580px] overflow-hidden">
        <video
          autoPlay loop muted playsInline
          preload="none"
          poster="/piste.jpg"
          className="absolute inset-0 w-full h-full object-cover"
        >
          <source src="/vol-rev%202.2.mp4" type="video/mp4" />
          <source src="/vol-rev%202.2.webm" type="video/webm" />
        </video>
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/35 to-black/65" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/40 via-transparent to-transparent" />

        <div className="relative z-10 flex flex-col items-center justify-center h-full text-center px-4 pb-16 pt-[48px] md:pt-[76px]">
          <div className="inline-flex items-center gap-2 bg-[#F2B705] rounded-full px-5 py-2 mb-8 shadow-[0_4px_20px_rgba(242,183,5,.4)]">
            <PlaneTakeoff size={13} className="text-[#0b2238]" />
            <span className="text-[#0b2238] text-xs font-bold tracking-[2.5px] uppercase">
              Vols en avion léger
            </span>
          </div>

          <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-[80px] font-black text-white leading-[1.0] tracking-tight mb-6 drop-shadow-lg">
            Volez où vous voulez.<br />
            <span className="text-[#F2B705]">À votre façon.</span>
          </h1>

          <p className="text-white/75 text-base sm:text-lg md:text-xl leading-relaxed max-w-xl mb-10 font-light">
            Baptême de l&apos;air en avion léger depuis Charleroi,{" "}
            <br className="hidden sm:block" />
            itinéraire libre, jusqu&apos;à 3 passagers, date au choix.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a
              href="#nos-vols"
              className="inline-flex items-center justify-center gap-2 px-7 py-3.5 bg-[#F2B705] text-[#0b2238] rounded-lg font-bold text-sm hover:bg-[#e6a800] transition-all shadow-[0_8px_30px_rgba(242,183,5,.35)] hover:-translate-y-0.5 active:translate-y-0"
            >
              <PlaneTakeoff size={16} />
              Réserver un vol
            </a>
            <a
              href="#vol-sur-mesure"
              className="inline-flex items-center justify-center gap-2 px-7 py-3.5 bg-white/10 text-white border border-white/30 rounded-lg font-semibold text-sm hover:bg-white/20 hover:border-white/50 transition-all backdrop-blur-sm"
            >
              <Route size={16} />
              Vol sur mesure
            </a>
          </div>

          <div className="mt-6 flex flex-col items-center gap-1.5">
            <p className="text-sm text-white/80">
              Utilisez le code{" "}
              <span className="font-mono font-black text-[#F2B705] bg-[#F2B705]/10 border border-[#F2B705]/30 rounded px-2 py-0.5">{welcomeCode}</span>
              {" "}pour {welcomeDiscountLabel}
            </p>
            <p className="text-[11px] text-white/55">* valable une seule fois · applicable lors de votre réservation.</p>
          </div>
        </div>

        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-white/50 z-10">
          <span className="text-xs font-medium tracking-widest uppercase">Découvrir</span>
          <ChevronDown size={18} className="animate-bounce" />
        </div>
      </section>

      {/* ═══ BARRE DE CONFIANCE ═══ */}
      <section className="bg-card border-b border-border">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 xl:px-10 py-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { icon: <Lock size={20} className="text-foreground" />, title: "Paiement sécurisé", desc: "Via Stripe, carte bancaire" },
              { icon: <Clock size={20} className="text-foreground" />, title: "Annulation gratuite", desc: "Jusqu'à 48 h avant le vol" },
              { icon: <Users size={20} className="text-foreground" />, title: "Jusqu'à 3 passagers", desc: "Partagez l'expérience à plusieurs" },
              { icon: <PlaneTakeoff size={20} className="text-foreground" />, title: "Itinéraire libre", desc: "Vous choisissez votre route" },
            ].map(({ icon, title, desc }) => (
              <div key={title} className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-secondary border border-border flex items-center justify-center shrink-0">
                  {icon}
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">{title}</p>
                  <p className="text-xs text-muted-foreground">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ NOS VOLS ═══ */}
      {(packs ?? []).length > 0 && (
        <section id="nos-vols" className="py-16 bg-gradient-navy border-t border-border">
          <div className="max-w-[1400px] mx-auto px-4 sm:px-6 xl:px-10">

            <div className="mb-10">
              <p className="text-xs font-bold text-primary uppercase tracking-[3px] mb-4">
                Au départ de Charleroi (EBCI)
              </p>
              <h2 className="text-4xl sm:text-5xl font-black text-foreground leading-none tracking-tight">
                Jusqu&apos;où voulez-vous aller ?
              </h2>
              <p className="text-muted-foreground text-sm mt-4">
                Du vol découverte à l&apos;aventure prolongée : sélectionnez la durée qui vous convient.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              {(packs ?? []).map((pack, index) => {
                const image = pack.images?.[0]?.url ?? null;
                const duree = pack.voucher_duration_minutes ?? 60;
                const isPopular = index === 1;
                return (
                  <Link key={pack.id} href={`/vols/${pack.slug}`} className="group block focus-visible:outline-none">
                    <article className="relative overflow-hidden rounded-lg aspect-[4/3] sm:aspect-[3/4]">
                      {image ? (
                        <Image
                          src={image}
                          alt={pack.title}
                          fill
                          className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.06]"
                          sizes="(max-width:640px) 100vw, (max-width:1280px) 50vw, 25vw"
                        />
                      ) : (
                        <div className="absolute inset-0 bg-gradient-to-br from-[#0b2238] via-[#0e3060] to-[#1a4a8a]" />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/92 via-black/20 to-transparent" />

                      {/* Badges haut */}
                      <div className="absolute top-4 left-4 right-4 flex items-start justify-between">
                        <div className="inline-flex items-center bg-black/40 backdrop-blur-md border border-white/20 rounded-lg px-3.5 py-2">
                          <span className="text-[#F2B705] font-black text-[15px] leading-none">{duree} min</span>
                        </div>
                        {isPopular && (
                          <div className="inline-flex items-center bg-[#F2B705] rounded-lg px-3 py-2">
                            <span className="text-[#0b2238] font-black text-[11px] leading-none uppercase tracking-wide">Le plus offert</span>
                          </div>
                        )}
                      </div>

                      <div className="absolute inset-0 flex flex-col justify-end p-4 sm:p-5">
                        <h3 className="text-white font-bold text-[19px] sm:text-[21px] leading-tight mb-1.5">
                          {pack.title}
                        </h3>
                        {pack.short_description && (
                          <p className="text-white/70 text-[13px] leading-snug mb-2.5 line-clamp-2">
                            {pack.short_description}
                          </p>
                        )}
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-white font-black text-[24px] leading-none">{pack.price} €</span>
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
              })}
            </div>

            <div className="mt-12 text-center">
              <p className="text-sm text-muted-foreground">
                Vous avez un itinéraire précis en tête ?{" "}
                <Link href="/vol-sur-mesure" className="text-foreground font-semibold hover:underline">
                  Créez un vol entièrement sur mesure →
                </Link>
              </p>
            </div>

          </div>
        </section>
      )}

      {/* ═══ VOL SUR MESURE ═══ */}
      <section id="vol-sur-mesure" className="bg-[#0b2238] overflow-hidden relative">

        {/* Vague haut — background → navy */}
        <div className="relative h-12 overflow-hidden">
          <svg viewBox="0 0 1440 48" preserveAspectRatio="none" className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <path d="M0,0 L1440,0 L1440,24 Q720,48 0,24 Z" fill="#f5f5f7" />
          </svg>
        </div>

        <div className="relative max-w-[1400px] mx-auto px-4 sm:px-6 xl:px-10 pt-2 sm:pt-12">

          <div className="mb-6">
            <p className="text-xs font-bold text-[#F2B705] uppercase tracking-[3px]">Vol sur mesure</p>
          </div>

          <div className="grid lg:grid-cols-[2fr_3fr] gap-12 items-center pb-0">

            {/* Texte gauche */}
            <div className="pb-12">
              <h2 className="text-4xl sm:text-5xl font-black text-white leading-[1.1] mb-4">
                Volez où vous voulez.<br />
                <span className="text-[#F2B705]">Payez ce que vous volez.</span>
              </h2>
              <p className="text-white/60 text-sm leading-relaxed mb-7 max-w-md">
                Pas de forfait à la minute. Tracez votre itinéraire sur la carte interactive
                et voyez le prix s&apos;ajuster en direct, kilomètre par kilomètre.
              </p>

              {/* Features */}
              <div className="space-y-5 mb-8">
                {[
                  {
                    icon: <MousePointerClick size={14} />,
                    title: "Itinéraire 100 % libre",
                    desc: "Namur, Bruxelles, la côte, les Ardennes... n'importe quelle destination en Belgique et au-delà.",
                  },
                  {
                    icon: <Zap size={14} />,
                    title: "Prix calculé en direct, au km",
                    desc: "Vous voyez le montant évoluer avant de confirmer quoi que ce soit. Zéro surprise.",
                  },
                  {
                    icon: <PlaneTakeoff size={14} />,
                    title: "Votre pilote valide votre itinéraire sous 24 h",
                    desc: "Il vérifie la faisabilité de l'espace aérien et vous confirme avec possibilité d'ajuster.",
                  },
                ].map(({ icon, title, desc }) => (
                  <div key={title} className="flex items-start gap-3.5">
                    <span className="text-[#F2B705] shrink-0 mt-0.5">{icon}</span>
                    <div>
                      <p className="text-white text-sm font-semibold leading-snug">{title}</p>
                      <p className="text-white/45 text-[11px] leading-relaxed mt-0.5">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Image mobile */}
              <div className="block md:hidden rounded-xl overflow-hidden border border-white/12 shadow-[0_8px_32px_rgba(0,0,0,0.4)] mb-8">
                <Image
                  src="/vol-sur-mesure.png"
                  alt="Aperçu de l'outil de planification vol sur mesure"
                  width={900}
                  height={600}
                  className="w-full h-auto"
                />
              </div>

              {/* CTA */}
              <div className="flex flex-col sm:flex-row gap-3">
                <Link
                  href="/vol-sur-mesure"
                  className="inline-flex items-center justify-center gap-2.5 px-6 py-3.5 bg-[#F2B705] text-[#0b2238] rounded-lg text-sm font-black hover:bg-[#e6a800] transition-colors shadow-lg shadow-[#F2B705]/20"
                >
                  <Route size={16} />
                  Créer mon vol sur mesure
                  <ArrowRight size={15} />
                </Link>
                <p className="flex items-center gap-1.5 text-white/35 text-xs self-center">
                  <Clock size={12} />
                  Aucun paiement immédiat
                </p>
              </div>
            </div>

            {/* Aperçu du configurateur */}
            <div className="hidden md:flex flex-col">
              <div className="rounded-2xl overflow-hidden border border-white/12 shadow-[0_24px_64px_rgba(0,0,0,0.55)]">
                <Image
                  src="/vol-sur-mesure.png"
                  alt="Aperçu de l'outil de planification vol sur mesure"
                  width={900}
                  height={600}
                  className="w-full h-auto"
                />
              </div>
            </div>

          </div>
        </div>

        {/* Vague bas — navy → blanc */}
        <div className="relative h-12 overflow-hidden">
          <svg viewBox="0 0 1440 48" preserveAspectRatio="none" className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <path d="M0,48 L0,24 Q360,0 720,24 Q1080,48 1440,24 L1440,48 Z" fill="#ffffff" />
          </svg>
        </div>

      </section>

      {/* ═══ GALERIE ═══ */}
      {galleryPreview.length > 0 && (
        <section className="bg-white py-20 sm:py-28">
          <div className="max-w-[1400px] mx-auto px-4 sm:px-6 xl:px-10">

            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-10">
              <div>
                <p className="text-xs font-bold text-primary uppercase tracking-[3px] mb-4">Galerie</p>
                <h2 className="text-4xl sm:text-5xl font-black text-foreground leading-none tracking-tight">
                  Vols en images
                </h2>
              </div>
              <Link
                href="/galerie"
                className="shrink-0 inline-flex items-center gap-2 text-sm font-semibold text-foreground/60 hover:text-foreground transition-colors"
              >
                Voir toute la galerie
                <ArrowRight size={15} />
              </Link>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-3 lg:grid-rows-2 gap-3 lg:h-[540px]">
              {galleryPreview.map((img, i) => (
                <Link
                  key={img.src}
                  href="/galerie"
                  className={`relative overflow-hidden rounded-xl group cursor-pointer ${
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
                </Link>
              ))}
            </div>

          </div>
        </section>
      )}

      {/* ═══ AVIS CLIENTS ═══ */}
      <section className="bg-secondary py-20 sm:py-28">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 xl:px-10">

          <div className="mb-12">
            <p className="text-primary text-xs font-bold tracking-[3px] uppercase mb-4">
              Ils ont volé avec Fly Horizons
            </p>
            <h2 className="text-4xl sm:text-5xl font-black text-foreground leading-none tracking-tight">
              Ce qu&apos;ils en disent
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[
              {
                name: "Sophie M.",
                location: "Namur",
                text: "J'avais un peu le trac avant de monter. Romain a pris le temps d'expliquer chaque étape, on s'est senti en confiance dès le départ. La vue sur la vallée de la Sambre était à couper le souffle. Un souvenir que je garderai longtemps.",
              },
              {
                name: "Laurent & Valérie",
                location: "Liège",
                text: "Offert à notre fils pour ses 18 ans. Il en parle encore. Le briefing était sérieux sans être intimidant, et Romain lui a même laissé tenir les commandes quelques minutes. Une expérience vraiment unique, pas du tout un vol de tourisme banal.",
              },
              {
                name: "Thomas D.",
                location: "Charleroi",
                text: "J'ai choisi le vol sur mesure pour survoler les Fagnes. Voir le prix se calculer en temps réel m'a mis en confiance : aucune surprise au moment de payer. Pilote à l'écoute, réponse rapide, vol sans accroc. Je recommande sans hésiter.",
              },
            ].map(({ name, location, text }) => (
              <div key={name} className="bg-card rounded-lg p-7 flex flex-col gap-5 shadow-[var(--sh-card)]">
                <div className="w-8 h-1 bg-primary rounded-full" />
                <p className="text-foreground/70 text-base leading-relaxed flex-1">{text}</p>
                <div>
                  <p className="text-foreground font-bold text-sm">{name}</p>
                  <p className="text-primary text-xs font-semibold tracking-wide mt-0.5">{location}</p>
                </div>
              </div>
            ))}
          </div>

        </div>
      </section>

      <ChatWidget />
    </main>
  );
}
