"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Search, Tag } from "lucide-react";
import { DeleteButton } from "@/components/admin/DeleteButton";
import { deleteClient } from "@/lib/actions/delete";

const RESA_STATUTS: Record<string, { label: string; color: string }> = {
  payment_pending: { label: "Paiement en att.",  color: "bg-orange-100 text-orange-700 border-orange-200" },
  en_attente:      { label: "En attente",         color: "bg-yellow-100 text-yellow-700 border-yellow-200" },
  date_confirmee:  { label: "Date confirmée",     color: "bg-blue-100 text-blue-700 border-blue-200" },
  heure_confirmee: { label: "Heure confirmée",    color: "bg-green-100 text-green-700 border-green-200" },
  vol_effectue:    { label: "Vol effectué",       color: "bg-purple-100 text-purple-700 border-purple-200" },
  annulee:         { label: "Annulée",            color: "bg-red-100 text-red-700 border-red-200" },
  en_attente_perso: { label: "Devis en att.",    color: "bg-yellow-100 text-yellow-700 border-yellow-200" },
  acompte_recu:     { label: "Acompte reçu",     color: "bg-emerald-100 text-emerald-700 border-emerald-200" },
};

const VOUCHER_STATUTS: Record<string, { label: string; color: string }> = {
  unused:  { label: "Disponible", color: "bg-green-100 text-green-700 border-green-200" },
  used:    { label: "Utilisé",    color: "bg-gray-100 text-gray-500 border-gray-200" },
  expired: { label: "Expiré",     color: "bg-red-100 text-red-700 border-red-200" },
};

interface Reservation {
  id: string;
  date_vol: string;
  heure_vol: string | null;
  duree: number;
  statut: string;
  type_resa: string;
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

interface Client {
  id: string;
  prenom: string;
  nom: string;
  email: string;
  telephone: string | null;
  created_at: string;
  reservations: Reservation[];
  vouchers: Voucher[];
}

function ClientCard({ client }: { client: Client }) {
  const [expanded, setExpanded] = useState(false);
  const resaCount = client.reservations.length;
  const voucherCount = client.vouchers.length;
  const lastResa = client.reservations[0];
  const hasDetails = resaCount > 0 || voucherCount > 0;

  return (
    <div className="card-premium p-4">
      <div
        className="flex items-start justify-between gap-4 cursor-pointer select-none"
        onClick={() => hasDetails && setExpanded(e => !e)}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-foreground text-sm">{client.prenom} {client.nom}</p>
            {resaCount > 0 && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full border bg-blue-100 text-blue-700 border-blue-200">
                {resaCount} vol{resaCount > 1 ? "s" : ""}
              </span>
            )}
            {voucherCount > 0 && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full border bg-violet-100 text-violet-700 border-violet-200">
                {voucherCount} voucher{voucherCount > 1 ? "s" : ""}
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">{client.email}</p>
          {client.telephone && (
            <p className="text-xs text-muted-foreground">{client.telephone}</p>
          )}
          {lastResa && (
            <p className="text-xs text-muted-foreground mt-0.5">
              Dernier vol : {new Date(lastResa.date_vol + "T12:00:00Z").toLocaleDateString("fr-BE", { day: "numeric", month: "short", year: "numeric" })}
            </p>
          )}
        </div>

        <div
          className="flex items-center gap-1 shrink-0"
          onClick={e => e.stopPropagation()}
        >
          <DeleteButton
            onDelete={() => deleteClient(client.id)}
            confirmMessage="Supprimer ?"
          />
          {hasDetails && (
            <span className="p-1.5 text-muted-foreground pointer-events-none">
              {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </span>
          )}
        </div>
      </div>

      {expanded && (
        <div className="mt-4 pt-4 border-t border-border space-y-4">
          {resaCount > 0 && (
            <div className="space-y-2">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Réservations</p>
              {client.reservations.map(r => {
                const statut = RESA_STATUTS[r.statut] ?? { label: r.statut, color: "bg-gray-100 text-gray-600 border-gray-200" };
                const dateStr = new Date(r.date_vol + "T12:00:00Z").toLocaleDateString("fr-BE", {
                  day: "numeric", month: "short", year: "numeric",
                });
                return (
                  <div key={r.id} className="flex items-center gap-3 bg-secondary/30 rounded-lg px-3 py-2 text-xs flex-wrap">
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${statut.color}`}>
                      {statut.label}
                    </span>
                    <span className="text-foreground font-medium">{dateStr}{r.heure_vol ? ` · ${r.heure_vol}` : ""}</span>
                    <span className="text-muted-foreground">{r.duree} min</span>
                    <span className="text-muted-foreground opacity-60">
                      {r.type_resa === "standard" ? "Standard" : "Sur mesure"}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {voucherCount > 0 && (
            <div className="space-y-2">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Vouchers</p>
              {client.vouchers.map(v => {
                const statut = VOUCHER_STATUTS[v.status] ?? { label: v.status, color: "bg-gray-100 text-gray-500 border-gray-200" };
                const dureH = Math.floor(v.duration_minutes / 60);
                const dureM = v.duration_minutes % 60;
                const dureStr = dureH > 0 ? `${dureH}h${dureM > 0 ? dureM : ""}` : `${dureM} min`;
                return (
                  <div key={v.id} className="flex items-center gap-3 bg-secondary/30 rounded-lg px-3 py-2 text-xs flex-wrap">
                    <Tag size={11} className="text-violet-500 shrink-0" />
                    <span className="font-mono font-bold text-violet-700 tracking-wider">{v.code}</span>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${statut.color}`}>
                      {statut.label}
                    </span>
                    <span className="text-foreground font-medium">{dureStr}</span>
                    {v.prix != null && <span className="text-muted-foreground">{v.prix} €</span>}
                    <span className="text-muted-foreground opacity-60 truncate">{v.product_title}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function ClientsClient({ clients }: { clients: Client[] }) {
  const [search, setSearch] = useState("");

  const filtered = clients.filter(c => {
    const q = search.toLowerCase();
    return (
      c.prenom.toLowerCase().includes(q) ||
      c.nom.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q) ||
      (c.telephone ?? "").includes(q)
    );
  });

  return (
    <div className="space-y-4">
      <div className="relative max-w-sm">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Rechercher par nom, email ou tél…"
          className="w-full h-9 pl-9 pr-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground text-sm">
          {search ? "Aucun client trouvé." : "Aucun client enregistré."}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(c => <ClientCard key={c.id} client={c} />)}
        </div>
      )}
    </div>
  );
}
