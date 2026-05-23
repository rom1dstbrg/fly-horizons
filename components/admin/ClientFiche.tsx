"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  ChevronLeft, Plane, Ticket, ShoppingCart,
  Phone, Mail, Calendar, Pencil, Check, X, Loader2,
} from "lucide-react";
import { updateClient } from "@/lib/actions/clients";
import { AdminBadge, STATUT_RESA, STATUT_PERSO, STATUT_VOUCHER } from "@/components/admin/ui/AdminBadge";

// Map fusionné : couvre standard (payment_pending…) + perso (acompte_recu…)
const RESA_MAP = { ...STATUT_RESA, ...STATUT_PERSO };

interface Reservation {
  id: string;
  date_vol: string;
  heure_vol: string | null;
  duree: number;
  statut: string;
  type_resa: string;
  acompte: number | null;
  passagers: number | null;
  created_at: string;
}

interface Voucher {
  id: string;
  code: string;
  duration_minutes: number;
  prix: number | null;
  product_title: string;
  status: string;
  used_at: string | null;
  expires_at: string | null;
  created_at: string;
}

interface OrderItem { id: string; title: string; quantity: number; unit_price: number }
interface Order {
  id: string;
  created_at: string;
  status: string;
  subtotal: number;
  total: number;
  items: OrderItem[];
}

interface Client {
  id: string;
  prenom: string;
  nom: string;
  email: string;
  telephone: string | null;
  created_at: string;
}

type TimelineItem =
  | { type: "reservation"; sortDate: string; data: Reservation }
  | { type: "voucher";     sortDate: string; data: Voucher }
  | { type: "order";       sortDate: string; data: Order };

