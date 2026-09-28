import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { CandidaturePiloteForm } from "@/components/devenir-pilote/CandidaturePiloteForm";

export const metadata: Metadata = {
  title: "Candidature pilote · Fly Horizons",
  description: "Faites une demande pour publier vos vols en partage de frais avec Fly Horizons.",
};

// Nouvelle DA (maquette-devenir-pilote.html, 28/09) : même système que /contact.
// Ordinateur : titre + formulaire (7) | « ce qui se passe ensuite » (5). Téléphone : l'aparté
// passe sous le formulaire.

const WRAP = "max-w-[1400px] mx-auto px-4 sm:px-6 xl:px-10";
const LINK = "font-semibold text-[#0b2238] underline decoration-[#0b2238]/25 underline-offset-[3px] hover:decoration-primary transition-colors";

const ENSUITE = [
  { t: "Nous vérifions votre demande", d: "Une personne de l'équipe la lit, pas un robot." },
  { t: "Nous créons votre compte", d: "Vous recevez par email l'accès à votre espace pilote." },
  { t: "Vous envoyez vos documents", d: "Licence, qualification et certificat médical. Une fois validés, vous publiez vos vols." },
];

export default function CandidaturePilotePage() {
  return (
    <main className="min-h-screen bg-white">
      <section className="pt-page pb-16 lg:pb-28">
        <div className={WRAP}>
          <Link
            href="/devenir-pilote"
            className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-muted-foreground hover:text-foreground transition-colors mb-[18px]"
          >
            <ArrowLeft size={14} /> Devenir pilote
          </Link>

          <div className="lg:grid lg:grid-cols-[7fr_5fr] lg:grid-rows-[auto_1fr] lg:gap-x-20">
            <div className="lg:col-start-1 lg:row-start-1">
              <p className="text-[11px] font-bold text-primary uppercase tracking-[3px] mb-3">Candidature pilote</p>
              <h1 className="text-[34px] lg:text-[52px] font-black text-foreground leading-[1.03] tracking-[-0.02em]">
                Faites une demande.
              </h1>
              <p className="mt-3.5 max-w-[520px] text-base lg:text-[17px] leading-[1.7] text-foreground/80">
                Elle ne vous engage à rien. Nous la vérifions, puis nous créons votre compte pilote.
              </p>
            </div>

            <div className="mt-7 lg:col-start-1 lg:row-start-2 max-w-[720px]">
              <CandidaturePiloteForm />
            </div>

            <aside
              aria-label="Ce qui se passe ensuite"
              className="mt-11 pt-7 border-t border-border lg:mt-0 lg:pt-10 lg:border-t-0 lg:col-start-2 lg:row-start-1 lg:row-span-2 self-start"
            >
              <h2 className="text-[13px] font-extrabold uppercase tracking-[1.5px] text-[#0b2238] mb-1.5">Ce qui se passe ensuite</h2>
              <ol>
                {ENSUITE.map(({ t, d }, i) => (
                  <li key={t} className="grid grid-cols-[28px_1fr] gap-3.5 py-3.5 border-b border-border">
                    <span className="w-7 h-7 rounded-full bg-secondary text-[#0b2238] text-[13px] font-extrabold grid place-items-center">{i + 1}</span>
                    <div className="text-sm leading-relaxed">
                      <p className="font-extrabold text-foreground mb-0.5">{t}</p>
                      <p className="text-foreground/70">{d}</p>
                    </div>
                  </li>
                ))}
              </ol>
              <p className="mt-[18px] text-sm leading-relaxed text-foreground/70">
                Une question avant de vous lancer ? <Link href="/contact" className={LINK}>Écrivez-nous</Link>.
              </p>
            </aside>
          </div>
        </div>
      </section>
    </main>
  );
}
