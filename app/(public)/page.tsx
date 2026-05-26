import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { ChevronDown, Gift, Route, Lock, BadgeCheck, Clock, PlaneTakeoff, Zap, ArrowRight, MousePointerClick } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { PackCard } from "@/components/shop/PackCard";
import PilotCard from "@/components/shop/PilotCard";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://fly-horizons.com";

export const metadata: Metadata = {
  title: {
    absolute: "Fly Horizons — Baptême de l'air en Belgique | Vols en avion léger depuis Charleroi",
  },
  description:
    "Offrez ou vivez un baptême de l'air inoubliable en avion léger au départ de Charleroi (Belgique). Vols de 30 à 120 min, itinéraire libre, jusqu'à 3 passagers.",
  alternates: { canonical: siteUrl },
  openGraph: {
    title: "Fly Horizons — Baptême de l'air en Belgique | Vols en avion léger depuis Charleroi",
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
          preload="auto"
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
            Baptême de l&apos;air en avion léger depuis Charleroi —<br className="hidden sm:block" />
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
              { icon: <BadgeCheck size={20} className="text-[#113356]" />, title: "Passagers assurés", desc: "Couverture Air Academy New CAG" },
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

              {/* Features horizontales */}
              <div className="space-y-2.5 mb-8">
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
                  <div key={title} className="flex items-start gap-3.5 bg-white/6 border border-white/10 rounded-xl px-4 py-3.5">
                    <div className="w-8 h-8 rounded-xl bg-[#F2B705]/15 border border-[#F2B705]/25 flex items-center justify-center text-[#F2B705] shrink-0 mt-0.5">
                      {icon}
                    </div>
                    <div>
                      <p className="text-white text-xs font-semibold leading-snug">{title}</p>
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

            {/* Visuel droite — aperçu devis interactif */}
            <div className="hidden lg:flex flex-col gap-3">

              {/* Carte principale */}
              <div className="bg-white/5 border border-white/10 rounded-2xl p-4">

                {/* En-tête carte */}
                <div className="flex items-center justify-between mb-3">
                  <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest">Aperçu de route</p>
                  <div className="flex items-center gap-1.5 bg-black/40 border border-white/10 rounded-full px-2 py-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                    <span className="text-white/60 text-[9px] font-bold tracking-wider">EN DIRECT</span>
                  </div>
                </div>

                {/* Miniature carte */}
                <div className="relative rounded-xl overflow-hidden mb-4" style={{ height: 190 }}>
                  <div className="absolute inset-0 bg-gradient-to-br from-[#0d3a6e] via-[#0b2238] to-[#061624]" />
                  <svg className="absolute inset-0 w-full h-full opacity-10" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                      <pattern id="grid-vsm" width="40" height="40" patternUnits="userSpaceOnUse">
                        <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#F2B705" strokeWidth="0.5"/>
                      </pattern>
                    </defs>
                    <rect width="100%" height="100%" fill="url(#grid-vsm)" />
                  </svg>
                  <svg className="absolute inset-0 w-full h-full" viewBox="0 0 380 190" xmlns="http://www.w3.org/2000/svg">
                    <path d="M 62,150 L 138,46 L 286,74 L 264,146 Z" fill="none" stroke="#F2B705" strokeWidth="4" strokeLinejoin="round" opacity="0.12" strokeLinecap="round"/>
                    <path d="M 62,150 L 138,46 L 286,74 L 264,146 Z" fill="none" stroke="#F2B705" strokeWidth="1.5" strokeDasharray="8 4" strokeLinejoin="round" opacity="0.9" strokeLinecap="round"/>
                    <polygon points="0,-3 6,0 0,3" fill="#F2B705" opacity="0.7" transform="translate(102,96) rotate(-65)"/>
                    <polygon points="0,-3 6,0 0,3" fill="#F2B705" opacity="0.7" transform="translate(218,59) rotate(8)"/>
                    <polygon points="0,-3 6,0 0,3" fill="#F2B705" opacity="0.7" transform="translate(274,116) rotate(97)"/>
                    <polygon points="0,-3 6,0 0,3" fill="#F2B705" opacity="0.7" transform="translate(148,153) rotate(192)"/>
                    <circle cx="138" cy="46" r="8" fill="#F2B705"/>
                    <text x="138" y="50" textAnchor="middle" fill="#113356" fontSize="7.5" fontWeight="800">1</text>
                    <rect x="149" y="39" width="42" height="12" rx="2.5" fill="#0b2238" opacity="0.92"/>
                    <text x="170" y="48.5" textAnchor="middle" fill="#F2B705" fontSize="7" fontWeight="700">Namur</text>
                    <circle cx="286" cy="74" r="8" fill="#F2B705"/>
                    <text x="286" y="78" textAnchor="middle" fill="#113356" fontSize="7.5" fontWeight="800">2</text>
                    <rect x="297" y="67" width="54" height="12" rx="2.5" fill="#0b2238" opacity="0.92"/>
                    <text x="324" y="76.5" textAnchor="middle" fill="#F2B705" fontSize="7" fontWeight="700">Bruxelles</text>
                    <circle cx="264" cy="146" r="8" fill="#F2B705"/>
                    <text x="264" y="150" textAnchor="middle" fill="#113356" fontSize="7.5" fontWeight="800">3</text>
                    <rect x="275" y="139" width="36" height="12" rx="2.5" fill="#0b2238" opacity="0.92"/>
                    <text x="293" y="148.5" textAnchor="middle" fill="#F2B705" fontSize="7" fontWeight="700">Wavre</text>
                    <circle cx="62" cy="150" r="11" fill="#113356" stroke="#F2B705" strokeWidth="2.5"/>
                    <text x="62" y="154" textAnchor="middle" fill="#F2B705" fontSize="9">✈</text>
                    <rect x="76" y="142" width="80" height="12" rx="2.5" fill="#0b2238" opacity="0.92"/>
                    <text x="116" y="151.5" textAnchor="middle" fill="#F2B705" fontSize="7" fontWeight="700">CRL · Charleroi</text>
                  </svg>
                </div>

                {/* Tableau de segments */}
                <div className="space-y-1.5 mb-3">
                  {[
                    { label: "CRL → Namur", km: "86 km", dur: "28 min" },
                    { label: "+ Bruxelles", km: "98 km", dur: "+32 min" },
                    { label: "+ Wavre → CRL", km: "45 km", dur: "+34 min" },
                  ].map(({ label, km, dur }) => (
                    <div key={label} className="flex items-center justify-between py-1 border-b border-white/8 last:border-0">
                      <div className="flex items-center gap-2">
                        <span className="w-1 h-1 rounded-full bg-[#F2B705]/50 shrink-0" />
                        <span className="text-white/50 text-[10.5px]">{label}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-white/30 text-[9.5px]">{km}</span>
                        <span className="text-white/45 text-[10.5px] font-medium w-14 text-right">{dur}</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Total */}
                <div className="flex items-center justify-between pt-2 border-t border-white/12">
                  <div>
                    <p className="text-white/35 text-[10px] leading-tight">229 km au total</p>
                    <p className="text-white/35 text-[10px] leading-tight">3 passagers</p>
                  </div>
                  <div className="flex items-center gap-1.5 bg-[#F2B705]/10 border border-[#F2B705]/20 rounded-lg px-2.5 py-1.5">
                    <Zap size={10} className="text-[#F2B705]" />
                    <span className="text-[#F2B705] text-[10px] font-bold">~94 min calculées</span>
                  </div>
                </div>

              </div>

              <p className="text-center text-white/20 text-[9px]">Aperçu illustratif — les valeurs sont calculées sur votre vraie route</p>
            </div>

          </div>
        </div>

      </section>

      {/* ═══ VOTRE PILOTE ═══ */}
      <PilotCard />

      {/* ═══ GALERIE ═══ */}
      <section className="bg-[#f5f8ff] py-10 border-t border-[#dce8ff] overflow-hidden">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">

          {/* Titre inline compact */}
          <div className="flex items-center gap-5 mb-5">
            <div className="shrink-0">
              <p className="text-[#F2B705] text-[10px] font-bold tracking-[3px] uppercase leading-none mb-1">En images</p>
              <h2 className="text-[#0b2238] text-lg font-extrabold leading-tight">L&apos;expérience Fly Horizons</h2>
            </div>
            <div className="flex-1 h-px bg-[#dce8ff]" />
          </div>

          {/* Strip horizontal — hauteur fixe, scroll sur mobile */}
          <div className="flex gap-3 overflow-x-auto pb-1 -mr-4 pr-4 sm:-mr-6 sm:pr-6">
            {[
              { src: "/gallery/1.png",  alt: "Vol au-dessus de la Belgique" },
              { src: "/gallery/2.png",  alt: "Cockpit DA40 — vue panoramique" },
              { src: "/gallery/3.png",  alt: "Paysage vu du ciel" },
              { src: "/gallery/7.png",  alt: "Horizon depuis le cockpit" },
              { src: "/gallery/9.png",  alt: "Vol au coucher du soleil" },
              { src: "/gallery/10.jpg", alt: "À bord du DA40" },
            ].map(({ src, alt }) => (
              <div key={src} className="relative h-48 w-72 shrink-0 rounded-2xl overflow-hidden group">
                <Image
                  src={src}
                  alt={alt}
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                  sizes="288px"
                />
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* ═══ AVIS CLIENTS ═══ */}
      <section className="bg-white py-16 sm:py-20 border-t border-border">
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

          {/* Placeholder note */}
          <p className="mt-12 text-center text-muted-foreground/30 text-xs">
            Témoignages recueillis après les vols — à remplacer par les vrais avis dès qu&apos;ils sont disponibles.
          </p>

        </div>
      </section>

    </main>
  );
}
