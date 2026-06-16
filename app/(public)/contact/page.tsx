import Link from "next/link";
import { Mail, MapPin, Clock, MessageCircle } from "lucide-react";
import { ContactForm } from "@/components/shop/ContactForm";
import { OpenChatButton } from "@/components/shop/OpenChatButton";
import { ChatWidget } from "@/components/chat/ChatWidget";

export const metadata = {
  title: "Contact · Fly Horizons",
  description: "Une question sur votre réservation ou votre vol ? Contactez Fly Horizons. Réponse personnelle sous 24 h.",
};

const CONTACT_ITEMS = [
  { Icon: Mail,   label: "Email",               value: "info@fly-horizons.com",        href: "mailto:info@fly-horizons.com" },
  { Icon: MapPin, label: "Aérodrome de départ", value: "Brussels South Charleroi · EBCI" },
  { Icon: Clock,  label: "Délai de réponse",    value: "Sous 24 h · 7 j/7" },
] as const;

export default function ContactPage() {
  return (
    <main className="min-h-screen bg-[#f5f5f7]">

      <section className="pt-[98px] pb-24 sm:pb-32">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 xl:px-10 pt-2 sm:pt-12">

          {/* ── En-tête ── */}
          <div className="mb-12">
            <p className="text-xs font-bold text-primary uppercase tracking-[3px] mb-4">Contact</p>
            <h1 className="text-5xl sm:text-6xl font-black text-foreground leading-none tracking-tight mb-4">
              Une question ?<br />
              <span className="text-primary">Écrivez-nous.</span>
            </h1>
            <p className="text-muted-foreground text-sm leading-relaxed max-w-sm">
              Réponse personnelle sous 24&nbsp;h. Pas de support externalisé, pas de réponse automatique.
            </p>
          </div>

          {/* ── Grille : formulaire gauche · sidebar droite ── */}
          <div className="grid lg:grid-cols-[1fr_340px] gap-6 lg:gap-8 items-start">

            {/* Formulaire */}
            <div className="bg-card border border-border rounded-lg p-8 sm:p-10 shadow-premium-lg">
              <h2 className="text-2xl font-black text-foreground mb-1">Envoyez un message</h2>
              <p className="text-xs text-muted-foreground mb-8">
                Votre question est peut-être déjà répondue dans notre{" "}
                <Link href="/faq" className="text-foreground font-semibold hover:text-primary transition-colors">
                  FAQ
                </Link>.
              </p>
              <ContactForm />
            </div>

            {/* Sidebar */}
            <div className="flex flex-col gap-4">

              {/* Infos pratiques */}
              <div className="bg-card border border-border rounded-lg p-6 shadow-premium flex flex-col gap-4">
                {CONTACT_ITEMS.map(({ Icon, label, value, href }) => (
                  <div key={label} className="flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-[#0b2238] shadow-gold-sm shrink-0">
                      <Icon size={16} />
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-[2px] mb-0.5">{label}</p>
                      {href ? (
                        <a href={href} className="text-sm font-bold text-foreground hover:text-primary transition-colors">{value}</a>
                      ) : (
                        <p className="text-sm font-bold text-foreground">{value}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Invite chat */}
              <div className="relative bg-navy rounded-lg p-6 overflow-hidden">

                {/* Déco */}
                <div className="absolute -bottom-8 -right-8 w-40 h-40 rounded-full bg-primary/10 pointer-events-none" />
                <div className="absolute top-4 -left-6 w-24 h-24 rounded-full bg-white/[0.03] pointer-events-none" />

                <div className="relative z-10">
                  <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center text-[#0b2238] shadow-gold mb-5">
                    <MessageCircle size={20} />
                  </div>

                  <p className="font-black text-white text-lg leading-snug mb-2">
                    Réponse instantanée ?
                  </p>
                  <p className="text-white/50 text-sm leading-relaxed mb-5">
                    Notre assistant répond en direct aux questions sur les vols, tarifs et bons cadeaux.
                  </p>

                  <OpenChatButton />
                </div>
              </div>

            </div>
          </div>

        </div>
      </section>

      <ChatWidget mobileVisible />
    </main>
  );
}
