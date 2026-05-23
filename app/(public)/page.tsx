import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { ChevronDown, Gift, Route, Lock, Mail, Package, BadgeCheck, Clock, MapPin, Users, Sparkles, PlaneTakeoff } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { FeaturedProducts } from "@/components/shop/FeaturedProducts";
import { PackCard } from "@/components/shop/PackCard";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://fly-horizons.com";

export const metadata: Metadata = {
  title: {
    absolute: "Fly Horizons — Baptême de l'air en Belgique | Vols privés depuis Charleroi",
  },
  description:
    "Offrez ou vivez un baptême de l'air inoubliable en avion léger au départ de Charleroi (Belgique). Vols de 30 à 120 min, itinéraire libre, jusqu'à 3 passagers. Pilote CPL licencié.",
  alternates: { canonical: siteUrl },
  openGraph: {
    title: "Fly Horizons — Baptême de l'air en Belgique | Vols privés depuis Charleroi",
    description:
      "Offrez ou vivez un baptême de l'air inoubliable en avion léger au départ de Charleroi (Belgique). Vols de 30 à 120 min, itinéraire libre.",
    url: siteUrl,
    images: [{ url: `${siteUrl}/piste.jpg`, width: 1200, height: 630, alt: "Fly Horizons — Baptême de l'air en Belgique" }],
  },
};

