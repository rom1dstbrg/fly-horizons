"use client";

import { useState, useTransition } from "react";
import {
  markVoucherUsed, markVoucherUnused,
  createManualVoucher, deleteVoucher, resendVoucherEmail,
} from "@/lib/actions/vouchers";
import { formatDuration } from "@/lib/vouchers";
import {
  Check, RotateCcw, Copy, Plus, Loader2, Users, AlertTriangle, Mail,
} from "lucide-react";
import { AdminBadge, STATUT_VOUCHER } from "@/components/admin/ui/AdminBadge";
import { AdminRowActions } from "@/components/admin/ui/AdminRowActions";
import { VoucherDrawer, type DrawerVoucher } from "@/components/admin/VoucherDrawer";

type VoucherCode = DrawerVoucher;

function getPaymentBadge(voucher: VoucherCode) {
  if (!voucher.order_id) return { label: "Offert", className: "bg-blue-50 text-blue-700 border-blue-200" };
  const s = voucher.order?.status;
  if (s === "pending")                        return { label: "En attente",  className: "bg-yellow-50 text-yellow-700 border-yellow-200" };
  if (s === "cancelled" || s === "refunded")  return { label: "Annulé",      className: "bg-red-50 text-red-600 border-red-200" };
  return                                             { label: "Payé",        className: "bg-emerald-50 text-emerald-700 border-emerald-200" };
}

const STATUS_FILTER_TABS = [
  { key: "all",    label: "Tous"        },
  { key: "unused", label: "Disponibles" },
  { key: "used",   label: "Utilisés"    },
];

// ── CopyCode ──────────────────────────────────────────────────────────────────

