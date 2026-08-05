"use client";

import { Check, Copy, ExternalLink } from "lucide-react";

export function PaymentLinkCard({
  paymentToken,
  linkCopied,
  onCopy,
}: {
  paymentToken: string;
  linkCopied: boolean;
  onCopy: () => void;
}) {
  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 space-y-2.5">
      <p className="text-[10px] font-bold text-amber-800 uppercase tracking-wider">Lien de paiement</p>
      <div className="flex items-center gap-2">
        <code className="flex-1 min-w-0 text-[10px] font-mono text-amber-900 bg-white border border-amber-200 rounded-lg px-2.5 py-1.5 truncate">
          /api/reservation/pay/{paymentToken.slice(0, 12)}…
        </code>
        <button
          type="button"
          onClick={onCopy}
          title="Copier le lien"
          className="shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white border border-amber-200 text-xs font-semibold text-amber-700 hover:bg-amber-100 transition-colors cursor-pointer"
        >
          {linkCopied ? <Check size={11} className="text-emerald-600" /> : <Copy size={11} />}
          {linkCopied ? "Copié" : "Copier"}
        </button>
        <a
          href={`/api/reservation/pay/${paymentToken}`}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white border border-amber-200 text-xs text-amber-700 hover:bg-amber-100 transition-colors"
          title="Ouvrir le lien"
        >
          <ExternalLink size={11} />
        </a>
      </div>
    </div>
  );
}
