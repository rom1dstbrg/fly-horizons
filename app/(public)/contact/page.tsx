import Link from "next/link";
import { Mail, MapPin, Clock } from "lucide-react";
import { ContactForm } from "@/components/shop/ContactForm";

export const metadata = {
  title: "Contact · Fly Horizons",
  description: "Une question sur votre réservation ou votre vol ? Contactez Romain, fondateur de Fly Horizons. Réponse personnelle sous 24 h.",
};

export default function ContactPage() {
  return (
    <main className="min-h-screen bg-gradient-navy pt-24 pb-16">
      <div className="container-shop max-w-5xl">

        {/* En-tête */}
        <div className="mb-10">
          <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-2">Contact</p>
          <h1 className="text-3xl font-bold text-foreground">Contactez-nous</h1>
          <p className="text-muted-foreground text-sm mt-2 max-w-lg">
            Une question, un problème ou envie d&apos;en savoir plus ?
            Écrivez-nous : Romain vous répond personnellement sous 24&nbsp;h.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">

          {/* Formulaire — 1er sur mobile, 2e sur desktop */}
          <div className="lg:col-span-2 lg:order-2">
            <div className="card-premium p-6 sm:p-8">
              <h2 className="font-semibold text-foreground mb-2">Envoyez-nous un message</h2>
              <p className="text-xs text-muted-foreground mb-6">
                Votre question est peut-être déjà répondue dans notre{" "}
                <Link href="/faq" className="text-primary hover:text-gold-400 transition-colors font-medium">FAQ</Link>.
              </p>
              <ContactForm />
            </div>
          </div>

          {/* Colonne info — 2e sur mobile, 1er sur desktop */}
          <div className="space-y-4 lg:order-1">

            <div className="card-premium p-6 space-y-5">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Informations</p>

              <div className="flex gap-3.5">
                <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                  <Mail size={15} className="text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">Email</p>
                  <a href="mailto:info@fly-horizons.com"
                    className="text-sm font-semibold text-foreground hover:text-primary transition-colors">
                    info@fly-horizons.com
                  </a>
                </div>
              </div>

              <div className="flex gap-3.5">
                <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                  <MapPin size={15} className="text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">Aérodrome de départ</p>
                  <p className="text-sm font-semibold text-foreground">Charleroi, EBCI</p>
                  <p className="text-xs text-muted-foreground">Belgique</p>
                </div>
              </div>

              <div className="flex gap-3.5">
                <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                  <Clock size={15} className="text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">Délai de réponse</p>
                  <p className="text-sm font-semibold text-foreground">Sous 24 h</p>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                    Chaque message est lu et répondu personnellement par Romain. Pas de réponse automatique, pas de support externalisé.
                  </p>
                </div>
              </div>
            </div>

            <div className="card-premium p-5 border-l-2 border-primary space-y-2">
              <p className="text-xs font-semibold text-foreground">Une approche personnelle</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Votre message est lu et répondu par{" "}
                <span className="text-foreground font-medium">Romain</span>,
                fondateur et pilote. Pas de support externalisé, pas de réponse automatique.
              </p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Chaque vol est organisé avec soin. Si vous avez la moindre question avant ou après votre réservation, n&apos;hésitez pas.
              </p>
            </div>

          </div>

        </div>
      </div>
    </main>
  );
}
