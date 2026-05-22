import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Comment ça marche — Fly Horizons",
  description:
    "Réservation, expérience à bord, espace aérien belge : tout ce qu'il faut savoir avant de voler avec Fly Horizons depuis Charleroi.",
};

export default function GuideLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
