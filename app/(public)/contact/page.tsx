import React from "react";
import Link from "next/link";
import { Mail, ArrowRight } from "lucide-react";
import { FaWhatsapp } from "react-icons/fa6";
import { ContactForm } from "@/components/shop/ContactForm";
import { ChatSidebarRow } from "./ChatSidebarRow";
import { ChatWidget } from "@/components/chat/ChatWidget";

export const metadata = {
  title: "Contact · Fly Horizons",
  description: "Une question sur votre réservation ou votre vol ? Contactez Fly Horizons. Réponse personnelle sous 24 h.",
};

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
          <div className="grid lg:grid-cols-[1fr_300px] gap-6 lg:gap-10 items-start">

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
            <div className="bg-card border border-border rounded-lg shadow-premium overflow-hidden lg:sticky lg:top-28">

              {/* Email */}
              <a
                href="mailto:info@fly-horizons.com"
                className="group flex items-center gap-4 p-5 border-b border-border hover:bg-secondary transition-colors"
              >
                <div className="w-9 h-9 rounded-lg bg-secondary border border-border flex items-center justify-center text-[#0b2238] shrink-0 group-hover:bg-primary group-hover:border-primary group-hover:shadow-gold-sm transition-all">
                  <Mail size={15} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-black text-foreground text-sm">Email</p>
                  <p className="text-muted-foreground text-xs mt-0.5 truncate">info@fly-horizons.com</p>
                </div>
                <ArrowRight size={15} className="shrink-0 text-muted-foreground/40 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
              </a>

              {/* WhatsApp */}
              <a
                href="https://wa.me/32472324135"
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center gap-4 p-5 border-b border-border hover:bg-secondary transition-colors"
              >
                <div className="w-9 h-9 rounded-lg bg-[#25D366]/10 border border-[#25D366]/20 flex items-center justify-center text-[#25D366] shrink-0 transition-all">
                  <FaWhatsapp size={17} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-black text-foreground text-sm">WhatsApp</p>
                  <p className="text-muted-foreground text-xs mt-0.5">Disponible 7&nbsp;j/7</p>
                </div>
                <ArrowRight size={15} className="shrink-0 text-muted-foreground/40 group-hover:text-[#25D366] group-hover:translate-x-0.5 transition-all" />
              </a>

              {/* Chat IA */}
              <ChatSidebarRow />

            </div>
          </div>

        </div>
      </section>

      <ChatWidget mobileVisible />
    </main>
  );
}
