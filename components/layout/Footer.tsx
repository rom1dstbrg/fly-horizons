import Link from "next/link";
import Image from "next/image";
import { Mail, Lock } from "lucide-react";
import { FaWhatsapp } from "react-icons/fa6";
import { NewsletterForm } from "@/components/NewsletterForm";

function IconFacebook({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
    </svg>
  );
}
function IconInstagram({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
    </svg>
  );
}

const SOCIALS = [
  { href: "mailto:info@fly-horizons.com",                            label: "E-mail",     icon: <Mail size={15} /> },
  { href: "https://www.facebook.com/profile.php?id=61569809631946",  label: "Facebook",  icon: <IconFacebook size={15} /> },
  { href: "https://www.instagram.com/fly_horizons_belgium/",         label: "Instagram", icon: <IconInstagram size={15} /> },
  { href: "https://wa.me/32472324135",                               label: "WhatsApp",  icon: <FaWhatsapp size={15} /> },
];

const INFOS = [
  { href: "/nos-offres", label: "Nos offres" },
  { href: "/about",      label: "À propos" },
  { href: "/faq",        label: "FAQ" },
  { href: "/galerie",    label: "Galerie" },
];

const PRATIQUE = [
  { href: "/access-ebci", label: "Plan d'accès · EBCI" },
  { href: "/nos-offres", label: "Réserver un vol" },
  { href: "/account",     label: "Mon compte" },
];

