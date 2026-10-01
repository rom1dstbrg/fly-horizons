import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";

export const metadata = { title: "Désinscription newsletter", robots: { index: false } };

// Nouvelle DA (01/10) : même langage que les autres pages de confirmation (pastille dorée, titre, texte, un lien),
// sans card centrée. La désinscription reste immédiate à l'ouverture du lien (comportement inchangé).
const mailLink = "font-semibold text-[#0b2238] underline decoration-[#0b2238]/25 underline-offset-[3px] hover:decoration-primary transition-colors";
const Mail = () => <a href="mailto:info@fly-horizons.com" className={mailLink}>info@fly-horizons.com</a>;

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
      .maybeSingle();

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
    <main className="min-h-screen bg-white">
      <section className="pt-page pb-24 lg:pb-32">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 xl:px-10">
          {isOk ? (
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-primary text-[#0b2238]">
              <Check size={20} strokeWidth={2.5} />
            </div>
          ) : (
            <p className="text-[11px] font-bold text-primary uppercase tracking-[3px] mb-3">Newsletter</p>
          )}

          <h1 className="text-[32px] lg:text-[44px] font-black text-foreground leading-[1.08] lg:leading-[1.04] tracking-[-0.02em] mb-3">
            {status === "success" && "Vous êtes désinscrit."}
            {status === "already" && "Déjà désinscrit."}
            {status === "invalid" && "Lien invalide."}
            {status === "missing" && "Lien incomplet."}
          </h1>

          <p className="max-w-[520px] text-base leading-[1.7] text-foreground/80">
            {status === "success" && "Cette adresse ne recevra plus la newsletter de Fly Horizons. Vous pouvez vous réinscrire à tout moment depuis le bas de n'importe quelle page du site."}
            {status === "already" && "Cette adresse ne reçoit déjà plus notre newsletter. Il n'y a rien d'autre à faire."}
            {status === "invalid" && <>Ce lien de désinscription n&apos;est pas valide. Écrivez-nous à <Mail /> et nous vous retirons de la liste.</>}
            {status === "missing" && <>Utilisez le lien de désinscription présent dans l&apos;email que vous avez reçu, ou écrivez-nous à <Mail />.</>}
          </p>

          <Link
            href="/"
            className="mt-6 inline-flex items-center gap-1.5 text-sm font-bold text-[#0b2238] underline decoration-[#0b2238]/25 underline-offset-4 hover:decoration-primary transition-colors"
          >
            Retour au site
            <ArrowRight size={14} />
          </Link>
        </div>
      </section>
    </main>
  );
}
