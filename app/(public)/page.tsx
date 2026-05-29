import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { ChevronDown, Gift, Route, Lock, Users, Clock, PlaneTakeoff, Zap, ArrowRight, MousePointerClick } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { PackCard } from "@/components/shop/PackCard";
import PilotCard from "@/components/shop/PilotCard";

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

  const { data: packs } = await supabase
    .from("products")
    .select("*, images:product_images(*)")
    .eq("active", true)
    .eq("product_type", "voucher")
    .order("voucher_duration_minutes", { ascending: true });

  return (
    <main className="bg-background">
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
          {/* MP4 en premier — seul format supporté par Safari */}
          <source src="/vol-rev%202.2.mp4" type="video/mp4" />
          <source src="/vol-rev%202.2.webm" type="video/webm" />
        </video>
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/35 to-black/65" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/40 via-transparent to-transparent" />

        <div className="relative z-10 flex flex-col items-center justify-center h-full text-center px-4 pb-16 pt-[48px] md:pt-[76px]">
          <div className="inline-flex items-center gap-2 bg-[#F2B705] rounded-full px-5 py-2 mb-8 shadow-[0_4px_20px_rgba(242,183,5,.4)]">
            <PlaneTakeoff size={13} className="text-[#113356]" />
            <span className="text-[#113356] text-xs font-bold tracking-[2.5px] uppercase">
              Vols en avion léger
            </span>
          </div>

          <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-[80px] font-extrabold text-white leading-[1.0] tracking-tight mb-6 drop-shadow-lg">
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
              className="inline-flex items-center justify-center gap-2 px-7 py-3.5 bg-[#F2B705] text-[#113356] rounded-xl font-bold text-sm hover:bg-[#e6a800] transition-all shadow-[0_8px_30px_rgba(242,183,5,.35)] hover:-translate-y-0.5 active:translate-y-0"
            >
              <Gift size={16} />
              Réserver un vol
            </a>
            <a
              href="#vol-sur-mesure"
              className="inline-flex items-center justify-center gap-2 px-7 py-3.5 bg-white/10 text-white border border-white/30 rounded-xl font-semibold text-sm hover:bg-white/20 hover:border-white/50 transition-all backdrop-blur-sm"
            >
              <Route size={16} />
              Vol sur mesure
            </a>
          </div>

          <div className="mt-6 flex flex-col items-center gap-0.5">
            <p className="text-sm text-white/80">
              Utilisez le code{" "}
              <span className="font-mono font-bold text-[#F2B705]">WELCOME2026</span>
              {" "}pour −10%
            </p>
            <p className="text-[10px] italic text-white/35">valable une seule fois · compte requis pour l&apos;utiliser.</p>
          </div>
        </div>

        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-white/50 z-10">
          <span className="text-xs font-medium tracking-widest uppercase">Découvrir</span>
          <ChevronDown size={18} className="animate-bounce" />
        </div>
      </section>

      {/* ═══ BARRE DE CONFIANCE ═══ */}
      <section className="bg-white border-b border-border">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { icon: <Lock size={20} className="text-[#113356]" />, title: "Paiement sécurisé", desc: "Via Stripe, carte bancaire" },
              { icon: <Clock size={20} className="text-[#113356]" />, title: "Annulation gratuite", desc: "Jusqu'à 48 h avant le vol" },
              { icon: <Users size={20} className="text-[#113356]" />, title: "Jusqu'à 3 passagers", desc: "Partagez l'expérience à plusieurs" },
              { icon: <PlaneTakeoff size={20} className="text-[#113356]" />, title: "Itinéraire libre", desc: "Vous choisissez votre route" },
            ].map(({ icon, title, desc }) => (
              <div key={title} className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-[#f5f8ff] border border-[#dce8ff] flex items-center justify-center shrink-0">
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
        <section id="nos-vols" className="py-16 bg-[#f5f5f7]">
          <div className="max-w-[1400px] mx-auto px-4 sm:px-6 xl:px-10">

            <div className="text-center mb-10">
              <p className="text-xs font-bold text-[#F2B705] uppercase tracking-[3px] mb-3">
                Au départ de Charleroi (EBCI)
              </p>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-foreground">
                Choisissez votre expérience
              </h2>
              <div className="w-10 h-0.5 bg-[#F2B705] mx-auto mt-4 mb-3 rounded-full" />
              <p className="text-muted-foreground text-sm mt-0 max-w-md mx-auto">
                Du vol découverte à l&apos;aventure prolongée : sélectionnez la durée qui vous convient.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
              {(packs ?? []).map((pack) => (
                <PackCard key={pack.id} pack={pack} />
              ))}
            </div>

            <div className="mt-12 text-center">
              <p className="text-sm text-muted-foreground">
                Vous avez un itinéraire précis en tête ?{" "}
                <Link href="/vol-sur-mesure" className="text-[#113356] font-semibold hover:underline">
                  Créez un vol entièrement sur mesure →
                </Link>
              </p>
            </div>

          </div>
        </section>
      )}

      {/* ═══ VOL SUR MESURE ═══ */}
      <section id="vol-sur-mesure" className="bg-[#0b2238] pt-20 pb-0 overflow-hidden relative">

        {/* Fond décoratif */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-[#F2B705]/5 rounded-full -translate-y-1/2 translate-x-1/4" />
          <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-[#113356]/60 rounded-full translate-y-1/2 -translate-x-1/4" />
        </div>

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6">

          {/* Label section */}
          <div className="mb-6">
            <p className="text-xs font-bold text-[#F2B705] uppercase tracking-[3px]">Vol sur mesure</p>
          </div>

          <div className="grid lg:grid-cols-2 gap-12 items-center pb-12">

            {/* Texte gauche */}
            <div>
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
                    title: "Romain valide votre route sous 24 h",
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

              {/* CTA */}
              <div className="flex flex-col sm:flex-row gap-3">
                <Link
                  href="/vol-sur-mesure"
                  className="inline-flex items-center justify-center gap-2.5 px-6 py-3.5 bg-[#F2B705] text-[#113356] rounded-xl text-sm font-black hover:bg-[#e6a800] transition-colors shadow-lg shadow-[#F2B705]/20"
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
            <div className="hidden lg:flex flex-col">
              <div className="rounded-2xl overflow-hidden border border-white/12 shadow-[0_24px_64px_rgba(0,0,0,0.55)]">
                <Image
                  src="/vol-sur-mesure.png"
                  alt="Aperçu de l'outil de planification vol sur mesure"
                  width={900}
                  height={600}
                  className="w-full h-auto"
                />
              </div>
              <p className="text-center text-white/15 text-[9px] mt-2.5">Aperçu de l&apos;outil de planification</p>
            </div>

          </div>
        </div>

      </section>

      {/* ═══ VOTRE PILOTE ═══ */}
      <PilotCard />


      {/* ═══ AVIS CLIENTS ═══ */}
      <section className="bg-white py-16 sm:py-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">

          <div className="text-center mb-14">
            <p className="text-[#F2B705] text-[10px] font-bold tracking-[3px] uppercase mb-3">
              Ils ont volé avec Fly Horizons
            </p>
            <h2 className="text-[#0b2238] text-3xl sm:text-4xl font-extrabold">
              Ce qu&apos;ils en disent
            </h2>
            <div className="w-10 h-0.5 bg-[#F2B705] mx-auto mt-4 rounded-full" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-12">
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
              <div key={name} className="flex flex-col gap-4">

                {/* Guillemet décoratif */}
                <span className="text-[#F2B705] text-7xl font-black leading-none select-none -mb-2">&ldquo;</span>

                {/* Texte */}
                <p className="text-foreground/65 text-sm leading-relaxed flex-1">
                  {text}
                </p>

                {/* Auteur */}
                <div className="pt-5 border-t border-border">
                  <p className="text-[#0b2238] font-bold text-sm">{name}</p>
                  <p className="text-[#F2B705] text-xs font-semibold tracking-wide mt-0.5">{location}</p>
                </div>

              </div>
            ))}
          </div>


        </div>
      </section>

    </main>
  );
}
