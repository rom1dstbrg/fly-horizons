import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { fmtDuration } from "@/lib/email-templates";
import SatisfactionForm from "./SatisfactionForm";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Enquête de satisfaction — Fly Horizons" };

interface Props {
  params: Promise<{ id: string }>;
}

export default async function SatisfactionPage({ params }: Props) {
  const { id } = await params;
  const supabase = createAdminClient();

  const { data: resa } = await supabase
    .from("reservations")
    .select("id, date_vol, duree, statut, clients(prenom, nom)")
    .eq("id", id)
    .single();

  if (!resa || resa.statut !== "vol_effectue") notFound();

  const { data: existing } = await supabase
    .from("satisfaction_surveys")
    .select("id")
    .eq("reservation_id", id)
    .maybeSingle();

  const client = resa.clients as unknown as { prenom: string; nom: string };
  const dateStr = new Date(resa.date_vol + "T12:00:00Z").toLocaleDateString("fr-BE", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });
  const dureeStr = fmtDuration(resa.duree);

  return (
    <main className="min-h-screen bg-[#0b2238] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8">
        {existing ? (
          <div className="text-center space-y-4">
            <p className="text-xs font-bold uppercase tracking-widest text-[#F2B705] mb-1">Fly Horizons</p>
            <h1 className="text-xl font-bold text-foreground">Avis déjà envoyé</h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Vous avez déjà partagé votre avis pour ce vol. Merci !
            </p>
          </div>
        ) : (
          <SatisfactionForm
            reservationId={resa.id}
            prenom={client.prenom}
            dateStr={dateStr}
            duree={dureeStr}
          />
        )}
      </div>
    </main>
  );
}
