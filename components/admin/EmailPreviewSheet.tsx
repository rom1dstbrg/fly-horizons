"use client";

import { useState, useEffect, useTransition } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { getEmailPreview, resendOrderEmail, type EmailPreviewType } from "@/lib/actions/email";
import { Send, Check, AlertCircle } from "lucide-react";

const EMAIL_TYPES: { value: EmailPreviewType; label: string }[] = [
  { value: "confirmation", label: "Confirmation + Facture" },
  { value: "processing",   label: "En préparation" },
  { value: "shipped",      label: "Expédiée" },
];

interface EmailPreviewSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: string;
  orderRef: string;
  customerEmail?: string;
}

export function EmailPreviewSheet({
  open,
  onOpenChange,
  orderId,
  orderRef,
  customerEmail,
}: EmailPreviewSheetProps) {
  const [type, setType] = useState<EmailPreviewType>("confirmation");
  const [html, setHtml] = useState("");
  const [loading, setLoading] = useState(false);
  const [sendState, setSendState] = useState<"idle" | "sent" | "error">("idle");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setHtml("");
    getEmailPreview(orderId, type).then((h) => {
      setHtml(h);
      setLoading(false);
    });
  }, [open, orderId, type]);

  useEffect(() => {
    setSendState("idle");
  }, [type]);

  function handleResend() {
    setSendState("idle");
    startTransition(async () => {
      const result = await resendOrderEmail(orderId, type);
      setSendState(result.success ? "sent" : "error");
    });
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex flex-col gap-0 p-0 w-full sm:max-w-2xl"
      >
        {/* Header */}
        <SheetHeader className="px-5 py-4 border-b border-border shrink-0 gap-3">
          <div className="flex items-center justify-between gap-2">
            <SheetTitle className="text-base">
              Aperçu email — <span className="font-mono text-primary">#{orderRef}</span>
            </SheetTitle>
            {customerEmail && (
              <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                → {customerEmail}
              </span>
            )}
          </div>

          {/* Type tabs + send button */}
          <div className="flex items-center gap-2 flex-wrap">
            {EMAIL_TYPES.map((t) => (
              <button
                key={t.value}
                onClick={() => setType(t.value)}
                className={`px-3 py-1 text-xs rounded-md font-medium border transition-colors ${
                  type === t.value
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border text-muted-foreground hover:text-foreground hover:border-primary/40"
                }`}
              >
                {t.label}
              </button>
            ))}

            <div className="ml-auto flex items-center gap-2 shrink-0">
              {sendState === "sent" && (
                <span className="flex items-center gap-1 text-xs text-green-500">
                  <Check size={12} /> Envoyé
                </span>
              )}
              {sendState === "error" && (
                <span className="flex items-center gap-1 text-xs text-destructive">
                  <AlertCircle size={12} /> Erreur
                </span>
              )}
              <button
                onClick={handleResend}
                disabled={isPending || loading}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-secondary border border-border text-foreground hover:border-primary transition-colors disabled:opacity-50"
              >
                <Send size={12} />
                {isPending ? "Envoi…" : "Renvoyer"}
              </button>
            </div>
          </div>
        </SheetHeader>

        {/* Preview iframe */}
        <div className="flex-1 overflow-hidden bg-muted/30">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-sm text-muted-foreground animate-pulse">
                Chargement de l'aperçu…
              </p>
            </div>
          ) : (
            <iframe
              srcDoc={html}
              title="Aperçu email"
              className="w-full h-full border-0 bg-white"
            />
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
