import Link from "next/link";
import { Mail, MapPin, Clock } from "lucide-react";
import { ContactForm } from "@/components/shop/ContactForm";

export const metadata = {
  title: "Contact — Fly Horizons",
  description: "Une question ? Un problème ? Contactez l'équipe Fly Horizons.",
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
            Écrivez-nous, nous vous répondons sous 48&nbsp;h.
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
                  <p className="text-sm font-semibold text-foreground">Sous 48 h ouvrables</p>
                </div>
              </div>
            </div>

            <div className="card-premium p-5 border-l-2 border-primary space-y-2">
              <p className="text-xs font-semibold text-foreground">À propos de ce site</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Ce site est développé et maintenu par{" "}
                <span className="text-foreground font-medium">Romain DESTANBERG</span>,
                pilote et fondateur de Fly Horizons. Il est en développement actif et évolue en permanence.
              </p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Des imperfections peuvent survenir. Chaque bug signalé via ce formulaire est lu personnellement : votre retour compte vraiment et aide à améliorer l&apos;expérience pour tous.
              </p>
              <p className="text-xs text-primary font-medium">
                Sujet : &ldquo;Bug ou problème technique&rdquo;
              </p>
            </div>

          </div>

        </div>
      </div>
    </main>
  );
}
