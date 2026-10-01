import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, ShieldCheck, HeartPulse, FileCheck } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { AnnonceCard } from "@/components/vols/AnnonceCard";
import { ScrollLink } from "@/components/vols/ScrollLink";

// Fiche pilote publique, atteinte par « Voir le profil » (fiche d'un vol, page de paiement, email « Votre pilote »).
// Nouvelle DA (01/10, maquette-pilote.html, variante B) : nom + petite photo ronde en pleine largeur ; bio en grand (7/12)
// | « Ce que nous vérifions » (5/12, filet vertical) ; puis les vols publiés du pilote. Pas d'infos de contact ni de
// données légales : seules les vérifications effectivement faites sont montrées, jamais par défaut.

type PilotePublic = {
  id: string;
  nom: string;
  bio: string | null;
  photo_url: string | null;
  docs_status: string | null;
  conditions_accepted_at: string | null;
};

async function getPilote(id: string): Promise<PilotePublic | null> {
  const { data } = await createAdminClient()
    .from("pilotes")
    .select("id, nom, bio, photo_url, docs_status, conditions_accepted_at")
    .eq("id", id)
    .maybeSingle();
  return (data as PilotePublic | null) ?? null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const pilote = await getPilote(id);
  return {
    title: pilote ? `${pilote.nom} · Pilote Fly Horizons` : "Pilote · Fly Horizons",
    robots: { index: false, follow: false },
  };
}

const EYEBROW = "text-[11px] font-bold text-primary uppercase tracking-[3px] mb-3";
const LINK = "inline-flex items-center gap-1.5 text-sm font-bold text-[#0b2238] underline decoration-[#0b2238]/25 underline-offset-4 hover:decoration-primary transition-colors cursor-pointer";

export default async function PilotePublicPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const pilote = await getPilote(id);
  if (!pilote) notFound();

  const prenom = pilote.nom.trim().split(/\s+/)[0];
  const initiales = pilote.nom.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();

  const bioParas = (pilote.bio ?? "")
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);

  // Seules les vérifications réellement faites : documents validés par Fly Horizons, charte acceptée.
  const docsOk = pilote.docs_status === "verifies";
  const checks = [
    docsOk && { Icon: ShieldCheck, label: "Licence de pilote vérifiée" },
    docsOk && { Icon: HeartPulse, label: "Certificat médical vérifié" },
    pilote.conditions_accepted_at && { Icon: FileCheck, label: "Charte des pilotes acceptée" },
  ].filter(Boolean) as { Icon: typeof ShieldCheck; label: string }[];

  // annonces_pilote est verrouillée à service_role (RLS) : lecture via le client admin, filtrée sur 'publiee'.
  const { data: rawAnnonces } = await createAdminClient()
    .from("annonces_pilote")
    .select("id, titre, duree, places, prix_total, part_pilote, mode_vente, images")
    .eq("pilote_id", pilote.id)
    .eq("statut", "publiee")
    .order("created_at", { ascending: false });

  const annonces = (rawAnnonces ?? []).map((a) => {
    const remainder = Math.round((a.prix_total - a.part_pilote) * 100) / 100;
    const mode: "avion" | "place" = a.mode_vente === "place" ? "place" : "avion";
    return {
      id: a.id,
      titre: a.titre,
      duree: a.duree,
      places: a.places,
      prix_client: mode === "place" ? Math.round((remainder / a.places) * 100) / 100 : remainder,
      pilote_nom: pilote.nom,
      cover_image: a.images?.[0] ?? null,
      mode_vente: mode,
    };
  });

  return (
    <main className="min-h-screen bg-white">
      <section className="pt-page pb-14 lg:pb-20">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 xl:px-10">
          <p className={EYEBROW}>Pilote Fly Horizons</p>

          <div className="flex items-center gap-4 lg:gap-5">
            {pilote.photo_url ? (
              <Image
                src={pilote.photo_url}
                alt={pilote.nom}
                width={96}
                height={96}
                className="h-[72px] w-[72px] lg:h-24 lg:w-24 shrink-0 rounded-full object-cover object-[50%_20%]"
                unoptimized
              />
            ) : (
              <div className="flex h-[72px] w-[72px] lg:h-24 lg:w-24 shrink-0 items-center justify-center rounded-full bg-secondary">
                <span className="text-[22px] lg:text-[28px] font-black text-[#0b2238]/30">{initiales}</span>
              </div>
            )}
            <h1 className="text-[34px] lg:text-[52px] font-black text-foreground leading-[1.05] lg:leading-[1.03] tracking-[-0.02em] break-words min-w-0">
              {pilote.nom}
            </h1>
          </div>

          <div className="mt-6 lg:mt-8 lg:grid lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
            <div className="lg:pt-4 lg:pr-[88px]">
              <div className="space-y-4 max-w-[640px] text-base lg:text-[19px] leading-[1.75] text-foreground/75">
                {bioParas.length > 0 ? (
                  bioParas.map((p, i) => <p key={i}>{p}</p>)
                ) : (
                  <p>{pilote.nom} est pilote privé et publie ses vols sur Fly Horizons. Retrouvez-les ci-dessous.</p>
                )}
              </div>
            </div>

            <div className="mt-7 lg:mt-0 lg:pt-4 lg:border-l lg:border-border lg:pl-[72px]">
              {checks.length > 0 && (
                <>
                  <p className="text-[11px] font-bold uppercase tracking-[2px] text-muted-foreground mb-2.5">Ce que nous vérifions</p>
                  <ul className="border-t border-border">
                    {checks.map(({ Icon, label }) => (
                      <li key={label} className="flex items-start gap-2.5 border-b border-border py-3 text-[15px] leading-normal text-foreground">
                        <Icon size={18} className="mt-0.5 shrink-0 text-[#0b2238]" />
                        {label}
                      </li>
                    ))}
                  </ul>
                </>
              )}
              <ScrollLink targetId="vols" className={`${LINK} ${checks.length > 0 ? "mt-4" : ""}`}>
                Voir ses vols
              </ScrollLink>
            </div>
          </div>
        </div>
      </section>

      <section id="vols" className="scroll-mt-[96px] border-t border-border py-10 lg:py-14">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 xl:px-10">
          <p className={EYEBROW}>Disponibles</p>
          <h2 className="text-[26px] font-black leading-[1.1] tracking-[-0.01em] text-foreground">Les vols de {prenom}</h2>

          {annonces.length > 0 ? (
            <div className="mt-6 lg:mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {annonces.map((a) => <AnnonceCard key={a.id} annonce={a} />)}
            </div>
          ) : (
            <div className="mt-4">
              <p className="mb-1.5 max-w-[460px] text-[15px] leading-[1.7] text-foreground/70">
                {`${prenom} n'a pas de vol publié en ce moment.`}
              </p>
              <Link href="/nos-offres" className={LINK}>
                Voir tous les vols disponibles
                <ArrowRight size={14} />
              </Link>
            </div>
          )}
        </div>
      </section>

      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 xl:px-10 pb-16 lg:pb-20">
        <div className="border-t border-border pt-7">
          <p className="mb-2 max-w-[560px] text-sm leading-[1.7] text-muted-foreground">
            Fly Horizons met en relation des passagers et des pilotes pour des vols en partage de frais. Chaque pilote est seul responsable de son vol.
          </p>
          <Link href="/about" className={LINK}>
            En savoir plus sur Fly Horizons
            <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    </main>
  );
}
