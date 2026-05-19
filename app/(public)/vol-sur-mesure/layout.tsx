import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Vol sur mesure",
  description:
    "Tracez votre propre itinéraire sur la carte et volez où vous voulez en Belgique. Prix calculé en temps réel au kilomètre, depuis l'aéroport de Charleroi (EBCI).",
};

export default function VolSurMesureLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
