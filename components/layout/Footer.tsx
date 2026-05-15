import Link from "next/link";
import Image from "next/image";
import { Mail, MapPin } from "lucide-react";

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="bg-navy-dk border-t border-border mt-auto">
      <div className="container-shop py-12">

        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 pb-10 border-b border-border">

          {/* Marque */}
          <div className="space-y-4">
            <Link href="/">
              <Image
                src="/header-shop-white.png"
                alt="Fly Horizons Shop"
                width={160} height={36}
                className="block h-8 w-auto object-contain"
                unoptimized
              />
            </Link>
            <p className="text-muted-foreground text-sm leading-relaxed max-w-xs">
              Vols privés en avion léger au départ de Charleroi. Itinéraires sur mesure, vouchers cadeaux et accessoires.
            </p>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <MapPin size={13} className="text-primary shrink-0" />
                Charleroi — EBCI, Belgique
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Mail size={13} className="text-primary shrink-0" />
                <a href="mailto:info@fly-horizons.com" className="hover:text-primary transition-colors">
                  info@fly-horizons.com
                </a>
              </div>
            </div>
          </div>

          {/* Explorer */}
          <div className="space-y-3">
            <p className="text-xs font-semibold text-foreground/50 uppercase tracking-widest">
              Explorer
            </p>
            <ul className="space-y-2.5">
              <li>
                <Link href="/packs" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  Nos vols
                </Link>
              </li>
              <li>
                <Link href="/vol-sur-mesure" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  Vol sur mesure
                </Link>
              </li>
              <li>
                <Link href="/vouchers" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  Vouchers cadeaux
                </Link>
              </li>
              <li>
                <Link href="/shop" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  Boutique
                </Link>
              </li>
            </ul>
          </div>

          {/* Aide */}
          <div className="space-y-3">
            <p className="text-xs font-semibold text-foreground/50 uppercase tracking-widest">
              Aide
            </p>
            <ul className="space-y-2.5">
              <li>
                <Link href="/contact" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  Contact
                </Link>
              </li>
              <li>
                <Link href="/orders" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  Mes commandes
                </Link>
              </li>
              <li>
                <Link href="/cart" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  Mon panier
                </Link>
              </li>
              <li>
                <Link href="/cgv" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  Conditions générales
                </Link>
              </li>
              <li>
                <Link href="https://fly-horizons.com" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  fly-horizons.com
                </Link>
              </li>
            </ul>
          </div>

        </div>

        <div className="pt-6 flex flex-col sm:flex-row justify-between items-center gap-3">
          <p className="text-xs text-muted-foreground">
            © {year} Fly Horizons — Romain DESTANBERG (BE.FCL.214192.A)
          </p>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            Paiement sécurisé
            <span className="text-primary font-semibold ml-1">Stripe</span>
          </div>
        </div>

      </div>
    </footer>
  );
}
