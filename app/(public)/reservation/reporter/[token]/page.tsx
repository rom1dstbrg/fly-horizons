import { createAdminClient } from "@/lib/supabase/admin";
import { parseRescheduleToken } from "@/lib/reschedule-token";
import { RescheduleClient } from "./RescheduleClient";
import { XCircle, AlertCircle } from "lucide-react";

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
        .select("id, date_vol, duree, statut, passagers, poids_total, clients(prenom, nom, email)")
        .eq("reschedule_token", parsed.t)
        .maybeSingle()
    : { data: null };

  if (!resa) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-gradient-navy px-4 pt-[98px] pb-16">
        <div className="max-w-md w-full text-center space-y-4">
          <div className="w-14 h-14 rounded-lg bg-secondary border border-border flex items-center justify-center mx-auto">
            <XCircle size={24} className="text-foreground/30" />
          </div>
          <h1 className="text-xl font-black text-foreground">Lien invalide</h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Ce lien de report n&apos;est plus valide. Il a peut-être déjà été utilisé ou il a expiré.
            Contactez-nous à{" "}
            <a href="mailto:info@fly-horizons.com" className="text-primary hover:brightness-90 transition-all font-semibold">
              info@fly-horizons.com
            </a>{" "}
            si vous avez besoin d&apos;aide.
          </p>
        </div>
      </div>
    );
  }

  if (["annulee", "vol_effectue"].includes(resa.statut)) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-gradient-navy px-4 pt-[98px] pb-16">
        <div className="max-w-md w-full text-center space-y-4">
          <div className="w-14 h-14 rounded-lg bg-secondary border border-border flex items-center justify-center mx-auto">
            <AlertCircle size={24} className="text-foreground/30" />
          </div>
          <h1 className="text-xl font-black text-foreground">Report non disponible</h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Ce vol ne peut plus être reporté.{" "}
            <a href="mailto:info@fly-horizons.com" className="text-primary hover:brightness-90 transition-all font-semibold">
              Contactez-nous
            </a>{" "}
            si vous avez une question.
          </p>
        </div>
      </div>
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
    />
  );
}
