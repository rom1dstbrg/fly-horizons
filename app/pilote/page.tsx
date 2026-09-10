import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { PlaneTakeoff, Plane, ArrowRight, AlertCircle } from "lucide-react";
import { piloteLegalStatus } from "@/lib/pilote/legal";

export default async function PiloteDashboard() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", user!.id).single();

  const prenom = profile?.full_name?.split(" ")[0] ?? "Pilote";

  const admin = createAdminClient();
  const { data: pilote } = await admin
    .from("pilotes")
    .select("id, licence_numero, licence_expiration, medical_expiration, conditions_accepted_at")
    .eq("user_id", user!.id)
    .maybeSingle();
  const legal = piloteLegalStatus(pilote);
  const today = new Date().toISOString().slice(0, 10);
  const [
    { count: demandesEnAttente },
    { count: volsAVenir },
    { count: volsNonPayes },
  ] = pilote
    ? await Promise.all([
        admin
          .from("reservations")
          .select("id", { count: "exact", head: true })
          .eq("pilote_id", pilote.id)
          .eq("statut", "demande_recue"),
        admin
          .from("reservations")
          .select("id", { count: "exact", head: true })
          .eq("pilote_id", pilote.id)
          .neq("type_resa", "perso")
          .gte("date_vol", today)
          .not("statut", "in", "(vol_effectue,annulee)"),
        admin
          .from("reservations")
          .select("id", { count: "exact", head: true })
          .eq("pilote_id", pilote.id)
          .eq("type_resa", "annonce_pilote")
          .neq("pilote_paye", true)
          .not("statut", "in", "(vol_effectue,annulee,demande_recue)"),
      ])
    : [{ count: 0 }, { count: 0 }, { count: 0 }];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-foreground">Bonjour {prenom}</h1>
        <p className="text-muted-foreground text-sm mt-0.5">Bienvenue sur votre espace pilote Fly Horizons.</p>
      </div>

      {!legal.ok && (
        <Link
          href="/pilote/profil"
          className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3 hover:border-red-300 transition-colors"
        >
          <AlertCircle size={18} className="text-red-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-red-800">
              Profil incomplet, vous ne pouvez pas recevoir de vols
            </p>
            <ul className="mt-1 space-y-0.5">
              {legal.issues
                .filter((i) => i.severity === "error")
                .map((i) => (
                  <li key={i.code} className="text-xs text-red-700">
                    {i.label}
                  </li>
                ))}
            </ul>
          </div>
          <ArrowRight size={16} className="text-red-600 shrink-0 mt-0.5" />
        </Link>
      )}

      {legal.ok && legal.issues.length > 0 && (
        <Link
          href="/pilote/profil"
          className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3 hover:border-amber-300 transition-colors"
        >
          <AlertCircle size={18} className="text-amber-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            {legal.issues.map((i) => (
              <p key={i.code} className="text-sm text-amber-800">
                {i.label}
              </p>
            ))}
          </div>
          <ArrowRight size={16} className="text-amber-600 shrink-0 mt-0.5" />
        </Link>
      )}

      {!!demandesEnAttente && demandesEnAttente > 0 && (
        <Link
          href="/pilote/vols"
          className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3 hover:border-amber-300 transition-colors"
        >
          <AlertCircle size={18} className="text-amber-600 shrink-0" />
          <p className="text-sm text-amber-800 flex-1">
            <strong>{demandesEnAttente}</strong> demande{demandesEnAttente > 1 ? "s" : ""} en attente de votre confirmation
          </p>
          <ArrowRight size={16} className="text-amber-600 shrink-0" />
        </Link>
      )}

      <div className="grid grid-cols-2 gap-4">
        <Link href="/pilote/vols" className="bg-card rounded-xl border border-border p-4 hover:border-primary/40 transition-colors">
          <p className="text-2xl font-bold text-foreground tabular-nums">{volsAVenir ?? 0}</p>
          <p className="text-xs text-muted-foreground mt-0.5">vol{(volsAVenir ?? 0) > 1 ? "s" : ""} à venir</p>
        </Link>
        <Link
          href="/pilote/vols"
          className={`rounded-xl border p-4 transition-colors ${
            (volsNonPayes ?? 0) > 0
              ? "bg-amber-50 border-amber-200 hover:border-amber-300"
              : "bg-card border-border hover:border-primary/40"
          }`}
        >
          <p className={`text-2xl font-bold tabular-nums ${(volsNonPayes ?? 0) > 0 ? "text-amber-700" : "text-foreground"}`}>
            {volsNonPayes ?? 0}
          </p>
          <p className={`text-xs mt-0.5 ${(volsNonPayes ?? 0) > 0 ? "text-amber-800" : "text-muted-foreground"}`}>
            vol{(volsNonPayes ?? 0) > 1 ? "s" : ""} pas encore réglé{(volsNonPayes ?? 0) > 1 ? "s" : ""} à surveiller
          </p>
        </Link>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <Link
          href="/pilote/annonces"
          className="bg-card rounded-xl border border-border p-6 flex items-center gap-4 hover:border-primary/40 hover:shadow-sm transition-all group"
        >
          <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center shrink-0">
            <PlaneTakeoff size={18} className="text-muted-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground">Publier un vol</p>
            <p className="text-xs text-muted-foreground mt-0.5">Durée, prix, photos — le client choisit sa date.</p>
          </div>
          <ArrowRight size={16} className="text-muted-foreground/40 group-hover:text-muted-foreground transition-colors shrink-0" />
        </Link>

        <Link
          href="/pilote/vols"
          className="bg-card rounded-xl border border-border p-6 flex items-center gap-4 hover:border-primary/40 hover:shadow-sm transition-all group"
        >
          <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center shrink-0">
            <Plane size={18} className="text-muted-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground">Mes vols</p>
            <p className="text-xs text-muted-foreground mt-0.5">Confirmez, tracez la route, encaissez.</p>
          </div>
          <ArrowRight size={16} className="text-muted-foreground/40 group-hover:text-muted-foreground transition-colors shrink-0" />
        </Link>
      </div>
    </div>
  );
}
