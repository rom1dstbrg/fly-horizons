import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
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

type Pilote = { id: string; nom: string; iban: string | null; photo_url: string | null };
type Client = { prenom: string; nom: string };

const EYEBROW = "text-[11px] font-bold text-primary uppercase tracking-[3px]";

export default async function AnnoncePaiementPage({ params }: PageProps) {
  const { token } = await params;
  const supabase = createAdminClient();

  const { data: resa } = await supabase
    .from("reservations")
    .select(
      "id, statut, acompte, date_vol, heure_vol, duree, pilote_paye, pilote_paye_at, client_paiement_declare_at, type_resa, clients(prenom, nom), pilotes(id, nom, iban, photo_url)",
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
    timeZone: "UTC",
  });
  const heure = resa.heure_vol ? resa.heure_vol.slice(0, 5) : null;
  const communication = piloteVirementCommunication(resa.date_vol, client?.nom ?? "");
  const piloteNom = pilote?.nom ?? "votre pilote";

  return (
    <main className="bg-white pt-page pb-16 lg:pb-24">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 xl:px-10">

        <div className="max-w-[680px]">
          <p className={`${EYEBROW} mb-2.5`}>Paiement</p>
          <h1 className="text-[28px] lg:text-[40px] font-black text-foreground leading-[1.05] tracking-[-0.02em]">
            {annulee ? "Demande annulée." : paye ? "Paiement confirmé." : "Réglez votre vol."}
          </h1>
          <p className="mt-2.5 max-w-[560px] text-[15px] leading-[1.7] text-foreground/70">
            {annulee ? (
              "Aucun règlement n'est attendu pour cette demande. Contactez votre pilote si besoin."
            ) : paye ? (
              <>Votre virement à <strong className="text-foreground">{piloteNom}</strong> a bien été reçu.</>
            ) : (
              <>Virement direct à <strong className="text-foreground">{piloteNom}</strong>, aucun paiement par carte ici : Fly Horizons n&apos;encaisse rien sur ce vol.</>
            )}
          </p>
        </div>

        {annulee ? null : (
          <div className="mt-8 pt-7 lg:mt-10 lg:pt-10 border-t border-border lg:grid lg:grid-cols-12">

            <section className="lg:col-span-7">
              <PaiementStatus
                reservationId={resa.id}
                token={token}
                declare={!!resa.client_paiement_declare_at}
                montant={montant}
                paye={paye}
                piloteNom={piloteNom}
                iban={pilote?.iban ?? null}
                communication={communication}
                qrUrl={`/api/pay-qr/${resa.id}`}
                receiptUrl={`/api/invoice/reservation/${resa.id}`}
              />
            </section>

            <aside className="mt-9 pt-8 border-t border-border lg:col-span-5 lg:mt-0 lg:pt-0 lg:pl-14 lg:ml-14 lg:border-l lg:border-t-0 lg:border-border">
              <p className={`${EYEBROW} mb-4`}>Votre vol</p>

              <div className="flex items-center gap-3 mb-5">
                {pilote?.photo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={pilote.photo_url}
                    alt=""
                    className="w-11 h-11 rounded-full object-cover object-top shrink-0"
                  />
                ) : (
                  <div className="w-11 h-11 rounded-full bg-secondary grid place-items-center shrink-0">
                    <PlaneTakeoff size={16} className="text-foreground/40" />
                  </div>
                )}
                <div className="min-w-0 text-sm">
                  <p className="font-semibold text-foreground">Avec {piloteNom}</p>
                  {pilote?.id && (
                    <Link href={`/nos-pilotes/${pilote.id}`} className="text-foreground/55 underline decoration-foreground/25 underline-offset-[3px] hover:decoration-primary hover:text-foreground transition-colors">
                      Voir le profil
                    </Link>
                  )}
                </div>
              </div>

              <dl className="text-[14px]">
                <div className="flex justify-between gap-4 py-2.5 border-b border-border">
                  <dt className="flex items-center gap-1.5 text-foreground/55"><CalendarDays size={14} /> Date</dt>
                  <dd className="text-right font-semibold text-foreground capitalize">{dateStr}</dd>
                </div>
                {heure && (
                  <div className="flex justify-between gap-4 py-2.5 border-b border-border">
                    <dt className="flex items-center gap-1.5 text-foreground/55"><Clock size={14} /> Heure</dt>
                    <dd className="text-right font-semibold text-foreground">{heure}</dd>
                  </div>
                )}
                <div className="flex justify-between gap-4 py-2.5 last:border-b-0 border-b border-border">
                  <dt className="flex items-center gap-1.5 text-foreground/55"><PlaneTakeoff size={14} /> Durée</dt>
                  <dd className="text-right font-semibold text-foreground">{resa.duree} min</dd>
                </div>
              </dl>

              <div className="mt-5 flex items-start gap-2.5 rounded-xl bg-primary/10 px-4 py-3">
                <ShieldCheck size={15} className="shrink-0 mt-0.5 text-primary" />
                <p className="text-[12.5px] leading-relaxed text-foreground/70">
                  Vol en partage de coûts (NCO.GEN.104). Votre participation couvre une quote-part
                  des frais réels et se règle directement au pilote.
                </p>
              </div>
            </aside>
          </div>
        )}

      </div>
    </main>
  );
}
