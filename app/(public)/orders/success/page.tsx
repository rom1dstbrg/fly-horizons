import Link from "next/link";
import { CheckCircle, Package } from "lucide-react";
import { ClearCart } from "@/components/shop/ClearCart";

export default function OrderSuccessPage() {
  return (
    <main className="flex-1 flex items-center justify-center bg-gradient-navy px-4 pt-[86px] pb-16">
      <div className="max-w-md w-full space-y-3">

        {/* ── Confirmation ── */}
        <div className="card-premium p-8 text-center">
          <div className="w-14 h-14 rounded-2xl bg-navy flex items-center justify-center mx-auto mb-5">
            <CheckCircle size={26} className="text-primary" />
          </div>
          <h1 className="text-2xl font-black text-foreground leading-tight mb-2">
            Commande confirmée !
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Merci pour votre commande. Vous recevrez un email de confirmation avec tous les détails.
          </p>
        </div>

        {/* ── Prochaines étapes ── */}
        <div className="card-premium p-6 space-y-4">
          <p className="text-[10px] font-black text-primary uppercase tracking-[3px]">
            Prochaines étapes
          </p>

          <div className="flex items-start gap-3">
            <div className="w-7 h-7 rounded-full bg-navy flex items-center justify-center shrink-0 mt-0.5">
              <CheckCircle size={13} className="text-primary" />
            </div>
            <div className="pt-0.5">
              <p className="text-sm font-bold text-foreground">Commande reçue</p>
              <p className="text-xs text-muted-foreground mt-0.5">Un email de confirmation vous a été envoyé.</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center shrink-0 mt-0.5">
              <span className="font-black text-primary-foreground text-xs leading-none">2</span>
            </div>
            <div className="pt-0.5">
              <p className="text-sm font-bold text-foreground">Vos codes de vol</p>
              <p className="text-xs text-muted-foreground mt-0.5">Disponibles dans votre espace client dès validation de la commande.</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center shrink-0 mt-0.5">
              <span className="font-black text-primary-foreground text-xs leading-none">3</span>
            </div>
            <div className="pt-0.5">
              <p className="text-sm font-bold text-foreground">Utilisez votre code</p>
              <p className="text-xs text-muted-foreground mt-0.5">Réservez votre vol en saisissant votre code lors de la réservation.</p>
            </div>
          </div>
        </div>

        {/* ── CTAs ── */}
        <div className="flex flex-col gap-2.5 pt-1">
          <Link
            href="/account#orders"
            className="inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-primary text-primary-foreground rounded-lg text-sm font-black hover:brightness-105 active:scale-[0.98] transition-all shadow-gold"
          >
            <Package size={15} />
            Voir mes commandes
          </Link>
          <Link
            href="/"
            className="inline-flex items-center justify-center px-6 py-2.5 rounded-lg border border-border text-sm font-medium text-muted-foreground hover:text-foreground hover:border-foreground/20 transition-colors"
          >
            Retour à l&apos;accueil
          </Link>
        </div>

      </div>

      <ClearCart />
    </main>
  );
}
