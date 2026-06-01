"use client";

import { useEffect, useState, useRef, useCallback, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Search, LayoutDashboard, Plane, CalendarCheck, Route,
  CalendarDays, Package, Ticket, Tag,
  Users, MessageSquare, Settings, ArrowRight, User,
  ShoppingBag, X, Loader2,
} from "lucide-react";

interface SearchResult {
  clients: { id: string; prenom: string; nom: string; email: string }[];
  orders: { id: string; created_at: string; total: number; status: string }[];
  vouchers: { id: string; code: string; recipient_email: string | null; status: string }[];
}

const QUICK_LINKS = [
  { href: "/admin",                            label: "Vue globale",          icon: LayoutDashboard, group: "Navigation" },
  { href: "/admin/vols",                       label: "Réservations",         icon: CalendarCheck,   group: "Navigation" },
  { href: "/admin/vols?tab=sur-mesure",        label: "Vols sur mesure",      icon: Route,           group: "Navigation" },
  { href: "/admin/vols?tab=disponibilites",    label: "Disponibilités",       icon: CalendarDays,    group: "Navigation" },
  { href: "/admin/boutique",                   label: "Vouchers",             icon: Ticket,          group: "Navigation" },
  { href: "/admin/boutique?tab=produits",      label: "Produits",             icon: Package,         group: "Navigation" },
  { href: "/admin/boutique?tab=coupons",       label: "Coupons",              icon: Tag,             group: "Navigation" },
  { href: "/admin/clients",                    label: "Clients",              icon: Users,           group: "Navigation" },
  { href: "/admin/contacts",                   label: "Messages",             icon: MessageSquare,   group: "Navigation" },
  { href: "/admin/settings",                   label: "Paramètres",           icon: Settings,        group: "Navigation" },
  { href: "/admin/reservations/new",           label: "Nouvelle réservation", icon: CalendarCheck,   group: "Actions rapides" },
  { href: "/admin/boutique",                   label: "Nouveau voucher",      icon: Ticket,          group: "Actions rapides" },
  { href: "/admin/products/new",               label: "Nouveau produit",      icon: Package,         group: "Actions rapides" },
];

