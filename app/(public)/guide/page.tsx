"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  CalendarCheck, Route, HelpCircle, Mail, CheckCircle,
  Clock, Headphones, Camera, BadgeCheck, ChevronDown,
  Gift, ChevronRight, CreditCard, Lock, PlaneTakeoff,
  AlertTriangle, MapPin, Zap, MousePointerClick, Users, Store,
} from "lucide-react";

// ── Navigation ────────────────────────────────────────────────────────────────

const NAV = [
  { id: "reservation",   label: "Réservation", Icon: CalendarCheck },
  { id: "sur-mesure",    label: "Sur mesure",  Icon: Route         },
  { id: "bon-cadeau",    label: "Bon cadeau",  Icon: Gift          },
  { id: "vos-questions", label: "Questions",   Icon: HelpCircle    },
];

// ── Données ───────────────────────────────────────────────────────────────────

const QUESTIONS = [
  {
    q: "Mon poids ou celui des passagers est-il vraiment important ?",
    a: "Oui, pour des raisons de sécurité et de centrage. Le poids total des passagers ne peut pas dépasser 178 kg. Au-delà, le vol n'est pas réalisable.",
  },
  {
    q: "Y a-t-il un âge minimum ?",
    a: "Non. Un enfant peut monter à bord à condition d'être accompagné d'un adulte. Il peut même s'asseoir à l'avant, sous réserve de ne pas toucher aux commandes.",
  },
  {
    q: "Et si la météo est mauvaise le jour du vol ?",
    a: "Le vol est reporté sans frais. La décision appartient au pilote jusqu'à 2 heures avant le départ. La sécurité prime toujours.",
  },
  {
    q: "Puis-je annuler ou reporter ma réservation ?",
    a: "Oui. L'annulation est sans frais jusqu'à 48 heures avant le vol. En cas de circonstance indépendante de votre volonté, aucun frais ne s'applique non plus.",
  },
  {
    q: "Le vol est-il bruyant ?",
    a: "Non. Des casques antibruit sont fournis à bord pour tous les passagers. Ils permettent aussi de communiquer avec le pilote pendant tout le vol.",
  },
  {
    q: "Puis-je toucher les commandes ?",
    a: "Oui, en phase de croisière et sous supervision du pilote. Vous sentez les réponses réelles de l'avion.",
  },
  {
    q: "Un bon cadeau peut-il être utilisé pour un vol sur mesure ?",
    a: "Oui. Le code est valable pour n'importe quelle formule de vol. Il est déduit de la provision au moment de la réservation.",
  },
  {
    q: "Que se passe-t-il si je ne règle pas la provision tout de suite ?",
    a: "Votre créneau n'est pas sécurisé. Un autre client peut réserver la même date et la même heure et payer avant vous. Dès que vous payez via le lien reçu par email, le créneau vous est attribué définitivement.",
  },
  {
    q: "Est-ce que je reçois quelque chose à l'issue du vol ?",
    a: "Un certificat de baptême de l'air peut être délivré sur demande, sans frais supplémentaires.",
  },
];

// ── Page ──────────────────────────────────────────────────────────────────────