export function Footer() {
  const year = new Date().getFullYear();
  const lnk  = "text-sm text-white/45 hover:text-white transition-colors";
  const hd   = "text-[10px] font-bold text-primary uppercase tracking-[2px] mb-4";
  const social = "text-white/40 hover:text-white transition-colors";

  return (
    <footer className="bg-navy border-t border-white/5 mt-auto">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 xl:px-10">

        {/* ════════════════════════════════
            VERSION MOBILE  (< lg)
        ════════════════════════════════ */}
        <div className="lg:hidden py-8 space-y-7">

          {/* Logo + tagline + réseaux */}
          <div>
            <Link href="/" className="inline-block mb-4">
              <Image src="/fly-horizons-logo-white.svg" alt="Fly Horizons"
                width={140} height={36} className="block h-7 w-auto object-contain" unoptimized />
            </Link>
            <p className="text-white/40 text-sm leading-relaxed mb-4">
              Vols partagés en avion léger avec Romain, pilote et fondateur, au départ de
              l&apos;aérodrome de Charleroi (EBCI).
            </p>
            <div className="flex items-center gap-4">
              {SOCIALS.map(({ href, label, icon }) => (
                <a key={href} href={href} target={href.startsWith("http") ? "_blank" : undefined}
                  rel={href.startsWith("http") ? "noopener noreferrer" : undefined}
                  aria-label={label} className={social}>
                  {icon}
                </a>
              ))}
            </div>
          </div>

          {/* Séparateur */}
          <div className="h-px bg-white/5" />

          {/* Liens — 1 colonne */}
          <div className="flex flex-col gap-6">
            <div>
              <p className="text-[9px] font-bold text-primary/70 uppercase tracking-[2px] mb-3">Informations</p>
              <ul className="space-y-2.5">
                {INFOS.map(({ href, label }) => (
                  <li key={href}><Link href={href} className="text-sm text-white/50 hover:text-white transition-colors">{label}</Link></li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-[9px] font-bold text-primary/70 uppercase tracking-[2px] mb-3">Pratique</p>
              <ul className="space-y-2.5">
                {PRATIQUE.map(({ href, label }) => (
                  <li key={href}><Link href={href} className="text-sm text-white/50 hover:text-white transition-colors">{label}</Link></li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-[9px] font-bold text-primary/70 uppercase tracking-[2px] mb-3">Contact</p>
              <ul className="space-y-2.5">
                <li><a href="mailto:info@fly-horizons.com" className="text-sm text-white/50 hover:text-white transition-colors">info@fly-horizons.com</a></li>
                <li><Link href="/contact" className="text-sm text-white/50 hover:text-white transition-colors">Formulaire de contact</Link></li>
                <li><a href="https://wa.me/32472324135" target="_blank" rel="noopener noreferrer" className="text-sm text-white/50 hover:text-white transition-colors">WhatsApp</a></li>
              </ul>
            </div>
          </div>

          {/* Séparateur */}
          <div className="h-px bg-white/5" />

          {/* Newsletter */}
          <div>
            <p className="text-[9px] font-bold text-primary/70 uppercase tracking-[2px] mb-3">Newsletter</p>
            <p className="text-sm text-white/40 mb-4">Recevez un email dès qu&apos;un vol est organisé.</p>
            <NewsletterForm compact />
          </div>

          {/* Séparateur */}
          <div className="h-px bg-white/5" />

          {/* Barre de bas mobile */}
          <div className="flex flex-col items-center gap-2.5 text-center">
            <p className="text-[11px] text-white/25">© {year} Fly Horizons, DESTANBERG Romain, Rue des Fusillés, 6040 Charleroi. Tous droits réservés.</p>
            <div className="flex items-center gap-2.5 text-[11px] text-white/25">
              <Link href="/cgp" target="_blank" rel="noopener noreferrer" className="hover:text-white/60 transition-colors">Conditions générales</Link>
              <span className="text-white/15">·</span>
              <Link href="/politique-de-confidentialite" target="_blank" rel="noopener noreferrer" className="hover:text-white/60 transition-colors">Confidentialité</Link>
              <span className="text-white/15">·</span>
              <Link href="/contact" className="hover:text-white/60 transition-colors">Contact</Link>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-white/20">
              <Lock size={9} />
              <span>Paiement sécurisé</span>
              <span className="text-primary/70 font-semibold">Stripe</span>
            </div>
          </div>

        </div>

        {/* ════════════════════════════════
            VERSION DESKTOP  (≥ lg)
        ════════════════════════════════ */}
        <div className="hidden lg:block">

          {/* ── Logo / tagline / réseaux + 3 colonnes de liens + newsletter ───────── */}
          <div className="grid lg:grid-cols-[1.6fr_0.9fr_0.9fr_0.9fr_1.3fr] gap-8 py-12">

            {/* Marque */}
            <div>
              <Link href="/" className="inline-block mb-4">
                <Image src="/fly-horizons-logo-white.svg" alt="Fly Horizons"
                  width={160} height={40} className="block h-8 w-auto object-contain" unoptimized />
              </Link>
              <p className="text-white/40 text-sm leading-relaxed max-w-xs mb-5">
                Vols partagés en avion léger avec Romain, pilote et fondateur, au départ de
                l&apos;aérodrome de Charleroi (EBCI).
              </p>
              <div className="flex items-center gap-4">
                {SOCIALS.map(({ href, label, icon }) => (
                  <a key={href} href={href} target={href.startsWith("http") ? "_blank" : undefined}
                    rel={href.startsWith("http") ? "noopener noreferrer" : undefined}
                    aria-label={label} className={social}>
                    {icon}
                  </a>
                ))}
              </div>
            </div>

            {/* Informations */}
            <div>
              <p className={hd}>Informations</p>
              <ul className="space-y-2.5">
                {INFOS.map(({ href, label }) => (
                  <li key={href}><Link href={href} className={lnk}>{label}</Link></li>
                ))}
              </ul>
            </div>

            {/* Pratique */}
            <div>
              <p className={hd}>Pratique</p>
              <ul className="space-y-2.5">
                {PRATIQUE.map(({ href, label }) => (
                  <li key={href}><Link href={href} className={lnk}>{label}</Link></li>
                ))}
              </ul>
            </div>

            {/* Contact */}
            <div>
              <p className={hd}>Contact</p>
              <ul className="space-y-2.5">
                <li><a href="mailto:info@fly-horizons.com" className={lnk}>info@fly-horizons.com</a></li>
                <li><Link href="/contact" className={lnk}>Formulaire de contact</Link></li>
                <li><a href="https://wa.me/32472324135" target="_blank" rel="noopener noreferrer" className={lnk}>WhatsApp</a></li>
              </ul>
            </div>

            {/* Newsletter */}
            <div>
              <p className={hd}>Newsletter</p>
              <p className="text-sm text-white/40 leading-relaxed mb-4">
                Recevez un email dès qu&apos;un vol est organisé.
              </p>
              <NewsletterForm compact />
            </div>

          </div>

          {/* ── Barre de bas ────────────────────────────────────────── */}
          <div className="py-5 border-t border-white/5 flex items-center justify-between gap-3">
            <p className="text-xs text-white/25">© {year} Fly Horizons, DESTANBERG Romain, Rue des Fusillés, 6040 Charleroi. Tous droits réservés.</p>
            <div className="flex items-center gap-4 text-xs text-white/25">
              <div className="flex items-center gap-3">
                <Link href="/cgp" target="_blank" rel="noopener noreferrer" className="hover:text-white/60 transition-colors">Conditions générales</Link>
                <span>·</span>
                <Link href="/politique-de-confidentialite" target="_blank" rel="noopener noreferrer" className="hover:text-white/60 transition-colors">Confidentialité</Link>
                <span>·</span>
                <Link href="/contact" className="hover:text-white/60 transition-colors">Contact</Link>
              </div>
              <div className="flex items-center gap-1.5">
                <Lock size={9} />
                <span>Paiement sécurisé</span>
                <span className="text-primary font-semibold">Stripe</span>
              </div>
            </div>
          </div>

        </div>

      </div>
    </footer>
  );
}
