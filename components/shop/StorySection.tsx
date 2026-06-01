import Link from "next/link";

export function StorySection() {
  return (
    <section className="py-20 bg-[#f5f5f7] border-t border-[#e0e5ef]">
      <div className="max-w-[80rem] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">

          {/* Texte */}
          <div className="space-y-6">
            <div>
              <p className="text-xs font-semibold text-[#F2B705] uppercase tracking-widest mb-3">
                Notre histoire
              </p>
              <h2 className="text-3xl font-bold text-[#0b2238] leading-tight">
                Née de la passion
                <br />
                <span className="text-[#F2B705]">pour l&apos;aviation</span>
              </h2>
            </div>

            <p className="text-[#0b2238]/60 leading-relaxed">
              Fly Horizons est née d&apos;une envie simple : partager la sensation du vol
              avec ceux qui n&apos;ont jamais eu l&apos;occasion d&apos;y accéder.
              Depuis Charleroi, chaque vol est une aventure personnalisée.
            </p>

            <p className="text-[#0b2238]/60 leading-relaxed">
              Itinéraire libre, jusqu&apos;à 3 passagers, date au choix.
              Vous choisissez où on va.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 pt-2">
              <Link
                href="/nos-offres"
                className="inline-flex items-center justify-center h-11 px-6 bg-[#F2B705] text-[#0b2238] rounded-xl font-semibold text-sm hover:bg-[#e6a800] transition-colors shadow-[0_6px_24px_rgba(242,183,5,.35)]"
              >
                Découvrir nos vols
              </Link>
              <Link
                href="/about"
                className="inline-flex items-center justify-center h-11 px-6 border border-[#e0e5ef] text-[#0b2238] rounded-xl font-medium text-sm hover:bg-[#edf0f7] transition-colors"
              >
                Notre histoire
              </Link>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-4">
            {[
              { value: "100%", label: "Itinéraire libre" },
              { value: "3", label: "Passagers max." },
              { value: "SSL", label: "Paiement sécurisé" },
              { value: "48h", label: "Annulation gratuite" },
            ].map(({ value, label }) => (
              <div key={label} className="bg-white border border-[#e0e5ef] rounded-[10px] shadow-[0_2px_14px_rgba(11,34,56,.07)] p-6 text-center space-y-2">
                <p className="text-4xl font-bold text-[#F2B705]">{value}</p>
                <p className="text-sm text-[#0b2238]/50">{label}</p>
              </div>
            ))}
          </div>

        </div>
      </div>
    </section>
  );
}
