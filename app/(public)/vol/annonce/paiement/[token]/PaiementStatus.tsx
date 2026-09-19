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
      <div className="bg-white rounded-2xl border border-green-200 p-6">
        <div className="flex items-center gap-2.5 mb-2">
          <CheckCircle2 size={20} className="text-green-600 shrink-0" />
          <p className="text-base font-bold text-[#0b2238]">Paiement confirmé par {piloteNom}</p>
        </div>
        <p className="text-sm text-[#0b2238]/60 mb-4">
          Votre pilote a confirmé la réception de votre virement
          {montant != null ? ` de ${montant} €` : ""}. Tout est réglé, à bientôt pour le vol.
        </p>
        <a
          href={receiptUrl}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#0b2238] text-white text-sm font-semibold hover:bg-[#0b2238]/90 transition-colors cursor-pointer"
        >
          <Download size={15} />
          Télécharger le reçu
        </a>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-border p-6 space-y-5">
      {/* Montant */}
      <div>
        <p className="text-[11px] font-bold uppercase tracking-[2px] text-[#0b2238]/50 mb-1">
          Montant à régler
        </p>
        <p className="text-[40px] font-black text-[#0b2238] leading-none">
          {montant != null ? `${montant} €` : "—"}
        </p>
        <p className="text-xs text-[#0b2238]/55 mt-2">
          À virer directement à votre pilote <strong>{piloteNom}</strong>. Fly Horizons
          n&apos;encaisse rien sur ce vol, aucun paiement par carte n&apos;est demandé ici.
        </p>
      </div>

      {iban ? (
        <div className="flex flex-col sm:flex-row gap-5">
          {/* QR EPC */}
          <div className="flex flex-col items-center sm:items-start gap-1.5 shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={qrUrl}
              alt="QR code de virement SEPA"
              width={150}
              height={150}
              className="rounded-xl border border-border bg-white"
            />
            <p className="text-[10px] text-[#0b2238]/50 text-center sm:text-left max-w-[150px] leading-snug">
              Pas avec l&apos;appareil photo : ouvrez votre appli bancaire, elle a son propre
              scanner.
            </p>
          </div>
          <div className="min-w-0 flex-1 space-y-3">
            <p className="text-xs text-[#0b2238]/55">
              Scannez le QR <strong>depuis votre appli bancaire</strong> (pas l&apos;appareil
              photo, qui ouvrirait juste une page web), ou saisissez le virement manuellement :
            </p>
            <Field
              label="IBAN"
              value={iban}
              display={iban}
              copied={copied === "iban"}
              onCopy={() => copy(iban.replace(/\s+/g, ""), "iban")}
            />
            <Field
              label="Bénéficiaire"
              value={piloteNom}
              display={piloteNom}
              copyable={false}
            />
            <Field
              label="Communication"
              value={communication}
              display={communication}
              copied={copied === "comm"}
              onCopy={() => copy(communication, "comm")}
            />
            {montant != null && (
              <Field label="Montant" value={String(montant)} display={`${montant} €`} copyable={false} />
            )}
          </div>
        </div>
      ) : (
        <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
          Votre pilote n&apos;a pas encore renseigné son IBAN. Il vous contactera pour le
          règlement.
        </p>
      )}

      {/* Statut en direct */}
      <div className="flex items-center justify-between gap-3 rounded-xl bg-[#f5f8ff] border border-border px-4 py-3">
        <span className="flex items-center gap-2 text-sm text-[#0b2238]/70">
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
  value: string;
  display: string;
  copied?: boolean;
  onCopy?: () => void;
  copyable?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-border/60 pb-2">
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-wide text-[#0b2238]/40">{label}</p>
        <p className="font-mono text-sm text-[#0b2238] truncate">{display}</p>
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
