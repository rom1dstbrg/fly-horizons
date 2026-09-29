import { createAdminClient } from "@/lib/supabase/admin";
import { SlotProposalForm } from "./SlotProposalForm";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Nouveau créneau proposé · Fly Horizons",
};

interface PageProps {
  params: Promise<{ token: string }>;
}

export default async function CreneauProposePage({ params }: PageProps) {
  const { token } = await params;
  const supabase = createAdminClient();

  const { data: resa } = await supabase
    .from("reservations")
    .select("id, date_vol, heure_vol, duree, slot_proposal_date, slot_proposal_heure, clients(prenom, nom, email)")
    .eq("slot_proposal_token", token)
    .maybeSingle();

  if (!resa || !resa.slot_proposal_date || !resa.slot_proposal_heure) {
    return (
      <main className="min-h-screen bg-white">
        <section className="pt-page pb-24 lg:pb-32">
          <div className="max-w-[1400px] mx-auto px-4 sm:px-6 xl:px-10">
            <p className="text-[11px] font-bold text-primary uppercase tracking-[3px] mb-3">Créneau proposé</p>
            <h1 className="text-[32px] lg:text-[44px] font-black text-foreground leading-[1.08] lg:leading-[1.04] tracking-[-0.02em] mb-3">
              Lien invalide.
            </h1>
            <p className="max-w-[520px] text-base leading-[1.7] text-foreground/80">
              Cette proposition n&apos;est plus valide. Elle a peut-être déjà été traitée. Écrivez-nous à{" "}
              <a href="mailto:info@fly-horizons.com" className="font-semibold text-[#0b2238] underline decoration-[#0b2238]/25 underline-offset-[3px] hover:decoration-primary transition-colors">
                info@fly-horizons.com
              </a>{" "}
              si vous avez besoin d&apos;aide.
            </p>
          </div>
        </section>
      </main>
    );
  }

  const client = resa.clients as unknown as { prenom: string; nom: string; email: string } | null;

  const requestedDateStr = new Date(resa.date_vol + "T12:00:00Z").toLocaleDateString("fr-BE", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });
  const proposedDateStr = new Date(resa.slot_proposal_date + "T12:00:00Z").toLocaleDateString("fr-BE", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });

  return (
    <SlotProposalForm
      token={token}
      prenom={client?.prenom ?? ""}
      requestedDateStr={requestedDateStr}
      proposedDateStr={proposedDateStr}
      proposedHeure={resa.slot_proposal_heure.slice(0, 5)}
      duree={resa.duree}
    />
  );
}
