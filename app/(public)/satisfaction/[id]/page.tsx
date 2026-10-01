import Link from "next/link";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { fmtDuration } from "@/lib/email-templates";
import SatisfactionForm from "./SatisfactionForm";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Votre avis sur votre vol", robots: { index: false } };

interface Props {
  params: Promise<{ id: string }>;
}

const EYEBROW = "text-[11px] font-bold text-primary uppercase tracking-[3px]";

// Formulaire d'avis après un vol (nouvelle DA, 01/10) : dans le site (en-tête et pied de
// page), centré sur le pilote du vol. Lien reçu par email quand le pilote marque le vol
// effectué. Les réponses sont lues par l'équipe Fly Horizons seulement.
export default async function SatisfactionPage({ params }: Props) {
  const { id } = await params;
  const supabase = createAdminClient();

  const { data: resa } = await supabase
    .from("reservations")
    .select("id, date_vol, heure_vol, duree, statut, clients(prenom, nom), pilotes(nom, photo_url)")
    .eq("id", id)
    .single();

  if (!resa || resa.statut !== "vol_effectue") notFound();

  const { data: existing } = await supabase
    .from("satisfaction_surveys")
    .select("id")
    .eq("reservation_id", id)
    .maybeSingle();

  const client = resa.clients as unknown as { prenom: string; nom: string };
  const pilote = (Array.isArray(resa.pilotes) ? resa.pilotes[0] : resa.pilotes) as { nom: string; photo_url: string | null } | null;
  const dateStr = new Date(resa.date_vol + "T12:00:00Z").toLocaleDateString("fr-BE", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });

  return (
    <main className="bg-white pb-16 lg:pb-24">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 xl:px-10 pt-page">
        {existing ? (
          <div className="max-w-[560px] mx-auto text-center pt-6 lg:pt-12">
            <p className={`${EYEBROW} mb-3`}>Avis déjà envoyé</p>
            <h1 className="text-[28px] lg:text-[38px] font-black text-foreground leading-[1.08] tracking-[-0.02em]">
              Votre avis nous est déjà parvenu, {client.prenom}.
            </h1>
            <p className="mt-4 text-[15px] leading-relaxed text-foreground/65">
              Merci encore. Nous lisons chaque retour.
            </p>
            <Link
              href="/nos-offres"
              className="mt-7 inline-flex items-center justify-center rounded-[10px] border border-foreground px-6 py-[13px] text-sm font-black text-foreground hover:bg-secondary transition-colors cursor-pointer"
            >
              Voir les prochains vols
            </Link>
          </div>
        ) : (
          <SatisfactionForm
            reservationId={resa.id}
            prenom={client.prenom}
            dateStr={dateStr}
            duree={fmtDuration(resa.duree)}
            pilote={pilote ? { nom: pilote.nom, photoUrl: pilote.photo_url } : null}
          />
        )}
      </div>
    </main>
  );
}
