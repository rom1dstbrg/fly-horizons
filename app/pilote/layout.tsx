import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logout } from "@/lib/actions/auth";
import { PiloteNav } from "@/components/pilote/PiloteNav";
import { ChartePiloteGate } from "@/components/pilote/ChartePiloteGate";
import { piloteLegalStatus } from "@/lib/pilote/legal";
import { listOpenOffersForPilote } from "@/lib/pilote/offers";
import { LogOut } from "lucide-react";

export const metadata: Metadata = {
  title: "Fly Horizons · Espace pilote",
};

export default async function PiloteLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("role, full_name").eq("id", user.id).single();
  if (profile?.role !== "pilote") redirect("/");

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

  // Pastille « Mes vols » : nombre de vols assignés encore actifs (ni effectués,
  // ni annulés) — pour attirer l'attention du pilote sur sa charge en cours.
  const { count: volsAlerts } = await admin
    .from("reservations")
    .select("id", { count: "exact", head: true })
    .eq("pilote_id", pilote.id)
    .neq("type_resa", "perso")
    .neq("statut", "vol_effectue")
    .neq("statut", "annulee");

  // Pastille « Offres » : nombre d'offres ouvertes prenables par ce pilote.
  const offresCount = (await listOpenOffersForPilote(pilote.id)).length;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border bg-card">
        <div className="w-full px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/pilote" className="flex items-center gap-2">
            <Image
              src="/fly-horizons-logo-admin.svg"
              alt="Fly Horizons"
              width={130}
              height={32}
              className="h-7 w-auto object-contain"
              style={{ width: "auto" }}
              priority
              unoptimized
            />
            <span className="text-[10px] font-bold uppercase tracking-[2px] text-muted-foreground/60 border-l border-border pl-2 ml-1">
              Pilote
            </span>
          </Link>
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-foreground hidden sm:inline">
              {profile?.full_name ?? user.email}
            </span>
            <form action={logout}>
              <button
                type="submit"
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-all cursor-pointer"
              >
                <LogOut size={14} />
                <span className="hidden sm:inline">Déconnexion</span>
              </button>
            </form>
          </div>
        </div>
      </header>
      <PiloteNav
        counts={{
          "/pilote/profil": profilAlerts,
          "/pilote/vols": volsAlerts ?? 0,
          "/pilote/offres": offresCount,
        }}
      />
      <main className="flex-1">
        <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </div>
      </main>
      {charteRequise && <ChartePiloteGate />}
    </div>
  );
}
