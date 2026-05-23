import { createAdminClient } from "@/lib/supabase/admin";
import { VolsPersoClient } from "@/components/admin/VolsPersoClient";
import { StopoversAdmin } from "@/components/admin/StopoversAdmin";
import { PageHeader } from "@/components/admin/PageHeader";

export const metadata = { title: "Vols sur mesure — Admin" };

export default async function VolsSurMesurePage() {
  const supabase = createAdminClient();

  const [{ data: reservations }, { data: stopovers }] = await Promise.all([
    supabase
      .from("reservations")
      .select("*, clients(*)")
      .eq("type_resa", "perso")
      .order("created_at", { ascending: false }),
    supabase
      .from("stopovers")
      .select("id, icao, nom, taxe, actif, lat, lng")
      .order("nom"),
  ]);

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
    <div className="space-y-5">
      <PageHeader
        domain="vols"
        title="Vols sur mesure"
        subtitle="Itinéraires personnalisés tracés sur carte"
      />

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3">
        {[
          { label: "En attente",   value: byStatus.en_attente,      color: "text-yellow-600" },
          { label: "Acompte ✓",    value: byStatus.acompte_recu,    color: "text-emerald-600" },
          { label: "Date ✓",       value: byStatus.date_confirmee,  color: "text-blue-600" },
          { label: "Heure ✓",      value: byStatus.heure_confirmee, color: "text-green-600" },
          { label: "Effectués",    value: byStatus.vol_effectue,    color: "text-purple-600" },
          { label: "Annulées",     value: byStatus.annulee,         color: "text-red-500" },
        ].map(({ label, value, color }) => (
          <div key={label} className="card-premium p-3 text-center">
            <p className={`text-xl font-bold ${color}`}>{value}</p>
            <p className="text-xs text-muted-foreground mt-0.5 leading-tight">{label}</p>
          </div>
        ))}
      </div>

      <StopoversAdmin initialData={stopovers ?? []} />
      <VolsPersoClient reservations={all} />
    </div>
  );
}
