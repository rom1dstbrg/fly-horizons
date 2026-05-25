"use client";

import { useState, useTransition } from "react";
import {
  markVoucherUsed, markVoucherUnused,
  createManualVoucher, updateVoucher, deleteVoucher,
} from "@/lib/actions/vouchers";
import { formatDuration } from "@/lib/vouchers";
import { Check, RotateCcw, Copy, Plus, Loader2, Users } from "lucide-react";
import { AdminBadge, STATUT_VOUCHER } from "@/components/admin/ui/AdminBadge";
import { AdminRowActions } from "@/components/admin/ui/AdminRowActions";

interface VoucherCode {
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
}

const TABS = [
  { key: "all",    label: "Tous" },
  { key: "unused", label: "Disponibles" },
  { key: "used",   label: "Utilisés" },
];

function CopyCode({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }
  return (
    <button onClick={copy} className="flex items-center gap-1.5 font-mono text-sm font-bold text-primary hover:opacity-70 transition-opacity whitespace-nowrap" title="Copier">
      {code}
      {copied ? <Check size={12} className="text-green-500" /> : <Copy size={11} className="opacity-40" />}
    </button>
  );
}

interface ClientOption {
  id: string;
  prenom: string;
  nom: string;
  email: string;
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
      <label className="block text-xs font-medium text-muted-foreground mb-1.5 flex items-center gap-1">
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
                className="w-full text-left px-3 py-2 hover:bg-secondary transition-colors"
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

function CreateVoucherForm({ onClose, clients, prixHeure60 }: {
  onClose: () => void;
  clients: ClientOption[];
  prixHeure60: number | null;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [created, setCreated] = useState<string | null>(null);
  const [recipientName, setRecipientName] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
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
      setCreated(r.code ?? null);
      setRecipientName("");
      setRecipientEmail("");
      setManualPrix("");
      setDuration(60);
      (e.target as HTMLFormElement).reset();
    });
  }

  return (
    <div className="card-premium p-5 mb-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-foreground">Nouveau voucher</h3>
        <button onClick={onClose} className="p-1 rounded hover:bg-secondary transition-colors text-muted-foreground">
          ✕
        </button>
      </div>

      {created && (
        <div className="bg-green-500/10 border border-green-500/30 rounded-lg px-4 py-3 mb-4 flex items-center gap-3">
          <Check size={14} className="text-green-500 shrink-0" />
          <div>
            <p className="text-sm text-green-600 font-medium">Voucher créé !</p>
            <p className="font-mono text-base font-bold text-green-700 tracking-widest mt-0.5">{created}</p>
          </div>
        </div>
      )}
      {error && <p className="text-sm text-destructive mb-3">{error}</p>}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Durée + prix */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 items-end">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">Durée (min) *</label>
            <input
              name="duration_minutes" type="number" required min={1} value={duration}
              onChange={e => setDuration(Number(e.target.value))}
              className="w-full h-9 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {/* Mode prix */}
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">Prix</label>
            <div className="flex gap-1 mb-2">
              <button
                type="button" onClick={() => setPriceMode("auto")}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${priceMode === "auto" ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"}`}
              >
                Auto {prixHeure60 ? `(${prixHeure60}€/h)` : ""}
              </button>
              <button
                type="button" onClick={() => setPriceMode("manual")}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${priceMode === "manual" ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"}`}
              >
                Manuel
              </button>
            </div>
            {priceMode === "auto" ? (
              <div className="h-9 px-3 rounded-lg border border-border bg-secondary/30 flex items-center">
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

          <div className="sm:col-span-1">
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">Expiration</label>
            <input name="expires_at" type="date"
              className="w-full h-9 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1.5">Description *</label>
          <input name="product_title" required placeholder="Ex. Vol de découverte 60 min"
            className="w-full h-9 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
        </div>

        {/* Destinataire */}
        <div className="rounded-lg border border-border bg-secondary/20 p-3 space-y-3">
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
        </div>

        <div className="flex gap-2 pt-1">
          <button type="submit" disabled={isPending}
            className="flex items-center gap-2 px-4 h-9 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 transition-colors">
            {isPending ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
            Générer
          </button>
          <button type="button" onClick={onClose}
            className="px-4 h-9 rounded-lg border border-border text-sm text-muted-foreground hover:bg-secondary transition-colors">
            Annuler
          </button>
        </div>
      </form>
    </div>
  );
}

function EditVoucherForm({ voucher, onClose }: { voucher: VoucherCode; onClose: () => void }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const r = await updateVoucher(voucher.id, {
        duration_minutes: parseInt(fd.get("duration_minutes") as string),
        prix: fd.get("prix") ? parseFloat(fd.get("prix") as string) : null,
        product_title: (fd.get("product_title") as string).trim(),
        recipient_name: (fd.get("recipient_name") as string).trim() || null,
        recipient_email: (fd.get("recipient_email") as string).trim() || null,
        expires_at: (fd.get("expires_at") as string) || null,
      });
      if (r.error) { setError(r.error); return; }
      onClose();
    });
  }

  const expiresDefault = voucher.expires_at
    ? new Date(voucher.expires_at).toISOString().split("T")[0]
    : "";

  return (
    <form onSubmit={handleSubmit} className="mt-3 pt-3 border-t border-border space-y-3">
      {error && <p className="text-xs text-destructive">{error}</p>}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">Durée (min)</label>
          <input name="duration_minutes" type="number" required min={1} defaultValue={voucher.duration_minutes}
            className="w-full h-8 px-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
        </div>
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">Prix (€)</label>
          <input name="prix" type="number" step="0.01" min="0" defaultValue={voucher.prix ?? ""}
            className="w-full h-8 px-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-muted-foreground mb-1">Description</label>
          <input name="product_title" required defaultValue={voucher.product_title}
            className="w-full h-8 px-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">Nom</label>
          <input name="recipient_name" defaultValue={voucher.recipient_name ?? ""}
            className="w-full h-8 px-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
        </div>
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">Email</label>
          <input name="recipient_email" type="email" defaultValue={voucher.recipient_email ?? ""}
            className="w-full h-8 px-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
        </div>
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">Expiration</label>
          <input name="expires_at" type="date" defaultValue={expiresDefault}
            className="w-full h-8 px-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
        </div>
      </div>
      <div className="flex gap-2">
        <button type="submit" disabled={isPending}
          className="flex items-center gap-1.5 px-3 h-8 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 disabled:opacity-50 transition-colors">
          {isPending ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />} Sauvegarder
        </button>
        <button type="button" onClick={onClose}
          className="px-3 h-8 rounded-lg border border-border text-xs text-muted-foreground hover:bg-secondary transition-colors">
          Annuler
        </button>
      </div>
    </form>
  );
}

function VoucherRow({ voucher }: { voucher: VoucherCode }) {
  const [isPending, startTransition] = useTransition();
  const [editing, setEditing] = useState(false);
  const statusCfg = STATUT_VOUCHER[voucher.status] ?? { label: voucher.status, variant: "secondary" as const };
  const date = new Date(voucher.created_at).toLocaleDateString("fr-BE", { day: "numeric", month: "short", year: "numeric" });
  const usedDate = voucher.used_at
    ? new Date(voucher.used_at).toLocaleDateString("fr-BE", { day: "numeric", month: "short" })
    : null;

  function toggle() {
    startTransition(async () => {
      if (voucher.status === "unused") await markVoucherUsed(voucher.id);
      else if (voucher.status === "used") await markVoucherUnused(voucher.id);
    });
  }

  return (
    <div className="px-5 py-3.5 border-b border-border last:border-0">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        {/* Code */}
        <div className="w-52 shrink-0">
          <CopyCode code={voucher.code} />
        </div>

        {/* Durée + prix */}
        <div className="w-28 shrink-0">
          <span className="text-sm font-medium text-foreground">{formatDuration(voucher.duration_minutes)}</span>
          {voucher.prix != null && (
            <p className="text-xs text-muted-foreground">{voucher.prix} €</p>
          )}
        </div>

        {/* Statut */}
        <div className="shrink-0">
          <AdminBadge variant={statusCfg.variant} label={statusCfg.label} />
        </div>

        {/* Destinataire */}
        <div className="min-w-0 flex-1">
          {voucher.recipient_name && (
            <p className="text-sm font-medium text-foreground truncate">{voucher.recipient_name}</p>
          )}
          {voucher.recipient_email ? (
            <p className={`text-xs text-muted-foreground truncate ${!voucher.recipient_name ? "text-sm" : ""}`}>{voucher.recipient_email}</p>
          ) : (
            <p className="text-xs text-muted-foreground/40 italic">Non renseigné</p>
          )}
        </div>

        {/* Date */}
        <div className="shrink-0 text-right min-w-[72px]">
          <p className="text-xs text-muted-foreground">{date}</p>
          {usedDate && <p className="text-xs text-green-500/70">Utilisé {usedDate}</p>}
        </div>

        {/* Actions */}
        <div className="shrink-0">
          <AdminRowActions
            onEdit={() => setEditing(e => !e)}
            onDelete={() => deleteVoucher(voucher.id)}
            extra={voucher.status !== "expired" ? [
              {
                icon: voucher.status === "unused" ? Check : RotateCcw,
                label: voucher.status === "unused" ? "Utiliser" : "Rétablir",
                onClick: toggle,
                disabled: isPending,
                title: voucher.status === "unused" ? "Marquer comme utilisé" : "Remettre disponible",
              },
            ] : []}
          />
        </div>
      </div>

      {editing && <EditVoucherForm voucher={voucher} onClose={() => setEditing(false)} />}
    </div>
  );
}

export function VouchersClient({ vouchers, clients, prixHeure60 }: {
  vouchers: VoucherCode[];
  clients: ClientOption[];
  prixHeure60?: number | null;
}) {
  const [tab, setTab] = useState("all");
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);

  const filtered = vouchers.filter((v) => {
    const matchTab = tab === "all" || v.status === tab;
    const matchSearch = !search ||
      v.code.includes(search.toUpperCase()) ||
      v.recipient_email?.toLowerCase().includes(search.toLowerCase()) ||
      v.recipient_name?.toLowerCase().includes(search.toLowerCase());
    return matchTab && matchSearch;
  });

  return (
    <div className="space-y-4">
      {showCreate && <CreateVoucherForm onClose={() => setShowCreate(false)} clients={clients} prixHeure60={prixHeure60 ?? null} />}

      {/* Filtres + actions */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex gap-1">
          {TABS.map((t) => {
            const count = t.key === "all" ? vouchers.length : vouchers.filter((v) => v.status === t.key).length;
            return (
              <button key={t.key} onClick={() => setTab(t.key)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  tab === t.key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                }`}>
                {t.label}
                <span className={`ml-1.5 text-xs ${tab === t.key ? "opacity-60" : "opacity-40"}`}>{count}</span>
              </button>
            );
          })}
        </div>
        <input value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Code ou email…"
          className="bg-input border border-border rounded-md px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary w-full sm:w-52" />
        <button onClick={() => setShowCreate(s => !s)}
          className={`ml-auto flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
            showCreate ? "bg-secondary text-foreground border border-border" : "bg-primary text-primary-foreground hover:bg-primary/90"
          }`}>
          <Plus size={15} /> Nouveau voucher
        </button>
      </div>

      {/* Table */}
      <div className="card-premium overflow-hidden">
        <div className="overflow-x-auto">
          <div className="min-w-[560px]">
            <div className="flex items-center gap-x-4 px-5 py-2.5 border-b border-border bg-secondary/30">
              <span className="w-52 text-xs font-semibold text-muted-foreground uppercase tracking-wider shrink-0">Code</span>
              <span className="w-28 text-xs font-semibold text-muted-foreground uppercase tracking-wider shrink-0">Durée / Prix</span>
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider shrink-0 w-20">Statut</span>
              <span className="flex-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Destinataire</span>
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider shrink-0">Date</span>
              <span className="w-32 shrink-0" />
            </div>

            {filtered.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-sm text-muted-foreground">Aucun voucher correspondant.</p>
              </div>
            ) : (
              filtered.map((v) => <VoucherRow key={v.id} voucher={v} />)
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
