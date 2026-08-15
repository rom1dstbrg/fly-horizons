import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { CalendarCheck, Map, Headphones, PlaneTakeoff, AlertCircle, Lock } from "lucide-react";
import { AnnonceBookingForm } from "@/components/vols/AnnonceBookingForm";
import { AnnonceCard } from "@/components/vols/AnnonceCard";
import { AnnonceStickyBar } from "@/components/vols/AnnonceStickyBar";
import { BackLink } from "@/components/shop/BackLink";
import { VolImageGallery } from "@/components/shop/VolImageGallery";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://fly-horizons.com";
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;

function toPublicUrl(path: string) {
  return `${SUPABASE_URL}/storage/v1/object/public/annonces/${path}`;
}

// Même structure que app/(public)/vols/[slug]/page.tsx (page produit des packs
// classiques), copie neutralisée : ce n'est pas toujours Romain qui pilote ici.
const STEPS = [
  {
    num: "01",
    icon: <CalendarCheck size={22} />,
    title: "Faites votre demande",
    desc: "Choisissez votre créneau et envoyez votre demande. La confirmation et votre bon de vol arrivent par email dès validation par le pilote.",
  },
  {
    num: "02",
    icon: <Map size={22} />,
    title: "Le pilote confirme et trace la route",
    desc: "Votre pilote vous contacte pour valider le créneau et composer l'itinéraire ensemble. La route s'adapte à vos envies et à la météo du jour.",
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
    supabase.from("annonces_pilote").select("*, pilotes(nom)").eq("id", id).single(),
    supabase
      .from("annonces_pilote")
      .select("id, duree, places, prix_total, part_pilote, images, pilotes(nom)")
      .eq("statut", "publiee")
      .neq("id", id)
      .order("created_at", { ascending: false })
      .limit(6),
  ]);

  if (!annonce || annonce.statut !== "publiee") notFound();

  const pilote = annonce.pilotes as unknown as { nom: string };
  const prixClient = Math.round((annonce.prix_total - annonce.part_pilote) * 100) / 100;
  const galleryImages = (annonce.images ?? []).map((path: string, i: number) => ({ url: toPublicUrl(path), position: i }));

  const autres = (autresRaw ?? []).map(a => ({
    id: a.id,
    duree: a.duree,
    places: a.places,
    prix_client: Math.round((a.prix_total - a.part_pilote) * 100) / 100,
    pilote_nom: (a.pilotes as unknown as { nom: string } | null)?.nom ?? "un pilote",
    cover_image: a.images?.[0] ?? null,
  }));

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

  return (
    <main className="bg-gradient-navy">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(productSchema) }} />

      {/* ══════ SPLIT — galerie gauche / info droite ══════ */}
      <div className="pt-[98px] bg-gradient-navy">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 xl:px-10 pt-2 sm:pt-12 pb-20">

          <BackLink />

          <div className="grid md:grid-cols-[1fr_380px] lg:grid-cols-[1fr_400px] gap-10 lg:gap-14 items-start">

            {/* ── Gauche : galerie ── */}
            <div>
              <VolImageGallery images={galleryImages} title={`Vol partagé avec ${pilote.nom}`} duree={annonce.duree} />
            </div>

            {/* ── Droite : info + CTA (sticky) ── */}
            <div className="md:sticky md:top-28 space-y-6">

              <div>
                <p className="text-xs font-bold text-primary uppercase tracking-[3px] mb-3">
                  {annonce.duree} min · Vol en avion léger
                </p>
                <h1 className="text-4xl sm:text-5xl font-black text-foreground leading-none tracking-tight">
                  Vol partagé avec {pilote.nom}
                </h1>
                {annonce.description && (
                  <p className="text-foreground/55 text-sm leading-relaxed mt-3">
                    {annonce.description}
                  </p>
                )}
              </div>

              <div id="vol-cta" className="space-y-5">
                <div className="pb-5 border-b border-border">
                  <p className="text-[10px] font-bold text-primary uppercase tracking-[2px] mb-2">Participation aux frais</p>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-[44px] font-black text-foreground leading-none">{prixClient}&nbsp;€</span>
                    <span className="text-muted-foreground text-sm">/ avion</span>
                  </div>
                </div>

                <AnnonceBookingForm annonceId={annonce.id} places={annonce.places} />

                <div className="space-y-1.5">
                  <p className="text-xs text-foreground/70 flex items-start gap-1.5 leading-relaxed">
                    <AlertCircle size={12} className="shrink-0 mt-0.5 text-primary" />
                    Créneau souhaité, pas garanti : le pilote confirme votre demande sous peu.
                  </p>
                  <p className="text-[10px] text-muted-foreground leading-relaxed">
                    Aucun paiement n&apos;est demandé avant confirmation par le pilote.
                  </p>
                  <p className="text-[10px] text-[#0b2238]/40 flex items-start gap-1.5 leading-relaxed">
                    <Lock size={9} className="shrink-0 mt-0.5" />
                    <span>Demande jusqu&apos;à <strong className="text-foreground/60">48 h avant le vol</strong>.</span>
                  </p>
                </div>

                <div className="p-4 bg-primary/10 border border-primary/30 rounded-lg">
                  <p className="text-[10px] font-bold text-foreground uppercase tracking-[2px] mb-1">
                    Vol en partage de coûts · NCO.GEN.104
                  </p>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Fly Horizons n&apos;est pas un service de transport aérien commercial. {pilote.nom} partage un vol qu&apos;il organise déjà : votre participation couvre une quote-part des frais réels (avion, carburant, taxes d&apos;aérodrome), sans marge commerciale.
                  </p>
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>

      {/* ══════ COMMENT ÇA SE PASSE ══════ */}
      <div className="bg-[#f5f5f7] py-20 sm:py-28 overflow-hidden">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 xl:px-10">
          <p className="text-xs font-bold text-primary uppercase tracking-[3px] mb-4">Déroulement</p>
          <h2 className="text-4xl sm:text-5xl font-black text-foreground leading-none tracking-tight mb-16">
            Comment ça se passe
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-12 lg:gap-8">
            {STEPS.map(({ num, icon, title, desc }) => (
              <div key={num} className="relative flex flex-col gap-5">
                <span className="absolute -top-3 right-0 text-[96px] font-black leading-none select-none pointer-events-none tabular-nums text-foreground/[0.06]">
                  {num}
                </span>
                <div className="relative z-10 w-14 h-14 rounded-2xl bg-primary flex items-center justify-center text-[#0b2238] shadow-[0_6px_24px_rgba(242,183,5,0.35)]">
                  {icon}
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-extrabold text-primary/70 uppercase tracking-[2.5px]">Étape {num}</span>
                  <p className="text-foreground font-black text-[17px] leading-snug">{title}</p>
                  <p className="text-foreground/60 text-sm leading-relaxed mt-1">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ══════ AUTRES VOLS DISPONIBLES ══════ */}
      {autres.length > 0 && (
        <div className="bg-gradient-navy py-20 sm:py-28">
          <div className="max-w-[1400px] mx-auto px-4 sm:px-6 xl:px-10">
            <p className="text-xs font-bold text-primary uppercase tracking-[3px] mb-4">Autres vols disponibles</p>
            <h2 className="text-4xl sm:text-5xl font-black text-foreground leading-none tracking-tight mb-10">
              Voir d&apos;autres offres
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {autres.map((a) => (
                <AnnonceCard key={a.id} annonce={a} />
              ))}
            </div>
          </div>
        </div>
      )}

      <AnnonceStickyBar piloteName={pilote.nom} prix={prixClient} />
    </main>
  );
}
