import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ChatWidget } from "@/components/chat/ChatWidget";
import { PackCard } from "@/components/shop/PackCard";
import { AnnonceCard } from "@/components/vols/AnnonceCard";
import { NoFlightsNotice } from "@/components/shop/NoFlightsNotice";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://fly-horizons.com";

export const metadata = {
  title: "Vol partagé en Belgique · Vols 30 à 120 min",
  description:
    "Vols partagés en avion léger depuis Charleroi, vols de 30 à 120 min. Itinéraire libre, jusqu'à 3 passagers. Réservez votre vol en Belgique.",
  alternates: { canonical: `${siteUrl}/nos-offres` },
  openGraph: {
    title: "Vol partagé en Belgique · Vols 30 à 120 min · Fly Horizons",
    description:
      "Vols partagés en avion léger depuis Charleroi, vols de 30 à 120 min. Itinéraire libre, jusqu'à 3 passagers.",
    url: `${siteUrl}/nos-offres`,
    images: [{ url: `${siteUrl}/da-40.webp`, width: 1600, height: 1068, alt: "Vol partagé, Fly Horizons Charleroi" }],
  },
};

// Nouvelle DA (28/09) : même vocabulaire que l'accueil (cards AnnonceCard/PackCard
// inchangées, écart header .pt-page, eyebrow + h1 34/52) mais composition propre à
// cette page — voir feedback_page_composition_distincte. Différence avec la
// section « Les prochains vols » de l'accueil : ici on affiche TOUT le catalogue
// disponible (pas de limite à 4, pas de lien "Tous les vols" puisqu'on y est déjà),
// en plusieurs groupes selon ce qui est publié (durée fixe / itinéraires / places).

const EYEBROW = "text-[11px] font-bold text-primary uppercase tracking-[3px] mb-3";
const GROUP_TITLE = "text-[22px] lg:text-[28px] font-black text-foreground leading-[1.1] tracking-[-0.01em]";
const GRID = "grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4";

function Group({ eyebrow, title, children }: { eyebrow: string; title: string; children: React.ReactNode }) {
  return (
    <section className="mt-12 lg:mt-16 pt-10 lg:pt-12 border-t border-border first:mt-0 first:pt-0 first:border-t-0">
      <p className={EYEBROW}>{eyebrow}</p>
      <h2 className={GROUP_TITLE}>{title}</h2>
      <div className={`${GRID} mt-6`}>{children}</div>
    </section>
  );
}

export default async function NosOffresPage() {
  const supabase = await createClient();

  // Chantier "tout passe par l'espace pilote" (2026-09-13, à terme) : décision de
  // dérivage prévue derrière ce flag, le temps que Romain republie son catalogue
  // réel en annonces avant qu'on bascule l'affichage public. Tant que la clé est
  // absente/≠ "annonces" en base, rien ne change (comportement products/Stripe
  // actuel). Voir projet.html § Décisions.
  const { data: sourceSetting } = await supabase
    .from("crm_settings")
    .select("value")
    .eq("key", "catalogue_source")
    .maybeSingle();
  const catalogueSource = sourceSetting?.value === "annonces" ? "annonces" : "products";

  const { data: packs } = await supabase
    .from("products")
    .select("*, images:product_images(*)")
    .eq("active", true)
    .eq("product_type", "voucher")
    .or("quantity_available.is.null,quantity_available.gt.0")
    .order("voucher_duration_minutes", { ascending: true });

  const packsFixes = (packs ?? []).filter(p => !p.route_waypoints?.length);
  const packsItineraire = (packs ?? []).filter(p => !!p.route_waypoints?.length);

  // annonces_pilote et pilotes sont verrouillées à service_role côté RLS (données
  // sensibles : IBAN, email pilote) — lecture via le client admin, filtrée
  // explicitement ici à statut='publiee' pour ne montrer que les vols disponibles.
  const adminSupabase = createAdminClient();
  const { data: rawAnnonces } = await adminSupabase
    .from("annonces_pilote")
    .select("id, titre, duree, places, prix_total, part_pilote, mode_vente, images, route_waypoints, pilotes(nom)")
    .eq("statut", "publiee")
    .order("created_at", { ascending: false });

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
      has_route: !!a.route_waypoints?.length,
    };
  });
  const annoncesFixes = annonces.filter(a => !a.has_route);
  const annoncesItineraire = annonces.filter(a => a.has_route);

  const nothingAtAll = catalogueSource === "annonces"
    ? annonces.length === 0
    : packsFixes.length === 0 && packsItineraire.length === 0 && annonces.length === 0;

  return (
    <main className="bg-white">
      <section className="pt-page pb-24 sm:pb-20">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 xl:px-10">

          {/* En-tête aligné sur les pages refaites (galerie, contact…) */}
          <div className="mb-10 lg:mb-14 max-w-[620px]">
            <p className={EYEBROW}>Au départ de Charleroi</p>
            <h1 className="text-[34px] lg:text-[52px] font-black text-foreground leading-[1.03] tracking-[-0.02em]">
              Tous les vols disponibles.
            </h1>
            <p className="mt-3 text-[15px] leading-[1.7] text-foreground/70">
              Vols partagés en avion léger, de 30 à 120 minutes. Vous ne payez que votre part des frais,
              jusqu&apos;à 3 passagers.
            </p>
          </div>

          {nothingAtAll ? (
            <NoFlightsNotice />
          ) : catalogueSource === "annonces" ? (
            <>
              {annoncesFixes.length > 0 && (
                <div className={GRID}>
                  {annoncesFixes.map((a) => <AnnonceCard key={a.id} annonce={a} />)}
                </div>
              )}
              {annoncesItineraire.length > 0 && (
                <Group eyebrow="Routes préparées par votre pilote" title="Itinéraires sélectionnés">
                  {annoncesItineraire.map((a) => <AnnonceCard key={a.id} annonce={a} />)}
                </Group>
              )}
            </>
          ) : (
            <>
              {packsFixes.length > 0 && (
                <div className={GRID}>
                  {packsFixes.map((pack) => <PackCard key={pack.id} pack={pack} />)}
                </div>
              )}
              {packsItineraire.length > 0 && (
                <Group eyebrow="Routes préparées par votre pilote" title="Itinéraires sélectionnés">
                  {packsItineraire.map((pack) => <PackCard key={pack.id} pack={pack} />)}
                </Group>
              )}
              {annonces.length > 0 && (
                <Group eyebrow="Places disponibles" title="Vols proposés par nos pilotes">
                  {annonces.map((a) => <AnnonceCard key={a.id} annonce={a} />)}
                </Group>
              )}
            </>
          )}

        </div>
      </section>

      <ChatWidget />
    </main>
  );
}
