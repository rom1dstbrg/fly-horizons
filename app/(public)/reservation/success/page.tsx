import Link from "next/link";
import { CalendarDays, MapPin, CloudRain, Users, ExternalLink, CheckCircle, AlertTriangle } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Réservation envoyée · Fly Horizons",
};

interface Props {
  searchParams: Promise<{ mode?: string }>;
}

const STEPS_NORMAL = [
  {
    num: 1,
    done: true,
    title: "Demande envoyée",
    desc: "Votre demande a bien été enregistrée. Un email de confirmation vient d'être envoyé.",
  },
  {
    num: 2,
    done: false,
    title: "Votre pilote confirme le créneau",
    desc: "Vous serez contacté dans les prochains jours pour valider la date et l'heure du vol.",
  },
  {
    num: 3,
    done: false,
    title: "Votre pilote vous propose un itinéraire",
    desc: "Une route est tracée en fonction de vos envies et de la météo. Vous la recevez par email et pouvez demander des ajustements.",
  },
  {
    num: 4,
    done: false,
    title: "À vous le ciel",
    desc: "Présentez-vous 15 min avant à Charleroi (EBCI). Briefing sécurité, casques audio fournis.",
  },
];

const STEPS_PAY_LATER = [
  {
    num: 1,
    done: true,
    title: "Demande enregistrée",
    desc: "Votre demande a bien été reçue.",
  },
  {
    num: 2,
    done: false,
    title: "Réglez dans les 24 h pour confirmer",
    desc: "Ouvrez le lien de paiement reçu par email et réglez l'acompte. Votre créneau n'est sécurisé qu'après paiement ; les disponibilités peuvent évoluer.",
  },
  {
    num: 3,
    done: false,
    title: "Votre pilote confirme et prépare votre vol",
    desc: "Une fois le paiement reçu, votre pilote valide votre créneau et vous envoie une proposition d'itinéraire à approuver.",
  },
  {
    num: 4,
    done: false,
    title: "À vous le ciel",
    desc: "Présentez-vous 15 min avant à Charleroi (EBCI). Briefing sécurité, casques audio fournis.",
  },
];

export default async function ReservationSuccessPage({ searchParams }: Props) {
  const { mode } = await searchParams;
  const isPayLater = mode === "pay-later";
  const steps = isPayLater ? STEPS_PAY_LATER : STEPS_NORMAL;

  return (
    <main className="flex-1 flex items-center justify-center bg-gradient-navy px-4 pt-[86px] pb-16">
      <div className="max-w-lg w-full space-y-3">

        {/* ── En-tête ── */}
        <div className="card-premium p-6">
          <h1 className="text-2xl font-black text-foreground leading-tight">
            {isPayLater ? "Demande enregistrée" : "Demande envoyée !"}
          </h1>
          <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">
            {isPayLater
              ? "Votre créneau sera confirmé dès réception de votre paiement."
              : "Voici ce qui se passe maintenant."}
          </p>

          {isPayLater && (
            <div className="mt-4 bg-primary/10 border border-primary/25 rounded-lg px-4 py-3 flex items-start gap-2.5">
              <AlertTriangle size={13} className="text-[#b38500] mt-0.5 shrink-0" />
              <p className="text-xs text-muted-foreground leading-relaxed">
                <strong className="text-foreground">Créneau non garanti.</strong>{" "}
                Réglez <strong className="text-foreground">dans les 24 h</strong> via le lien reçu par email. Au-delà, la date peut être attribuée à un autre client.
              </p>
            </div>
          )}
        </div>

        {/* ── Étapes ── */}
        <div className="card-premium p-6">
          <p className="text-[10px] font-black text-primary uppercase tracking-[3px] mb-5">
            Prochaines étapes
          </p>
          <div>
            {steps.map(({ num, done, title, desc }, i) => (
              <div key={num} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${done ? "bg-navy" : "bg-primary"}`}>
                    {done
                      ? <CheckCircle size={13} className="text-primary" />
                      : <span className="font-black text-primary-foreground text-xs leading-none">{num}</span>}
                  </div>
                  {i < steps.length - 1 && (
                    <div className="w-px bg-border my-1 min-h-[20px] flex-1" />
                  )}
                </div>
                <div className="pb-4 pt-0.5">
                  <p className="text-sm font-bold text-foreground">{title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Infos pratiques ── */}
        <div className="card-premium p-6 space-y-4">
          <p className="text-[10px] font-black text-primary uppercase tracking-[3px]">
            Informations pratiques
          </p>

          <div className="flex items-start gap-3">
            <div className="w-7 h-7 rounded-lg bg-secondary border border-border flex items-center justify-center shrink-0 mt-0.5">
              <MapPin size={13} className="text-muted-foreground" />
            </div>
            <div>
              <p className="text-xs font-semibold text-foreground">Aéroport de Charleroi (EBCI)</p>
              <p className="text-xs text-muted-foreground mt-0.5">Rue des Frères Wright 8, Gosselies · Arrivez 15 min avant</p>
            </div>
          </div>

          <Link
            href="/access-ebci"
            className="flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-secondary border border-border text-muted-foreground rounded-lg text-xs font-semibold hover:bg-navy hover:text-white hover:border-navy transition-all"
          >
            <ExternalLink size={12} />
            Plan d&apos;accès à l&apos;aéroport
          </Link>

          <div className="flex items-start gap-3 pt-1 border-t border-border">
            <div className="w-7 h-7 rounded-lg bg-secondary border border-border flex items-center justify-center shrink-0 mt-0.5">
              <CloudRain size={13} className="text-muted-foreground" />
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              <strong className="text-foreground">Météo :</strong> en cas de conditions défavorables, le vol est reporté sans frais. Romain vous recontacte pour fixer une nouvelle date.
            </p>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-7 h-7 rounded-lg bg-secondary border border-border flex items-center justify-center shrink-0 mt-0.5">
              <Users size={13} className="text-muted-foreground" />
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              <strong className="text-foreground">Passagers :</strong> maximum 3 passagers par vol (avion léger), sans exception.
            </p>
          </div>
        </div>

        {/* ── CTAs ── */}
        <div className="flex flex-col gap-2.5 pt-1">
          <Link
            href="/account#reservations"
            className="inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-primary text-primary-foreground rounded-lg text-sm font-black hover:brightness-105 active:scale-[0.98] transition-all shadow-gold"
          >
            <CalendarDays size={15} />
            {isPayLater ? "Accéder à mon compte" : "Suivre ma réservation"}
          </Link>
          <Link
            href="/"
            className="inline-flex items-center justify-center px-6 py-2.5 rounded-lg border border-border text-sm font-medium text-muted-foreground hover:text-foreground hover:border-foreground/20 transition-colors"
          >
            Retour à l&apos;accueil
          </Link>
        </div>

      </div>
    </main>
  );
}
