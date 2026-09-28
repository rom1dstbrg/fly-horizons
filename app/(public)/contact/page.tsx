import Link from "next/link";
import { MapPin, Mail, Clock, MessageCircle } from "lucide-react";
import { ContactForm } from "@/components/shop/ContactForm";
import { AskAssistantLink } from "./AskAssistantLink";
import { ChatWidget } from "@/components/chat/ChatWidget";

export const metadata = {
  title: "Contact · Fly Horizons",
  description: "Une question sur votre demande ou votre vol ? Écrivez à Fly Horizons. Réponse personnelle sous 24 h.",
};

// Nouvelle DA (maquette-contact.html, variante C, 28/09).
// Ordinateur : titre + formulaire à gauche (7) | infos à droite (5), qui démarrent à la
// hauteur du titre. Téléphone : uniquement le titre et le formulaire (demande de Romain).
// Point de rendez-vous = mêmes coordonnées que /access-ebci.

const MEET_COORDS = "50.45787645919888,4.454058485690142";
const GMAPS_DIR   = `https://www.google.com/maps/dir/?api=1&destination=${MEET_COORDS}`;
const GMAPS_EMBED = `https://maps.google.com/maps?q=${MEET_COORDS}&z=16&output=embed`;

const WRAP = "max-w-[1400px] mx-auto px-4 sm:px-6 xl:px-10";
const LINK = "font-semibold text-[#0b2238] underline decoration-[#0b2238]/25 underline-offset-[3px] hover:decoration-primary transition-colors";

function InfoRow({ Icon, title, children }: { Icon: typeof Mail; title: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3.5 py-4 border-b border-border last:border-b-0">
      <span className="w-[38px] h-[38px] shrink-0 rounded-[10px] bg-secondary grid place-items-center text-[#0b2238]">
        <Icon size={16} />
      </span>
      <div className="text-sm leading-relaxed text-foreground/70">
        <p className="font-bold text-foreground mt-0.5 mb-0.5">{title}</p>
        {children}
      </div>
    </div>
  );
}

export default function ContactPage() {
  return (
    <main className="min-h-screen bg-white">
      <section className="pt-page pb-16 lg:pb-28">
        <div className={`${WRAP} lg:grid lg:grid-cols-[7fr_5fr] lg:grid-rows-[auto_1fr] lg:gap-x-20`}>

          <div className="lg:col-start-1 lg:row-start-1">
            <p className="text-[11px] font-bold text-primary uppercase tracking-[3px] mb-3">Contact</p>
            <h1 className="text-[34px] lg:text-[52px] font-black text-foreground leading-[1.03] tracking-[-0.02em]">
              Écrivez-nous.
            </h1>
            <p className="mt-3.5 max-w-[460px] text-base lg:text-[17px] leading-[1.7] text-foreground/80">
              Une personne de l&apos;équipe lit chaque message et vous répond par email sous 24&nbsp;h.
            </p>
          </div>

          <div className="mt-7 lg:col-start-1 lg:row-start-2 max-w-[720px]">
            <ContactForm />
          </div>

          {/* Infos : ordinateur uniquement */}
          <aside aria-label="Nous trouver et nous joindre" className="hidden lg:block lg:col-start-2 lg:row-start-1 lg:row-span-2 self-start">
            <div className="aspect-[4/3] rounded-[14px] overflow-hidden bg-secondary mb-2">
              <iframe
                src={GMAPS_EMBED}
                title="Point de rendez-vous Fly Horizons"
                className="w-full h-full border-0"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
            <InfoRow Icon={MapPin} title="Point de rendez-vous">
              <p>Aviation générale, aérodrome de Charleroi (EBCI), 6041 Gosselies</p>
              <p className="mt-1.5 text-[13px] text-muted-foreground">
                <a href={GMAPS_DIR} target="_blank" rel="noopener noreferrer" className={LINK}>Itinéraire GPS</a>
                {" · "}
                <Link href="/access-ebci" className={LINK}>Plan d&apos;accès détaillé</Link>
              </p>
            </InfoRow>
            <InfoRow Icon={Mail} title="Email">
              <a href="mailto:info@fly-horizons.com" className={LINK}>info@fly-horizons.com</a>
            </InfoRow>
            <InfoRow Icon={Clock} title="Délai de réponse">
              <p>Sous 24&nbsp;h, par une personne de l&apos;équipe</p>
            </InfoRow>
            <InfoRow Icon={MessageCircle} title="Une question simple ?">
              <p>
                <AskAssistantLink className={LINK} /> ou consultez la{" "}
                <Link href="/faq" className={LINK}>FAQ</Link>
              </p>
            </InfoRow>
          </aside>

        </div>
      </section>

      <ChatWidget mobileVisible />
    </main>
  );
}
