import { notFound } from "next/navigation";

// Masqué le 30/07/2026 : arrêt de la vente publique de vouchers (voir audit-legal-fly-horizons.html,
// point critique n°1, checklist c1b) — code intact, pas supprimé. La réservation se fait maintenant
// directement via /reservation, sans passer par un checkout panier.
export default function CheckoutLayout({ children }: { children: React.ReactNode }) {
  notFound();
  return <>{children}</>;
}
