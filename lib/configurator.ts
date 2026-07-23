export interface ConfiguratorWaypoint {
  nom: string;
  lat: number;
  lng: number;
}

/**
 * Génère l'URL du configurateur avec les waypoints encodés.
 * Format : /configurer?wp=Nom,lat,lng&wp=Nom2,lat2,lng2
 * Le nom peut contenir des virgules — lat et lng sont toujours les deux derniers segments.
 */
export function configuratorUrl(waypoints: ConfiguratorWaypoint[] = []): string {
  if (waypoints.length === 0) return "/configurer";
  const params = new URLSearchParams();
  waypoints.forEach(w => params.append("wp", `${w.nom},${w.lat},${w.lng}`));
  return `/configurer?${params.toString()}`;
}
