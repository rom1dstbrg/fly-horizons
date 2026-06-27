import Link from "next/link";
import Image from "next/image";
import { Mail, MapPin, Lock, Clock } from "lucide-react";
import { FaPlane, FaRoute, FaUser, FaCircleQuestion, FaBookOpen, FaMap, FaCircleUser, FaRightToBracket, FaEnvelope, FaImages } from "react-icons/fa6";
import type { IconType } from "react-icons";
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

const SERVICES: { href: string; label: string; icon: IconType }[] = [
  { href: "/nos-offres",     label: "Nos offres",     icon: FaPlane },
  { href: "/vol-sur-mesure", label: "Vol sur mesure", icon: FaRoute },
];

const INFOS: { href: string; label: string; icon: IconType }[] = [
  { href: "/about",       label: "À propos",            icon: FaUser },
  { href: "/faq",         label: "FAQ",                 icon: FaCircleQuestion },
  { href: "/guide",       label: "Guide passager",      icon: FaBookOpen },
  { href: "/access-ebci", label: "Plan d'accès · EBCI", icon: FaMap },
  { href: "/galerie",     label: "Galerie",             icon: FaImages },
];

const MON_ESPACE: { href: string; label: string; icon: IconType }[] = [
  { href: "/account", label: "Mon compte", icon: FaCircleUser },
  { href: "/login",   label: "Connexion",  icon: FaRightToBracket },
];

const SOCIALS = [
  { href: "https://www.facebook.com/profile.php?id=61569809631946", label: "Facebook",  icon: <IconFacebook size={15} /> },
  { href: "https://www.instagram.com/fly_horizons_belgium/",         label: "Instagram", icon: <IconInstagram size={15} /> },
];

