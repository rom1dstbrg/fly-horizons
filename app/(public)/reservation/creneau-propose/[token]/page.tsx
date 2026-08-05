import { createAdminClient } from "@/lib/supabase/admin";
import { SlotProposalForm } from "./SlotProposalForm";
import { XCircle } from "lucide-react";
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
      <div className="flex-1 flex flex-col items-center justify-center bg-gradient-navy px-4 pt-[98px] pb-16">
        <div className="max-w-md w-full text-center space-y-4">
          <div className="w-14 h-14 rounded-lg bg-secondary border border-border flex items-center justify-center mx-auto">
            <XCircle size={24} className="text-foreground/30" />
          </div>
          <h1 className="text-xl font-black text-foreground">Lien invalide</h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Cette proposition n&apos;est plus valide. Elle a peut-être déjà été traitée.
            Contactez-nous à{" "}
            <a href="mailto:info@fly-horizons.com" className="text-primary hover:brightness-90 transition-all font-semibold">
              info@fly-horizons.com
            </a>{" "}
            si vous avez besoin d&apos;aide.
          </p>
        </div>
      </div>
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
