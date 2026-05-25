import Link from "next/link";
import { CheckCircle } from "lucide-react";

interface Props {
  searchParams: Promise<{ d?: string }>;
}

export default async function ReporterConfirmePage({ searchParams }: Props) {
  const { d } = await searchParams;
  const dateStr = d ? decodeURIComponent(d) : null;

  return (
    <div className="bg-[#f5f5f7] flex-1 flex flex-col px-4 pb-16">
      <div className="h-[84px]" />
      <div className="flex-1 flex flex-col items-center justify-center py-10">
      <div className="max-w-md w-full text-center">
        <div className="w-16 h-16 rounded-2xl bg-green-100 flex items-center justify-center mx-auto mb-5">
          <CheckCircle size={28} className="text-green-600" />
        </div>
        <h1 className="text-xl font-bold text-foreground mb-2">Report confirmé</h1>
        <p className="text-sm text-muted-foreground leading-relaxed mb-6">
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
        <Link
          href="/account#reservations"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#113356] text-white rounded-xl text-sm font-bold hover:bg-[#0b2238] transition-colors"
        >
          Voir ma réservation
        </Link>
      </div>
      </div>
    </div>
  );
}
