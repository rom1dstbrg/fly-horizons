import Image from "next/image";
import Link from "next/link";
import { MapPin, Car, Bus, Clock, Navigation, ParkingSquare, AlertTriangle } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Plan d'accès · Fly Horizons",
  description: "Toutes les informations pour rejoindre le point de rendez-vous à l'aéroport de Charleroi (EBCI).",
  robots: { index: false },
};

const MEET_COORDS  = "50.45787645919888,4.454058485690142";
const PARK_COORDS  = "50.45750455237072,4.453501387085746";
const GMAPS_DIR    = `https://www.google.com/maps/dir/?api=1&destination=${MEET_COORDS}`;
const GMAPS_PARK   = `https://www.google.com/maps?q=${PARK_COORDS}`;
const GMAPS_EMBED  = `https://maps.google.com/maps?q=${MEET_COORDS}&z=17&t=k&output=embed`;

export default function AccessEbciPage() {
  return (
    <main className="min-h-screen bg-gradient-navy pt-24 pb-16">
      <div className="container-shop max-w-3xl">

        {/* En-tête */}
        <div className="mb-10">
          <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-2">Point de rendez-vous</p>
          <h1 className="text-3xl font-bold text-foreground">Plan d&apos;accès</h1>
          <p className="text-muted-foreground text-sm mt-2 max-w-lg">
            Toutes les informations pour rejoindre le point de rendez-vous à l&apos;aéroport de Charleroi&nbsp;(EBCI).
            Présentez-vous <strong className="text-foreground">15 minutes avant</strong> l&apos;heure indiquée.
          </p>
        </div>

        {/* Carte point de rdv + parking */}
        <div className="card-premium p-6 mb-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">

            <div className="flex gap-3.5">
              <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 mt-0.5">
                <MapPin size={15} className="text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Point de rendez-vous</p>
                <p className="text-sm font-semibold text-foreground">Aéroport de Charleroi</p>
                <p className="text-xs text-muted-foreground mt-0.5">GPS : 50.4579° N, 4.4541° E</p>
                <a
                  href={GMAPS_DIR}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 mt-2 text-xs text-primary hover:text-gold-400 transition-colors font-medium"
                >
                  <Navigation size={11} />
                  Itinéraire GPS
                </a>
              </div>
            </div>

            <div className="flex gap-3.5">
              <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 mt-0.5">
                <ParkingSquare size={15} className="text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Parking</p>
                <p className="text-sm font-semibold text-foreground">Parking visiteurs (gratuit)</p>
                <p className="text-xs text-muted-foreground mt-0.5">À 50 m du point de rendez-vous</p>
                <a
                  href={GMAPS_PARK}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 mt-2 text-xs text-primary hover:text-gold-400 transition-colors font-medium"
                >
                  <Navigation size={11} />
                  Voir le parking
                </a>
              </div>
            </div>

          </div>
        </div>

        {/* Image aérienne */}
        <div className="card-premium overflow-hidden mb-6">
          <div className="bg-muted/40 border-b border-border px-4 py-2.5 flex items-center gap-2">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Vue aérienne, accès parking</span>
          </div>
          <div className="relative">
            <Image
              src="/access-ebci-plan.png"
              alt="Vue aérienne de l'accès au parking"
              width={800}
              height={420}
              className="w-full object-cover"
              unoptimized
            />
            <div className="absolute bottom-3 left-3 flex flex-wrap gap-1.5">
              {["Parking visiteur", "Gratuit", "H24 / 7j"].map((tag) => (
                <span key={tag} className="px-2.5 py-1 text-[11px] font-bold rounded-full bg-[#0b2238]/80 text-[#F2B705] border border-[#F2B705]/30 backdrop-blur-sm">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* En voiture */}
        <div className="card-premium p-6 mb-6">
          <div className="flex items-center gap-2.5 mb-5">
            <div className="w-8 h-8 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
              <Car size={14} className="text-primary" />
            </div>
            <h2 className="font-semibold text-foreground">En voiture</h2>
          </div>

          <p className="text-xs text-muted-foreground font-semibold uppercase tracking-widest mb-3">Adresse à encoder dans le GPS</p>
          <div className="bg-secondary/60 border border-border rounded-xl px-4 py-3 mb-5">
            <p className="text-sm font-mono font-semibold text-foreground">Aéroport de Charleroi (EBCI)</p>
            <p className="text-xs text-muted-foreground mt-0.5">Gosselies, 6041 Charleroi, Belgique</p>
            <p className="text-xs text-muted-foreground mt-1">
              Ou coordonnées GPS directes :{" "}
              <span className="font-mono text-foreground">50.4579, 4.4541</span>
            </p>
          </div>

          <p className="text-xs text-muted-foreground font-semibold uppercase tracking-widest mb-3">Depuis les grands axes</p>
          <div className="space-y-3">
            {[
              {
                from: "Depuis Bruxelles",
                route: "A54 → sortie 21 « Gosselies / Aéroport » → suivre « Aérodrome / Aviation générale »",
              },
              {
                from: "Depuis Namur",
                route: "E42 → A54 → sortie 21 « Gosselies / Aéroport » → suivre « Aérodrome »",
              },
              {
                from: "Depuis Mons",
                route: "A54 direction Bruxelles → sortie 21 « Gosselies / Aéroport »",
              },
              {
                from: "Depuis Liège",
                route: "E42 direction Namur → A54 → sortie 21 « Gosselies / Aéroport »",
              },
            ].map((d) => (
              <div key={d.from} className="flex gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-foreground">{d.from}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{d.route}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-5 pt-4 border-t border-border flex items-start gap-2.5">
            <AlertTriangle size={13} className="text-primary mt-0.5 shrink-0" />
            <p className="text-xs text-muted-foreground">
              Ne pas suivre les panneaux « Terminal passagers ». L&apos;aéroport aviation légère est un accès distinct, situé à l&apos;écart du terminal commercial.
            </p>
          </div>
        </div>

        {/* Image — point de rendez-vous au sol */}
        <div className="card-premium overflow-hidden mb-6">
          <div className="bg-muted/40 border-b border-border px-4 py-2.5 flex items-center gap-2">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Vue au sol, point de rendez-vous</span>
          </div>
          <Image
            src="/access-ebci-building.png"
            alt="Point de rendez-vous, vue au sol"
            width={800}
            height={380}
            className="w-full object-cover"
            unoptimized
          />
          <div className="px-5 py-4 border-t border-border space-y-2">
            <p className="text-xs font-semibold text-foreground">En attendant votre vol</p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Vous pouvez patienter devant le bâtiment ou entrer dans le terminal, accessible au public.
              Vous y trouverez des <strong className="text-foreground">toilettes</strong> et un <strong className="text-foreground">distributeur de boissons</strong>.
            </p>
          </div>
        </div>

        {/* En transports */}
        <div className="card-premium p-6 mb-6">
          <div className="flex items-center gap-2.5 mb-5">
            <div className="w-8 h-8 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
              <Bus size={14} className="text-primary" />
            </div>
            <h2 className="font-semibold text-foreground">En transports en commun</h2>
          </div>

          <div className="space-y-4">
            <div className="flex gap-3.5">
              <div className="w-7 h-7 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 text-[10px] font-bold text-primary mt-0.5">
                1
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Train jusqu&apos;à Charleroi-Sud</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Toutes les grandes villes belges sont connectées à Charleroi-Sud par la SNCB.
                </p>
              </div>
            </div>
            <div className="flex gap-3.5">
              <div className="w-7 h-7 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 text-[10px] font-bold text-primary mt-0.5">
                2
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Bus TEC ligne 68 / 68A, direction Aéroport</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Depuis l&apos;arrêt <strong className="text-foreground">Charleroi-Sud</strong>, prenez le bus TEC ligne&nbsp;68 ou&nbsp;68A.
                  Descendre à l&apos;arrêt <strong className="text-foreground">Gosselies Aéroport</strong>.
                  Durée : environ 20 minutes.
                </p>
              </div>
            </div>
            <div className="flex gap-3.5">
              <div className="w-7 h-7 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 text-[10px] font-bold text-primary mt-0.5">
                3
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Depuis l&apos;arrêt, rejoindre l&apos;aéroport à pied</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Environ 5 minutes à pied depuis l&apos;arrêt de bus jusqu&apos;au point de rendez-vous.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-5 pt-4 border-t border-border flex items-start gap-2.5">
            <Clock size={13} className="text-primary mt-0.5 shrink-0" />
            <p className="text-xs text-muted-foreground">
              Prévoyez une marge en cas de retard. Consultez les horaires en temps réel sur{" "}
              <a href="https://www.infotec.be" target="_blank" rel="noopener noreferrer"
                className="text-primary hover:text-gold-400 transition-colors font-medium">
                infotec.be
              </a>.
            </p>
          </div>
        </div>

        {/* Carte Google Maps */}
        <div className="card-premium overflow-hidden mb-6">
          <div className="bg-muted/40 border-b border-border px-4 py-2.5">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Carte interactive</span>
          </div>
          <iframe
            src={GMAPS_EMBED}
            title="Point de rendez-vous Fly Horizons"
            className="w-full h-72 border-0"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </div>

        {/* CTA itinéraire */}
        <a
          href={GMAPS_DIR}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 w-full py-3.5 bg-primary text-primary-foreground font-semibold text-sm rounded-xl hover:bg-gold-400 transition-colors"
        >
          <Navigation size={16} />
          Lancer l&apos;itinéraire GPS
        </a>

        {/* Contact */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-6 text-xs text-muted-foreground">
          <span>
            Problème pour nous trouver ?{" "}
            <a href="mailto:info@fly-horizons.com" className="text-primary hover:text-gold-400 transition-colors font-medium">
              info@fly-horizons.com
            </a>
          </span>
          <span className="hidden sm:inline text-border">·</span>
          <Link href="/faq" className="text-primary hover:text-gold-400 transition-colors font-medium">
            Consulter la FAQ
          </Link>
        </div>

      </div>
    </main>
  );
}
