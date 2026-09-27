// Estimation distance/durée d'une boucle EBCI → points → EBCI (même formule que
// /vol-sur-mesure) : vitesse de croisière 100 kt + 4 min d'observation par point.

export const EBCI_GEO = { lat: 50.4592, lng: 4.4538 };
const SPEED_KMH = 185.2;
const OBS_MIN_PER_POINT = 4;

export function calcRouteStats(
  wps: Array<{ lat: string | number; lng: string | number }>,
): { distKm: number; totalMin: number } | null {
  const valid = wps
    .map(wp => ({ lat: Number(wp.lat), lng: Number(wp.lng) }))
    .filter(wp => Number.isFinite(wp.lat) && Number.isFinite(wp.lng));
  if (!valid.length) return null;
  const pts = [EBCI_GEO, ...valid, EBCI_GEO];
  let dist = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1];
    const dLat = (b.lat - a.lat) * Math.PI / 180;
    const dLng = (b.lng - a.lng) * Math.PI / 180;
    const x = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * Math.PI / 180) * Math.cos(b.lat * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
    dist += 6371 * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
  }
  const distKm = Math.round(dist * 10) / 10;
  const transitMin = Math.round((distKm / SPEED_KMH) * 60);
  return { distKm, totalMin: transitMin + valid.length * OBS_MIN_PER_POINT };
}
