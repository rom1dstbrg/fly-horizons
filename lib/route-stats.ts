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

// Points « techniques » probables (27/09) : le client voit les points comme le
// programme du vol, donc seuls les lieux survolés devraient y être. Premier ou
// dernier point à moins de 15 km d'EBCI = presque toujours un point de sortie /
// d'entrée de la CTR (au milieu de la route, un lieu proche reste plausible) ;
// tronçon de moins de 8 km = un point pour contourner une zone.
const NEAR_EBCI_KM = 15;
const SHORT_LEG_KM = 8;

function distKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const dLat = (b.lat - a.lat) * Math.PI / 180;
  const dLng = (b.lng - a.lng) * Math.PI / 180;
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * Math.PI / 180) * Math.cos(b.lat * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

export type SuspectPoint =
  | { index: number; reason: "ebci"; km: number }
  | { index: number; reason: "court"; km: number; prev: number };

/** Index (dans l'ordre donné) des points qui ressemblent à des points techniques. */
export function suspectPoints(wps: Array<{ lat: string | number; lng: string | number }>): SuspectPoint[] {
  const pts = wps.map(wp => ({ lat: Number(wp.lat), lng: Number(wp.lng) }));
  const out: SuspectPoint[] = [];
  pts.forEach((p, i) => {
    if (!Number.isFinite(p.lat) || !Number.isFinite(p.lng)) return;
    const dEbci = distKm(EBCI_GEO, p);
    const bout = i === 0 || i === pts.length - 1;
    if (bout && dEbci < NEAR_EBCI_KM) {
      out.push({ index: i, reason: "ebci", km: Math.round(dEbci) });
      return;
    }
    const prev = pts[i - 1];
    if (i > 0 && Number.isFinite(prev.lat) && Number.isFinite(prev.lng)) {
      const d = distKm(prev, p);
      if (d < SHORT_LEG_KM) out.push({ index: i, reason: "court", km: Math.round(d * 10) / 10, prev: i - 1 });
    }
  });
  return out;
}
