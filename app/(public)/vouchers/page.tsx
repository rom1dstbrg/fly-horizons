import { createClient } from "@/lib/supabase/server";
import { Gift, Mail, Calendar, ArrowRight } from "lucide-react";
import Link from "next/link";
import { VoucherBuyGrid } from "@/components/shop/VoucherBuyGrid";

export const metadata = {
  title: "Vouchers cadeaux — Fly Horizons",
  description: "Offrez un vol privé en avion léger. Le code est envoyé par email immédiatement après le paiement.",
};

const STEPS = [
  { icon: Gift,     step: "01", title: "Choisissez une durée",       desc: "Sélectionnez l'offre ci-dessous et ajoutez au panier." },
  { icon: Mail,     step: "02", title: "Recevez le code par email",  desc: "Un code unique envoyé immédiatement après le paiement." },
  { icon: Calendar, step: "03", title: "Le bénéficiaire réserve",    desc: "Il entre son code sur /reservation et choisit sa date." },
];

export default async function VouchersPage() {
  const supabase = await createClient();

  const { data: vols } = await supabase
    .from("products")
    .select("*, images:product_images(*)")
    .eq("active", true)
    .eq("product_type", "voucher")
    .order("voucher_duration_minutes", { ascending: true });

  return (
    <main className="bg-[#f5f5f7]">

      {/* ── Hero ── */}
      <div className="bg-[#0b2238] pt-[98px] pb-14 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-2.5 mb-5">
            <div className="w-8 h-8 rounded-xl bg-[#F2B705]/15 border border-[#F2B705]/25 flex items-center justify-center">
              <Gift size={15} className="text-[#F2B705]" />
            </div>
            <span className="text-[#F2B705] text-xs font-bold uppercase tracking-[3px]">Idée cadeau</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-white leading-tight mb-4">
            Offrez un vol<br className="hidden sm:block" /> inoubliable
          </h1>
          <p className="text-white/50 text-sm leading-relaxed max-w-sm">
            Un code cadeau envoyé par email immédiatement. Le bénéficiaire choisit sa date quand il le souhaite. Valable 12 mois.
          </p>
        </div>
      </div>

      {/* ── Comment ça marche ── */}
      <div className="bg-white border-b border-border">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-border">
            {STEPS.map(({ icon: Icon, step, title, desc }) => (
              <div key={step} className="flex items-start gap-4 py-6 sm:px-8 first:pl-0 last:pr-0">
                <div className="shrink-0 flex flex-col items-center gap-1.5 pt-0.5">
                  <span className="text-[10px] font-black text-[#F2B705] tracking-[2px]">{step}</span>
                  <div className="w-8 h-8 rounded-xl bg-[#f5f8ff] border border-[#dce8ff] flex items-center justify-center">
                    <Icon size={15} className="text-[#113356]" />
                  </div>
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground mb-0.5">{title}</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Offres ── */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">

        {(!vols || vols.length === 0) ? (
          <div className="text-center py-20 text-muted-foreground text-sm">Aucune offre disponible pour le moment.</div>
        ) : (
          <VoucherBuyGrid vols={vols} />
        )}

        {/* Pied de section */}
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-3 pt-6 border-t border-border">
          <p className="text-xs text-muted-foreground">
            Codes valables <strong className="text-foreground">12 mois</strong> à partir de la date d&apos;achat · Non remboursables
          </p>
          <Link href="/reservation" className="text-xs text-[#113356] font-semibold hover:underline flex items-center gap-1">
            Vous avez déjà un code ? Réservez ici <ArrowRight size={11} />
          </Link>
        </div>

      </div>

      {/* ── Vous voulez voler vous-même ? ── */}
      <div className="border-t border-border bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-7 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <p className="font-bold text-foreground text-sm">Vous voulez voler vous-même ?</p>
            <p className="text-xs text-muted-foreground mt-0.5">Réservez directement une date — confirmation avec votre numéro de référence.</p>
          </div>
          <Link
            href="/packs"
            className="shrink-0 inline-flex items-center gap-2 px-5 py-2.5 bg-[#113356] text-white rounded-xl text-sm font-semibold hover:bg-[#0b2238] transition-colors"
          >
            Voir nos vols <ArrowRight size={14} />
          </Link>
        </div>
      </div>

    </main>
  );
}
