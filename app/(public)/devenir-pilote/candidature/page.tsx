import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { CandidaturePiloteForm } from "@/components/devenir-pilote/CandidaturePiloteForm";

export const metadata = {
  title: "Candidature pilote · Fly Horizons",
  description: "Faites une demande pour proposer vos vols en partage de frais avec Fly Horizons.",
};

export default function CandidaturePilotePage() {
  return (
    <main className="min-h-screen bg-[#f5f5f7]">

      <section className="pt-[98px] pb-24 sm:pb-32">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 xl:px-10 pt-2 sm:pt-12">

          <Link
            href="/devenir-pilote"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors mb-8"
          >
            <ArrowLeft size={13} /> Retour à la présentation
          </Link>

          <div className="grid lg:grid-cols-[1fr_1fr] gap-10 items-start max-w-4xl">

            <div>
              <p className="text-xs font-bold text-primary uppercase tracking-[3px] mb-4">Pilotes</p>
              <h1 className="text-4xl sm:text-5xl font-black text-foreground leading-none tracking-tight mb-4">
                Faites une<br /><span className="text-primary">demande.</span>
              </h1>
              <p className="text-muted-foreground text-sm leading-relaxed max-w-sm">
                Cette demande ne vous engage à rien : nous revenons vers vous pour en discuter
                avant toute activation d&apos;un compte pilote. Une question avant de vous
                lancer ?{" "}
                <Link href="/contact" className="text-foreground font-semibold hover:text-primary transition-colors">
                  Contactez-nous directement
                </Link>.
              </p>
            </div>

            <div className="bg-card border border-border rounded-lg p-8 sm:p-10 shadow-premium-lg">
              <CandidaturePiloteForm />
            </div>

          </div>

        </div>
      </section>

    </main>
  );
}
