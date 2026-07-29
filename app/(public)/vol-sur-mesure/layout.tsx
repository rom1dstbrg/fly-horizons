import type { Metadata } from "next";
import { notFound } from "next/navigation";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://fly-horizons.com";

export const metadata: Metadata = {
  title: "Vol sur mesure",
  description:
    "Tracez votre propre itinéraire sur la carte et volez où vous voulez en Belgique. Prix calculé en temps réel au kilomètre, depuis l'aéroport de Charleroi (EBCI).",
  alternates: { canonical: `${siteUrl}/vol-sur-mesure` },
};

// Masqué le 29/07/2026 en attendant confirmation DGTA/avocat sur le modèle légal
// (voir audit-legal-fly-horizons.html, point critique n°1) — code intact, pas supprimé.
export default function VolSurMesureLayout({ children }: { children: React.ReactNode }) {
  notFound();
  return <>{children}</>;
}
