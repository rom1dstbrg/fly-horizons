import { createAdminClient } from "@/lib/supabase/admin";
import { VolsPersoClient } from "@/components/admin/VolsPersoClient";

export const metadata = { title: "Vols sur mesure — Admin" };

export default async function VolsSurMesurePage() {
  const supabase = createAdminClient();

  const { data: reservations } = await supabase
    .from("reservations")
    .select("*, clients(*)")
    .eq("type_resa", "perso")
    .order("created_at", { ascending: false });

  const all = reservations ?? [];
  const byStatus = {
    en_attente:      all.filter(r => r.statut === "en_attente").length,
    acompte_recu:    all.filter(r => r.statut === "acompte_recu").length,
    date_confirmee:  all.filter(r => r.statut === "date_confirmee").length,
    heure_confirmee: all.filter(r => r.statut === "heure_confirmee").length,
    vol_effectue:    all.filter(r => r.statut === "vol_effectue").length,
    annulee:         all.filter(r => r.statut === "annulee").length,
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Vols sur mesure</h1>
        <p className="text-muted-foreground text-sm mt-1">Réservations personnalisées avec itinéraire tracé sur carte</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
        {[
          { label: "En attente",      value: byStatus.en_attente,      color: "text-yellow-600" },
          { label: "Acompte reçu",    value: byStatus.acompte_recu,    color: "text-emerald-600" },
          { label: "Date confirmée",  value: byStatus.date_confirmee,  color: "text-blue-600" },
          { label: "Heure confirmée", value: byStatus.heure_confirmee, color: "text-green-600" },
          { label: "Vol effectué",    value: byStatus.vol_effectue,    color: "text-purple-600" },
          { label: "Annulées",        value: byStatus.annulee,         color: "text-red-500" },
        ].map(({ label, value, color }) => (
          <div key={label} className="card-premium p-3 text-center">
            <p className={`text-xl font-bold ${color}`}>{value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      <VolsPersoClient reservations={reservations ?? []} />
    </div>
  );
}
