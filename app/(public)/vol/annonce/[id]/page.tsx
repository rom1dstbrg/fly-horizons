import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { Clock, Users, MapPin } from "lucide-react";
import { AnnonceBookingForm } from "@/components/vols/AnnonceBookingForm";
import { BackLink } from "@/components/shop/BackLink";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://fly-horizons.com";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("annonces_pilote")
    .select("date_vol, heure_vol, duree, pilotes(nom)")
    .eq("id", id)
    .eq("statut", "publiee")
    .maybeSingle();
  if (!data) return {};
  const pilote = data.pilotes as unknown as { nom: string } | null;
  const dateStr = new Date(data.date_vol + "T12:00:00Z").toLocaleDateString("fr-BE", {
    day: "numeric", month: "long", year: "numeric",
  });
  const title = `Vol partagé avec ${pilote?.nom ?? "un pilote"} · ${dateStr}`;
  return {
    title,
    description: `Vol partagé de ${data.duree} min avec ${pilote?.nom ?? "un pilote"} Fly Horizons, le ${dateStr} à ${data.heure_vol.slice(0, 5)}, au départ de Charleroi (EBCI).`,
    alternates: { canonical: `${siteUrl}/vol/annonce/${id}` },
  };
}

export default async function AnnonceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = createAdminClient();

  const { data: annonce } = await supabase
    .from("annonces_pilote")
    .select("*, pilotes(nom)")
    .eq("id", id)
    .single();

  if (!annonce || annonce.statut !== "publiee") notFound();

  const pilote = annonce.pilotes as unknown as { nom: string };
  const prixClient = Math.round((annonce.prix_total - annonce.part_pilote) * 100) / 100;
  const dateStr = new Date(annonce.date_vol + "T12:00:00Z").toLocaleDateString("fr-BE", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });

  return (
    <main className="bg-[#f5f5f7] min-h-screen pt-[98px] pb-16">
      <div className="max-w-2xl mx-auto px-4 sm:px-6">
        <BackLink />

        <div className="card-premium p-6 sm:p-8 mt-4">
          <p className="text-xs font-bold text-[#F2B705] uppercase tracking-[3px] mb-2">
            Vol partagé · {pilote.nom}
          </p>
          <h1 className="text-3xl sm:text-4xl font-black text-foreground leading-tight mb-6 capitalize">
            {dateStr}
          </h1>

          <div className="flex flex-wrap gap-4 mb-6 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Clock size={14} /> {annonce.heure_vol.slice(0, 5)} · {annonce.duree} min
            </span>
            <span className="flex items-center gap-1.5">
              <Users size={14} /> Jusqu&apos;à {annonce.places} passager{annonce.places > 1 ? "s" : ""}
            </span>
            <span className="flex items-center gap-1.5">
              <MapPin size={14} /> Aéroport de Charleroi (EBCI)
            </span>
          </div>

          <div className="flex items-baseline gap-2 mb-8 pb-8 border-b border-border">
            <span className="text-4xl font-black text-foreground">{prixClient} €</span>
            <span className="text-sm text-muted-foreground">pour le vol</span>
          </div>

          <AnnonceBookingForm annonceId={annonce.id} places={annonce.places} />
        </div>
      </div>
    </main>
  );
}
