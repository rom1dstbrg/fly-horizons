import Link from "next/link";
import { CheckCircle, CalendarDays, MapPin, Clock, AlertTriangle } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Réservation envoyée — Fly Horizons",
};

interface Props {
  searchParams: Promise<{ mode?: string }>;
}

export default async function ReservationSuccessPage({ searchParams }: Props) {
  const { mode } = await searchParams;
  const isPayLater = mode === "pay-later";

  if (isPayLater) {
    return (
      <main className="min-h-screen bg-[#f5f5f7] flex items-center justify-center px-4 pt-[86px] pb-16">
        <div className="max-w-md w-full bg-white rounded-2xl border border-border shadow-sm p-8 text-center">

          <div className="w-14 h-14 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-4">
            <Clock className="text-amber-600" size={28} />
          </div>

          <h1 className="text-xl font-bold text-foreground mb-2">
            Demande enregistrée !
          </h1>
          <p className="text-muted-foreground text-sm mb-4 leading-relaxed">
            Votre demande de réservation a bien été reçue. Vous allez recevoir un email avec votre lien de paiement.
          </p>

          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-6 text-left">
            <div className="flex items-start gap-2.5">
              <AlertTriangle size={14} className="text-amber-600 mt-0.5 shrink-0" />
              <p className="text-xs text-amber-800 leading-relaxed">
                <strong>Créneau non garanti.</strong> Votre date et horaire ne seront confirmés qu&apos;après réception du paiement. En cas de paiement tardif, le créneau pourrait ne plus être disponible.
              </p>
            </div>
          </div>

          <div className="bg-secondary/40 rounded-xl p-4 space-y-3 text-left mb-6">
            <div className="flex items-start gap-2.5">
              <CalendarDays size={14} className="text-[#113356] mt-0.5 shrink-0" />
              <p className="text-xs text-muted-foreground">
                Le lien de paiement est disponible dans votre email et depuis votre espace personnel (Mon compte &rarr; Mes réservations).
              </p>
            </div>
            <div className="flex items-start gap-2.5">
              <MapPin size={14} className="text-[#113356] mt-0.5 shrink-0" />
              <p className="text-xs text-muted-foreground">
                Le vol part de l&apos;aéroport de Charleroi (EBCI). Arrivez 15 min avant l&apos;heure prévue.
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <Link
              href="/account#reservations"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#113356] text-white rounded-xl text-sm font-semibold hover:bg-[#0b2238] transition-colors"
            >
              <CalendarDays size={15} />
              Accéder à mon compte
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

  return (
    <main className="min-h-screen bg-[#f5f5f7] flex items-center justify-center px-4 pt-[86px] pb-16">
      <div className="max-w-md w-full bg-white rounded-2xl border border-border shadow-sm p-8 text-center">

        <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="text-green-600" size={28} />
        </div>

        <h1 className="text-xl font-bold text-foreground mb-2">
          Demande envoyée !
        </h1>
        <p className="text-muted-foreground text-sm mb-6 leading-relaxed">
          Votre demande de réservation a bien été reçue. Vous allez recevoir un email de confirmation.
        </p>

        <div className="bg-secondary/40 rounded-xl p-4 space-y-3 text-left mb-6">
          <div className="flex items-start gap-2.5">
            <CalendarDays size={14} className="text-[#113356] mt-0.5 shrink-0" />
            <p className="text-xs text-muted-foreground">
              Nous vous contacterons rapidement pour confirmer votre créneau. Suivez l&apos;avancement depuis votre compte.
            </p>
          </div>
          <div className="flex items-start gap-2.5">
            <MapPin size={14} className="text-[#113356] mt-0.5 shrink-0" />
            <p className="text-xs text-muted-foreground">
              Le vol part de l&apos;aéroport de Charleroi (EBCI). Arrivez 15 min avant l&apos;heure prévue.
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <Link
            href="/account#reservations"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#113356] text-white rounded-xl text-sm font-semibold hover:bg-[#0b2238] transition-colors"
          >
            <CalendarDays size={15} />
            Suivre ma réservation
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
