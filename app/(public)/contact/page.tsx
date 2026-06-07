import Link from "next/link";
import { Mail, MapPin, Clock } from "lucide-react";
import { ContactForm } from "@/components/shop/ContactForm";
import { ChatWidget } from "@/components/chat/ChatWidget";

export const metadata = {
  title: "Contact · Fly Horizons",
  description: "Une question sur votre réservation ou votre vol ? Contactez Fly Horizons. Réponse personnelle sous 24 h.",
};

export default function ContactPage() {
  return (
    <main className="min-h-screen bg-[#f5f5f7]">

      {/* ══ INTRO ══ */}
      <section className="pt-[98px] pb-20 sm:pb-28">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 xl:px-10 pt-12">

          <div className="grid lg:grid-cols-2 gap-8 lg:gap-x-20 items-start">

            {/* 1. Header — toujours en premier */}
            <div className="order-1 lg:col-start-1 lg:row-start-1">
              <p className="text-xs font-bold text-primary uppercase tracking-[3px] mb-4">Contact</p>
              <h1 className="text-5xl sm:text-6xl font-black text-foreground leading-none tracking-tight mb-6">
                Une question ?<br />
                <span className="text-primary">Écrivez-nous.</span>
              </h1>
              <p className="text-foreground/60 text-sm leading-relaxed max-w-sm">
                Nous vous répondons personnellement sous 24&nbsp;h.
                Pas de support externalisé, pas de réponse automatique.
              </p>
            </div>

            {/* 2. Formulaire — deuxième sur mobile, colonne droite sur desktop */}
            <div className="card-premium p-7 sm:p-10 order-2 lg:col-start-2 lg:row-start-1 lg:row-span-2">
              <h2 className="text-xl font-black text-foreground mb-1">Envoyez un message</h2>
              <p className="text-xs text-foreground/50 mb-7">
                Votre question est peut-être déjà répondue dans notre{" "}
                <Link href="/faq" className="text-foreground font-semibold hover:text-primary transition-colors">
                  FAQ
                </Link>.
              </p>
              <ContactForm />
            </div>

            {/* 3. Infos — troisième sur mobile, sous le header sur desktop */}
            <div className="order-3 lg:col-start-1 lg:row-start-2">
              {[
                {
                  Icon: Mail,
                  label: "Email",
                  value: "info@fly-horizons.com",
                  href: "mailto:info@fly-horizons.com",
                },
                {
                  Icon: MapPin,
                  label: "Aérodrome de départ",
                  value: "Brussels South Charleroi · EBCI",
                },
                {
                  Icon: Clock,
                  label: "Délai de réponse",
                  value: "Sous 24 h · 7 j/7",
                },
              ].map(({ Icon, label, value, href }) => (
                <div key={label} className="flex items-center gap-4 py-4 border-b border-border/60 last:border-0">
                  <span className="text-primary shrink-0">
                    <Icon size={16} />
                  </span>
                  <div>
                    <p className="text-[11px] text-foreground/40 font-medium mb-0.5 uppercase tracking-wide">{label}</p>
                    {href ? (
                      <a href={href} className="text-sm font-semibold text-foreground hover:text-primary transition-colors">
                        {value}
                      </a>
                    ) : (
                      <p className="text-sm font-semibold text-foreground">{value}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>

          </div>
        </div>
      </section>

      <ChatWidget mobileVisible />
    </main>
  );
}