export function Footer() {
  const year = new Date().getFullYear();
  const lnk  = "text-sm text-white/45 hover:text-white transition-colors";
  const hd   = "text-[10px] font-bold text-primary uppercase tracking-[2px] mb-4";

  return (
    <footer className="bg-navy border-t border-white/5 mt-auto">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 xl:px-10">

        {/* ════════════════════════════════
            VERSION MOBILE  (< lg)
        ════════════════════════════════ */}
        <div className="lg:hidden py-8 space-y-6">

          {/* Logo + réseaux */}
          <div className="flex items-center justify-between">
            <Link href="/" className="inline-block">
              <Image src="/fly-horizons-logo-white.svg" alt="Fly Horizons"
                width={140} height={36} className="block h-7 w-auto object-contain" unoptimized />
            </Link>
            <div className="flex items-center gap-2">
              {SOCIALS.map(({ href, label, icon }) => (
                <a key={href} href={href} target="_blank" rel="noopener noreferrer" aria-label={label}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-white/40 hover:text-white hover:bg-white/8 border border-white/8 transition-all">
                  {icon}
                </a>
              ))}
            </div>
          </div>

          {/* Tagline */}
          <p className="text-white/35 text-xs leading-relaxed">
            Baptêmes de l&apos;air en avion léger depuis Charleroi (EBCI).
            Partage de frais réglementé NCO.GEN.104.
          </p>

          {/* Newsletter mobile */}
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <p className="text-base font-black text-white mb-1">Restez dans la boucle.</p>
            <p className="text-xs text-white/40 mb-4">Actus et offres exclusives en avant-première.</p>
            <NewsletterForm compact />
          </div>

          {/* Séparateur gold */}
          <div className="h-px bg-gradient-to-r from-primary/40 via-primary/10 to-transparent" />

          {/* Liens de navigation — 2 colonnes */}
          <div className="grid grid-cols-2 gap-x-6 gap-y-5">
            {/* Colonne gauche : Vols */}
            <div>
              <p className="text-[9px] font-bold text-primary/70 uppercase tracking-[2px] mb-3">Vols</p>
              <ul className="space-y-2.5">
                {SERVICES.map(({ href, label, icon: Icon }) => (
                  <li key={href}>
                    <Link href={href} className="flex items-center gap-2 text-sm text-white/50 hover:text-white transition-colors">
                      <Icon size={12} className="shrink-0" />{label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Colonne droite : Infos */}
            <div>
              <p className="text-[9px] font-bold text-primary/70 uppercase tracking-[2px] mb-3">Informations</p>
              <ul className="space-y-2.5">
                {INFOS.map(({ href, label, icon: Icon }) => (
                  <li key={href}>
                    <Link href={href} className="flex items-center gap-2 text-sm text-white/50 hover:text-white transition-colors">
                      <Icon size={12} className="shrink-0" />{label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Colonne gauche : Mon espace */}
            <div>
              <p className="text-[9px] font-bold text-primary/70 uppercase tracking-[2px] mb-3">Mon espace</p>
              <ul className="space-y-2.5">
                {MON_ESPACE.map(({ href, label, icon: Icon }) => (
                  <li key={href}>
                    <Link href={href} className="flex items-center gap-2 text-sm text-white/50 hover:text-white transition-colors">
                      <Icon size={12} className="shrink-0" />{label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Colonne droite : Contact */}
            <div>
              <p className="text-[9px] font-bold text-primary/70 uppercase tracking-[2px] mb-3">Contact</p>
              <ul className="space-y-2.5">
                <li>
                  <a href="mailto:info@fly-horizons.com" className="flex items-center gap-2 text-sm text-white/50 hover:text-white transition-colors">
                    <FaEnvelope size={12} className="shrink-0" />info@fly-horizons.com
                  </a>
                </li>
                <li>
                  <Link href="/contact" className="flex items-center gap-2 text-sm text-white/50 hover:text-white transition-colors">
                    <FaEnvelope size={12} className="shrink-0" />Formulaire de contact
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          {/* Séparateur */}
          <div className="h-px bg-white/5" />

          {/* Infos pratiques compactes */}
          <div className="flex flex-col items-center gap-2">
            <div className="flex items-center gap-2.5">
              <MapPin size={11} className="shrink-0" />
              <span className="text-xs text-white/30">Charleroi EBCI · Gosselies, Belgique</span>
            </div>
            <div className="flex items-center gap-2.5">
              <Clock size={11} className="shrink-0" />
              <span className="text-xs text-white/30">7j/7 sur réservation · Réponse email sous 24 h</span>
            </div>
          </div>

          {/* Séparateur */}
          <div className="h-px bg-white/5" />

          {/* Barre de bas mobile */}
          <div className="flex flex-col items-center gap-2.5 text-center">
            <p className="text-[11px] text-white/25">© {year} Fly Horizons. Tous droits réservés.</p>
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

          {/* ── Newsletter band ─────────────────────────────────────── */}
          <div className="py-10 flex items-center justify-between gap-16 border-b border-white/8">
            <div className="shrink-0">
              <p className="text-2xl font-black text-white tracking-tight leading-tight">
                Restez dans la boucle.
              </p>
              <p className="text-sm text-white/45 mt-1.5">
                Actualités, nouvelles destinations et offres exclusives en avant-première.
              </p>
            </div>
            <div className="w-full max-w-md">
              <NewsletterForm compact />
            </div>
          </div>

          {/* ── Grille liens ────────────────────────────────────────── */}
          <div className="grid lg:grid-cols-[2fr_1fr_1fr_1fr_1fr] gap-10 py-10 border-b border-white/5">

            {/* Marque */}
            <div>
              <Link href="/" className="inline-block">
                <Image src="/fly-horizons-logo-white.svg" alt="Fly Horizons"
                  width={160} height={40} className="block h-8 w-auto object-contain" unoptimized />
              </Link>
              <p className="text-white/40 text-sm leading-relaxed max-w-xs mt-4">
                Baptêmes de l&apos;air et vols sur mesure en avion léger depuis Charleroi · EBCI.
                Organisés dans le cadre du partage de frais réglementé (NCO.GEN.104).
              </p>
              <div className="mt-4 flex items-center gap-2">
                {SOCIALS.map(({ href, label, icon }) => (
                  <a key={href} href={href} target="_blank" rel="noopener noreferrer" aria-label={label}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-white/40 hover:text-white hover:bg-white/8 border border-white/8 hover:border-white/20 transition-all">
                    {icon}
                  </a>
                ))}
              </div>
            </div>

            {/* Nos services */}
            <div>
              <p className={hd}>Nos services</p>
              <ul className="space-y-2.5">
                {SERVICES.map(({ href, label, icon: Icon }) => (
                  <li key={href}>
                    <Link href={href} className={lnk + " flex items-center gap-2"}>
                      <Icon size={12} className="shrink-0" />{label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Informations */}
            <div>
              <p className={hd}>Informations</p>
              <ul className="space-y-2.5">
                {INFOS.map(({ href, label, icon: Icon }) => (
                  <li key={href}>
                    <Link href={href} className={lnk + " flex items-center gap-2"}>
                      <Icon size={12} className="shrink-0" />{label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Mon espace */}
            <div>
              <p className={hd}>Mon espace</p>
              <ul className="space-y-2.5">
                {MON_ESPACE.map(({ href, label, icon: Icon }) => (
                  <li key={href}>
                    <Link href={href} className={lnk + " flex items-center gap-2"}>
                      <Icon size={12} className="shrink-0" />{label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Contact */}
            <div>
              <p className={hd}>Contact</p>
              <div className="space-y-3">
                <div className="flex items-start gap-2.5">
                  <Mail size={13} className="text-primary shrink-0 mt-0.5" />
                  <a href="mailto:info@fly-horizons.com" className="text-sm text-white/45 hover:text-white transition-colors">
                    info@fly-horizons.com
                  </a>
                </div>
                <div className="flex items-start gap-2.5">
                  <MapPin size={13} className="text-primary shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm text-white/45">Aéroport de Charleroi</p>
                    <p className="text-xs text-white/25 mt-0.5">EBCI · Gosselies, Belgique</p>
                  </div>
                </div>
                <div className="flex items-start gap-2.5">
                  <Clock size={13} className="text-primary shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm text-white/45">7j/7 sur réservation</p>
                    <p className="text-xs text-white/25 mt-0.5">Réponse email sous 24 h</p>
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* ── Barre de bas ────────────────────────────────────────── */}
          <div className="py-5 flex items-center justify-between gap-3">
            <p className="text-xs text-white/25">© {year} Fly Horizons. Tous droits réservés.</p>
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
