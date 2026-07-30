import type { Metadata } from "next";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://fly-horizons.com";

export const metadata: Metadata = {
  title: "FAQ, vol partagé · Questions fréquentes",
  description:
    "Questions fréquentes sur les vols partagés Fly Horizons : départ de Charleroi, durées disponibles, sécurité, conditions météo, tarifs et réservation.",
  alternates: { canonical: `${siteUrl}/faq` },
};

export default function FaqLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
