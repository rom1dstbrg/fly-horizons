import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase/admin";
import { piloteVirementCommunication } from "@/lib/pilote/payment";
import { PaiementStatus } from "./PaiementStatus";
import { PlaneTakeoff, Clock, CalendarDays, ShieldCheck } from "lucide-react";

export const metadata: Metadata = {
  title: "Régler votre vol · Fly Horizons",
  robots: { index: false, follow: false },
};

interface PageProps {
  params: Promise<{ token: string }>;
}

type Pilote = { nom: string; iban: string | null; photo_url: string | null; bio: string | null };
type Client = { prenom: string; nom: string };

export default async function AnnoncePaiementPage({ params }: PageProps) {
  const { token } = await params;
  const supabase = createAdminClient();

  const { data: resa } = await supabase
    .from("reservations")
    .select(
      "id, statut, acompte, date_vol, heure_vol, duree, pilote_paye, pilote_paye_at, type_resa, clients(prenom, nom), pilotes(nom, iban, photo_url, bio)",
    )
    .eq("payment_token", token)
    .eq("type_resa", "annonce_pilote")
    .maybeSingle();

  if (!resa) notFound();

  const pilote = (Array.isArray(resa.pilotes) ? resa.pilotes[0] : resa.pilotes) as Pilote | null;
  const client = (Array.isArray(resa.clients) ? resa.clients[0] : resa.clients) as Client | null;
  const montant = typeof resa.acompte === "number" ? resa.acompte : null;
  const paye = resa.pilote_paye === true;
  const annulee = resa.statut === "annulee";

  const dateStr = new Date(resa.date_vol + "T12:00:00Z").toLocaleDateString("fr-BE", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const heure = resa.heure_vol ? resa.heure_vol.slice(0, 5) : null;
  const communication = piloteVirementCommunication(resa.date_vol, client?.nom ?? "");
  const photoUrl = pilote?.photo_url || null;

  return (
    <main className="min-h-screen bg-[#f5f8ff]">
      <div className="h-[80px] sm:h-[98px]" />

      <div className="max-w-2xl mx-auto px-4 sm:px-6 pb-24 pt-4">
        {/* ── En-tête pilote ─────────────────────────────────────────── */}
        <div className="flex items-center gap-4 mb-6">
          {photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={photoUrl}
              alt={pilote?.nom ?? "Pilote"}
              className="w-16 h-16 rounded-full object-cover border border-border shrink-0"
            />
          ) : (
            <div className="w-16 h-16 rounded-full bg-[#0b2238]/5 flex items-center justify-center shrink-0">
              <PlaneTakeoff size={22} className="text-[#0b2238]/40" />
            </div>
          )}
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-[2px] text-[#0b2238]/50">
              Pilote Fly Horizons
            </p>
            <h1 className="text-2xl font-black text-[#0b2238] leading-tight">
              {pilote?.nom ?? "Votre pilote"}
            </h1>
          </div>
        </div>

        {/* ── Rappel du vol ──────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-border p-5 mb-4">
          <p className="text-[11px] font-bold uppercase tracking-[2px] text-[#0b2238]/50 mb-3">
            Votre vol
          </p>
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-[#0b2238]">
            <span className="flex items-center gap-1.5 capitalize">
              <CalendarDays size={14} className="text-primary" /> {dateStr}
            </span>
            {heure && (
              <span className="flex items-center gap-1.5">
                <Clock size={14} className="text-primary" /> {heure}
              </span>
            )}
            <span className="flex items-center gap-1.5">
              <PlaneTakeoff size={14} className="text-primary" /> {resa.duree} min
            </span>
          </div>
        </div>

        {annulee ? (
          <div className="bg-white rounded-2xl border border-red-200 p-6 text-center">
            <p className="text-base font-bold text-red-700 mb-1">Cette demande a été annulée</p>
            <p className="text-sm text-[#0b2238]/60">
              Aucun règlement n&apos;est attendu. Contactez votre pilote si besoin.
            </p>
          </div>
        ) : (
          <PaiementStatus
            reservationId={resa.id}
            montant={montant}
            paye={paye}
            piloteNom={pilote?.nom ?? "votre pilote"}
            iban={pilote?.iban ?? null}
            communication={communication}
            qrUrl={`/api/pay-qr/${resa.id}`}
            receiptUrl={`/api/invoice/reservation/${resa.id}`}
          />
        )}

        {/* ── Cadre légal ────────────────────────────────────────────── */}
        <div className="mt-6 flex items-start gap-2.5 rounded-xl bg-primary/10 border border-primary/25 px-4 py-3">
          <ShieldCheck size={15} className="shrink-0 mt-0.5 text-primary" />
          <p className="text-xs text-[#0b2238]/70 leading-relaxed">
            Vol en partage de coûts (NCO.GEN.104). Fly Horizons n&apos;est pas un service de
            transport aérien commercial et n&apos;encaisse rien sur ce vol : votre participation
            couvre une quote-part des frais réels et se règle directement au pilote.
          </p>
        </div>
      </div>
    </main>
  );
}
