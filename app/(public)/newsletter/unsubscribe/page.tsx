import { createAdminClient } from "@/lib/supabase/admin";
import Link from "next/link";
import { CheckCircle2, XCircle } from "lucide-react";

export const metadata = { title: "Désinscription newsletter — Fly Horizons" };

export default async function UnsubscribePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  let status: "success" | "already" | "invalid" | "missing" = "missing";

  if (token) {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("newsletter_subscribers")
      .select("id, active")
      .eq("unsubscribe_token", token)
      .single();

    if (!data) {
      status = "invalid";
    } else if (!data.active) {
      status = "already";
    } else {
      await supabase
        .from("newsletter_subscribers")
        .update({ active: false, unsubscribed_at: new Date().toISOString() })
        .eq("id", data.id);
      status = "success";
    }
  }

  const isOk = status === "success" || status === "already";

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-16 bg-[#f5f8ff]">
      <div className="max-w-md w-full bg-white rounded-2xl border border-border shadow-sm p-8 text-center">

        <div className={`w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-5 ${isOk ? "bg-green-50" : "bg-red-50"}`}>
          {isOk
            ? <CheckCircle2 size={28} className="text-green-500" />
            : <XCircle size={28} className="text-red-400" />
          }
        </div>

        {status === "success" && (
          <>
            <h1 className="text-xl font-bold text-foreground mb-2">Désinscription confirmée</h1>
            <p className="text-sm text-muted-foreground">
              Vous avez bien été retiré de notre newsletter. Vous ne recevrez plus d'emails de notre part.
            </p>
          </>
        )}
        {status === "already" && (
          <>
            <h1 className="text-xl font-bold text-foreground mb-2">Déjà désinscrit</h1>
            <p className="text-sm text-muted-foreground">
              Cette adresse email n'est plus inscrite à notre newsletter.
            </p>
          </>
        )}
        {status === "invalid" && (
          <>
            <h1 className="text-xl font-bold text-foreground mb-2">Lien invalide</h1>
            <p className="text-sm text-muted-foreground">
              Ce lien de désinscription n'est pas valide ou a déjà été utilisé.
            </p>
          </>
        )}
        {status === "missing" && (
          <>
            <h1 className="text-xl font-bold text-foreground mb-2">Lien manquant</h1>
            <p className="text-sm text-muted-foreground">
              Le lien de désinscription est incomplet. Utilisez le lien fourni dans l'email reçu.
            </p>
          </>
        )}

        <Link
          href="/"
          className="inline-block mt-6 px-5 py-2.5 bg-navy text-white rounded-lg text-sm font-semibold hover:bg-navy/90 transition-colors"
        >
          Retour au site
        </Link>
      </div>
    </div>
  );
}
