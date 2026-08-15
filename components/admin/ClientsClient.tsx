"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Tag, ExternalLink, Mail, Send, Loader2, Users } from "lucide-react";
import { deleteClient } from "@/lib/actions/delete";
import { sendEmailToClient } from "@/lib/actions/clients";
import { AdminBadge, STATUT_VOUCHER } from "@/components/admin/ui/AdminBadge";
import { getResaBadge } from "@/components/admin/ui/resaBadge";
import { AdminRowActions } from "@/components/admin/ui/AdminRowActions";
import { AdminSheet, SheetSection, SheetRow } from "@/components/admin/ui/AdminSheet";
import { PageToolbar, EmptyState } from "@/components/admin/ui";

interface Reservation {
  id: string;
  date_vol: string;
  heure_vol: string | null;
  duree: number;
  statut: string;
  type_resa: string;
  payment_status: string | null;
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

// ── Corps du drawer (remonté à chaque client pour reset l'état) ─
function DrawerBody({ client }: { client: Client }) {
  const [emailOpen, setEmailOpen] = useState(false);
  const [emailSubject, setEmailSubject] = useState(`Fly Horizons — Message pour ${client.prenom} ${client.nom}`);
  const [emailBody, setEmailBody] = useState(`Bonjour ${client.prenom},\n\n\n\nCordialement,\nL'équipe Fly Horizons`);
  const [feedback, setFeedback] = useState("");
  const [isPending, startTransition] = useTransition();

  const resaCount = client.reservations.length;
  const voucherCount = client.vouchers.length;
  const joinedAt = new Date(client.created_at).toLocaleDateString("fr-BE", {
    day: "numeric", month: "long", year: "numeric",
  });

  function handleSend() {
    startTransition(async () => {
      const r = await sendEmailToClient(client.id, emailSubject, emailBody);
      if (r.error) { setFeedback(r.error); return; }
      setFeedback("Email envoyé ✓");
      setEmailOpen(false);
      setTimeout(() => setFeedback(""), 3000);
    });
  }

  return (
    <>
      {/* Infos générales */}
      <SheetSection title="Informations">
        <SheetRow label="Prénom" value={client.prenom} />
        <SheetRow label="Nom" value={client.nom} />
        <SheetRow label="Email" value={client.email} />
        {client.telephone && <SheetRow label="Téléphone" value={client.telephone} />}
        <SheetRow label="Inscrit le" value={joinedAt} />
      </SheetSection>

      {/* Réservations */}
      <SheetSection title={`Réservations (${resaCount})`}>
        {resaCount === 0 ? (
          <p className="text-xs text-muted-foreground py-2">Aucune réservation.</p>
        ) : (
          <div className="space-y-2">
            {client.reservations.map(r => {
              const statut = getResaBadge(r);
              const dateStr = new Date(r.date_vol + "T12:00:00Z").toLocaleDateString("fr-BE", {
                day: "numeric", month: "short", year: "numeric",
              });
              return (
                <div key={r.id} className="flex items-center gap-2 flex-wrap bg-secondary/30 rounded-lg px-3 py-2 text-xs">
                  <AdminBadge variant={statut.variant} label={statut.label} />
                  <span className="font-medium text-foreground">{dateStr}{r.heure_vol ? ` · ${r.heure_vol.slice(0, 5)}` : ""}</span>
                  <span className="text-muted-foreground">{r.duree} min</span>
                  <span className="text-muted-foreground opacity-60">
                    {r.type_resa === "perso" ? "Sur mesure" : r.type_resa === "annonce_pilote" ? "Vol partagé" : "Standard"}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </SheetSection>

      {/* Vouchers */}
      <SheetSection title={`Vouchers (${voucherCount})`}>
        {voucherCount === 0 ? (
          <p className="text-xs text-muted-foreground py-2">Aucun voucher.</p>
        ) : (
          <div className="space-y-2">
            {client.vouchers.map(v => {
              const statut = STATUT_VOUCHER[v.status] ?? { label: v.status, variant: "secondary" as const };
              const dureH = Math.floor(v.duration_minutes / 60);
              const dureM = v.duration_minutes % 60;
              const dureStr = dureH > 0 ? `${dureH}h${dureM > 0 ? dureM : ""}` : `${dureM} min`;
              return (
                <div key={v.id} className="flex items-center gap-2 flex-wrap bg-secondary/30 rounded-lg px-3 py-2 text-xs">
                  <Tag size={11} className="text-violet-500 shrink-0" />
                  <span className="font-mono font-bold text-violet-700 tracking-wider">{v.code}</span>
                  <AdminBadge variant={statut.variant} label={statut.label} />
                  <span className="font-medium text-foreground">{dureStr}</span>
                  {v.prix != null && <span className="text-muted-foreground">{v.prix} €</span>}
                  <span className="text-muted-foreground opacity-60 truncate max-w-[140px]">{v.product_title}</span>
                </div>
              );
            })}
          </div>
        )}
      </SheetSection>

      {/* Email libre */}
      <SheetSection title="Email libre">
        {feedback && (
          <p className={`text-xs mb-2 ${feedback.includes("✓") ? "text-emerald-600" : "text-destructive"}`}>
            {feedback}
          </p>
        )}
        {emailOpen ? (
          <div className="space-y-2.5 bg-secondary/40 rounded-xl p-3.5 border border-border">
            <div>
              <p className="text-[10px] text-muted-foreground mb-1">À</p>
              <p className="text-xs text-foreground font-medium">{client.email}</p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground mb-1">Sujet</p>
              <input
                autoFocus
                value={emailSubject}
                onChange={e => setEmailSubject(e.target.value)}
                className="w-full h-8 px-2.5 rounded-lg border border-input bg-background text-xs focus:outline-none focus:ring-1 focus:ring-navy/30"
              />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground mb-1">Message</p>
              <textarea
                value={emailBody}
                onChange={e => setEmailBody(e.target.value)}
                rows={6}
                className="w-full px-2.5 py-2 rounded-lg border border-input bg-background text-xs resize-none focus:outline-none focus:ring-1 focus:ring-navy/30"
              />
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleSend}
                disabled={isPending || !emailSubject.trim() || !emailBody.trim()}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#0b2238] text-white text-xs font-semibold hover:bg-[#0b2238] transition-colors disabled:opacity-50"
              >
                {isPending ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
                Envoyer
              </button>
              <button
                onClick={() => setEmailOpen(false)}
                disabled={isPending}
                className="px-3 py-1.5 rounded-lg border border-border text-xs text-muted-foreground hover:bg-secondary transition-colors"
              >
                Annuler
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setEmailOpen(true)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border text-xs text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
          >
            <Mail size={13} />
            Composer un email…
          </button>
        )}
      </SheetSection>
    </>
  );
}

// ── Drawer de détail client ────────────────────────────────────
function ClientDrawer({
  client,
  onClose,
}: {
  client: Client | null;
  onClose: () => void;
}) {
  if (!client) return null;

  return (
    <AdminSheet
      open={!!client}
      onClose={onClose}
      title={`${client.prenom} ${client.nom}`}
      subtitle={client.email}
      footer={
        <Link
          href={`/admin/clients/${client.id}`}
          className="flex items-center gap-2 text-sm font-medium text-primary hover:underline"
        >
          <ExternalLink size={14} />
          Voir la fiche complète
        </Link>
      }
    >
      <DrawerBody key={client.id} client={client} />
    </AdminSheet>
  );
}

// ── Carte client ───────────────────────────────────────────────
function ClientCard({
  client,
  onOpen,
  onDelete,
}: {
  client: Client;
  onOpen: () => void;
  onDelete: () => Promise<{ error?: string } | void>;
}) {
  const resaCount = client.reservations.length;
  const voucherCount = client.vouchers.length;

  return (
    <div className="card-premium px-4 py-2.5 hover:border-primary/30 transition-colors">
      <div className="flex items-center justify-between gap-4">
        {/* Infos — cliquables */}
        <div className="flex-1 min-w-0 cursor-pointer flex items-center gap-3 flex-wrap" onClick={onOpen}>
          <span className="font-mono text-[10px] font-semibold text-muted-foreground/70 shrink-0">
            {client.id}
          </span>
          <p className="font-semibold text-foreground text-sm shrink-0">
            {client.prenom} {client.nom}
          </p>
          {resaCount > 0 && (
            <AdminBadge variant="info" label={`${resaCount} vol${resaCount > 1 ? "s" : ""}`} />
          )}
          {voucherCount > 0 && (
            <AdminBadge variant="primary" label={`${voucherCount} voucher${voucherCount > 1 ? "s" : ""}`} />
          )}
          <span className="text-xs text-muted-foreground truncate">
            {client.email}{client.telephone ? ` · ${client.telephone}` : ""}
          </span>
        </div>

        {/* Actions */}
        <div onClick={e => e.stopPropagation()} className="shrink-0">
          <AdminRowActions
            onView={onOpen}
            onDelete={onDelete}
          />
        </div>
      </div>
    </div>
  );
}

// ── Page principale ────────────────────────────────────────────
export function ClientsClient({ clients: initial }: { clients: Client[] }) {
  const [clients, setClients] = useState<Client[]>(initial);
  const [search, setSearch] = useState("");
  const [drawer, setDrawer] = useState<Client | null>(null);

  async function handleDelete(id: string) {
    const result = await deleteClient(id);
    if (!result?.error) {
      setClients(prev => prev.filter(c => c.id !== id));
      if (drawer?.id === id) setDrawer(null);
    }
    return result;
  }

  const filtered = clients.filter(c => {
    const q = search.toLowerCase();
    return (
      c.prenom.toLowerCase().includes(q) ||
      c.nom.toLowerCase().includes(q) ||
      (c.email ?? "").toLowerCase().includes(q) ||
      (c.telephone ?? "").includes(q)
    );
  });

  return (
    <>
      <div className="space-y-4">
        <PageToolbar
          search={{ value: search, onChange: setSearch, placeholder: "Rechercher par nom, email ou tél…" }}
        />

        {filtered.length === 0 ? (
          <EmptyState
            icon={Users}
            title={search ? "Aucun client trouvé" : "Aucun client enregistré"}
            description={search ? "Aucun client ne correspond à cette recherche." : "Les clients apparaîtront ici dès la première réservation."}
          />
        ) : (
          <div className="space-y-2">
            {filtered.map(c => (
              <ClientCard
                key={c.id}
                client={c}
                onOpen={() => setDrawer(c)}
                onDelete={() => handleDelete(c.id)}
              />
            ))}
          </div>
        )}
      </div>

      <ClientDrawer
        client={drawer}
        onClose={() => setDrawer(null)}
      />
    </>
  );
}
