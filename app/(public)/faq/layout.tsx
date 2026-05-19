import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "FAQ",
  description:
    "Questions fréquentes sur les baptêmes de l'air Fly Horizons — départ de Charleroi, durées disponibles, sécurité, conditions météo, tarifs et réservation.",
};

export default function FaqLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
