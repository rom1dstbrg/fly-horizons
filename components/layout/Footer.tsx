import Link from "next/link";
import Image from "next/image";
import { Mail, MapPin, Lock, Clock } from "lucide-react";

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

const SERVICES = [
  { href: "/nos-offres",     label: "Nos offres" },
  { href: "/vol-sur-mesure", label: "Vol sur mesure" },
];

const INFOS = [
  { href: "/about",       label: "À propos" },
  { href: "/faq",         label: "FAQ" },
  { href: "/guide",       label: "Guide passager" },
  { href: "/access-ebci", label: "Plan d'accès · EBCI" },
  { href: "/cgp",         label: "Conditions générales", newTab: true },
];

const COMPTE = [
  { href: "/account",        label: "Mon compte" },
  { href: "/account#reservations", label: "Mes réservations" },
  { href: "/orders",         label: "Mes commandes" },
  { href: "/login",          label: "Connexion" },
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

export function Footer() {
  const year = new Date().getFullYear();
  const lnk  = "text-sm text-white/45 hover:text-white transition-colors";
  const hd   = "text-[10px] font-bold text-primary uppercase tracking-[2px] mb-4";

  return (
    <footer className="bg-navy border-t border-white/5 mt-auto">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 xl:px-10 py-10">

        {/* ── Grille principale ── */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-[2fr_1fr_1fr_1fr_1fr] gap-10 pb-10 border-b border-white/5">

          {/* ── Marque ── */}
          <div className="col-span-2 md:col-span-3 lg:col-span-1">
            <Link href="/" className="inline-block">
              <Image
                src="/fly-horizons-logo-white.svg"
                alt="Fly Horizons"
                width={160} height={40}
                className="block h-8 w-auto object-contain"
                unoptimized
              />
            </Link>

            <p className="text-white/45 text-sm leading-relaxed max-w-xs mt-4">
              Baptêmes de l&apos;air et vols sur mesure en avion léger depuis Charleroi · EBCI.
              Organisés dans le cadre du partage de frais réglementé (NCO.GEN.104).
            </p>

            <div className="mt-4 flex items-center gap-2">
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
                <li key={href}><Link href={href} className={lnk}>{label}</Link></li>
              ))}
            </ul>
          </div>

          {/* ── Informations ── */}
          <div>
            <p className={hd}>Informations</p>
            <ul className="space-y-2.5">
              {INFOS.map(({ href, label, newTab }) => (
                <li key={href}>
                  <Link href={href} className={lnk} {...(newTab ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* ── Mon espace ── */}
          <div>
            <p className={hd}>Mon espace</p>
            <ul className="space-y-2.5">
              {COMPTE.map(({ href, label }) => (
                <li key={href}><Link href={href} className={lnk}>{label}</Link></li>
              ))}
            </ul>
          </div>

          {/* ── Contact ── */}
          <div>
            <p className={hd}>Contact</p>
            <div className="space-y-3">
              <div className="flex items-start gap-2.5">
                <Mail size={13} className="text-primary shrink-0 mt-0.5" />
                <a href="mailto:info@fly-horizons.com"
                  className="text-sm text-white/45 hover:text-white transition-colors">
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

        {/* ── Barre de bas ── */}
        <div className="pt-5 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-white/25">
            © {year} Fly Horizons · DESTANBERG Romain. Tous droits réservés.
          </p>
          <div className="flex items-center gap-4 text-xs text-white/25">
            <div className="flex items-center gap-3">
              <Link href="/cgp" target="_blank" rel="noopener noreferrer" className="hover:text-white/60 transition-colors">Conditions générales</Link>
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
    </footer>
  );
}
