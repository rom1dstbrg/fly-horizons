import Link from "next/link";
import type { Metadata } from "next";
import { CalendarDays, MapPin, CloudRain, Users, ExternalLink, Landmark, Check } from "lucide-react";

export const metadata: Metadata = {
  title: "Réservation envoyée · Fly Horizons",
};

// Nouvelle DA (28/09) : fond blanc, sans boîte, .pt-page. Point d'arrivée de deux
// flows différents (jamais mélanger leur contenu) :
// - "annonce" (AnnonceReserveClient, vols publiés par les pilotes) : demande
//   seule, rien payé ici, viré au pilote après sa confirmation.
// - défaut (app/(public)/reservation, anciens produits/vouchers + Stripe) :
//   peut déjà être payé, itinéraire proposé ensuite par le pilote.
const STEPS: Record<"annonce" | "defaut", { title: string; texte: string }[]> = {
  annonce: [
    { title: "Demande envoyée", texte: "Votre demande a bien été enregistrée. Un email de confirmation vient d'être envoyé." },
    { title: "Le pilote confirme", texte: "Il vérifie le créneau et la météo prévue, puis vous confirme le vol par email, sous 72 h." },
    { title: "Vous réglez votre part", texte: "Par virement au pilote, avec un QR code à scanner depuis votre app bancaire. Vous recevez ensuite votre reçu." },
    { title: "Rendez-vous à Charleroi", texte: "Accueil à l'aérodrome (EBCI), briefing sécurité, casque audio pour chaque passager." },
  ],
  defaut: [
    { title: "Demande envoyée", texte: "Votre demande a bien été enregistrée. Un email de confirmation vient d'être envoyé." },
    { title: "Votre pilote confirme le créneau", texte: "Vous serez contacté dans les prochains jours pour valider la date et l'heure du vol." },
    { title: "Votre pilote vous propose un itinéraire", texte: "Une route est tracée selon vos envies et la météo. Vous la recevez par email et pouvez demander des ajustements." },
    { title: "À vous le ciel", texte: "Présentez-vous 15 min avant à Charleroi (EBCI). Briefing sécurité, casques audio fournis." },
  ],
};

const CTA = "inline-flex items-center justify-center gap-2 px-6 py-[15px] bg-primary text-[#0b2238] rounded-[10px] text-sm font-black shadow-gold hover:bg-[#e6a800] hover:-translate-y-px transition-all";
const LINK = "font-semibold text-[#0b2238] underline decoration-[#0b2238]/25 underline-offset-[3px] hover:decoration-primary transition-colors";

function InfoRow({ Icon, title, children }: { Icon: typeof MapPin; title: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3.5 py-4 border-b border-border last:border-b-0">
      <span className="w-[38px] h-[38px] shrink-0 rounded-[10px] bg-secondary grid place-items-center text-[#0b2238]">
        <Icon size={16} />
      </span>
      <div className="text-[13.5px] leading-relaxed text-foreground/70">
        <p className="font-bold text-foreground mb-0.5">{title}</p>
        {children}
      </div>
    </div>
  );
}

export default async function ReservationSuccessPage({ searchParams }: { searchParams: Promise<{ type?: string }> }) {
  const { type } = await searchParams;
  const isAnnonce = type === "annonce";
  const steps = STEPS[isAnnonce ? "annonce" : "defaut"];

  return (
    <main className="bg-white pt-page pb-24">
      <div className="max-w-[680px] mx-auto px-4 sm:px-6">

        <div className="w-12 h-12 rounded-full bg-primary text-[#0b2238] grid place-items-center mb-[18px]">
          <Check size={22} strokeWidth={2.5} />
        </div>
        <h1 className="text-[34px] lg:text-[44px] font-black text-foreground leading-[1.03] tracking-[-0.02em]">
          Demande envoyée.
        </h1>
        <p className="mt-3 text-[15px] leading-[1.7] text-foreground/75">Voici ce qui se passe maintenant.</p>

        {/* Étapes */}
        <section className="mt-9 pt-8 border-t border-border">
          <p className="text-[11px] font-bold text-primary uppercase tracking-[3px] mb-5">Prochaines étapes</p>
          <ol>
            {steps.map(({ title, texte }, i) => (
              <li key={title} className="flex gap-3.5 pb-6 last:pb-0">
                <span className="flex flex-col items-center shrink-0">
                  <span className={`w-7 h-7 rounded-full grid place-items-center text-xs font-black leading-none ${i === 0 ? "bg-[#0b2238] text-primary" : "bg-secondary text-foreground/60"}`}>
                    {i === 0 ? <Check size={13} /> : i + 1}
                  </span>
                  {i < steps.length - 1 && <span className="w-px flex-1 bg-border mt-1.5 min-h-[26px]" />}
                </span>
                <div className="pt-0.5">
                  <p className="text-[15px] font-bold text-foreground">{title}</p>
                  <p className="mt-1 text-[13.5px] leading-relaxed text-foreground/65">{texte}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        {/* Informations pratiques */}
        <section className="mt-9 pt-8 border-t border-border">
          <p className="text-[11px] font-bold text-primary uppercase tracking-[3px] mb-1">Informations pratiques</p>

          <InfoRow Icon={MapPin} title="Aéroport de Charleroi (EBCI)">
            Rue des Frères Wright 8, Gosselies. Arrivez 15 min avant.{" "}
            <Link href="/access-ebci" className={LINK}>Plan d&apos;accès <ExternalLink size={11} className="inline -mt-0.5" /></Link>
          </InfoRow>

          <InfoRow Icon={CloudRain} title="Météo">
            En cas de conditions défavorables, le vol est reporté sans frais. {isAnnonce ? "Votre pilote" : "Nous"} vous recontacte pour fixer une nouvelle date.
          </InfoRow>

          {isAnnonce && (
            <InfoRow Icon={Landmark} title="Paiement">
              Rien à régler pour l&apos;instant. Le pilote vous enverra les infos de virement une fois votre créneau confirmé.
            </InfoRow>
          )}

          <InfoRow Icon={Users} title="Passagers">
            Maximum 3 passagers par vol (avion léger), sans exception.
          </InfoRow>
        </section>

        {/* CTAs */}
        <div className="mt-9 pt-8 border-t border-border flex flex-wrap gap-3">
          <Link href="/account#reservations" className={CTA}>
            <CalendarDays size={15} /> Suivre ma réservation
          </Link>
          <Link href="/" className="inline-flex items-center justify-center px-6 py-[15px] rounded-[10px] border border-border text-sm font-bold text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors">
            Retour à l&apos;accueil
          </Link>
        </div>

      </div>
    </main>
  );
}
