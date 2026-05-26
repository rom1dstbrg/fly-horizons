import Link from "next/link";
import Image from "next/image";
import { Mail, MapPin, Lock, Clock } from "lucide-react";

// ── SVG brand icons (lucide doesn't ship these) ───────────────
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

// ── Data ──────────────────────────────────────────────────────
const SERVICES = [
  { href: "/nos-offres",     label: "Nos offres" },
  { href: "/vol-sur-mesure", label: "Vol sur mesure" },
];

const PAGES = [
  { href: "/about",        label: "À propos" },
  { href: "/contact",      label: "Contact" },
  { href: "/faq",          label: "FAQ" },
  { href: "/access-ebci",  label: "Plan d'accès" },
  { href: "/cgv",          label: "Conditions générales" },
  { href: "/account",      label: "Mon compte" },
  { href: "/orders",       label: "Mes commandes" },
];

const SOCIALS = [
  {
    href:  "https://www.facebook.com/profile.php?id=61569809631946",
    label: "Facebook",
    icon:  <IconFacebook size={15} />,
  },
  {
    href:  "https://www.instagram.com/fly_horizons_belgium/",
    label: "Instagram",
    icon:  <IconInstagram size={15} />,
  },
];

// ── Component ─────────────────────────────────────────────────
export function Footer() {
  const year = new Date().getFullYear();
  const lnk  = "text-sm text-white/45 hover:text-white transition-colors";
  const hd   = "text-[10px] font-bold text-[#F2B705] uppercase tracking-[2px] mb-4";

  return (
    <footer className="bg-[#0b2238] border-t border-white/5 mt-auto">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 max-xs:py-7">

        {/* ── Grille principale ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr] gap-10 max-xs:gap-6 pb-10 max-xs:pb-6 border-b border-white/5">

          {/* ── Marque ── */}
          <div>
            <Link href="/" className="inline-block">
              <Image
                src="/logo-footer.png"
                alt="Fly Horizons"
                width={160} height={40}
                className="block h-8 w-auto object-contain"
                unoptimized
              />
            </Link>

            <p className="text-white/45 text-sm leading-relaxed max-w-xs mt-4 max-xs:mt-3 max-xs:text-xs">
              Des vols en avion léger, tracés par vous, payés à la minute réelle.
            </p>

            {/* Réseaux sociaux */}
            <div className="mt-4 max-xs:mt-3 flex items-center gap-2">
              {SOCIALS.map(({ href, label, icon }) => (
                <a key={href} href={href} target="_blank" rel="noopener noreferrer"
                  aria-label={label}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-white/40 hover:text-white hover:bg-white/8 border border-white/8 hover:border-white/20 transition-all">
                  {icon}
                </a>
              ))}
            </div>
          </div>

          {/* ── Nos services ── */}
          <div>
            <p className={hd}>Nos services</p>
            <ul className="space-y-2.5">
              {SERVICES.map(({ href, label }) => (
                <li key={href}>
                  <Link href={href} className={lnk}>{label}</Link>
                </li>
              ))}
            </ul>
          </div>

          {/* ── Pages utiles ── */}
          <div>
            <p className={hd}>Pages utiles</p>
            <ul className="space-y-2.5">
              {PAGES.map(({ href, label }) => (
                <li key={href}>
                  <Link href={href} className={lnk}>{label}</Link>
                </li>
              ))}
            </ul>
          </div>

          {/* ── Nous contacter ── */}
          <div>
            <p className={hd}>Nous contacter</p>
            <div className="space-y-3">
              <div className="flex items-start gap-2.5">
                <Mail size={13} className="text-[#fbae17] shrink-0 mt-0.5" />
                <a href="mailto:info@fly-horizons.com"
                  className="text-sm text-white/45 hover:text-white transition-colors">
                  info@fly-horizons.com
                </a>
              </div>
              <div className="flex items-start gap-2.5">
                <MapPin size={13} className="text-[#fbae17] shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-white/45">Aéroport de Charleroi</p>
                  <p className="text-xs text-white/25 mt-0.5">EBCI, Belgique</p>
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <Clock size={13} className="text-[#fbae17] shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-white/45">7j/7 sur réservation</p>
                  <p className="text-xs text-white/25 mt-0.5">Réponse email sous 24 h</p>
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* ── Barre de bas ── */}
        <div className="pt-5 max-xs:pt-4 flex flex-col sm:flex-row items-center justify-between gap-3 max-xs:gap-2">
          <p className="text-xs text-white/25">
            © {year} Fly Horizons — DESTANBERG Romain. Tous droits réservés.
          </p>
          <div className="flex items-center gap-4 text-xs text-white/25">
            <div className="flex items-center gap-3">
              <Link href="/cgv" className="hover:text-white/60 transition-colors">Conditions générales</Link>
              <span>·</span>
              <Link href="/contact" className="hover:text-white/60 transition-colors">Contact</Link>
            </div>
            <div className="flex items-center gap-1.5">
              <Lock size={9} />
              <span>Paiement sécurisé</span>
              <span className="text-[#fbae17] font-semibold">Stripe</span>
            </div>
          </div>
        </div>

      </div>
    </footer>
  );
}
