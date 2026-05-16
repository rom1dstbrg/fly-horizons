import { Mail, MapPin, Clock, Bug } from "lucide-react";
import { ContactForm } from "@/components/shop/ContactForm";

export const metadata = {
  title: "Contact — Fly Horizons",
  description: "Une question ? Un problème ? Contactez l'équipe Fly Horizons.",
};

export default function ContactPage() {
  return (
    <main className="bg-[#f5f5f7] flex flex-col">

      {/* ── En-tête ── */}
      <div className="pt-[98px] pb-8 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto">
          <p className="text-xs font-bold text-[#113356] uppercase tracking-[3px] mb-2">Support</p>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-foreground mb-2">Contactez-nous</h1>
          <p className="text-muted-foreground text-sm max-w-md leading-relaxed">
            Une question, un problème ou simplement envie d&apos;en savoir plus ?
            Écrivez-nous, nous vous répondons sous 48&nbsp;h.
          </p>
        </div>
      </div>

      {/* ── Contenu ── */}
      <div className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 pb-12">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

          {/* Colonne info */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white rounded-2xl border border-border p-6 shadow-sm space-y-5">
              <h2 className="font-bold text-foreground text-sm">Informations</h2>

              <div className="flex gap-3.5">
                <div className="w-9 h-9 rounded-xl bg-[#f5f8ff] border border-[#dce8ff] flex items-center justify-center shrink-0">
                  <Mail size={16} className="text-[#113356]" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">Email</p>
                  <a href="mailto:info@fly-horizons.com" className="text-sm font-semibold text-[#113356] hover:underline">
                    info@fly-horizons.com
                  </a>
                </div>
              </div>

              <div className="flex gap-3.5">
                <div className="w-9 h-9 rounded-xl bg-[#f5f8ff] border border-[#dce8ff] flex items-center justify-center shrink-0">
                  <MapPin size={16} className="text-[#113356]" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">Aérodrome de départ</p>
                  <p className="text-sm font-semibold text-foreground">Charleroi — EBCI</p>
                  <p className="text-xs text-muted-foreground">Belgique</p>
                </div>
              </div>

              <div className="flex gap-3.5">
                <div className="w-9 h-9 rounded-xl bg-[#f5f8ff] border border-[#dce8ff] flex items-center justify-center shrink-0">
                  <Clock size={16} className="text-[#113356]" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">Délai de réponse</p>
                  <p className="text-sm font-semibold text-foreground">Sous 48 h ouvrables</p>
                </div>
              </div>
            </div>

            {/* Bug report */}
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
              <div className="flex gap-3">
                <Bug size={18} className="text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-amber-800 mb-1">Signaler un bug</p>
                  <p className="text-xs text-amber-700 leading-relaxed">
                    Ce site est en amélioration continue. Si vous rencontrez un comportement inattendu, signalez-le — votre retour est précieux.
                  </p>
                  <p className="text-xs text-amber-600 mt-2 font-medium">
                    Choisissez le sujet <em>&ldquo;Bug ou problème technique&rdquo;</em>.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Formulaire */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-2xl border border-border p-6 sm:p-8 shadow-sm">
              <h2 className="font-bold text-foreground text-sm mb-6">Envoyez-nous un message</h2>
              <ContactForm />
            </div>
          </div>

        </div>
      </div>

      {/* ── À propos de ce site ── */}
      <div className="border-t border-border py-8 px-4 sm:px-6">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-[2.5px] mb-2">À propos de ce site</p>
          <p className="text-sm text-muted-foreground leading-relaxed max-w-xl mx-auto">
            Cette boutique a été développée et est maintenue par{" "}
            <strong className="text-foreground">Romain DESTANBERG (BE.FCL.214192.A)</strong>,
            pilote et fondateur de Fly Horizons. Elle est en amélioration continue — des imperfections peuvent survenir.
            Tout retour ou bug signalé via ce formulaire est lu et traité personnellement.
          </p>
        </div>
      </div>

    </main>
  );
}
