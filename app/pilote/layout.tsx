import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { PiloteSidebar, type PilotIdInfo } from "@/components/pilote/PiloteSidebar";
import { PiloteTopBar } from "@/components/pilote/PiloteTopBar";
import { PiloteTabBar } from "@/components/pilote/PiloteTabBar";
import { MetarChip } from "@/components/pilote/MetarChip";
import { ChartePiloteGate } from "@/components/pilote/ChartePiloteGate";
import { piloteLegalStatus } from "@/lib/pilote/legal";

export const metadata: Metadata = {
  title: "Fly Horizons · Espace pilote",
};

// Plein écran au téléphone : le contenu passe sous les zones de l'iPhone, les
// barres ajoutent elles-mêmes env(safe-area-inset-*).
export const viewport: Viewport = {
  viewportFit: "cover",
  themeColor: "#f5f6f8",
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
  // `issues` alimente le détail dépliable au clic sur la pastille — jusqu'ici
  // le pilote devait déjà cliquer jusqu'au profil pour savoir CE QUI manquait.
  const pilotIdInfo: PilotIdInfo = {
    nom: profile?.full_name || "Pilote",
    licenceNumero: pilote.licence_numero,
    licenceExpiration: pilote.licence_expiration,
    medicalExpiration: pilote.medical_expiration,
    legalOk: legal.ok,
    legalWarn: legal.issues.some((i) => i.severity === "warn"),
    issues: legal.issues.map((i) => ({ label: i.label, severity: i.severity })),
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

  // Point or sur l'onglet « Vols » du téléphone : ce qui attend une action du
  // pilote (nouvelle demande, heure à confirmer).
  const { count: volsATraiter } = await admin
    .from("reservations")
    .select("id", { count: "exact", head: true })
    .eq("pilote_id", pilote.id)
    .in("statut", ["demande_recue", "en_attente"]);

  const counts = {
    "/pilote/profil": profilAlerts,
    "/pilote/vols": volsAlerts ?? 0,
  };

  return (
    <div className="pilote-studio flex min-h-screen bg-st-bg font-sans text-st-text">
      <PiloteSidebar counts={counts} pilot={pilotIdInfo} isAdmin={profile?.role === "admin"} />
      {/* lg:pl-[76px] = largeur du rail replié : ouvert au survol, il se pose
          PAR-DESSUS le contenu sans le pousser (choix du 24/09, Studio). */}
      <div className="flex min-h-screen min-w-0 flex-1 flex-col lg:pl-[76px]">
        <PiloteTopBar
          pilot={pilotIdInfo}
          metar={<Suspense fallback={null}><MetarChip /></Suspense>}
        />
        <main className="flex-1 px-4 pb-[calc(7rem+env(safe-area-inset-bottom))] pt-[calc(1.25rem+env(safe-area-inset-top))] sm:px-6 lg:px-7 lg:pb-8 lg:pt-6">
          {children}
        </main>
      </div>
      <PiloteTabBar
        pilot={pilotIdInfo}
        isAdmin={profile?.role === "admin"}
        badges={{ "/pilote/vols": volsATraiter ?? 0, "/pilote/profil": profilAlerts }}
      />
      {charteRequise && <ChartePiloteGate />}
    </div>
  );
}
