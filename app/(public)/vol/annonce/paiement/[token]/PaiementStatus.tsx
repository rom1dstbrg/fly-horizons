"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Copy, Check, Download, RefreshCw, Clock } from "lucide-react";

interface Props {
  reservationId: string;
  montant: number | null;
  paye: boolean;
  piloteNom: string;
  iban: string | null;
  communication: string;
  qrUrl: string;
  receiptUrl: string;
}

const EYEBROW = "text-[11px] font-bold text-primary uppercase tracking-[3px]";
const CTA = "inline-flex items-center justify-center gap-2 rounded-[10px] bg-[#0b2238] px-6 py-[15px] text-sm font-black text-white hover:bg-[#0b2238]/90 transition-colors cursor-pointer";

export function PaiementStatus({
  montant,
  paye,
  piloteNom,
  iban,
  communication,
  qrUrl,
  receiptUrl,
}: Props) {
  const router = useRouter();
  const [copied, setCopied] = useState<"iban" | "comm" | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Rafraîchit l'état ("en attente" → "confirmé") tant que le pilote n'a pas
  // coché « payé ». Pas de webhook : c'est un simple poll doux.
  useEffect(() => {
    if (paye) return;
    const t = setInterval(() => router.refresh(), 20_000);
    return () => clearInterval(t);
  }, [paye, router]);

  function copy(value: string, key: "iban" | "comm") {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(null), 2000);
    });
  }

  if (paye) {
    return (
      <div>
        <div className="w-12 h-12 rounded-full bg-primary text-[#0b2238] grid place-items-center mb-[18px]">
          <CheckCircle2 size={22} strokeWidth={2.5} />
        </div>
        <p className="text-[15px] leading-relaxed text-foreground/70 mb-6">
          {piloteNom} a confirmé la réception de votre virement
          {montant != null ? ` de ${montant} €` : ""}. Tout est réglé, à bientôt pour le vol.
        </p>
        <a href={receiptUrl} className={CTA}>
          <Download size={15} />
          Télécharger le reçu
        </a>
      </div>
    );
  }

  return (
    <div>
      {/* Montant */}
      <p className={`${EYEBROW} mb-1`}>Montant à régler</p>
      <p className="text-[44px] lg:text-[52px] font-black text-foreground leading-none">
        {montant != null ? `${montant} €` : "—"}
      </p>

      {iban ? (
        <div className="mt-7 pt-7 border-t border-border">
          <p className="text-[13.5px] text-foreground/60 mb-5">
            Scannez le QR <strong className="text-foreground">depuis votre appli bancaire</strong> (pas
            l&apos;appareil photo, qui ouvrirait juste une page web), ou saisissez le virement manuellement :
          </p>
          <div className="flex flex-col sm:flex-row gap-6">
            {/* QR EPC */}
            <div className="flex flex-col items-center sm:items-start gap-2 shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={qrUrl}
                alt="QR code de virement SEPA"
                width={150}
                height={150}
                className="rounded-xl border border-border"
              />
              <p className="text-[11px] text-foreground/45 text-center sm:text-left max-w-[150px] leading-snug">
                Pas avec l&apos;appareil photo : ouvrez votre appli bancaire, elle a son propre
                scanner.
              </p>
            </div>
            <div className="min-w-0 flex-1">
              <Field
                label="IBAN"
                display={iban}
                copied={copied === "iban"}
                onCopy={() => copy(iban.replace(/\s+/g, ""), "iban")}
              />
              <Field label="Bénéficiaire" display={piloteNom} copyable={false} />
              <Field
                label="Communication"
                display={communication}
                copied={copied === "comm"}
                onCopy={() => copy(communication, "comm")}
              />
              {montant != null && (
                <Field label="Montant" display={`${montant} €`} copyable={false} />
              )}
            </div>
          </div>
        </div>
      ) : (
        <p className="mt-7 text-sm text-amber-700 bg-amber-50 rounded-xl px-4 py-3">
          Votre pilote n&apos;a pas encore renseigné son IBAN. Il vous contactera pour le
          règlement.
        </p>
      )}

      {/* Statut en direct */}
      <div className="mt-7 pt-6 border-t border-border flex items-center justify-between gap-3">
        <span className="flex items-center gap-2 text-sm text-foreground/70">
          <Clock size={15} className="text-amber-500" />
          En attente de votre virement — le pilote confirmera dès réception.
        </span>
        <button
          type="button"
          onClick={() => {
            setRefreshing(true);
            router.refresh();
            setTimeout(() => setRefreshing(false), 1200);
          }}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline cursor-pointer shrink-0"
        >
          <RefreshCw size={12} className={refreshing ? "animate-spin" : ""} />
          Actualiser
        </button>
      </div>
    </div>
  );
}

function Field({
  label,
  display,
  copied,
  onCopy,
  copyable = true,
}: {
  label: string;
  display: string;
  copied?: boolean;
  onCopy?: () => void;
  copyable?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-3 border-b border-border last:border-b-0">
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-wide text-foreground/40">{label}</p>
        <p className="font-mono text-sm text-foreground truncate">{display}</p>
      </div>
      {copyable && onCopy && (
        <button
          type="button"
          onClick={onCopy}
          className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline cursor-pointer shrink-0"
        >
          {copied ? <Check size={12} /> : <Copy size={12} />}
          {copied ? "Copié" : "Copier"}
        </button>
      )}
    </div>
  );
}
