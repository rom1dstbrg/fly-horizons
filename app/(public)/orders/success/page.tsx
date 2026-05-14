import Link from "next/link";
import { CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ClearCart } from "@/components/shop/ClearCart";

export default function OrderSuccessPage() {
  return (
    <main className="min-h-screen bg-gradient-navy pt-24 pb-16">
      <div className="container-shop max-w-lg">
        <div className="card-premium p-10 text-center space-y-6">

          <div className="w-16 h-16 rounded-full bg-green-500/10 border border-green-500/30 flex items-center justify-center mx-auto">
            <CheckCircle size={32} className="text-green-500" />
          </div>

          <div>
            <h1 className="text-2xl font-bold text-foreground mb-2">
              Commande confirmee !
            </h1>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Merci pour votre commande. Vous recevrez un email de confirmation
              avec tous les details.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            <Button
              asChild
              className="bg-primary text-primary-foreground hover:bg-gold-400 font-semibold"
            >
              <Link href="/orders">
                Voir mes commandes
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              className="border-border text-foreground hover:bg-secondary"
            >
              <Link href="/shop">
                Continuer mes achats
              </Link>
            </Button>
          </div>

        </div>
      </div>

      {/* Vide le panier cote client */}
      <ClearCart />
    </main>
  );
}