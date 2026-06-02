"use client";

import { useState, useTransition, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import {
  X, Check, Copy, Phone, Mail, ExternalLink,
  AlertTriangle, Loader2, Pencil, RotateCcw, Trash2,
} from "lucide-react";
import {
  markVoucherUsed, markVoucherUnused, updateVoucher, deleteVoucher, resendVoucherEmail,
} from "@/lib/actions/vouchers";
import { formatDuration } from "@/lib/vouchers";
import { AdminBadge, STATUT_VOUCHER } from "@/components/admin/ui/AdminBadge";

interface VoucherOrder { id: string; total: number; status: string; created_at: string; }

export interface DrawerVoucher {
  id: string;
  code: string;
  duration_minutes: number;
  prix: number | null;
  product_title: string;
  recipient_email: string | null;
  recipient_name: string | null;
  status: "unused" | "used" | "expired";
  used_at: string | null;
  expires_at: string | null;
  created_at: string;
  order_id: string | null;
  order: VoucherOrder | null;
  client_telephone: string | null;
  client_id: string | null;
  buyer_name: string | null;
  buyer_email: string | null;
}

function getPaymentBadge(v: DrawerVoucher) {
  if (!v.order_id) return { label: "Offert", className: "bg-blue-50 text-blue-700 border-blue-200" };
  const s = v.order?.status;
  if (s === "pending")                        return { label: "En attente", className: "bg-yellow-50 text-yellow-700 border-yellow-200" };
  if (s === "cancelled" || s === "refunded")  return { label: "Annulé",     className: "bg-red-50 text-red-600 border-red-200" };
  return                                             { label: "Payé",       className: "bg-emerald-50 text-emerald-700 border-emerald-200" };
}

function CopyCode({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }
  return (
    <button
      onClick={copy}
      title="Copier le code"
      className="flex items-center gap-2 font-mono text-base font-bold text-foreground hover:opacity-70 transition-opacity cursor-pointer"
    >
      {code}
      {copied
        ? <Check size={14} className="text-green-500" />
        : <Copy size={13} className="text-muted-foreground" />
      }
    </button>
  );
}

export function VoucherDrawer({
  voucher,
  onClose,
  onUpdate,
  onDelete,
}: {
  voucher: DrawerVoucher | null;
  onClose: () => void;
  onUpdate?: (id: string, fields: Partial<DrawerVoucher>) => void;
  onDelete?: (id: string) => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [feedback, setFeedback] = useState<{ msg: string; ok: boolean } | null>(null);

  // Edit form state
  const [draftTitle, setDraftTitle]     = useState("");
  const [draftDuration, setDraftDuration] = useState("");
  const [draftPrix, setDraftPrix]       = useState("");
  const [draftName, setDraftName]       = useState("");
  const [draftEmail, setDraftEmail]     = useState("");
  const [draftExpires, setDraftExpires] = useState("");

  useEffect(() => {
    setEditing(false);
    setConfirmDelete(false);
    setFeedback(null);
  }, [voucher?.id]);

  function showFeedback(msg: string, ok = true) {
    setFeedback({ msg, ok });
    setTimeout(() => setFeedback(null), 3000);
  }

  function openEdit() {
    if (!voucher) return;
    setDraftTitle(voucher.product_title);
    setDraftDuration(String(voucher.duration_minutes));
    setDraftPrix(voucher.prix != null ? String(voucher.prix) : "");
    setDraftName(voucher.recipient_name ?? "");
    setDraftEmail(voucher.recipient_email ?? "");
    setDraftExpires(
      voucher.expires_at ? new Date(voucher.expires_at).toISOString().split("T")[0] : ""
    );
    setEditing(true);
  }

  function saveEdit() {
    if (!voucher) return;
    const fields = {
      product_title:    draftTitle.trim(),
      duration_minutes: parseInt(draftDuration) || voucher.duration_minutes,
      prix:             draftPrix ? parseFloat(draftPrix) : null,
      recipient_name:   draftName.trim() || null,
      recipient_email:  draftEmail.trim() || null,
      expires_at:       draftExpires || null,
    };
    startTransition(async () => {
      const r = await updateVoucher(voucher.id, fields);
      if (r.error) { showFeedback("Erreur : " + r.error, false); return; }
      onUpdate?.(voucher.id, fields);
      setEditing(false);
      showFeedback("Voucher mis à jour ✓");
    });
  }

  function toggleUsed() {
    if (!voucher) return;
    startTransition(async () => {
      if (voucher.status === "unused") {
        await markVoucherUsed(voucher.id);
        onUpdate?.(voucher.id, { status: "used", used_at: new Date().toISOString() });
        showFeedback("Marqué comme utilisé ✓");
      } else if (voucher.status === "used") {
        await markVoucherUnused(voucher.id);
        onUpdate?.(voucher.id, { status: "unused", used_at: null });
        showFeedback("Remis disponible ✓");
      }
    });
  }

  function doDelete() {
    if (!voucher) return;
    startTransition(async () => {
      await deleteVoucher(voucher.id);
      onDelete?.(voucher.id);
      onClose();
    });
  }

  function doResendEmail() {
    if (!voucher) return;
    startTransition(async () => {
      const r = await resendVoucherEmail(voucher.id);
      if (r.error) showFeedback("Erreur : " + r.error, false);
      else showFeedback("Email renvoyé ✓");
    });
  }

  const v = voucher;
  const statusCfg = v ? (STATUT_VOUCHER[v.status] ?? { label: v.status, variant: "secondary" as const }) : null;
  const payBadge  = v ? getPaymentBadge(v) : null;

  const createdDate = v
    ? new Date(v.created_at).toLocaleDateString("fr-BE", { day: "numeric", month: "long", year: "numeric" })
    : "";
  const usedDate = v?.used_at
    ? new Date(v.used_at).toLocaleDateString("fr-BE", { day: "numeric", month: "long", year: "numeric" })
    : null;
  const expiresDate = v?.expires_at
    ? new Date(v.expires_at).toLocaleDateString("fr-BE", { day: "numeric", month: "long", year: "numeric" })
    : null;
  const isExpiringSoon = v?.expires_at && v.status === "unused"
    ? new Date(v.expires_at) < new Date(Date.now() + 14 * 86400000)
    : false;

  return (
    <AnimatePresence>
      {v && (
        <>
          <motion.div
            className="fixed inset-0 bg-foreground/20 backdrop-blur-[1px] z-50"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
          />

          <motion.aside
            className="fixed right-0 top-0 bottom-0 w-full max-w-lg bg-card border-l border-border shadow-[−8px_0_40px_rgba(17,51,86,.12)] z-50 flex flex-col"
            initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 300 }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-1.5">
                  {statusCfg && <AdminBadge variant={statusCfg.variant} label={statusCfg.label} />}
                  {payBadge && (
                    <span className={`inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full border ${payBadge.className}`}>
                      {payBadge.label}
                    </span>
                  )}
                </div>
                <CopyCode code={v.code} />
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground shrink-0 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Feedback toast */}
            <AnimatePresence>
              {feedback && (
                <motion.div
                  className={`mx-4 mt-3 px-3 py-2 rounded-lg text-sm flex items-center gap-2 shrink-0 border ${
                    feedback.ok
                      ? "bg-green-50 border-green-200 text-green-700"
                      : "bg-red-50 border-red-200 text-red-700"
                  }`}
                  initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                >
                  <Check size={13} /> {feedback.msg}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">

              {/* Client */}
              <div className="bg-secondary rounded-xl p-4 space-y-2.5">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[1.5px] mb-2">Client</p>
                {v.recipient_name ? (
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-foreground">{v.recipient_name}</span>
                    {v.client_id && (
                      <Link
                        href={`/admin/clients/${v.client_id}`}
                        onClick={onClose}
                        className="text-muted-foreground hover:text-navy transition-colors"
                        title="Voir le profil client"
                      >
                        <ExternalLink size={12} />
                      </Link>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground italic">Destinataire non renseigné</p>
                )}
                {v.recipient_email && (
                  <a
                    href={`mailto:${v.recipient_email}`}
                    className="flex items-center gap-2.5 hover:text-navy transition-colors"
                  >
                    <Mail size={13} className="text-muted-foreground shrink-0" />
                    <span className="text-sm text-foreground">{v.recipient_email}</span>
                  </a>
                )}
                {v.client_telephone && (
                  <a
                    href={`tel:${v.client_telephone}`}
                    className="flex items-center gap-2.5 hover:text-navy transition-colors"
                  >
                    <Phone size={13} className="text-muted-foreground shrink-0" />
                    <span className="text-sm text-foreground">{v.client_telephone}</span>
                  </a>
                )}
              </div>

              {/* Vol */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[1.5px]">Vol</p>
                  {!editing && (
                    <button
                      onClick={openEdit}
                      className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors px-1.5 py-0.5 rounded hover:bg-secondary cursor-pointer"
                    >
                      <Pencil size={10} /> Modifier
                    </button>
                  )}
                </div>

                {editing ? (
                  <div className="space-y-3 bg-secondary rounded-xl p-4">
                    <div>
                      <label className="block text-xs font-medium text-muted-foreground mb-1.5">Description du vol</label>
                      <input
                        value={draftTitle} onChange={e => setDraftTitle(e.target.value)}
                        className="w-full h-9 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-muted-foreground mb-1.5">Durée (min)</label>
                        <input
                          type="number" min={1} value={draftDuration} onChange={e => setDraftDuration(e.target.value)}
                          className="w-full h-9 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-muted-foreground mb-1.5">Prix (€)</label>
                        <input
                          type="number" step="0.01" min="0" value={draftPrix} onChange={e => setDraftPrix(e.target.value)}
                          className="w-full h-9 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-muted-foreground mb-1.5">Nom destinataire</label>
                      <input
                        value={draftName} onChange={e => setDraftName(e.target.value)} placeholder="Jean Dupont"
                        className="w-full h-9 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-muted-foreground mb-1.5">Email destinataire</label>
                      <input
                        type="email" value={draftEmail} onChange={e => setDraftEmail(e.target.value)} placeholder="jean@exemple.com"
                        className="w-full h-9 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-muted-foreground mb-1.5">Expiration</label>
                      <input
                        type="date" value={draftExpires} onChange={e => setDraftExpires(e.target.value)}
                        className="w-full h-9 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                    </div>
                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={saveEdit} disabled={isPending}
                        className="flex items-center gap-1.5 px-3 h-8 rounded-lg bg-navy text-white text-xs font-semibold hover:brightness-90 disabled:opacity-50 transition-all cursor-pointer"
                      >
                        {isPending ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                        Sauvegarder
                      </button>
                      <button
                        onClick={() => setEditing(false)}
                        className="px-3 h-8 rounded-lg border border-border text-xs text-muted-foreground hover:bg-secondary transition-colors cursor-pointer"
                      >
                        Annuler
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="bg-secondary rounded-xl p-4 space-y-2">
                    <p className="text-sm font-medium text-foreground">{v.product_title}</p>
                    <div className="flex items-center gap-4">
                      <span className="text-sm font-semibold text-foreground">{formatDuration(v.duration_minutes)}</span>
                      {v.prix != null && (
                        <span className="text-sm font-semibold text-primary">{v.prix} €</span>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Paiement */}
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[1.5px] mb-2">Paiement</p>
                <div className="bg-secondary rounded-xl p-4 flex items-center gap-3 flex-wrap">
                  {payBadge && (
                    <span className={`inline-flex items-center text-xs font-semibold px-2.5 py-1 rounded-full border ${payBadge.className}`}>
                      {payBadge.label}
                    </span>
                  )}
                  {v.order?.total != null && (
                    <span className="text-sm font-semibold text-foreground">{v.order.total} €</span>
                  )}
                  {v.order_id && (
                    <span className="text-xs text-muted-foreground font-mono ml-auto">
                      #{v.order_id.slice(0, 8).toUpperCase()}
                    </span>
                  )}
                </div>
              </div>

              {/* Dates */}
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[1.5px] mb-2">Dates</p>
                <div className="bg-secondary rounded-xl p-4 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Créé le</span>
                    <span className="text-sm text-foreground">{createdDate}</span>
                  </div>
                  {expiresDate && (
                    <div className="flex items-center justify-between">
                      <span className={`text-xs flex items-center gap-1 ${isExpiringSoon ? "text-amber-600 font-medium" : "text-muted-foreground"}`}>
                        {isExpiringSoon && <AlertTriangle size={11} />}
                        Expire le
                      </span>
                      <span className={`text-sm ${isExpiringSoon ? "text-amber-600 font-semibold" : "text-foreground"}`}>
                        {expiresDate}
                      </span>
                    </div>
                  )}
                  {usedDate && (
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-emerald-600">Utilisé le</span>
                      <span className="text-sm text-emerald-600 font-medium">{usedDate}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-5 py-4 border-t border-border shrink-0 space-y-2">
              <div className="flex items-center gap-2">
              {v.status !== "expired" && (
                <button
                  onClick={toggleUsed} disabled={isPending}
                  className="flex items-center gap-2 px-4 h-9 rounded-lg bg-navy text-white text-sm font-semibold hover:brightness-90 disabled:opacity-50 transition-all cursor-pointer flex-1 justify-center"
                >
                  {isPending
                    ? <Loader2 size={14} className="animate-spin" />
                    : v.status === "unused"
                      ? <><Check size={14} /> Marquer utilisé</>
                      : <><RotateCcw size={14} /> Remettre disponible</>
                  }
                </button>
              )}

              {confirmDelete ? (
                <div className="flex gap-2">
                  <button
                    onClick={doDelete} disabled={isPending}
                    className="flex items-center gap-1.5 px-3 h-9 rounded-lg bg-destructive text-white text-sm font-semibold hover:brightness-90 disabled:opacity-50 cursor-pointer"
                  >
                    {isPending ? <Loader2 size={14} className="animate-spin" /> : "Confirmer"}
                  </button>
                  <button
                    onClick={() => setConfirmDelete(false)}
                    className="px-3 h-9 rounded-lg border border-border text-sm text-muted-foreground hover:bg-secondary cursor-pointer"
                  >
                    Annuler
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmDelete(true)}
                  className="flex items-center gap-1.5 px-3 h-9 rounded-lg border border-border text-sm text-muted-foreground hover:text-destructive hover:border-destructive/30 hover:bg-destructive/5 transition-colors cursor-pointer"
                >
                  <Trash2 size={14} />
                  Supprimer
                </button>
              )}
              </div>
              {v.recipient_email && (
                <button
                  onClick={doResendEmail} disabled={isPending}
                  className="w-full flex items-center justify-center gap-2 px-4 h-9 rounded-lg border border-border text-sm text-muted-foreground hover:text-navy hover:border-navy/30 hover:bg-navy/5 disabled:opacity-50 transition-colors cursor-pointer"
                >
                  {isPending ? <Loader2 size={14} className="animate-spin" /> : <Mail size={14} />}
                  Renvoyer par email
                </button>
              )}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
