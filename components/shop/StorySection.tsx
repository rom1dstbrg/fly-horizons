import Link from "next/link";

export function StorySection() {
  return (
    <section className="py-20 bg-gradient-navy border-t border-border">
      <div className="container-shop">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">

          {/* Texte */}
          <div className="space-y-6">
            <div>
              <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-3">
                Notre histoire
              </p>
              <h2 className="text-3xl font-bold text-foreground leading-tight">
                Nes de la passion
                <br />
                <span className="text-gold-gradient">pour l&apos;aviation</span>
              </h2>
            </div>

            <p className="text-muted-foreground leading-relaxed">
              Fly Horizons est ne d&apos;une passion profonde pour l&apos;aviation et le ciel.
              Notre boutique propose une selection d&apos;accessoires premium
              concus pour les passionnes qui portent leur amour du vol au quotidien.
            </p>

            <p className="text-muted-foreground leading-relaxed">
              Chaque produit est choisi avec soin pour refleter l&apos;elegance
              et la precision qui caracterisent le monde de l&apos;aviation.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 pt-2">
              <Link
                href="/shop"
                className="inline-flex items-center justify-center h-11 px-6 bg-primary text-primary-foreground rounded-md font-semibold text-sm hover:bg-gold-400 transition-colors shadow-gold"
              >
                Decouvrir la boutique
              </Link>
              <a
                href="https://fly-horizons.com"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center h-11 px-6 border border-border text-foreground rounded-md font-medium text-sm hover:bg-secondary transition-colors"
              >
                Notre site principal
              </a>
            </div>
          </div>

          {/* Stats / visuels */}
          <div className="grid grid-cols-2 gap-4">
            <div className="card-premium p-6 text-center space-y-2">
              <p className="text-4xl font-bold text-primary">100%</p>
              <p className="text-sm text-muted-foreground">Produits selectionnes</p>
            </div>
            <div className="card-premium p-6 text-center space-y-2">
              <p className="text-4xl font-bold text-primary">4</p>
              <p className="text-sm text-muted-foreground">Pays livres</p>
            </div>
            <div className="card-premium p-6 text-center space-y-2">
              <p className="text-4xl font-bold text-primary">SSL</p>
              <p className="text-sm text-muted-foreground">Paiement securise</p>
            </div>
            <div className="card-premium p-6 text-center space-y-2">
              <p className="text-4xl font-bold text-primary">EU</p>
              <p className="text-sm text-muted-foreground">Expedition rapide</p>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