function CopyCode({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  function copy(e: React.MouseEvent) {
    e.stopPropagation();
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }
  return (
    <button
      onClick={copy}
      title="Copier"
      className="inline-flex items-center gap-1 font-mono text-xs font-bold text-primary hover:opacity-70 transition-opacity cursor-pointer"
    >
      {code}
      {copied
        ? <Check size={10} className="text-green-500" />
        : <Copy size={9} className="opacity-40" />
      }
    </button>
  );
}

// ── ClientPicker ──────────────────────────────────────────────────────────────

interface ClientOption {
  id: string;
  prenom: string;
  nom: string;
  email: string;
  telephone?: string | null;
}

function ClientPicker({ clients, onSelect }: {
  clients: ClientOption[];
  onSelect: (c: ClientOption) => void;
}) {
  const [query, setQuery] = useState("");
  const suggestions = query.length >= 2
    ? clients.filter(c =>
        c.email.toLowerCase().includes(query.toLowerCase()) ||
        `${c.prenom} ${c.nom}`.toLowerCase().includes(query.toLowerCase())
      ).slice(0, 5)
    : [];

  return (
    <div className="relative">
      <label className="flex items-center gap-1 text-xs font-medium text-muted-foreground mb-1.5">
        <Users size={11} /> Choisir un client existant
      </label>
      <input
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder="Nom ou email…"
        className="w-full h-9 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
      />
      {suggestions.length > 0 && (
        <ul className="absolute z-10 mt-1 w-full bg-popover border border-border rounded-lg shadow-lg overflow-hidden text-sm">
          {suggestions.map(c => (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => { onSelect(c); setQuery(""); }}
                className="w-full text-left px-3 py-2 hover:bg-secondary transition-colors cursor-pointer"
              >
                <span className="font-medium text-foreground">{c.prenom} {c.nom}</span>
                <span className="ml-2 text-xs text-muted-foreground">{c.email}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ── CreateVoucherForm ─────────────────────────────────────────────────────────

function CreateVoucherForm({ onClose, clients, prixHeure60 }: {
  onClose: () => void;
  clients: ClientOption[];
  prixHeure60: number | null;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [created, setCreated] = useState<{ code: string; emailSent?: boolean } | null>(null);
  const [recipientName, setRecipientName] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [sendEmail, setSendEmail] = useState(false);
  const [priceMode, setPriceMode] = useState<"auto" | "manual">("auto");
  const [duration, setDuration] = useState<number>(60);
  const [manualPrix, setManualPrix] = useState("");

  const autoPrice = priceMode === "auto" && prixHeure60 && duration > 0
    ? Math.round((prixHeure60 / 60) * duration * 100) / 100
    : null;

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(""); setCreated(null);
    const formData = new FormData(e.currentTarget);
    formData.set("recipient_name", recipientName);
    formData.set("recipient_email", recipientEmail);
    if (priceMode === "auto" && autoPrice !== null) {
      formData.set("prix", String(autoPrice));
    }
    startTransition(async () => {
      const r = await createManualVoucher(formData);
      if (r.error) { setError(r.error); return; }
      let emailSent = false;
      if (sendEmail && recipientEmail && r.id) {
        const er = await resendVoucherEmail(r.id);
        emailSent = !er.error;
      }
      setCreated({ code: r.code ?? "", emailSent });
      setRecipientName("");
      setRecipientEmail("");
      setSendEmail(false);
      setManualPrix("");
      setDuration(60);
      (e.target as HTMLFormElement).reset();
    });
  }

  return (
    <div className="card-premium p-5 mb-2">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-foreground">Nouveau voucher</h3>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg hover:bg-secondary transition-colors text-muted-foreground cursor-pointer"
        >
          ✕
        </button>
      </div>

      {created && (
        <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 mb-4 flex items-center gap-3">
          <Check size={14} className="text-green-500 shrink-0" />
          <div>
            <p className="text-sm text-green-700 font-medium">
              Voucher créé !{created.emailSent ? " Email envoyé ✓" : ""}
            </p>
            <p className="font-mono text-base font-bold text-green-800 tracking-widest mt-0.5">{created.code}</p>
          </div>
        </div>
      )}
      {error && <p className="text-sm text-destructive mb-3">{error}</p>}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 items-end">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">Durée (min) *</label>
            <input
              name="duration_minutes" type="number" required min={1} value={duration}
              onChange={e => setDuration(Number(e.target.value))}
              className="w-full h-9 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">Prix</label>
            <div className="flex gap-1 mb-2">
              <button
                type="button" onClick={() => setPriceMode("auto")}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${priceMode === "auto" ? "bg-navy text-white" : "bg-secondary text-muted-foreground hover:text-foreground"}`}
              >
                Auto {prixHeure60 ? `(${prixHeure60} €/h)` : ""}
              </button>
              <button
                type="button" onClick={() => setPriceMode("manual")}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${priceMode === "manual" ? "bg-navy text-white" : "bg-secondary text-muted-foreground hover:text-foreground"}`}
              >
                Manuel
              </button>
            </div>
            {priceMode === "auto" ? (
              <div className="h-9 px-3 rounded-lg border border-border bg-secondary flex items-center">
                {autoPrice !== null
                  ? <span className="text-sm font-semibold text-primary">{autoPrice} €</span>
                  : <span className="text-xs text-muted-foreground italic">Tarif horaire non configuré</span>
                }
                <input type="hidden" name="prix" value={autoPrice ?? ""} />
              </div>
            ) : (
              <input
                name="prix" type="number" step="0.01" min="0" placeholder="256.00"
                value={manualPrix} onChange={e => setManualPrix(e.target.value)}
                className="w-full h-9 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">Expiration</label>
            <input name="expires_at" type="date"
              className="w-full h-9 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1.5">Description du vol *</label>
          <input name="product_title" required placeholder="Ex. Vol de découverte 60 min"
            className="w-full h-9 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
        </div>

        <div className="rounded-lg border border-border bg-secondary p-3 space-y-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Destinataire</p>
          <ClientPicker
            clients={clients}
            onSelect={c => { setRecipientName(`${c.prenom} ${c.nom}`); setRecipientEmail(c.email); }}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Nom</label>
              <input value={recipientName} onChange={e => setRecipientName(e.target.value)} placeholder="Jean Dupont"
                className="w-full h-9 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Email</label>
              <input value={recipientEmail} onChange={e => setRecipientEmail(e.target.value)} type="email" placeholder="jean@exemple.com"
                className="w-full h-9 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
          </div>
          {recipientEmail && (
            <label className="flex items-center gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={sendEmail}
                onChange={e => setSendEmail(e.target.checked)}
                className="rounded border-border accent-navy cursor-pointer"
              />
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Mail size={11} />
                Envoyer le voucher par email au destinataire
              </span>
            </label>
          )}
        </div>

        <div className="flex gap-2 pt-1">
          <button
            type="submit" disabled={isPending}
            className="flex items-center gap-2 px-4 h-9 rounded-lg bg-primary text-primary-foreground text-sm font-black hover:brightness-105 active:scale-[0.98] shadow-gold disabled:opacity-50 transition-all cursor-pointer"
          >
            {isPending ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
            Générer
          </button>
          <button
            type="button" onClick={onClose}
            className="px-4 h-9 rounded-lg border border-border text-sm text-muted-foreground hover:bg-secondary transition-colors cursor-pointer"
          >
            Annuler
          </button>
        </div>
      </form>
    </div>
  );
}

// ── VoucherCard ───────────────────────────────────────────────────────────────

function VoucherCard({ voucher, onOpen }: { voucher: VoucherCode; onOpen: () => void }) {
  const [isPending, startTransition] = useTransition();

  const statusCfg = STATUT_VOUCHER[voucher.status] ?? { label: voucher.status, variant: "secondary" as const };
  const payBadge  = getPaymentBadge(voucher);

  const isExpiringSoon = voucher.expires_at && voucher.status === "unused"
    ? new Date(voucher.expires_at) < new Date(Date.now() + 14 * 86400000)
    : false;
  const expiresDate = voucher.expires_at
    ? new Date(voucher.expires_at).toLocaleDateString("fr-BE", { day: "numeric", month: "short", year: "numeric" })
    : null;

  function toggle() {
    startTransition(async () => {
      if (voucher.status === "unused") await markVoucherUsed(voucher.id);
      else if (voucher.status === "used") await markVoucherUnused(voucher.id);
    });
  }

  // Info line: code · durée · prix · description
  const infoLine = [
    voucher.product_title,
    formatDuration(voucher.duration_minutes),
    voucher.prix != null ? `${voucher.prix} €` : null,
  ].filter(Boolean).join(" · ");

  // Acheteur (depuis l'ordre Stripe)
  const buyerName  = voucher.buyer_name ?? null;
  const buyerEmail = voucher.buyer_email ?? null;
  const hasBuyer   = buyerName || buyerEmail;
  // On distingue acheteur ≠ destinataire seulement si les emails diffèrent
  const buyerIsRecipient = buyerEmail && voucher.recipient_email
    ? buyerEmail.toLowerCase() === voucher.recipient_email.toLowerCase()
    : false;

  // Contact line : email + téléphone du destinataire
  const contactLine = [
    voucher.recipient_email,
    voucher.client_telephone,
  ].filter(Boolean).join(" · ");

  return (
    <div className="card-premium p-4 hover:border-primary/30 transition-colors">
      <div className="flex items-start justify-between gap-4">

        {/* Zone cliquable */}
        <div className="flex-1 min-w-0 cursor-pointer" onClick={onOpen}>

          {/* Ligne 1 : nom + badges */}
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-foreground text-sm">
              {voucher.recipient_name ?? <span className="text-muted-foreground font-normal italic">Destinataire non renseigné</span>}
            </p>
            <AdminBadge variant={statusCfg.variant} label={statusCfg.label} />
            <span className={`inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full border ${payBadge.className}`}>
              {payBadge.label}
            </span>
            {isExpiringSoon && (
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                <AlertTriangle size={9} /> Expire bientôt
              </span>
            )}
          </div>

          {/* Ligne 2 : code + infos vol */}
          <div className="flex items-center gap-x-3 gap-y-0.5 flex-wrap mt-1" onClick={e => e.stopPropagation()}>
            <CopyCode code={voucher.code} />
            <span className="text-muted-foreground text-xs select-none">·</span>
            <p className="text-xs text-muted-foreground">{infoLine}</p>
            {expiresDate && (
              <>
                <span className="text-muted-foreground text-xs select-none hidden sm:inline">·</span>
                <p className={`text-xs hidden sm:block ${isExpiringSoon ? "text-amber-600 font-medium" : "text-muted-foreground"}`}>
                  Exp. {expiresDate}
                </p>
              </>
            )}
          </div>

          {/* Ligne 3 : email + téléphone destinataire */}
          {contactLine && (
            <p className="text-xs text-muted-foreground mt-0.5">{contactLine}</p>
          )}

          {/* Ligne 4 : acheteur (si différent du destinataire) */}
          {hasBuyer && !buyerIsRecipient && (
            <p className="text-xs text-muted-foreground mt-0.5">
              <span className="text-muted-foreground/60">Acheté par</span>{" "}
              {[buyerName, buyerEmail].filter(Boolean).join(" · ")}
            </p>
          )}
        </div>

        {/* Actions */}
        <div onClick={e => e.stopPropagation()} className="shrink-0">
          <AdminRowActions
            onView={onOpen}
            onDelete={() => deleteVoucher(voucher.id)}
            extra={voucher.status !== "expired" ? [
              {
                icon: voucher.status === "unused" ? Check : RotateCcw,
                label:   voucher.status === "unused" ? "Utiliser" : "Rétablir",
                onClick: toggle,
                disabled: isPending,
              },
            ] : []}
          />
        </div>
      </div>
    </div>
  );
}

// ── VouchersClient ────────────────────────────────────────────────────────────

export function VouchersClient({ vouchers: initial, clients, prixHeure60 }: {
  vouchers: VoucherCode[];
  clients: ClientOption[];
  prixHeure60?: number | null;
}) {
  const [vouchers, setVouchers] = useState<VoucherCode[]>(initial);
  const [drawer, setDrawer]     = useState<VoucherCode | null>(null);
  const [tab, setTab]           = useState("all");
  const [search, setSearch]     = useState("");
  const [showCreate, setShowCreate] = useState(false);

  function handleUpdate(id: string, fields: Partial<VoucherCode>) {
    setVouchers(prev => prev.map(v => v.id === id ? { ...v, ...fields } : v));
    setDrawer(prev => prev?.id === id ? { ...prev, ...fields } as VoucherCode : prev);
  }

  function handleDelete(id: string) {
    setVouchers(prev => prev.filter(v => v.id !== id));
    setDrawer(null);
  }

  const filtered = vouchers.filter(v => {
    const matchTab    = tab === "all" || v.status === tab;
    const matchSearch = !search ||
      v.code.includes(search.toUpperCase()) ||
      v.recipient_email?.toLowerCase().includes(search.toLowerCase()) ||
      v.recipient_name?.toLowerCase().includes(search.toLowerCase()) ||
      v.client_telephone?.includes(search) ||
      v.product_title?.toLowerCase().includes(search.toLowerCase());
    return matchTab && matchSearch;
  });

  return (
    <>
      <div className="space-y-4">
        {showCreate && (
          <CreateVoucherForm
            onClose={() => setShowCreate(false)}
            clients={clients}
            prixHeure60={prixHeure60 ?? null}
          />
        )}

        {/* Filtres + recherche + action */}
        <div className="flex flex-wrap items-center gap-2">
          {STATUS_FILTER_TABS.map(t => {
            const count = t.key === "all" ? vouchers.length : vouchers.filter(v => v.status === t.key).length;
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition-colors cursor-pointer ${
                  tab === t.key
                    ? "bg-navy text-white border-navy"
                    : "border-border text-muted-foreground hover:bg-secondary"
                }`}
              >
                {t.label}
                <span className="ml-1.5 opacity-60">{count}</span>
              </button>
            );
          })}

          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Code, email, téléphone…"
            className="bg-background border border-border rounded-lg px-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary sm:w-52"
          />

          <button
            onClick={() => setShowCreate(s => !s)}
            className={`ml-auto flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
              showCreate
                ? "bg-secondary text-foreground border border-border"
                : "bg-primary text-primary-foreground hover:brightness-105 shadow-gold"
            }`}
          >
            <Plus size={14} /> Nouveau voucher
          </button>
        </div>

        {/* Liste cartes */}
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground text-sm">
            Aucun voucher correspondant.
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(v => (
              <VoucherCard key={v.id} voucher={v} onOpen={() => setDrawer(v)} />
            ))}
          </div>
        )}
      </div>

      <VoucherDrawer
        voucher={drawer}
        onClose={() => setDrawer(null)}
        onUpdate={handleUpdate}
        onDelete={handleDelete}
      />
    </>
  );
}