export default function GuidePage() {
  const [activeSection, setActiveSection] = useState(NAV[0].id);
  const [openQ, setOpenQ] = useState<string | null>(null);

  useEffect(() => {
    function onScroll() {
      const nearBottom =
        window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 80;
      if (nearBottom) {
        setActiveSection(NAV[NAV.length - 1].id);
        return;
      }
      const threshold = 130;
      let active = NAV[0].id;
      for (const { id } of NAV) {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top <= threshold) active = id;
      }
      setActiveSection(active);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  function scrollTo(id: string) {
    const el = document.getElementById(id);
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY - 108;
    window.scrollTo({ top, behavior: "smooth" });
  }

  return (
    <main className="bg-background min-h-screen">

      {/* ── Hero ── */}
      <div className="pt-[98px] pb-12">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 xl:px-10 pt-2 sm:pt-12">
          <p className="text-primary text-[10px] font-black tracking-[3px] uppercase mb-3">Fly Horizons</p>
          <h1 className="text-4xl sm:text-5xl font-black text-foreground leading-none tracking-tight mb-4">
            Tout ce que vous voulez savoir
          </h1>
          <p className="text-muted-foreground text-sm max-w-lg leading-relaxed">
            Bon cadeau, réservation classique ou vol sur mesure : choisissez ce qui vous concerne et lisez directement les détails.
          </p>
        </div>
      </div>

      {/* ── Mobile tab bar ── */}
      <div className="lg:hidden sticky top-[72px] z-40 bg-card/95 backdrop-blur border-b border-border">
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar px-4 py-2.5">
          {NAV.map(({ id, label, Icon }) => (
            <button
              key={id}
              onClick={() => scrollTo(id)}
              className={[
                "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors shrink-0 cursor-pointer",
                activeSection === id
                  ? "bg-navy text-white"
                  : "bg-card border border-border text-muted-foreground hover:text-foreground",
              ].join(" ")}
            >
              <Icon size={12} />{label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Corps ── */}
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 xl:px-10 py-10">
        <div className="flex gap-10 lg:gap-14 items-start">

          {/* Sidebar desktop */}
          <aside className="hidden lg:block w-44 shrink-0 sticky top-28 self-start">
            <nav className="space-y-0.5">
              {NAV.map(({ id, label, Icon }) => (
                <button
                  key={id}
                  onClick={() => scrollTo(id)}
                  className={[
                    "w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-all text-left cursor-pointer",
                    activeSection === id
                      ? "bg-navy text-white"
                      : "text-muted-foreground hover:text-foreground hover:bg-card",
                  ].join(" ")}
                >
                  <Icon size={15} className={activeSection === id ? "text-primary" : "opacity-50"} />
                  {label}
                </button>
              ))}
            </nav>
          </aside>

          {/* Sections */}
          <div className="flex-1 min-w-0 space-y-20">

            {/* ══════════════════════════════════════════
                SECTION 1 : RÉSERVATION CLASSIQUE
            ══════════════════════════════════════════ */}
            <section id="reservation" className="scroll-mt-32">
              <SectionHeader
                tag="Durée fixe"
                title="Réservation classique"
                desc="Choisissez une durée de vol parmi 30, 60, 90 ou 120 minutes. Le prix est affiché avant paiement, sans surprise."
              />

              <InfoCard className="mb-6">
                <p className="text-sm text-muted-foreground leading-relaxed">
                  La réservation classique est la formule la plus directe. Vous sélectionnez une durée, un créneau disponible dans le calendrier,
                  vous renseignez vos informations, et c'est tout. L'itinéraire est proposé par le pilote quelques jours avant le vol,
                  en tenant compte de vos souhaits.
                </p>
              </InfoCard>

              <div className="space-y-0 mb-6">
                {[
                  {
                    n: "01", Icon: Clock,
                    title: "Choisissez votre durée de vol",
                    desc: "30, 60, 90 ou 120 minutes. Le prix correspondant est affiché immédiatement.",
                    cta: { label: "Voir les formules", href: "/nos-offres" },
                  },
                  {
                    n: "02", Icon: CalendarCheck,
                    title: "Sélectionnez une date et un horaire",
                    desc: "Le calendrier affiche uniquement les créneaux disponibles. Si une date vous convient, vous réservez directement, sans devis ni appel téléphonique.",
                  },
                  {
                    n: "03", Icon: Users,
                    title: "Renseignez vos informations",
                    desc: "Prénom, nom, email, téléphone, nombre de passagers et poids total. Ces informations sont nécessaires pour préparer le vol en toute sécurité.",
                  },
                  {
                    n: "04", Icon: CreditCard,
                    title: "Choisissez votre mode de paiement",
                    desc: "",
                    payment: true,
                  },
                  {
                    n: "05", Icon: Mail,
                    title: "Confirmation par email",
                    desc: "Dès que la provision est reçue, un email de confirmation vous est envoyé avec tous les détails. Vous pouvez aussi retrouver votre réservation dans votre espace client à tout moment.",
                  },
                  {
                    n: "06", Icon: PlaneTakeoff,
                    title: "Le jour J",
                    desc: "Arrivez 15 minutes avant à l'aéroport de Charleroi (EBCI). Un briefing de sécurité a lieu avant l'embarquement. Le pilote reste aux commandes pendant tout le vol.",
                  },
                  {
                    n: "07", Icon: CheckCircle,
                    title: "Après le vol",
                    desc: "Le solde est calculé selon la durée réelle du vol et vous est facturé après l'atterrissage. Le tarif à la minute vous est communiqué avant la réservation.",
                  },
                ].map((s, i, arr) => {
                  const Icon = s.Icon;
                  return (
                    <div key={s.n} className="flex gap-4 items-start">
                      <div className="flex flex-col items-center shrink-0">
                        <div className="w-9 h-9 rounded-lg bg-navy text-primary flex items-center justify-center font-black text-[11px]">{s.n}</div>
                        {i < arr.length - 1 && <div className="w-px flex-1 bg-border mt-2 min-h-[24px]" />}
                      </div>
                      <div className="pb-7 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Icon size={14} className="text-foreground shrink-0" />
                          <p className="font-bold text-foreground text-sm">{s.title}</p>
                        </div>
                        {s.desc && <p className="text-muted-foreground text-sm leading-relaxed mb-2">{s.desc}</p>}
                        {s.cta && (
                          <Link href={s.cta.href} className="inline-flex items-center gap-1.5 text-xs font-semibold text-foreground hover:text-primary transition-colors underline-offset-2">
                            {s.cta.label} <ChevronRight size={12} />
                          </Link>
                        )}
                        {s.payment && <PaymentBlock />}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex gap-3 flex-wrap">
                <Link href="/nos-offres" className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-black hover:brightness-105 active:scale-[0.98] transition-all shadow-gold">
                  Voir les formules <ChevronRight size={14} />
                </Link>
              </div>
            </section>

            {/* ══════════════════════════════════════════
                SECTION 2 : VOL SUR MESURE
            ══════════════════════════════════════════ */}
            <section id="sur-mesure" className="scroll-mt-32">
              <SectionHeader
                tag="Itinéraire libre"
                title="Vol sur mesure"
                desc="Vous dessinez votre propre route. Le prix s'adapte à la distance parcourue. Idéal pour des lieux précis à survoler."
              />

              <InfoCard className="mb-6">
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Contrairement à la réservation classique, le vol sur mesure n'a pas de durée fixe.
                  Vous placez des points sur la carte interactive : l'algorithme calcule la distance totale,
                  la durée estimée et le prix en temps réel. Vous savez exactement ce que vous allez payer avant de confirmer.
                  Le prix est calculé à la minute, selon le tarif horaire en vigueur.
                </p>
              </InfoCard>

              {/* Ce que vous pouvez faire */}
              <div className="bg-card border border-border rounded-2xl p-5 mb-6">
                <p className="text-xs font-bold text-primary uppercase tracking-[2px] mb-4">Ce que vous pouvez demander</p>
                <div className="grid sm:grid-cols-2 gap-2">
                  {[
                    "Survoler votre maison, votre village ou votre région",
                    "Passer au-dessus de châteaux, rivières, forêts, lacs",
                    "Inclure une escale avec atterrissage (Namur, Le Touquet, Middelzeeland...)",
                    "Choisir une heure précise : coucher de soleil, matin calme",
                    "Combiner plusieurs zones dans un seul vol",
                    "Personnaliser la durée selon votre budget",
                  ].map((item) => (
                    <div key={item} className="flex items-start gap-2">
                      <CheckCircle size={13} className="text-primary shrink-0 mt-0.5" />
                      <p className="text-sm text-muted-foreground">{item}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Étapes */}
              <div className="space-y-0 mb-6">
                {[
                  {
                    n: "01", Icon: MousePointerClick,
                    title: "Dessinez votre route sur la carte",
                    desc: "Depuis l'application vol sur mesure, choisissez un itinéraire parmi nos propositions ou cliquez directement sur la carte pour ajouter vos propres points de passage.",
                    cta: { label: "Accéder à la carte", href: "/vol-sur-mesure" },
                  },
                  {
                    n: "02", Icon: Zap,
                    title: "Le prix s'affiche en temps réel",
                    desc: "À chaque point ajouté, la distance totale, la durée estimée et le prix se mettent à jour immédiatement. Si votre trajet est trop long pour l'avion ou le budget, vous le voyez tout de suite.",
                  },
                  {
                    n: "03", Icon: CalendarCheck,
                    title: "Sélectionnez votre créneau",
                    desc: "Même processus que la réservation classique : vous choisissez une date et un horaire disponibles dans le calendrier.",
                  },
                  {
                    n: "04", Icon: Users,
                    title: "Renseignez vos informations",
                    desc: "Coordonnées, nombre de passagers, poids total. Identique à la réservation classique.",
                  },
                  {
                    n: "05", Icon: CreditCard,
                    title: "Règlement de la provision",
                    desc: "La provision est calculée sur la base de votre itinéraire estimé. Vous pouvez régler immédiatement ou recevoir un lien par email.",
                    payment: true,
                  },
                  {
                    n: "06", Icon: MapPin,
                    title: "Le jour J",
                    desc: "Arrivez 15 minutes avant à Charleroi (EBCI). Le pilote peut ajuster la route en fonction de la météo ou de l'espace aérien disponible ce jour-là. Vous êtes informé de tout changement.",
                  },
                  {
                    n: "07", Icon: CheckCircle,
                    title: "Après le vol",
                    desc: "Le solde est calculé selon la durée réelle du vol. Si le vol a été plus court que prévu, vous payez moins. S'il a été plus long, la différence est facturée. Dans tous les cas, le tarif à la minute vous est communiqué avant la réservation.",
                  },
                ].map((s, i, arr) => {
                  const Icon = s.Icon;
                  return (
                    <div key={s.n} className="flex gap-4 items-start">
                      <div className="flex flex-col items-center shrink-0">
                        <div className="w-9 h-9 rounded-lg bg-navy text-primary flex items-center justify-center font-black text-[11px]">{s.n}</div>
                        {i < arr.length - 1 && <div className="w-px flex-1 bg-border mt-2 min-h-[24px]" />}
                      </div>
                      <div className="pb-7 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Icon size={14} className="text-foreground shrink-0" />
                          <p className="font-bold text-foreground text-sm">{s.title}</p>
                        </div>
                        {s.desc && <p className="text-muted-foreground text-sm leading-relaxed mb-2">{s.desc}</p>}
                        {s.cta && (
                          <Link href={s.cta.href} className="inline-flex items-center gap-1.5 text-xs font-semibold text-foreground hover:text-primary transition-colors underline-offset-2">
                            {s.cta.label} <ChevronRight size={12} />
                          </Link>
                        )}
                        {s.payment && <PaymentBlock />}
                      </div>
                    </div>
                  );
                })}
              </div>

              <NoteCard icon={<AlertTriangle size={14} />} color="amber">
                L'espace aérien belge comporte des zones restreintes, notamment autour de Bruxelles et de certaines bases militaires.
                Si un point de votre itinéraire se trouve dans une zone inaccessible, le pilote vous propose une alternative.
                La grande majorité des destinations depuis Charleroi ne rencontre aucune restriction.
              </NoteCard>

              <div className="flex gap-3 flex-wrap mt-6">
                <Link href="/vol-sur-mesure" className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-black hover:brightness-105 active:scale-[0.98] transition-all shadow-gold">
                  Créer mon vol sur mesure <ChevronRight size={14} />
                </Link>
              </div>
            </section>

            {/* ══════════════════════════════════════════
                SECTION 3 : BON CADEAU
            ══════════════════════════════════════════ */}
            <section id="bon-cadeau" className="scroll-mt-32">
              <SectionHeader
                tag="Offrir un vol"
                title="Bon cadeau"
                desc="Offrez une expérience inoubliable sans imposer de date. Le bénéficiaire choisit son créneau quand il le souhaite."
              />

              <InfoCard className="mb-6">
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Un bon cadeau est un code unique lié à une durée de vol précise : 30, 60, 90 ou 120 minutes.
                  Après l'achat, le code est envoyé par email immédiatement sous la forme <span className="font-mono font-bold text-foreground">XXXX-XXXX-XXXX-XXXX</span>.
                  Il peut être transmis à son bénéficiaire par email ou imprimé.
                </p>
              </InfoCard>

              <div className="space-y-0 mb-6">
                {[
                  {
                    n: "01", Icon: Store,
                    title: "Achetez le bon en ligne",
                    desc: "Rendez-vous sur Nos offres, choisissez la durée de vol souhaitée et payez via Stripe. Le code arrive par email dans les minutes qui suivent.",
                    cta: { label: "Voir nos offres", href: "/nos-offres" },
                  },
                  {
                    n: "02", Icon: Gift,
                    title: "Transmettez le code",
                    desc: "Copiez ou transférez l'email de confirmation au bénéficiaire. Vous pouvez aussi imprimer le bon pour l'offrir physiquement.",
                  },
                  {
                    n: "03", Icon: CalendarCheck,
                    title: "Le bénéficiaire réserve son créneau",
                    desc: "Il se rend sur la page de réservation, choisit une date et un horaire disponibles, puis entre son code dans le champ prévu à l'étape de paiement.",
                  },
                  {
                    n: "04", Icon: Lock,
                    title: "Le créneau est sécurisé",
                    desc: "Si le bon cadeau couvre la totalité de la provision, aucun paiement supplémentaire n'est demandé et le créneau est immédiatement confirmé. S'il ne couvre qu'une partie, le bénéficiaire règle le solde via Stripe.",
                  },
                  {
                    n: "05", Icon: PlaneTakeoff,
                    title: "Le jour J",
                    desc: "Arrivée 15 minutes avant à l'aéroport de Charleroi (EBCI). Briefing sécurité, montée à bord, décollage.",
                  },
                ].map((s, i, arr) => {
                  const Icon = s.Icon;
                  return (
                    <div key={s.n} className="flex gap-4 items-start">
                      <div className="flex flex-col items-center shrink-0">
                        <div className="w-9 h-9 rounded-lg bg-navy text-primary flex items-center justify-center font-black text-[11px]">{s.n}</div>
                        {i < arr.length - 1 && <div className="w-px flex-1 bg-border mt-2 min-h-[24px]" />}
                      </div>
                      <div className="pb-7 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Icon size={14} className="text-foreground shrink-0" />
                          <p className="font-bold text-foreground text-sm">{s.title}</p>
                        </div>
                        <p className="text-muted-foreground text-sm leading-relaxed mb-2">{s.desc}</p>
                        {s.cta && (
                          <Link href={s.cta.href} className="inline-flex items-center gap-1.5 text-xs font-semibold text-foreground hover:text-primary transition-colors underline-offset-2">
                            {s.cta.label} <ChevronRight size={12} />
                          </Link>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <NoteCard icon={<BadgeCheck size={14} />} color="blue">
                Un bon cadeau est valable pour une réservation à durée fixe ou pour un vol sur mesure.
                Il est déductible de la provision quelle que soit la formule choisie.
              </NoteCard>
            </section>

            {/* ══════════════════════════════════════════
                SECTION 4 : VOS QUESTIONS
            ══════════════════════════════════════════ */}
            <section id="vos-questions" className="scroll-mt-32">
              <SectionHeader
                tag="Avant de réserver"
                title="Vos questions"
                desc="Les doutes les plus courants avant un premier vol."
              />

              <div className="bg-card border border-border rounded-2xl overflow-hidden divide-y divide-border mb-5">
                {QUESTIONS.map((item) => {
                  const open = openQ === item.q;
                  return (
                    <div key={item.q}>
                      <button
                        onClick={() => setOpenQ(open ? null : item.q)}
                        className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left hover:bg-secondary transition-colors cursor-pointer"
                        aria-expanded={open}
                      >
                        <span className="text-sm font-semibold text-foreground">{item.q}</span>
                        <ChevronDown size={15} className={`shrink-0 text-muted-foreground transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
                      </button>
                      <div className={`grid transition-all duration-200 ${open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
                        <div className="overflow-hidden">
                          <p className="px-5 pb-4 pt-2 text-sm text-muted-foreground leading-relaxed">{item.a}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="bg-navy rounded-2xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <p className="text-white font-bold text-sm">Une autre question ?</p>
                  <p className="text-white/50 text-xs mt-0.5">Notre équipe répond sous 48 h.</p>
                </div>
                <Link href="/contact" className="shrink-0 inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-black hover:brightness-105 active:scale-[0.98] transition-all shadow-gold whitespace-nowrap">
                  Nous contacter <ChevronRight size={14} />
                </Link>
              </div>
            </section>

          </div>
        </div>
      </div>
    </main>
  );
}

// ── Composants internes ───────────────────────────────────────────────────────

function SectionHeader({ tag, title, desc }: { tag: string; title: string; desc: string }) {
  return (
    <div className="mb-8">
      <p className="text-[10px] font-bold text-primary uppercase tracking-[2.5px] mb-2">{tag}</p>
      <h2 className="text-2xl font-black text-foreground mb-2">{title}</h2>
      <p className="text-muted-foreground text-sm leading-relaxed">{desc}</p>
    </div>
  );
}

function InfoCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-card border border-border rounded-2xl p-5 ${className}`}>
      {children}
    </div>
  );
}

function NoteCard({
  children, icon, color,
}: {
  children: React.ReactNode;
  icon: React.ReactNode;
  color: "amber" | "blue";
}) {
  const styles = {
    amber: "bg-primary/10 border-primary/30 text-foreground",
    blue:  "bg-secondary border-border text-foreground",
  };
  return (
    <div className={`flex items-start gap-3 border rounded-2xl px-4 py-3.5 ${styles[color]}`}>
      <span className="shrink-0 mt-0.5 text-primary">{icon}</span>
      <p className="text-sm leading-relaxed text-muted-foreground">{children}</p>
    </div>
  );
}

function PaymentBlock() {
  return (
    <div className="grid sm:grid-cols-2 gap-3 mt-2">
      {/* Option A */}
      <div className="bg-navy rounded-lg p-4">
        <div className="flex items-center gap-2 mb-2">
          <Lock size={13} className="text-primary shrink-0" />
          <p className="text-xs font-bold text-white">Payer maintenant</p>
          <span className="ml-auto text-[10px] font-bold bg-primary text-primary-foreground px-1.5 py-0.5 rounded-full">Recommandé</span>
        </div>
        <ul className="space-y-1">
          {[
            "La provision est débitée immédiatement via Stripe.",
            "Le créneau est sécurisé sur-le-champ.",
            "Confirmation reçue dans la minute.",
          ].map((t) => (
            <li key={t} className="flex items-start gap-1.5 text-xs text-white/65">
              <CheckCircle size={11} className="shrink-0 mt-0.5 text-primary" />
              {t}
            </li>
          ))}
        </ul>
      </div>
      {/* Option B */}
      <div className="bg-card border border-border rounded-lg p-4">
        <div className="flex items-center gap-2 mb-2">
          <Mail size={13} className="text-foreground shrink-0" />
          <p className="text-xs font-bold text-foreground">Payer plus tard</p>
        </div>
        <ul className="space-y-1">
          {[
            "Un email avec un lien Stripe vous est envoyé.",
            "Aucune saisie de carte sur ce site.",
            "Attention : le créneau n'est pas garanti tant que la provision n'est pas reçue.",
          ].map((t) => (
            <li key={t} className="flex items-start gap-1.5 text-xs text-muted-foreground">
              <span className="w-1 h-1 rounded-full bg-muted-foreground/50 shrink-0 mt-1.5" />
              {t}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
