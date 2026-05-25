import { createAdminClient } from "@/lib/supabase/admin";
import { RescheduleClient } from "./RescheduleClient";

interface PageProps {
  params: Promise<{ token: string }>;
}

export default async function ReporterPage({ params }: PageProps) {
  const { token } = await params;
  const supabase = createAdminClient();

  const { data: resa } = await supabase
    .from("reservations")
    .select("id, date_vol, duree, statut, passagers, poids_total, clients(prenom, nom, email)")
    .eq("reschedule_token", token)
    .maybeSingle();

  if (!resa) {
    return (
      <div className="bg-[#f5f5f7] flex-1 flex flex-col items-center justify-center px-4 py-16 min-h-[60vh]">
        <div className="max-w-md w-full text-center">
          <div className="w-14 h-14 rounded-2xl bg-red-100 flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">🔗</span>
          </div>
          <h1 className="text-xl font-bold text-foreground mb-2">Lien invalide</h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Ce lien de report n&apos;est plus valide. Il a peut-être déjà été utilisé, ou il a expiré.
            Contactez-nous à{" "}
            <a href="mailto:info@fly-horizons.com" className="text-[#113356] underline">
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
      <div className="bg-[#f5f5f7] flex-1 flex flex-col items-center justify-center px-4 py-16 min-h-[60vh]">
        <div className="max-w-md w-full text-center">
          <div className="w-14 h-14 rounded-2xl bg-orange-100 flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">✈️</span>
          </div>
          <h1 className="text-xl font-bold text-foreground mb-2">Report non disponible</h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Ce vol ne peut plus être reporté. Contactez-nous si vous avez une question.
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
