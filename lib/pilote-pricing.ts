export function calculerPrixClient(
  prixHeure: number,
  dureeMinutes: number,
  partType: "pourcentage" | "montant",
  partValeur: number
): number {
  const coutTotal = prixHeure * (dureeMinutes / 60);
  const partPilote = partType === "pourcentage" ? coutTotal * (partValeur / 100) : partValeur;
  return Math.max(0, Math.round((coutTotal - partPilote) * 100) / 100);
}
