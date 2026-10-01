import type { Metadata } from "next";
import { LegalDoc } from "@/components/legal/LegalDoc";
import { PRIVACY_META, PRIVACY_NOTICE, PRIVACY_SECTIONS } from "./content";

export const metadata: Metadata = {
  title: "Politique de confidentialité",
  description:
    "Quelles données Fly Horizons collecte, pourquoi, qui les reçoit, combien de temps elles sont conservées et comment exercer vos droits (RGPD).",
  robots: { index: true, follow: true },
};

export default function PolitiqueConfidentialitePage() {
  return (
    <LegalDoc
      eyebrow="Légal"
      title="Politique de confidentialité."
      intro="Ce que nous collectons, pourquoi, qui le reçoit, combien de temps nous le gardons, et comment faire valoir vos droits."
      meta={PRIVACY_META}
      notice={PRIVACY_NOTICE}
      sections={PRIVACY_SECTIONS}
      footer={{
        title: "Une question sur vos données ?",
        text: "Écrivez-nous : nous répondons dans un délai maximum d'un mois, le plus souvent bien plus vite.",
        href: "/contact",
        cta: "Nous écrire",
      }}
    />
  );
}
