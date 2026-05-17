"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, Search, MessageCircle } from "lucide-react";

const THEMES = [
  {
    title: "Informations générales",
    items: [
      {
        q: "D'où part-on ?",
        a: "Les vols débutent principalement depuis l'aéroport de Brussels South Charleroi (EBCI/CRL). Il est toutefois possible de décoller depuis un autre aéroport proche de chez vous, ce qui peut entraîner des frais supplémentaires.",
      },
      {
        q: "Que dois-je apporter pour le vol ?",
        a: "Adaptez votre tenue à la météo du jour. Il est conseillé de prévoir un pull dans tous les cas, et une veste chaude si vous volez en hiver. Aucun autre équipement n'est nécessaire.",
      },
      {
        q: "Combien de temps dois-je arriver avant le vol ?",
        a: "Il est recommandé d'arriver environ 15 minutes avant l'heure prévue du départ pour les préparatifs et le briefing de sécurité.",
      },
    ],
  },
  {
    title: "Détails et conditions du vol",
    items: [
      {
        q: "Quel est le nombre maximum de passagers ?",
        a: "L'avion dispose de 4 places, ce qui permet d'accueillir jusqu'à 3 passagers en plus du pilote. Le poids total des passagers est un critère important pour garantir la sécurité du vol.",
      },
      {
        q: "Que se passe-t-il en cas de mauvaises conditions météo ?",
        a: "Si les conditions météorologiques sont défavorables, le vol peut être reporté à une date ultérieure sans frais supplémentaires. Une annulation peut être décidée jusqu'à 2 heures avant l'heure prévue afin de garantir la sécurité.",
      },
      {
        q: "Le vol est-il bruyant ?",
        a: "Non, grâce aux casques fournis à bord. Ces casques atténuent la majorité des bruits pour vous offrir une expérience confortable et immersive.",
      },
      {
        q: "Faut-il des capacités particulières pour monter à bord ?",
        a: "Il est nécessaire de pouvoir monter dans l'avion, ce qui équivaut à grimper l'équivalent de 3 à 4 marches à l'aide d'un marchepied.",
      },
      {
        q: "Pourquoi mon poids est-il demandé ?",
        a: "Le poids est essentiel pour calculer la masse et le centrage de l'avion. Ce paramètre garantit la stabilité de l'appareil pendant le vol.",
      },
    ],
  },
  {
    title: "Réservation et annulation",
    items: [
      {
        q: "Puis-je annuler ou reporter mon vol ?",
        a: "Il est recommandé d'annuler dès que possible en cas d'imprévu. La limite pour une annulation sans frais est fixée à 48 heures avant la date prévue. Les annulations de dernière minute causées par des circonstances indépendantes de votre volonté n'entraînent aucun frais.",
      },
      {
        q: "Comment fonctionne le paiement ?",
        a: "Un acompte est requis lors de la réservation. Le montant restant sera remboursé ou ajusté en fonction des éventuels frais, conformément aux Conditions Générales.",
      },
      {
        q: "Puis-je choisir l'itinéraire ou la destination ?",
        a: "Absolument ! Via notre option « Vol sur mesure », vous pouvez personnaliser votre vol en choisissant les lieux à survoler, les points d'intérêt ou un aéroport de destination.",
      },
      {
        q: "Puis-je réserver pour une occasion spéciale ?",
        a: "Oui, tout à fait. Pour ce type de demande (anniversaire, demande en mariage, etc.), utilisez le formulaire de contact et nous adapterons l'expérience.",
      },
      {
        q: "Est-il possible de prendre des photos ou vidéos ?",
        a: "Oui, il est tout à fait possible de prendre des photos ou des vidéos pendant le vol.",
      },
    ],
  },
  {
    title: "Expérience à bord",
    items: [
      {
        q: "Puis-je toucher les commandes pendant le vol ?",
        a: "Oui, il est possible de toucher les commandes pendant la phase de croisière, sous la supervision du pilote.",
      },
      {
        q: "Est-ce que je reçois un certificat ou un souvenir ?",
        a: "Un certificat attestant de votre baptême de l'air peut être délivré sur demande, sans frais supplémentaires.",
      },
    ],
  },
  {
    title: "Passagers",
    items: [
      {
        q: "Quel est l'âge minimum pour participer ?",
        a: "Il n'y a pas d'âge minimum pour monter à bord. Cependant, un mineur doit toujours être accompagné d'un adulte. Un enfant peut s'asseoir à l'avant à condition qu'il soit clairement établi qu'il ne touchera pas aux commandes.",
      },
    ],
  },
];

