import Link from "next/link";
import { CheckCircle, CalendarDays, MapPin, CloudRain, Users, ExternalLink } from "lucide-react";

export const metadata = { title: "Vol sur mesure réservé · Fly Horizons" };

const STEPS = [
  {
    num: 1,
    done: true,
    title: "Demande envoyée",
    desc: "Votre acompte a bien été reçu et votre itinéraire enregistré. Un email de confirmation vient d'être envoyé.",
  },
  {
    num: 2,
    done: false,
    title: "Votre pilote analyse votre route",
    desc: "Dans les 24 h, votre pilote étudie la faisabilité de votre itinéraire. Si certaines zones ne peuvent pas être survolées, il vous propose des alternatives.",
  },
  {
    num: 3,
    done: false,
    title: "Validation de l'itinéraire",
    desc: "Vous recevez la route définitive par email. Vous pouvez demander des ajustements avant de donner votre accord.",
  },
  {
    num: 4,
    done: false,
    title: "À vous le ciel",
    desc: "Présentez-vous 15 min avant à Charleroi (EBCI). Briefing sécurité, casques audio fournis.",
  },
];

export default function VolSurMesureSuccessPage() {
  return (
    <main className="flex-1 flex items-center justify-center bg-[#f5f5f7] px-4 pt-[86px] pb-16">
      <div className="max-w-lg w-full space-y-3">

        {/* ── En-tête ── */}
        <div className="bg-card rounded-2xl border border-border shadow-[var(--sh-card)] p-6">
          <p className="text-[10px] font-black text-primary uppercase tracking-[3px] mb-1">
            Vol sur mesure
          </p>
          <h1 className="text-2xl font-black text-foreground leading-tight">
            Votre aventure est réservée !
          </h1>
          <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">
            Voici ce qui se passe maintenant.
          </p>
        </div>

        {/* ── Étapes ── */}
        <div className="bg-card rounded-2xl border border-border shadow-[var(--sh-card)] p-6">
          <p className="text-[10px] font-black text-primary uppercase tracking-[3px] mb-5">
            Prochaines étapes
          </p>
          <div>
            {STEPS.map(({ num, done, title, desc }, i) => (
              <div key={num} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${done ? "bg-navy" : "bg-primary"}`}>
                    {done
                      ? <CheckCircle size={13} className="text-primary" />
                      : <span className="font-black text-primary-foreground text-xs leading-none">{num}</span>}
                  </div>
                  {i < STEPS.length - 1 && (
                    <div className="w-px bg-border my-1 min-h-[20px] flex-1" />
                  )}
                </div>
                <div className="pb-4 pt-0.5">
                  <p className="text-sm font-bold text-foreground">{title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Infos pratiques ── */}
        <div className="bg-card rounded-2xl border border-border shadow-[var(--sh-card)] p-6 space-y-4">
          <p className="text-[10px] font-black text-primary uppercase tracking-[3px]">
            Informations pratiques
          </p>

          <div className="flex items-start gap-3">
            <div className="w-7 h-7 rounded-lg bg-secondary border border-border flex items-center justify-center shrink-0 mt-0.5">
              <MapPin size={13} className="text-muted-foreground" />
            </div>
            <div>
              <p className="text-xs font-semibold text-foreground">Aéroport de Charleroi (EBCI)</p>
              <p className="text-xs text-muted-foreground mt-0.5">Rue des Frères Wright 8, Gosselies · Arrivez 15 min avant</p>
            </div>
          </div>

          <Link
            href="/access-ebci"
            className="flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-secondary border border-border text-muted-foreground rounded-lg text-xs font-semibold hover:bg-navy hover:text-white hover:border-navy transition-all"
          >
            <ExternalLink size={12} />
            Plan d&apos;accès à l&apos;aéroport
          </Link>

          <div className="flex items-start gap-3 pt-1 border-t border-border">
            <div className="w-7 h-7 rounded-lg bg-secondary border border-border flex items-center justify-center shrink-0 mt-0.5">
              <CloudRain size={13} className="text-muted-foreground" />
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              <strong className="text-foreground">Météo :</strong> si les conditions ne permettent pas de voler, le vol est reporté sans frais. La décision est prise jusqu&apos;à 2 h avant le départ.
            </p>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-7 h-7 rounded-lg bg-secondary border border-border flex items-center justify-center shrink-0 mt-0.5">
              <Users size={13} className="text-muted-foreground" />
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              <strong className="text-foreground">Passagers :</strong> maximum 3 passagers par vol (avion léger), sans exception.
            </p>
          </div>
        </div>

        {/* ── CTAs ── */}
        <div className="flex flex-col gap-2.5 pt-1">
          <Link
            href="/account#reservations"
            className="inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-primary text-primary-foreground rounded-lg text-sm font-black hover:brightness-105 active:scale-[0.98] transition-all shadow-gold"
          >
            <CalendarDays size={15} />
            Suivre ma réservation
          </Link>
          <Link
            href="/"
            className="inline-flex items-center justify-center px-6 py-2.5 rounded-lg border border-border text-sm font-medium text-muted-foreground hover:text-foreground hover:border-foreground/20 transition-colors"
          >
            Retour à l&apos;accueil
          </Link>
        </div>

      </div>
    </main>
  );
}
