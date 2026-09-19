import Link from "next/link";
import { ShieldCheck, PlaneTakeoff, Users, FileCheck, ArrowRight } from "lucide-react";

export const metadata = {
  title: "Devenir pilote partenaire · Fly Horizons",
  description: "Pilote licencié ? Proposez vos vols en partage de frais avec Fly Horizons, dans le cadre du règlement EASA NCO.GEN.104.",
};

const ETAPES = [
  {
    icon: FileCheck,
    titre: "Vous êtes en règle",
    texte: "Licence de pilote valide (PPL minimum), certificat médical à jour et qualifications nécessaires à l'appareil que vous comptez utiliser.",
  },
  {
    icon: PlaneTakeoff,
    titre: "Vous publiez un vol",
    texte: "Depuis un espace pilote dédié, vous décrivez le vol que vous comptez effectuer : date, itinéraire, nombre de places.",
  },
  {
    icon: Users,
    titre: "Des passagers réservent",
    texte: "Fly Horizons met votre annonce en visibilité et gère la prise de contact avec les passagers intéressés.",
  },
  {
    icon: ShieldCheck,
    titre: "Vous restez seul responsable du vol",
    texte: "Préparation, décision de partir, sécurité : vous êtes commandant de bord. Fly Horizons ne pilote pas et n'exploite pas le vol.",
  },
];

export default function DevenirPilotePage() {
  return (
    <main className="min-h-screen bg-[#f5f5f7]">

      <section className="pt-[98px] pb-24 sm:pb-32">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 xl:px-10 pt-2 sm:pt-12">

          {/* ── En-tête ── */}
          <div className="mb-14 max-w-2xl">
            <p className="text-xs font-bold text-primary uppercase tracking-[3px] mb-4">Pilotes</p>
            <h1 className="text-5xl sm:text-6xl font-black text-foreground leading-none tracking-tight mb-4">
              Vous êtes pilote ?<br />
              <span className="text-primary">Proposez vos vols.</span>
            </h1>
            <p className="text-muted-foreground text-sm leading-relaxed max-w-lg mb-8">
              Fly Horizons met en relation des pilotes privés et des passagers pour des vols en
              partage de frais. Vous restez seul responsable de votre vol ; nous nous occupons de
              la mise en relation.
            </p>
            <Link
              href="/devenir-pilote/candidature"
              className="inline-flex items-center gap-2 h-11 px-6 bg-primary text-primary-foreground rounded-lg font-black text-sm hover:bg-[#e6a800] transition-all shadow-gold"
            >
              Faire une demande <ArrowRight size={15} />
            </Link>
          </div>

          <div className="max-w-3xl space-y-6">

            {/* Étapes */}
            <div className="bg-card border border-border rounded-lg p-8 sm:p-10 shadow-premium">
              <h2 className="text-xl font-black text-foreground mb-6">Comment ça marche</h2>
              <div className="grid sm:grid-cols-2 gap-6">
                {ETAPES.map(({ icon: Icon, titre, texte }, i) => (
                  <div key={titre} className="flex gap-3.5">
                    <div className="w-9 h-9 rounded-lg bg-secondary border border-border flex items-center justify-center text-[#0b2238] shrink-0">
                      <Icon size={16} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-muted-foreground/70 uppercase tracking-wide mb-0.5">
                        Étape {i + 1}
                      </p>
                      <p className="font-black text-foreground text-sm mb-1">{titre}</p>
                      <p className="text-muted-foreground text-xs leading-relaxed">{texte}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Cadre légal — même formulation que /cgp */}
            <div className="p-4 bg-primary/10 border border-primary/30 rounded-lg">
              <p className="text-xs font-bold text-foreground uppercase tracking-[2px] mb-1">
                Activité de partage de coûts · NCO.GEN.104
              </p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Les vols Fly Horizons sont des vols en partage de coûts au sens du règlement
                EASA NCO.GEN.104, entre personnes non professionnelles. Ce n&apos;est pas un
                service de transport aérien commercial : le passager règle uniquement sa
                quote-part des frais directs du vol (carburant, aéronef, redevances). En tant
                que pilote, vous assumez votre propre part de ces coûts et ne percevez aucune
                rémunération pour vos services de pilotage. Fly Horizons ne perçoit aucune
                commission et n&apos;intervient jamais dans l&apos;encaissement, qui se règle
                directement entre vous et le passager.{" "}
                <Link href="/cgp" target="_blank" rel="noopener noreferrer" className="text-foreground font-semibold hover:text-primary transition-colors underline underline-offset-2">
                  Conditions générales
                </Link>.
              </p>
            </div>

            {/* CTA de fin */}
            <div className="bg-navy rounded-2xl p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="flex-1">
                <p className="text-white font-black text-lg mb-1">Prêt à vous lancer ?</p>
                <p className="text-white/50 text-sm">Deux minutes suffisent pour nous laisser vos coordonnées.</p>
              </div>
              <Link
                href="/devenir-pilote/candidature"
                className="inline-flex items-center gap-2 h-11 px-6 bg-primary text-primary-foreground rounded-lg font-black text-sm hover:bg-[#e6a800] transition-all shadow-gold shrink-0"
              >
                Faire une demande <ArrowRight size={15} />
              </Link>
            </div>

          </div>

        </div>
      </section>

    </main>
  );
}