export function ClientFiche({
  client,
  reservations,
  vouchers,
  orders,
}: {
  client: Client;
  reservations: Reservation[];
  vouchers: Voucher[];
  orders: Order[];
}) {
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState({
    prenom: client.prenom,
    nom: client.nom,
    telephone: client.telephone ?? "",
  });
  const [feedback, setFeedback] = useState("");
  const [isPending, startTransition] = useTransition();

  const initials = `${client.prenom[0] ?? ""}${client.nom[0] ?? ""}`.toUpperCase();
  const clientSince = new Date(client.created_at).toLocaleDateString("fr-BE", {
    day: "numeric", month: "long", year: "numeric",
  });

  // Stats
  const volsEffectues = reservations.filter(r => r.statut === "vol_effectue").length;
  const vouchersActifs = vouchers.filter(v => v.status === "unused").length;
  const totalAcomptes = reservations.reduce((sum, r) => sum + (r.acompte ?? 0), 0);

  // Timeline
  const timeline: TimelineItem[] = [
    ...reservations.map(r => ({ type: "reservation" as const, sortDate: r.created_at, data: r })),
    ...vouchers.map(v => ({ type: "voucher" as const, sortDate: v.created_at, data: v })),
    ...orders.map(o => ({ type: "order" as const, sortDate: o.created_at, data: o })),
  ].sort((a, b) => new Date(b.sortDate).getTime() - new Date(a.sortDate).getTime());

  function saveEdit() {
    startTransition(async () => {
      const r = await updateClient(client.id, {
        prenom: editData.prenom.trim() || client.prenom,
        nom: editData.nom.trim() || client.nom,
        telephone: editData.telephone.trim() || null,
      });
      if (r.error) { setFeedback(r.error); return; }
      setEditing(false);
      setFeedback("Modifications enregistrées");
      setTimeout(() => setFeedback(""), 2500);
    });
  }

  return (
    <div className="space-y-6">
      {/* Back */}
      <Link
        href="/admin/clients"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ChevronLeft size={15} />
        Retour aux clients
      </Link>

      {/* Header card */}
      <div className="bg-card rounded-xl border border-border p-6">
        <div className="flex items-start gap-5 flex-wrap">
          {/* Avatar */}
          <div className="w-14 h-14 rounded-xl bg-navy text-white flex items-center justify-center text-lg font-bold shrink-0">
            {initials}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            {editing ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <input
                    value={editData.prenom}
                    onChange={e => setEditData(d => ({ ...d, prenom: e.target.value }))}
                    placeholder="Prénom"
                    className="h-8 px-2.5 rounded-md border border-border bg-background text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy/40 w-32"
                  />
                  <input
                    value={editData.nom}
                    onChange={e => setEditData(d => ({ ...d, nom: e.target.value }))}
                    placeholder="Nom"
                    className="h-8 px-2.5 rounded-md border border-border bg-background text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy/40 w-32"
                  />
                </div>
                <input
                  value={editData.telephone}
                  onChange={e => setEditData(d => ({ ...d, telephone: e.target.value }))}
                  placeholder="Téléphone"
                  className="h-8 px-2.5 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy/40 w-48"
                />
                <div className="flex items-center gap-2">
                  <button
                    onClick={saveEdit}
                    disabled={isPending}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-navy text-white text-xs font-semibold hover:bg-navy/90 transition-colors disabled:opacity-60"
                  >
                    {isPending ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                    Enregistrer
                  </button>
                  <button
                    onClick={() => { setEditing(false); setEditData({ prenom: client.prenom, nom: client.nom, telephone: client.telephone ?? "" }); }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-border text-xs text-muted-foreground hover:bg-secondary transition-colors"
                  >
                    <X size={12} /> Annuler
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h1 className="text-xl font-bold text-foreground">
                    {client.prenom} {client.nom}
                  </h1>
                  <span className="text-xs text-muted-foreground bg-secondary border border-border px-2 py-0.5 rounded-full font-mono">
                    {client.id}
                  </span>
                  <button
                    onClick={() => setEditing(true)}
                    className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-md transition-colors"
                    title="Modifier"
                  >
                    <Pencil size={13} />
                  </button>
                </div>
                <div className="flex items-center gap-4 mt-2 flex-wrap">
                  <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Mail size={13} />
                    {client.email}
                  </span>
                  {client.telephone && (
                    <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Phone size={13} />
                      {client.telephone}
                    </span>
                  )}
                  <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Calendar size={13} />
                    Client depuis le {clientSince}
                  </span>
                </div>
              </>
            )}
            {feedback && (
              <p className="mt-2 text-xs text-emerald-600 font-medium">{feedback}</p>
            )}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Réservations",    value: reservations.length, color: "text-blue-600" },
          { label: "Vols effectués",  value: volsEffectues,       color: "text-purple-600" },
          { label: "Vouchers actifs", value: vouchersActifs,      color: "text-emerald-600" },
          { label: "Acomptes",        value: `${totalAcomptes} €`, color: "text-navy" },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-card rounded-xl border border-border p-4 text-center">
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Timeline */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h2 className="text-sm font-semibold text-foreground">Historique d'activité</h2>
          <p className="text-xs text-muted-foreground mt-0.5">{timeline.length} événement{timeline.length !== 1 ? "s" : ""}</p>
        </div>

        {timeline.length === 0 ? (
          <div className="p-12 text-center text-sm text-muted-foreground">Aucune activité enregistrée.</div>
        ) : (
          <div className="divide-y divide-border">
            {timeline.map((item, i) => {
              const dateStr = new Date(item.sortDate).toLocaleDateString("fr-BE", {
                day: "numeric", month: "short", year: "numeric",
              });

              if (item.type === "reservation") {
                const r = item.data;
                const statut = RESA_MAP[r.statut] ?? { label: r.statut, variant: "secondary" as const };
                const volDate = new Date(r.date_vol + "T12:00:00Z").toLocaleDateString("fr-BE", {
                  weekday: "short", day: "numeric", month: "short", year: "numeric",
                });
                return (
                  <div key={`r-${r.id}`} className="flex items-start gap-4 px-5 py-4 hover:bg-secondary/20 transition-colors">
                    <div className="mt-0.5 w-7 h-7 rounded-full bg-blue-100 border border-blue-200 flex items-center justify-center shrink-0">
                      <Plane size={13} className="text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-foreground">
                          {r.type_resa === "standard" ? "Réservation standard" : "Vol sur mesure"}
                        </span>
                        <AdminBadge variant={statut.variant} label={statut.label} />
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Vol le {volDate}
                        {r.heure_vol ? ` à ${r.heure_vol.slice(0, 5)}` : ""}, {r.duree} min
                        {r.passagers ? ` · ${r.passagers} passager${r.passagers > 1 ? "s" : ""}` : ""}
                        {r.acompte ? ` · ${r.acompte} €` : ""}
                      </p>
                    </div>
                    <span className="text-xs text-muted-foreground/60 shrink-0 mt-0.5">{dateStr}</span>
                  </div>
                );
              }

              if (item.type === "voucher") {
                const v = item.data;
                const statut = STATUT_VOUCHER[v.status] ?? { label: v.status, variant: "secondary" as const };
                return (
                  <div key={`v-${v.id}`} className="flex items-start gap-4 px-5 py-4 hover:bg-secondary/20 transition-colors">
                    <div className="mt-0.5 w-7 h-7 rounded-full bg-violet-100 border border-violet-200 flex items-center justify-center shrink-0">
                      <Ticket size={13} className="text-violet-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-foreground">Voucher · {v.product_title}</span>
                        <AdminBadge variant={statut.variant} label={statut.label} />
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Code <span className="font-mono font-semibold text-foreground">{v.code}</span>, {v.duration_minutes} min
                        {v.prix ? ` · ${v.prix} €` : ""}
                        {v.used_at ? ` · Utilisé le ${new Date(v.used_at).toLocaleDateString("fr-BE", { day: "numeric", month: "short" })}` : ""}
                      </p>
                    </div>
                    <span className="text-xs text-muted-foreground/60 shrink-0 mt-0.5">{dateStr}</span>
                  </div>
                );
              }

              // order
              const o = item.data;
              return (
                <div key={`o-${o.id}`} className="flex items-start gap-4 px-5 py-4 hover:bg-secondary/20 transition-colors">
                  <div className="mt-0.5 w-7 h-7 rounded-full bg-amber-100 border border-amber-200 flex items-center justify-center shrink-0">
                    <ShoppingCart size={13} className="text-amber-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-foreground">Commande boutique</span>
                      <span className="text-[10px] font-mono text-muted-foreground border border-border px-1.5 py-0.5 rounded">
                        #{o.id.slice(0, 8).toUpperCase()}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {o.items?.map(i => `${i.title} ×${i.quantity}`).join(", ")}
                      {o.total ? ` · ${o.total} €` : ""}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground/60 shrink-0 mt-0.5">{dateStr}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
