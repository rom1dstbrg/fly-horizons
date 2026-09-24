"use client";

import { Plus, Route, WifiOff, ChevronDown } from "lucide-react";
import { Button, ButtonLabel, ChoiceMenu } from "@/components/pilote/studio";


// Les 3 façons de créer un vol, décrites (audit UX du 19/09) : un seul bouton
// qui ouvre un menu plutôt que 3 boutons nus. Libellés repris de
// components/admin/VolsPageActions.tsx pour garder un seul vocabulaire.
export const NEW_FLIGHT_CHOICES = [
  { href: "/pilote/reservations/new", icon: Plus, label: "Nouvelle réservation", desc: "Un client vous a contacté (téléphone, email) pour un vol standard." },
  { href: "/pilote/reservations/new-mesure", icon: Route, label: "Vol sur mesure", desc: "Itinéraire et prix que vous construisez vous-même pour un client." },
  { href: "/pilote/reservations/new-horsite", icon: WifiOff, label: "Hors site", desc: "Vol déjà convenu ailleurs (Messenger, téléphone...), à enregistrer pour votre historique." },
] as const;

export function PiloteVolsActions({ variant = "primary" }: { variant?: "primary" | "secondary" }) {
  return (
    <ChoiceMenu
      title="Nouveau vol"
      choices={NEW_FLIGHT_CHOICES}
      trigger={(props) => (
        <Button variant={variant} {...props}>
          <Plus />
          <ButtonLabel full="Nouveau vol" short="Ajouter" />
          <ChevronDown className="max-sm:hidden" />
        </Button>
      )}
    />
  );
}
