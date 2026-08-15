import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { PlaneTakeoff, Plane, ArrowRight, AlertCircle } from "lucide-react";

export default async function PiloteDashboard() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", user!.id).single();

  const prenom = profile?.full_name?.split(" ")[0] ?? "Pilote";

  const admin = createAdminClient();
  const { data: pilote } = await admin.from("pilotes").select("id").eq("user_id", user!.id).maybeSingle();
  const { count: demandesEnAttente } = pilote
    ? await admin
        .from("reservations")
        .select("id", { count: "exact", head: true })
        .eq("pilote_id", pilote.id)
        .eq("statut", "demande_recue")
    : { count: 0 };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-foreground">Bonjour {prenom}</h1>
        <p className="text-muted-foreground text-sm mt-0.5">Bienvenue sur votre espace pilote Fly Horizons.</p>
      </div>

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
