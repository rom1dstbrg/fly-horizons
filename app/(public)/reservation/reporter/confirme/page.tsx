import Link from "next/link";
import { CheckCircle, CalendarDays } from "lucide-react";

interface Props {
  searchParams: Promise<{ d?: string }>;
}

export default async function ReporterConfirmePage({ searchParams }: Props) {
  const { d } = await searchParams;
  const dateStr = d ? decodeURIComponent(d) : null;

  return (
    <main className="flex-1 flex items-center justify-center bg-gradient-navy px-4 pt-[86px] pb-16">
      <div className="max-w-md w-full space-y-3">

        {/* ── Confirmation ── */}
        <div className="card-premium p-8 text-center">
          <div className="w-14 h-14 rounded-lg bg-navy flex items-center justify-center mx-auto mb-5">
            <CheckCircle size={26} className="text-primary" />
          </div>
          <h1 className="text-2xl font-black text-foreground leading-tight mb-2">
            Report confirmé
          </h1>
          <p className="text-sm text-foreground/50 leading-relaxed">
            {dateStr ? (
              <>
                Votre vol est bien reporté au{" "}
                <strong className="text-foreground capitalize">{dateStr}</strong>.{" "}
              </>
            ) : (
              "Votre vol a bien été reporté. "
            )}
            Un email de confirmation vous a été envoyé. Je prendrai contact avec vous pour confirmer les détails.
          </p>
        </div>

        {/* ── CTA ── */}
        <div className="flex flex-col gap-2.5 pt-1">
          <Link
            href="/account#reservations"
            className="inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-primary text-primary-foreground rounded-lg text-sm font-black hover:bg-[#e6a800] active:scale-[0.98] transition-all shadow-gold"
          >
            <CalendarDays size={15} />
            Voir ma réservation
          </Link>
          <Link
            href="/"
            className="inline-flex items-center justify-center px-6 py-2.5 rounded-lg border border-border text-sm font-medium text-foreground/50 hover:text-foreground hover:border-foreground/20 transition-colors"
          >
            Retour à l&apos;accueil
          </Link>
        </div>

      </div>
    </main>
  );
}
