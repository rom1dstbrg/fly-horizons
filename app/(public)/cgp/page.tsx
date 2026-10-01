import type { Metadata } from "next";
import { LegalDoc } from "@/components/legal/LegalDoc";
import { CGP_META, CGP_NOTICE, CGP_SECTIONS } from "./content";

export const metadata: Metadata = {
  title: "Conditions générales de participation",
  description:
    "Les règles de participation aux vols en partage de frais publiés sur fly-horizons.com : demande, paiement direct au pilote, report, annulation, assurance.",
};

export default function CgpPage() {
  return (
    <LegalDoc
      eyebrow="Légal"
      title="Conditions générales de participation."
      intro="Les règles qui s'appliquent quand vous demandez à rejoindre un vol publié par un pilote sur Fly Horizons."
      meta={CGP_META}
      notice={CGP_NOTICE}
      sections={CGP_SECTIONS}
      footer={{
        title: "Une question sur ces conditions ?",
        text: "Écrivez-nous : une personne vous répond sous 24 h.",
        href: "/contact",
        cta: "Nous écrire",
      }}
    />
  );
}
