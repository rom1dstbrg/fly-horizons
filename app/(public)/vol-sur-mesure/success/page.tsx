import Link from "next/link";
import { CheckCircle, MapPin, Mail } from "lucide-react";

export const metadata = { title: "Réservation confirmée — Fly Horizons" };

export default function VolSurMesureSuccessPage() {
  return (
    <main className="min-h-screen bg-[#f5f5f7] flex items-center justify-center px-4 pt-[86px] pb-16">
      <div className="max-w-md w-full bg-white rounded-2xl border border-border shadow-sm p-8 text-center">
        <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="text-green-600" size={28} />
        </div>
        <h1 className="text-xl font-bold text-foreground mb-2">Demande envoyée !</h1>
        <p className="text-muted-foreground text-sm mb-6 leading-relaxed">
          Votre acompte a bien été reçu. Vous allez recevoir un email de confirmation.
        </p>

        <div className="bg-secondary/40 rounded-xl p-4 space-y-3 text-left mb-6">
          <div className="flex items-start gap-2.5">
            <Mail size={14} className="text-primary mt-0.5 shrink-0" />
            <p className="text-xs text-muted-foreground">
              Un email de confirmation vous a été envoyé avec les détails de votre vol sur mesure.
            </p>
          </div>
          <div className="flex items-start gap-2.5">
            <MapPin size={14} className="text-primary mt-0.5 shrink-0" />
            <p className="text-xs text-muted-foreground">
              Nous vous recontacterons sous 24h pour affiner votre itinéraire et confirmer la date exacte.
            </p>
          </div>
        </div>

        <p className="text-xs text-muted-foreground mb-6">
          Le solde sera réglé à l&apos;issue du vol selon la durée réelle de votre trajet.
        </p>

        <Link
          href="/"
          className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors"
        >
          Retour à l&apos;accueil
        </Link>
      </div>
    </main>
  );
}
