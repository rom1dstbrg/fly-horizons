type GeoPoint = { lat: number; lng: number };

function haversine(a: GeoPoint, b: GeoPoint): number {
  const R = 6371;
  const dLat = (b.lat - a.lat) * Math.PI / 180;
  const dLng = (b.lng - a.lng) * Math.PI / 180;
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(a.lat * Math.PI / 180) * Math.cos(b.lat * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

function nearestNeighbor(pts: GeoPoint[], start: GeoPoint): number[] {
  if (!pts.length) return [];
  const unvisited = pts.map((_, i) => i);
  const order: number[] = [];
  let cur: GeoPoint = start;
  while (unvisited.length) {
    let bestPos = 0, bestD = Infinity;
    unvisited.forEach((idx, pos) => {
      const d = haversine(cur, pts[idx]);
      if (d < bestD) { bestD = d; bestPos = pos; }
    });
    const chosen = unvisited.splice(bestPos, 1)[0];
    order.push(chosen);
    cur = pts[chosen];
  }
  return order;
}

function twoOpt(route: GeoPoint[]): GeoPoint[] {
  let best = [...route];
  let improved = true;
  while (improved) {
    improved = false;
    outer: for (let i = 0; i < best.length - 2; i++) {
      for (let j = i + 2; j < best.length - 1; j++) {
        const d1 = haversine(best[i], best[i + 1]) + haversine(best[j], best[j + 1]);
        const d2 = haversine(best[i], best[j]) + haversine(best[i + 1], best[j + 1]);
        if (d2 < d1 - 1e-10) {
          best = [...best.slice(0, i + 1), ...best.slice(i + 1, j + 1).reverse(), ...best.slice(j + 1)];
          improved = true;
          break outer;
        }
      }
    }
  }
  return best;
}

function orOpt(route: GeoPoint[]): GeoPoint[] {
  let best = [...route];
  let improved = true;
  while (improved) {
    improved = false;
    for (let i = 1; i < best.length - 1; i++) {
      const pt = best[i];
      const without = [...best.slice(0, i), ...best.slice(i + 1)];
      const removeSave =
        haversine(best[i - 1], pt) + haversine(pt, best[i + 1])
        - haversine(best[i - 1], best[i + 1]);
      let bestGain = 1e-10;
      let bestJ = -1;
      for (let j = 1; j < without.length; j++) {
        const insertCost =
          haversine(without[j - 1], pt) + haversine(pt, without[j])
          - haversine(without[j - 1], without[j]);
        const gain = removeSave - insertCost;
        if (gain > bestGain) { bestGain = gain; bestJ = j; }
      }
      if (bestJ !== -1) {
        best = [...without.slice(0, bestJ), pt, ...without.slice(bestJ)];
        improved = true;
        break;
      }
    }
  }
  return best;
}

const EBCI: GeoPoint = { lat: 50.4592, lng: 4.4538 };

/**
 * Returns the waypoints reordered using nearest-neighbor + 2-opt + or-opt,
 * starting and ending at EBCI. The input/output arrays have the same elements,
 * only the order changes.
 */
export function optimizeWaypoints<T extends GeoPoint>(pts: T[]): T[] {
  if (pts.length <= 1) return pts;
  const order = nearestNeighbor(pts, EBCI);
  const base: GeoPoint[] = [EBCI, ...order.map(i => pts[i]), EBCI];
  const optimized = twoOpt(orOpt(base));
  // Strip EBCI from both ends and map back to original items
  const interior = optimized.slice(1, -1);
  return interior.map(pt => {
    const found = pts.find(p => Math.abs(p.lat - pt.lat) < 1e-9 && Math.abs(p.lng - pt.lng) < 1e-9);
    return found ?? (pts[0] as T);
  });
}
