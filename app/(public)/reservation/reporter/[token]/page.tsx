import { createAdminClient } from "@/lib/supabase/admin";
import { parseRescheduleToken } from "@/lib/reschedule-token";
import { RescheduleClient } from "./RescheduleClient";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

interface PageProps {
  params: Promise<{ token: string }>;
}

export default async function ReporterPage({ params }: PageProps) {
  const { token } = await params;
  const supabase = createAdminClient();

  const parsed = parseRescheduleToken(token);
  const isExpired = parsed && Date.now() > parsed.exp;

  const { data: resa } = parsed && !isExpired
    ? await supabase
        .from("reservations")
        .select("id, date_vol, duree, statut, passagers, poids_total, pilote_id, clients(prenom, nom, email), pilotes(nom)")
        .eq("reschedule_token", parsed.t)
        .maybeSingle()
    : { data: null };

  if (!resa) {
    return (
      <Notice title="Ce lien n'est plus valide.">
        Il a peut-être déjà servi ou il a expiré (un lien de report est valable 30 jours).
        Écrivez-nous depuis la <Link href="/contact" className={LINK}>page contact</Link> et nous vous en renvoyons un.
      </Notice>
    );
  }

  if (["annulee", "vol_effectue"].includes(resa.statut)) {
    return (
      <Notice title="Ce vol ne peut plus être reporté.">
        Il est déjà effectué ou annulé. Une question ? <Link href="/contact" className={LINK}>Contactez-nous</Link>.
      </Notice>
    );
  }

  const clientRaw = resa.clients as unknown as { prenom: string; nom: string; email: string } | null;

  return (
    <RescheduleClient
      token={token}
      currentDate={resa.date_vol}
      duree={resa.duree}
      prenom={clientRaw?.prenom ?? ""}
      nom={clientRaw?.nom ?? ""}
      email={clientRaw?.email ?? ""}
      passagers={resa.passagers ?? 1}
      poids_total={resa.poids_total ?? null}
      piloteNom={resa.pilote_id ? ((Array.isArray(resa.pilotes) ? resa.pilotes[0] : resa.pilotes) as { nom: string } | null)?.nom ?? "votre pilote" : null}
    />
  );
}

const LINK = "font-semibold text-[#0b2238] underline decoration-[#0b2238]/25 underline-offset-[3px] hover:decoration-primary transition-colors";

// Lien invalide ou vol clos : même colonne que la confirmation sur place.
function Notice({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <main className="bg-white pt-page pb-24">
      <div className="max-w-[640px] mx-auto px-4 sm:px-6">
        <p className="text-[11px] font-bold text-primary uppercase tracking-[3px] mb-3">Report de vol</p>
        <h1 className="text-[34px] lg:text-[40px] font-black text-foreground leading-[1.03] tracking-[-0.02em] mb-3">{title}</h1>
        <p className="text-[15px] leading-[1.7] text-foreground/75">{children}</p>
        <Link href="/" className="mt-[22px] inline-flex items-center gap-2 px-5 py-3 bg-white border border-border text-foreground rounded-[10px] text-sm font-bold hover:border-foreground transition-colors">
          <ArrowLeft size={15} /> Retour à l&apos;accueil
        </Link>
      </div>
    </main>
  );
}
