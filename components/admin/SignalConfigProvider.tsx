"use client";

import { setSignalConfig, type SignalConfig } from "@/lib/reservation-signals";

// Installe les seuils de signaux choisis dans Paramètres pour tous les composants
// clients de l'espace (liste Réservations, tiroir, fiche client). Rendu avant les
// enfants : ils lisent déjà la bonne configuration au premier affichage.
export function SignalConfigProvider({ value, children }: { value: SignalConfig; children: React.ReactNode }) {
  setSignalConfig(value);
  return <>{children}</>;
}
