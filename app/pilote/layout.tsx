import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { PiloteSidebar, type PilotIdInfo } from "@/components/pilote/PiloteSidebar";
import { ChartePiloteGate } from "@/components/pilote/ChartePiloteGate";
import { piloteLegalStatus } from "@/lib/pilote/legal";

export const metadata: Metadata = {
  title: "Fly Horizons · Espace pilote",
};

export default async function PiloteLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("role, full_name").eq("id", user.id).single();
  // isAdmin passe aussi : un compte admin peut avoir sa propre fiche pilote
  // (cas de Romain, admin + pilote sur le même compte depuis le 14/09).
  if (profile?.role !== "pilote" && profile?.role !== "admin") redirect("/");

  // Un pilote désactivé (statut != 'actif') perd l'accès à l'espace, même si son
  // rôle profil reste "pilote" (la désactivation ne touche que la fiche pilotes).
  const admin = createAdminClient();
  const { data: pilote } = await admin
    .from("pilotes")
    .select("id, statut, conditions_accepted_at, licence_numero, licence_expiration, medical_expiration")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!pilote || pilote.statut !== "actif") redirect("/");

  // Charte pilote non encore acceptée : on bloque l'espace derrière le popup.
  const charteRequise = !pilote.conditions_accepted_at;

  // Nombre d'items bloquants sur le profil, pour la pastille de la nav.
  const legal = piloteLegalStatus(pilote);
  const profilAlerts = legal.issues.filter(
    (i) => i.severity === "error" && i.field !== undefined,
  ).length;

  // Plaque pilote (sidebar) : identité + licence/medical + pastille de statut.
  const pilotIdInfo: PilotIdInfo = {
    nom: profile?.full_name || "Pilote",
    licenceNumero: pilote.licence_numero,
    licenceExpiration: pilote.licence_expiration,
    medicalExpiration: pilote.medical_expiration,
    legalOk: legal.ok,
    legalWarn: legal.issues.some((i) => i.severity === "warn"),
  };

  // Pastille « Mes vols » : nombre de vols du pilote encore actifs (ni effectués,
  // ni annulés) — pour attirer l'attention sur sa charge en cours.
  const { count: volsAlerts } = await admin
    .from("reservations")
    .select("id", { count: "exact", head: true })
    .eq("pilote_id", pilote.id)
    .neq("type_resa", "perso")
    .neq("statut", "vol_effectue")
    .neq("statut", "annulee");

  return (
    <div className="min-h-screen bg-background flex">
      <PiloteSidebar
        counts={{
          "/pilote/profil": profilAlerts,
          "/pilote/vols": volsAlerts ?? 0,
        }}
        pilot={pilotIdInfo}
        isAdmin={profile?.role === "admin"}
      />
      <main className="flex-1 min-w-0 lg:ml-64 min-h-screen">
        <div className="px-4 pt-16 pb-[calc(76px+env(safe-area-inset-bottom))] sm:px-6 sm:pt-16 lg:p-8 lg:pt-8 lg:pb-8">
          {children}
        </div>
      </main>
      {charteRequise && <ChartePiloteGate />}
    </div>
  );
}
