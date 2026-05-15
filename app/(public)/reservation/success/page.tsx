import Link from "next/link";
import { CheckCircle } from "lucide-react";

export default function ReservationSuccessPage() {
  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <div className="flex justify-center mb-6">
          <div className="w-20 h-20 rounded-full bg-green-500/10 flex items-center justify-center">
            <CheckCircle className="text-green-500" size={40} />
          </div>
        </div>

        <h1 className="text-2xl font-bold text-foreground mb-3">
          Demande envoyée !
        </h1>
        <p className="text-muted-foreground mb-2 leading-relaxed">
          Votre demande de réservation a bien été reçue. Vous allez recevoir un email de confirmation.
        </p>
        <p className="text-muted-foreground text-sm mb-8">
          Nous vous contacterons rapidement pour confirmer votre vol.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/"
            className="inline-flex items-center justify-center px-6 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            Retour à l&apos;accueil
          </Link>
          <a
            href="https://fly-horizons.com"
            className="inline-flex items-center justify-center px-6 py-2.5 rounded-lg border border-border text-sm font-medium hover:bg-secondary transition-colors"
          >
            fly-horizons.com
          </a>
        </div>
      </div>
    </div>
  );
}
