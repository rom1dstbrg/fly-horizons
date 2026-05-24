import Link from "next/link";
import { CheckCircle, CalendarDays, MapPin, Clock, AlertTriangle, CloudRain, Users, ExternalLink } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Réservation envoyée — Fly Horizons",
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
    title: "Romain confirme votre créneau",
    desc: "Vous serez contacté dans les prochains jours pour valider la date et l'heure du vol.",
  },
  {
    num: 3,
    done: false,
    title: "À vous le ciel",
    desc: "Présentez-vous 15 min avant à l'aéroport de Charleroi (EBCI). Briefing sécurité, casques audio fournis.",
  },
];

const STEPS_PAY_LATER = [
  {
    num: 1,
    done: true,
    title: "Demande envoyée",
    desc: "Votre demande a bien été enregistrée.",
  },
  {
    num: 2,
    done: false,
    title: "Réglez pour confirmer",
    desc: "Utilisez le lien de paiement envoyé par email pour bloquer votre créneau. Sans paiement, la date n'est pas garantie.",
  },
  {
    num: 3,
    done: false,
    title: "À vous le ciel",
    desc: "Présentez-vous 15 min avant à l'aéroport de Charleroi (EBCI). Briefing sécurité, casques audio fournis.",
  },
];

export default async function ReservationSuccessPage({ searchParams }: Props) {
  const { mode } = await searchParams;
  const isPayLater = mode === "pay-later";

  const steps = isPayLater ? STEPS_PAY_LATER : STEPS_NORMAL;

  return (
    <main className="min-h-screen bg-[#f5f5f7] flex items-center justify-center px-4 pt-[86px] pb-16">
      <div className="max-w-lg w-full space-y-4">

        {/* ── Header ── */}
        <div className="bg-white rounded-2xl border border-border shadow-sm p-8 text-center">
          <div className={`w-14 h-14 rounded-full ${isPayLater ? "bg-amber-100" : "bg-green-100"} flex items-center justify-center mx-auto mb-4`}>
            {isPayLater
              ? <Clock className="text-amber-600" size={28} />
              : <CheckCircle className="text-green-600" size={28} />}
          </div>

          <h1 className="text-xl font-bold text-foreground mb-2">
            {isPayLater ? "Demande enregistrée !" : "Demande envoyée !"}
          </h1>
          <p className="text-muted-foreground text-sm leading-relaxed">
            {isPayLater
              ? "Votre demande a été reçue. Réglez via le lien dans votre email pour confirmer le créneau."
              : "Votre demande a bien été reçue. Un email de confirmation vient d'être envoyé."}
          </p>

          {isPayLater && (
            <div className="mt-4 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-left">
              <div className="flex items-start gap-2.5">
                <AlertTriangle size={14} className="text-amber-600 mt-0.5 shrink-0" />
                <p className="text-xs text-amber-800 leading-relaxed">
                  <strong>Créneau non garanti.</strong> Votre date ne sera confirmée qu&apos;après réception du paiement. Passé le délai, le créneau sera libéré automatiquement.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* ── Étapes suivantes ── */}
        <div className="bg-white rounded-2xl border border-border shadow-sm p-5">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[2px] mb-4">La suite</p>
          <div className="space-y-0">
            {steps.map(({ num, done, title, desc }, i) => (
              <div key={num} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${done ? "bg-green-500" : "bg-[#F2B705]"}`}>
                    {done
                      ? <CheckCircle size={13} className="text-white" />
                      : <span className="font-black text-[#0b2238] text-xs leading-none">{num}</span>}
                  </div>
                  {i < steps.length - 1 && (
                    <div className="w-px bg-border mt-1 mb-0" style={{ height: 28 }} />
                  )}
                </div>
                <div className="pb-4">
                  <p className={`text-sm font-bold ${done ? "text-green-700" : "text-foreground"}`}>{title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Infos pratiques ── */}
        <div className="bg-white rounded-2xl border border-border shadow-sm p-5 space-y-3">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[2px]">Informations pratiques</p>

          <div className="flex items-start gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-[#f5f8ff] border border-[#dce8ff] flex items-center justify-center shrink-0">
              <MapPin size={13} className="text-[#113356]" />
            </div>
            <div>
              <p className="text-xs font-semibold text-foreground">Aéroport de Charleroi (EBCI)</p>
              <p className="text-xs text-muted-foreground">Rue des Frères Wright 8, Gosselies · Arrivez 15 min avant</p>
            </div>
          </div>

          <Link
            href="/access-ebci"
            className="flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-[#f5f8ff] border border-[#dce8ff] text-[#113356] rounded-xl text-xs font-semibold hover:bg-[#113356] hover:text-white hover:border-[#113356] transition-all"
          >
            <ExternalLink size={12} />
            Plan d&apos;accès à l&apos;aéroport
          </Link>

          <div className="flex items-start gap-2.5 pt-2 border-t border-border">
            <div className="w-7 h-7 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0">
              <CloudRain size={13} className="text-blue-500" />
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              <strong className="text-foreground">Météo :</strong> en cas de conditions défavorables, le vol est reporté sans frais ni pénalité. Romain vous recontacte pour fixer une nouvelle date.
            </p>
          </div>

          <div className="flex items-start gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-[#f5f8ff] border border-[#dce8ff] flex items-center justify-center shrink-0">
              <Users size={13} className="text-[#113356]" />
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              <strong className="text-foreground">Passagers :</strong> maximum 3 passagers par vol (avion léger privé), sans exception.
            </p>
          </div>
        </div>

        {/* ── CTAs ── */}
        <div className="flex flex-col gap-3">
          <Link
            href="/account#reservations"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#113356] text-white rounded-xl text-sm font-semibold hover:bg-[#0b2238] transition-colors"
          >
            <CalendarDays size={15} />
            {isPayLater ? "Accéder à mon compte" : "Suivre ma réservation"}
          </Link>
          <Link
            href="/"
            className="inline-flex items-center justify-center px-6 py-2.5 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:bg-secondary transition-colors"
          >
            Retour à l&apos;accueil
          </Link>
        </div>

      </div>
    </main>
  );
}