const STATUS_LABELS: Record<string, string> = {
  paid: "Payée", pending: "En attente", processing: "En cours",
  shipped: "Expédiée", delivered: "Livrée", cancelled: "Annulée", refunded: "Remboursée",
};

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult | null>(null);
  const [isPending, startTransition] = useTransition();
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const openPalette = useCallback(() => {
    setOpen(true);
    setQuery("");
    setResults(null);
    setActiveIndex(0);
  }, []);

  // Global keyboard shortcut + custom event
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        openPalette();
      }
      if (e.key === "Escape") setOpen(false);
    }
    function onCustom() { openPalette(); }
    document.addEventListener("keydown", onKey);
    document.addEventListener("openCommandPalette", onCustom);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("openCommandPalette", onCustom);
    };
  }, [openPalette]);

  // Focus input when open
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
  }, [open]);

  // Search
  useEffect(() => {
    if (!query || query.length < 2) { setResults(null); return; }
    const timer = setTimeout(() => {
      startTransition(async () => {
        const res = await fetch(`/api/admin/search?q=${encodeURIComponent(query)}`);
        if (res.ok) setResults(await res.json());
      });
    }, 200);
    return () => clearTimeout(timer);
  }, [query]);

  // Build flat list of navigable items for keyboard nav
  const filtered = query.length >= 1
    ? QUICK_LINKS.filter(l =>
        l.label.toLowerCase().includes(query.toLowerCase()) ||
        l.group.toLowerCase().includes(query.toLowerCase())
      )
    : QUICK_LINKS;

  function navigate(href: string) {
    router.push(href);
    setOpen(false);
    setQuery("");
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-start justify-center pt-[10vh] px-4"
      onClick={() => setOpen(false)}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-foreground/20 backdrop-blur-[2px]" />

      {/* Panel */}
      <div
        className="relative w-full max-w-xl bg-card rounded-xl shadow-[0_20px_60px_rgba(17,51,86,.18)] border border-border overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        onClick={e => e.stopPropagation()}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-border">
          {isPending
            ? <Loader2 size={16} className="text-muted-foreground shrink-0 animate-spin" />
            : <Search size={16} className="text-muted-foreground shrink-0" />
          }
          <input
            ref={inputRef}
            value={query}
            onChange={e => { setQuery(e.target.value); setActiveIndex(0); }}
            onKeyDown={e => {
              if (e.key === "ArrowDown") { e.preventDefault(); setActiveIndex(i => i + 1); }
              if (e.key === "ArrowUp") { e.preventDefault(); setActiveIndex(i => Math.max(0, i - 1)); }
              if (e.key === "Enter") {
                const first = filtered[activeIndex];
                if (first) navigate(first.href);
              }
            }}
            placeholder="Rechercher clients, commandes, pages…"
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
          {query && (
            <button onClick={() => { setQuery(""); setResults(null); }} className="text-muted-foreground hover:text-foreground transition-colors">
              <X size={14} />
            </button>
          )}
          <kbd className="hidden sm:inline-flex items-center text-[10px] font-mono bg-secondary border border-border rounded px-1.5 py-0.5 text-muted-foreground shrink-0">
            ESC
          </kbd>
        </div>

        <div className="max-h-[60vh] overflow-y-auto">

          {/* Client results */}
          {results?.clients && results.clients.length > 0 && (
            <div>
              <p className="px-4 py-2 text-[10px] font-bold text-muted-foreground/50 uppercase tracking-[1.5px]">
                Clients
              </p>
              {results.clients.map(client => (
                <button
                  key={client.id}
                  onClick={() => navigate("/admin/clients")}
                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-secondary transition-colors text-left"
                >
                  <div className="w-7 h-7 rounded-full bg-navy/10 flex items-center justify-center shrink-0">
                    <User size={12} className="text-navy" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{client.prenom} {client.nom}</p>
                    <p className="text-xs text-muted-foreground truncate">{client.email}</p>
                  </div>
                  <ArrowRight size={13} className="text-muted-foreground/40 shrink-0 ml-auto" />
                </button>
              ))}
            </div>
          )}

          {/* Order results */}
          {results?.orders && results.orders.length > 0 && (
            <div>
              <p className="px-4 py-2 text-[10px] font-bold text-muted-foreground/50 uppercase tracking-[1.5px]">
                Commandes
              </p>
              {results.orders.map(order => (
                <button
                  key={order.id}
                  onClick={() => navigate("/admin/boutique")}
                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-secondary transition-colors text-left"
                >
                  <div className="w-7 h-7 rounded-full bg-gold/10 flex items-center justify-center shrink-0">
                    <ShoppingBag size={12} className="text-gold-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground font-mono">#{order.id.slice(0, 8).toUpperCase()}</p>
                    <p className="text-xs text-muted-foreground">{STATUS_LABELS[order.status]} · {order.total?.toFixed(2)} €</p>
                  </div>
                  <ArrowRight size={13} className="text-muted-foreground/40 shrink-0 ml-auto" />
                </button>
              ))}
            </div>
          )}

          {/* Voucher results */}
          {results?.vouchers && results.vouchers.length > 0 && (
            <div>
              <p className="px-4 py-2 text-[10px] font-bold text-muted-foreground/50 uppercase tracking-[1.5px]">
                Vouchers
              </p>
              {results.vouchers.map(v => (
                <button
                  key={v.id}
                  onClick={() => navigate("/admin/boutique?tab=vouchers")}
                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-secondary transition-colors text-left"
                >
                  <div className="w-7 h-7 rounded-full bg-purple-100 flex items-center justify-center shrink-0">
                    <Ticket size={12} className="text-purple-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground font-mono tracking-wider">{v.code}</p>
                    <p className="text-xs text-muted-foreground">{v.recipient_email ?? "—"}</p>
                  </div>
                  <ArrowRight size={13} className="text-muted-foreground/40 shrink-0 ml-auto" />
                </button>
              ))}
            </div>
          )}

          {/* Quick nav links */}
          {filtered.length > 0 && (() => {
            const groups = [...new Set(filtered.map(l => l.group))];
            let globalIdx = 0;
            return groups.map(group => {
              const items = filtered.filter(l => l.group === group);
              return (
                <div key={group}>
                  <p className="px-4 py-2 text-[10px] font-bold text-muted-foreground/50 uppercase tracking-[1.5px]">
                    {group}
                  </p>
                  {items.map(link => {
                    const idx = globalIdx++;
                    const Icon = link.icon;
                    const isActive = idx === activeIndex;
                    return (
                      <button
                        key={link.href}
                        onClick={() => navigate(link.href)}
                        onMouseEnter={() => setActiveIndex(idx)}
                        className={`w-full flex items-center gap-3 px-4 py-2 transition-colors text-left ${
                          isActive ? "bg-secondary" : "hover:bg-secondary/60"
                        }`}
                      >
                        <div className="w-7 h-7 rounded-md bg-secondary flex items-center justify-center shrink-0">
                          <Icon size={13} className="text-muted-foreground" />
                        </div>
                        <span className="text-sm text-foreground">{link.label}</span>
                        <ArrowRight size={12} className="text-muted-foreground/30 shrink-0 ml-auto" />
                      </button>
                    );
                  })}
                </div>
              );
            });
          })()}

          {/* Empty state */}
          {query.length >= 2 && !isPending && results?.clients.length === 0 && results?.orders.length === 0 && results?.vouchers.length === 0 && filtered.length === 0 && (
            <div className="px-4 py-10 text-center">
              <p className="text-sm text-muted-foreground">Aucun résultat pour « {query} »</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-4 px-4 py-2.5 border-t border-border bg-secondary/30">
          <span className="text-[10px] text-muted-foreground/50 flex items-center gap-1">
            <kbd className="font-mono bg-background border border-border rounded px-1">↑↓</kbd> naviguer
          </span>
          <span className="text-[10px] text-muted-foreground/50 flex items-center gap-1">
            <kbd className="font-mono bg-background border border-border rounded px-1">↵</kbd> ouvrir
          </span>
          <span className="text-[10px] text-muted-foreground/50 flex items-center gap-1">
            <kbd className="font-mono bg-background border border-border rounded px-1">ESC</kbd> fermer
          </span>
        </div>
      </div>
    </div>
  );
}
