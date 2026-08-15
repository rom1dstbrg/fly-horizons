import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Plane, PlaneTakeoff, ArrowRight, Clock, Users } from "lucide-react";

export default async function PiloteDashboard() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", user!.id).single();

  const prenom = profile?.full_name?.split(" ")[0] ?? "Pilote";

  const admin = createAdminClient();
  const { data: pilote } = await admin.from("pilotes").select("id").eq("user_id", user!.id).maybeSingle();
  const { data: mesVols } = pilote
    ? await admin
        .from("reservations")
        .select("id, date_vol, heure_vol, duree, passagers, statut, clients(prenom, nom)")
        .eq("pilote_id", pilote.id)
        .in("statut", ["heure_confirmee", "vol_effectue"])
        .order("date_vol", { ascending: true })
    : { data: [] };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-foreground">Bonjour {prenom}</h1>
        <p className="text-muted-foreground text-sm mt-0.5">Bienvenue sur votre espace pilote Fly Horizons.</p>
      </div>

      <Link
        href="/pilote/annonces"
        className="bg-card rounded-xl border border-border p-6 flex items-center gap-4 hover:border-primary/40 hover:shadow-sm transition-all group"
      >
        <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center shrink-0">
          <PlaneTakeoff size={18} className="text-muted-foreground" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground">Publier un vol</p>
          <p className="text-xs text-muted-foreground mt-0.5">Créez votre annonce avec date, prix et votre part personnelle.</p>
        </div>
        <ArrowRight size={16} className="text-muted-foreground/40 group-hover:text-muted-foreground transition-colors shrink-0" />
      </Link>

      <div>
        <p className="text-xs font-bold text-muted-foreground uppercase tracking-[1.5px] mb-3">Mes vols réservés</p>
        {!mesVols || mesVols.length === 0 ? (
          <div className="bg-card rounded-xl border border-border p-10 flex flex-col items-center justify-center text-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center">
              <Plane size={18} className="text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Aucun vol réservé pour l&apos;instant</p>
              <p className="text-xs text-muted-foreground mt-1 max-w-[320px]">
                Vos annonces réservées par des clients apparaîtront ici.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-2.5">
            {mesVols.map((v) => {
              const client = v.clients as unknown as { prenom: string; nom: string } | null;
              const dateStr = new Date(v.date_vol + "T12:00:00Z").toLocaleDateString("fr-BE", {
                weekday: "short", day: "numeric", month: "short", year: "numeric",
              });
              return (
                <div key={v.id} className="bg-card rounded-xl border border-border p-4 flex flex-wrap items-center gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-foreground capitalize">{dateStr}</span>
                      {v.statut === "vol_effectue" && (
                        <span className="text-[10px] font-bold uppercase tracking-wide text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">Effectué</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><Clock size={11} /> {v.heure_vol?.slice(0, 5)} · {v.duree} min</span>
                      <span className="flex items-center gap-1"><Users size={11} /> {v.passagers} passager{v.passagers > 1 ? "s" : ""}</span>
                      {client && <span>{client.prenom} {client.nom}</span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
