import { createAdminClient } from "@/lib/supabase/admin";
import { ReservationsClient } from "@/components/admin/ReservationsClient";
import Link from "next/link";
import { Plus } from "lucide-react";

export const metadata = { title: "Réservations — Admin" };

export default async function ReservationsPage() {
  const supabase = createAdminClient();

  const { data: reservations } = await supabase
    .from("reservations")
    .select("*, clients(*)")
    .eq("type_resa", "standard")
    .order("created_at", { ascending: false });

  const all = reservations ?? [];
  const byStatus = {
    payment_pending: all.filter(r => r.statut === "payment_pending").length,
    en_attente:      all.filter(r => r.statut === "en_attente").length,
    date_confirmee:  all.filter(r => r.statut === "date_confirmee").length,
    heure_confirmee: all.filter(r => r.statut === "heure_confirmee").length,
    vol_effectue:    all.filter(r => r.statut === "vol_effectue").length,
    annulee:         all.filter(r => r.statut === "annulee").length,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Réservations</h1>
          <p className="text-muted-foreground text-sm mt-1">Réservations effectuées via la page /reserver (packs 30 / 60 / 90 / 120 min)</p>
        </div>
        <Link
          href="/admin/reservations/new"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors shrink-0"
        >
          <Plus size={15} /> Nouvelle réservation
        </Link>
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
        {[
          { label: "Paiement en att.", value: byStatus.payment_pending, color: "text-orange-500" },
          { label: "En attente",       value: byStatus.en_attente,      color: "text-yellow-600" },
          { label: "Date confirmée",   value: byStatus.date_confirmee,  color: "text-blue-600" },
          { label: "Heure confirmée",  value: byStatus.heure_confirmee, color: "text-green-600" },
          { label: "Vol effectué",     value: byStatus.vol_effectue,    color: "text-purple-600" },
          { label: "Annulées",         value: byStatus.annulee,         color: "text-red-500" },
        ].map(({ label, value, color }) => (
          <div key={label} className="card-premium p-3 text-center">
            <p className={`text-xl font-bold ${color}`}>{value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      <ReservationsClient reservations={all} />
    </div>
  );
}