const localBusinessSchema = {
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  name: "Fly Horizons",
  description:
    "Baptêmes de l'air et vols privés en avion léger depuis l'aéroport de Charleroi (EBCI), Belgique. Itinéraire 100 % libre, pilote CPL licencié, jusqu'à 3 passagers.",
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

export default async function HomePage() {
  const supabase = await createClient();

  const [{ data: packs }, { data: products }] = await Promise.all([
    supabase
      .from("products")
      .select("*, images:product_images(*)")
      .eq("active", true)
      .eq("product_type", "voucher")
      .order("voucher_duration_minutes", { ascending: true }),
    supabase
      .from("products")
      .select("*, images:product_images(*)")
      .eq("active", true)
      .eq("featured", true)
      .eq("product_type", "physical")
      .order("created_at", { ascending: false })
      .limit(4),
  ]);

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
          preload="auto"
          poster="/piste.jpg"
          className="absolute inset-0 w-full h-full object-cover"
        >
          {/* MP4 en premier — seul format supporté par Safari */}
          <source src="/vol-rev.mp4" type="video/mp4" />
          <source src="/vol-rev%202.2.webm" type="video/webm" />
        </video>
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/35 to-black/65" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/40 via-transparent to-transparent" />

        <div className="relative z-10 flex flex-col items-center justify-center h-full text-center px-4 pb-16 pt-[48px] md:pt-[76px]">
          <div className="inline-flex items-center gap-2 bg-[#F2B705] rounded-full px-5 py-2 mb-8 shadow-[0_4px_20px_rgba(242,183,5,.4)]">
            <PlaneTakeoff size={13} className="text-[#113356]" />
            <span className="text-[#113356] text-xs font-bold tracking-[2.5px] uppercase">
              Vols privés en avion léger
            </span>
          </div>

          <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-[80px] font-extrabold text-white leading-[1.0] tracking-tight mb-6 drop-shadow-lg">
            Survolez le monde<br />
            <span className="text-[#F2B705]">à votre façon.</span>
          </h1>

          <p className="text-white/75 text-base sm:text-lg md:text-xl leading-relaxed max-w-xl mb-10 font-light">
            Admirez ce que vous voulez depuis le ciel,<br className="hidden sm:block" />
            exactement comme vous l&apos;avez rêvé.
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
            <p className="text-[10px] italic text-white/35">valable une seule fois par compte.</p>
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
              { icon: <Mail size={20} className="text-[#113356]" />, title: "Code par email", desc: "Voucher envoyé instantanément" },
              { icon: <Package size={20} className="text-[#113356]" />, title: "Livraison Belgique", desc: "Accessoires livrés partout" },
              { icon: <BadgeCheck size={20} className="text-[#113356]" />, title: "Pilote licencié CPL", desc: "Sécurité & professionnalisme" },
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
      <section id="vol-sur-mesure" className="bg-[#0b2238] py-20 overflow-hidden">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">

            {/* Texte */}
            <div>
              <span className="inline-flex items-center gap-2 text-[#F2B705] text-xs font-bold tracking-[3px] uppercase mb-5">
                <Sparkles size={11} className="fill-[#F2B705]" /> Exclusivité Fly Horizons
              </span>
              <h2 className="text-4xl sm:text-5xl font-extrabold text-white leading-tight mb-5">
                Votre itinéraire,<br />
                <span className="text-[#F2B705]">tracé par vous.</span>
              </h2>
              <p className="text-white/60 text-base leading-relaxed mb-8 max-w-md">
                Placez vos points sur la carte et l&apos;algorithme calcule votre route optimale en temps réel au départ de Charleroi.
              </p>

              <div className="space-y-5 mb-10">
                {[
                  {
                    n: "01",
                    title: "Tracez votre route",
                    desc: "Cliquez sur la carte pour ajouter des étapes. Namur, Bruxelles, la côte, les Ardennes…",
                  },
                  {
                    n: "02",
                    title: "Visualisez votre vol en direct",
                    desc: "L'algorithme optimise le parcours et calcule la durée instantanément.",
                  },
                  {
                    n: "03",
                    title: "Recevez votre confirmation",
                    desc: "Un email récapitulatif avec tous les détails de votre vol vous est envoyé.",
                  },
                ].map(({ n, title, desc }) => (
                  <div key={n} className="flex gap-4">
                    <div className="w-9 h-9 rounded-full bg-[#F2B705]/15 border border-[#F2B705]/30 flex items-center justify-center shrink-0 text-[#F2B705] text-xs font-black">
                      {n}
                    </div>
                    <div>
                      <p className="text-white font-semibold text-sm">{title}</p>
                      <p className="text-white/50 text-sm mt-0.5">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              <Link
                href="/vol-sur-mesure"
                className="inline-flex items-center gap-2 px-7 py-3.5 bg-[#F2B705] text-[#113356] rounded-xl font-bold text-sm hover:bg-[#e6a800] transition-all shadow-[0_6px_24px_rgba(242,183,5,.25)] hover:-translate-y-0.5"
              >
                <Route size={16} />
                Créer mon vol sur mesure
              </Link>
            </div>

            {/* Illustration carte */}
            <div className="hidden lg:flex items-center justify-center">
              <div className="relative w-full max-w-[420px]">
                <div className="bg-[#0d2d47] border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
                  <div className="absolute top-4 right-4 bg-[#F2B705] text-[#113356] text-[10px] font-black px-2.5 py-1 rounded-full z-10">
                    LIVE
                  </div>
                  <div className="p-4 pb-0">
                    <svg viewBox="0 0 420 240" xmlns="http://www.w3.org/2000/svg" className="w-full rounded-xl overflow-hidden">
                      <rect width="420" height="240" fill="#1a3f5c" rx="10"/>
                      <line x1="0" y1="80" x2="420" y2="80" stroke="#ffffff08" strokeWidth="1"/>
                      <line x1="0" y1="160" x2="420" y2="160" stroke="#ffffff08" strokeWidth="1"/>
                      <line x1="140" y1="0" x2="140" y2="240" stroke="#ffffff08" strokeWidth="1"/>
                      <line x1="280" y1="0" x2="280" y2="240" stroke="#ffffff08" strokeWidth="1"/>
                      <polyline points="210,120 100,75 65,155 175,200 310,170 360,85 210,120"
                        stroke="#F2B705" strokeWidth="2.5" fill="none" strokeDasharray="9,5" strokeLinecap="round" opacity="0.9"/>
                      <circle cx="210" cy="120" r="12" fill="#113356" stroke="#F2B705" strokeWidth="2.5"/>
                      <text x="210" y="125" textAnchor="middle" fontSize="10" fill="#F2B705" fontFamily="sans-serif">✈</text>
                      {([
                        [100, 75], [65, 155], [175, 200], [310, 170], [360, 85]
                      ] as [number, number][]).map(([cx, cy], i) => (
                        <g key={i}>
                          <circle cx={cx} cy={cy} r="9" fill="#F2B705" stroke="white" strokeWidth="1.5"/>
                          <text x={cx} y={cy + 4} textAnchor="middle" fontSize="8" fill="#113356" fontFamily="sans-serif" fontWeight="bold">{i + 1}</text>
                        </g>
                      ))}
                    </svg>
                  </div>
                  <div className="flex divide-x divide-white/10 border-t border-white/10">
                    {[
                      { label: "Distance", value: "312 km" },
                      { label: "Durée", value: "~101 min" },
                      { label: "Étapes", value: "5 points" },
                    ].map(({ label, value }) => (
                      <div key={label} className="flex-1 px-4 py-3 text-center">
                        <p className="text-[10px] text-white/40 uppercase tracking-wider">{label}</p>
                        <p className="text-sm font-bold text-white mt-0.5">{value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ═══ COLLECTION FLY HORIZONS ═══ */}
      {(products ?? []).length > 0 && (
        <div id="collection">
          <FeaturedProducts products={products ?? []} />
        </div>
      )}

    </main>
  );
}
