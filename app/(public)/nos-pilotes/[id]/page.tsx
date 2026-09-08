import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";

// Fiche pilote publique, montrée au client à qui ce pilote est attribué
// (lien dans l'email « Votre pilote pour ce vol »). Transparence : prénom/nom,
// photo, bio. Pas d'infos de contact ni de données légales.

type PilotePublic = { id: string; nom: string; bio: string | null; photo_url: string | null };

async function getPilote(id: string): Promise<PilotePublic | null> {
  const { data } = await createAdminClient()
    .from("pilotes")
    .select("id, nom, bio, photo_url")
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

export default async function PilotePublicPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const pilote = await getPilote(id);
  if (!pilote) notFound();

  const bioParas: string[] = (pilote.bio ?? "")
    .split(/\n{2,}/)
    .map((p: string) => p.trim())
    .filter(Boolean);

  return (
    <main className="min-h-screen bg-white">
      <section className="bg-white pt-[98px]">
        <div className="max-w-[880px] mx-auto px-4 sm:px-6 xl:px-10 pt-10 sm:pt-16 pb-20 sm:pb-28">
          <p className="text-xs font-bold text-[#F2B705] uppercase tracking-[3px] mb-4">
            Votre pilote
          </p>

          <div className="flex flex-col sm:flex-row sm:items-center gap-6 sm:gap-8 mb-10">
            {pilote.photo_url ? (
              <Image
                src={pilote.photo_url}
                alt={pilote.nom}
                width={140}
                height={140}
                className="w-32 h-32 sm:w-36 sm:h-36 rounded-2xl object-cover shrink-0"
                unoptimized
              />
            ) : (
              <div className="w-32 h-32 sm:w-36 sm:h-36 rounded-2xl bg-[#f5f8ff] flex items-center justify-center shrink-0">
                <span className="text-3xl font-black text-[#0b2238]/30">
                  {pilote.nom
                    .split(" ")
                    .map((w: string) => w[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase()}
                </span>
              </div>
            )}
            <h1 className="text-3xl sm:text-4xl font-black text-foreground leading-tight tracking-tight">
              {pilote.nom}
            </h1>
          </div>

          <div className="space-y-5 text-foreground/70 text-[15px] sm:text-base leading-relaxed">
            {bioParas.length > 0 ? (
              bioParas.map((p: string, i: number) => <p key={i}>{p}</p>)
            ) : (
              <p>
                {pilote.nom} fait partie des pilotes de confiance de Fly Horizons. Il assurera
                votre vol au départ de Charleroi et vous contactera directement pour convenir
                des détails.
              </p>
            )}
          </div>

          <div className="mt-12 pt-8 border-t border-black/10">
            <p className="text-sm text-foreground/60 mb-3">
              Fly Horizons met en relation des passagers et des pilotes pour des vols en partage
              de frais. Chaque pilote est responsable de son vol.
            </p>
            <Link
              href="/about"
              className="inline-flex items-center gap-1.5 text-sm font-bold text-[#0b2238] hover:text-[#F2B705] transition-colors"
            >
              En savoir plus sur Fly Horizons
              <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