export default function FaqPage() {
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const query = search.toLowerCase().trim();

  const filtered = THEMES.map((theme) => ({
    ...theme,
    items: theme.items.filter(
      (item) => !query || item.q.toLowerCase().includes(query) || item.a.toLowerCase().includes(query)
    ),
  })).filter((theme) => theme.items.length > 0);

  function toggle(key: string) {
    setOpenKey((prev) => (prev === key ? null : key));
  }

  return (
    <main className="min-h-screen bg-gradient-navy pt-24 pb-16">
      <div className="container-shop max-w-3xl">

        {/* En-tête */}
        <div className="mb-10">
          <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-2">Questions fréquentes</p>
          <h1 className="text-3xl font-bold text-foreground">Vous avez des questions ?</h1>
          <p className="text-muted-foreground text-sm mt-2 max-w-lg">
            Toutes les réponses aux questions les plus courantes sur vos vols avec Fly Horizons.
          </p>
        </div>

        {/* Recherche */}
        <div className="relative mb-8">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            placeholder="Rechercher une question…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setOpenKey(null); }}
            className="w-full pl-9 pr-4 py-2.5 text-sm bg-card border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
          />
        </div>

        {/* Thèmes */}
        {filtered.length === 0 ? (
          <div className="text-center py-16 space-y-3">
            <p className="text-muted-foreground text-sm">Aucun résultat pour &laquo;&nbsp;{search}&nbsp;&raquo;</p>
            <Link href="/contact" className="text-sm text-primary hover:text-gold-400 transition-colors font-medium">
              Posez-nous la question directement →
            </Link>
          </div>
        ) : (
          <div className="space-y-8">
            {filtered.map((theme) => (
              <div key={theme.title}>
                <p className="text-[10px] font-bold text-primary uppercase tracking-widest mb-3">
                  {theme.title}
                </p>
                <div className="card-premium divide-y divide-border overflow-hidden">
                  {theme.items.map((item, i) => {
                    const key = `${theme.title}-${i}`;
                    const open = openKey === key;
                    return (
                      <div key={key}>
                        <button
                          onClick={() => toggle(key)}
                          className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left hover:bg-secondary/40 transition-colors"
                          aria-expanded={open}
                        >
                          <span className="text-sm font-medium text-foreground">{item.q}</span>
                          <ChevronDown
                            size={15}
                            className={`shrink-0 text-muted-foreground transition-transform duration-300 ${open ? "rotate-180" : ""}`}
                          />
                        </button>
                        <div className={`grid transition-all duration-300 ease-in-out ${open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
                          <div className="overflow-hidden">
                            <div className="px-5 pb-4 border-t border-border pt-3">
                              <p className="text-sm text-muted-foreground leading-relaxed">{item.a}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* CTA contact */}
        <div className="mt-10 card-premium p-6 flex flex-col sm:flex-row items-center gap-4 border-l-2 border-primary">
          <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
            <MessageCircle size={16} className="text-primary" />
          </div>
          <div className="flex-1 text-center sm:text-left">
            <p className="text-sm font-semibold text-foreground">Vous ne trouvez pas votre réponse ?</p>
            <p className="text-xs text-muted-foreground mt-0.5">Notre équipe vous répond sous 48 h.</p>
          </div>
          <Link
            href="/contact"
            className="shrink-0 px-4 py-2 text-sm font-semibold bg-primary text-primary-foreground rounded-xl hover:bg-gold-400 transition-colors"
          >
            Nous contacter
          </Link>
        </div>

      </div>
    </main>
  );
}
