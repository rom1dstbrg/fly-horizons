import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { PlaneTakeoff, Plane, Scale, User, ArrowRight } from "lucide-react";
import { piloteLegalStatus } from "@/lib/pilote/legal";
import { PiloteHeader, PiloteAlert } from "@/components/pilote/ui";

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
        admin.from("reservations").select("id", { count: "exact", head: true })
          .eq("pilote_id", pilote.id).eq("statut", "demande_recue"),
        admin.from("reservations").select("id", { count: "exact", head: true })
          .eq("pilote_id", pilote.id).neq("type_resa", "perso")
          .gte("date_vol", today).not("statut", "in", "(vol_effectue,annulee)"),
        admin.from("reservations").select("id", { count: "exact", head: true })
          .eq("pilote_id", pilote.id).eq("type_resa", "annonce_pilote")
          .neq("pilote_paye", true).not("statut", "in", "(vol_effectue,annulee,demande_recue)"),
      ])
    : [{ count: 0 }, { count: 0 }, { count: 0 }];

  const nDemandes = demandesEnAttente ?? 0;
  const nAVenir = volsAVenir ?? 0;
  const nNonPayes = volsNonPayes ?? 0;

  const stats = [
    { n: nAVenir, label: nAVenir > 1 ? "vols à venir" : "vol à venir", href: "/pilote/vols" },
    { n: nDemandes, label: nDemandes > 1 ? "demandes reçues" : "demande reçue", href: "/pilote/vols" },
    { n: nNonPayes, label: "à régler", href: "/pilote/vols", warn: nNonPayes > 0 },
  ];

  const destinations = [
    { href: "/pilote/annonces", label: "Mes annonces", desc: "Publiez un vol : durée, prix, photos.", Icon: PlaneTakeoff },
    { href: "/pilote/vols", label: "Mes vols", desc: "Confirmez, tracez la route, marquez le règlement.", Icon: Plane },
    { href: "/pilote/mass-balance", label: "Masse & centrage", desc: "Feuille DA40, perfs, METAR.", Icon: Scale },
    { href: "/pilote/profil", label: "Mon profil", desc: "Licence, médical, IBAN, bio, signature.", Icon: User },
  ];

  return (
    <div className="space-y-6">
      <PiloteHeader title={`Bonjour ${prenom}`} subtitle="Vos vols et vos annonces, en un coup d'œil." />

      {!legal.ok && (
        <PiloteAlert tone="danger" href="/pilote/profil">
          <p className="font-semibold">Profil incomplet, vous ne pouvez pas recevoir de vols</p>
          <ul className="mt-1 space-y-0.5 text-[13px]">
            {legal.issues.filter((i) => i.severity === "error").map((i) => (
              <li key={i.code}>{i.label}</li>
            ))}
          </ul>
        </PiloteAlert>
      )}

      {legal.ok && legal.issues.length > 0 && (
        <PiloteAlert tone="warn" href="/pilote/profil">
          {legal.issues.map((i) => (
            <p key={i.code}>{i.label}</p>
          ))}
        </PiloteAlert>
      )}

      {/* Chiffres — 3 cartes identiques */}
      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        {stats.map((s) => (
          <Link
            key={s.label}
            href={s.href}
            className={`card-premium p-4 sm:p-5 transition-shadow hover:shadow-[0_8px_32px_rgba(11,34,56,0.11)] ${
              s.warn ? "border-l-4 border-l-amber-400" : ""
            }`}
          >
            <p className={`text-[26px] font-bold leading-none tabular-nums ${s.warn ? "text-amber-700" : "text-foreground"}`}>
              {s.n}
            </p>
            <p className={`text-xs mt-2 ${s.warn ? "text-amber-800" : "text-muted-foreground"}`}>{s.label}</p>
          </Link>
        ))}
      </div>

      {/* Destinations — cartes identiques */}
      <div className="grid sm:grid-cols-2 gap-3 sm:gap-4">
        {destinations.map(({ href, label, desc, Icon }) => (
          <Link
            key={href}
            href={href}
            className="card-premium p-5 flex items-center gap-4 transition-shadow hover:shadow-[0_8px_32px_rgba(11,34,56,0.11)] group"
          >
            <div className="w-10 h-10 rounded-[10px] bg-secondary flex items-center justify-center shrink-0">
              <Icon size={18} className="text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground">{label}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
            </div>
            <ArrowRight size={16} className="text-muted-foreground/40 group-hover:text-muted-foreground transition-colors shrink-0" />
          </Link>
        ))}
      </div>
    </div>
  );
}
