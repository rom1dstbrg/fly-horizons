import { createAdminClient } from "@/lib/supabase/admin";
import { ReservationsClient } from "@/components/admin/ReservationsClient";
import { PageHeader } from "@/components/admin/PageHeader";
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
    <div className="space-y-5">
      <PageHeader
        domain="vols"
        title="Réservations"
        subtitle="Packs 30 / 60 / 90 / 120 min, réservés via /reservation"
        action={
          <Link
            href="/admin/reservations/new"
            className="inline-flex items-center gap-2 px-3 py-2 sm:px-4 rounded-md bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors"
          >
            <Plus size={15} />
            <span className="hidden sm:inline">Nouvelle réservation</span>
            <span className="sm:hidden">Nouveau</span>
          </Link>
        }
      />

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3">
        {[
          { label: "Paiement att.", value: byStatus.payment_pending, color: "text-orange-500" },
          { label: "En attente",    value: byStatus.en_attente,      color: "text-yellow-600" },
          { label: "Date ✓",        value: byStatus.date_confirmee,  color: "text-blue-600" },
          { label: "Heure ✓",       value: byStatus.heure_confirmee, color: "text-green-600" },
          { label: "Effectués",     value: byStatus.vol_effectue,    color: "text-purple-600" },
          { label: "Annulées",      value: byStatus.annulee,         color: "text-red-500" },
        ].map(({ label, value, color }) => (
          <div key={label} className="card-premium p-3 text-center">
            <p className={`text-xl font-bold ${color}`}>{value}</p>
            <p className="text-xs text-muted-foreground mt-0.5 leading-tight">{label}</p>
          </div>
        ))}
      </div>

      <ReservationsClient reservations={all} />
    </div>
  );
}
