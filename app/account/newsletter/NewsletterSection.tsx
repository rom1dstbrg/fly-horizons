"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Loader2, BellOff, Mails } from "lucide-react";
import { subscribeFromAccount, unsubscribeFromAccount } from "@/lib/actions/newsletter";

export function NewsletterSection({ newsletterActive }: { newsletterActive: boolean | null }) {
  const [subscribed, setSubscribed] = useState<boolean | null>(newsletterActive);
  const [loading, setLoading] = useState(false);

  async function toggle() {
    setLoading(true);
    const res = subscribed ? await unsubscribeFromAccount() : await subscribeFromAccount();
    setLoading(false);
    if (res.error) {
      toast.error(res.error);
    } else {
      setSubscribed(!subscribed);
      toast.success(
        subscribed
          ? "Désinscription effectuée"
          : "Inscription confirmée, vérifiez vos emails"
      );
    }
  }

  return (
    <div className="card-premium p-6 space-y-4">
      <div className="flex items-start justify-between gap-6">
        <div className="flex-1">
          <p className="text-sm text-foreground font-medium mb-1">
            {subscribed ? "Vous êtes abonné" : "Vous n'êtes pas abonné"}
          </p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {subscribed
              ? "Vous recevez nos actualités, offres et nouveautés en avant-première."
              : "Abonnez-vous pour recevoir nos actualités, offres et nouveautés en avant-première."}
          </p>
        </div>

        {subscribed ? (
          <button
            onClick={toggle}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border text-xs font-semibold text-muted-foreground hover:text-red-600 hover:border-red-200 hover:bg-red-50 transition-colors disabled:opacity-40 cursor-pointer shrink-0"
          >
            {loading ? <Loader2 size={13} className="animate-spin" /> : <BellOff size={13} />}
            Se désinscrire
          </button>
        ) : (
          <button
            onClick={toggle}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-navy text-white text-xs font-semibold hover:bg-navy/90 transition-colors disabled:opacity-40 cursor-pointer shrink-0"
          >
            {loading ? <Loader2 size={13} className="animate-spin" /> : <Mails size={13} />}
            S&apos;abonner
          </button>
        )}
      </div>

      {subscribed && (
        <p className="pt-4 border-t border-border text-[11px] text-muted-foreground/60">
          Vous pouvez vous désinscrire à tout moment via le lien en bas de chaque email ou depuis cette page.
        </p>
      )}
    </div>
  );
}
