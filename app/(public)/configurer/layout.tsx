import { notFound } from "next/navigation";

// Masqué le 29/07/2026 en attendant confirmation DGTA/avocat sur le modèle légal
// (voir audit-legal-fly-horizons.html, point critique n°1) — code intact, pas supprimé.
export default function ConfigurerLayout({ children }: { children: React.ReactNode }) {
  notFound();
  return <>{children}</>;
}
