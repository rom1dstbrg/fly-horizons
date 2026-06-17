"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { union } from "@turf/union";
import { polygon as turfPoly, featureCollection } from "@turf/helpers";

// ── Public types ───────────────────────────────────────────────
export interface POI { id: string; lat: number; lng: number; nom: string }

export interface AdventureRouteData {
  pois:       POI[];
  distKm:     number;
  transitMin: number;
  obsMin:     number;
  totalMin:   number;
}

export interface AdventureMapHandle {
  clearAll:       () => void;
  addPOI:         (poi: POI) => void;
  removePOI:      (id: string) => void;
  fitBounds:      () => void;
  invalidateSize: () => void;
}

export type StyleMode = "vues" | "rapide";

// ── Constants ──────────────────────────────────────────────────
const DEPART:         { lat: number; lng: number } = { lat: 50.4592, lng: 4.4538 };
const SPEED_KMH       = 185.2;
const OBS_MIN_RAPIDE  = 4;  // +2 min/point vs ancienne valeur — circuit d'observation
const OBS_MIN_VUES    = 6;  // panoramique : 2 min de plus par point pour bien profiter
const OBS_RADIUS_M    = 1500;

// ── Geo types ──────────────────────────────────────────────────
type Pt = { lat: number; lng: number };

// ── Haversine ─────────────────────────────────────────────────
function haversine(a: Pt, b: Pt): number {
  const R = 6371;
  const dLat = (b.lat - a.lat) * Math.PI / 180;
  const dLng = (b.lng - a.lng) * Math.PI / 180;
  const x = Math.sin(dLat / 2) ** 2
    + Math.cos(a.lat * Math.PI / 180) * Math.cos(b.lat * Math.PI / 180)
    * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

// ── Route optimisation (nearest-neighbor + 2-opt) ─────────────
function nearestNeighbor(pts: Pt[]): number[] {
  const unvisited = pts.map((_, i) => i);
  const order: number[] = [];
  let cur: Pt = DEPART;
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

function twoOpt(route: Pt[]): Pt[] {
  let best = [...route];
  let improved = true;
  while (improved) {
    improved = false;
    for (let i = 0; i < best.length - 2; i++) {
      for (let j = i + 2; j < best.length - 1; j++) {
        const d1 = haversine(best[i], best[i + 1]) + haversine(best[j], best[j + 1]);
        const d2 = haversine(best[i], best[j])     + haversine(best[i + 1], best[j + 1]);
        if (d2 < d1 - 1e-10) {
          best = [
            ...best.slice(0, i + 1),
            ...best.slice(i + 1, j + 1).reverse(),
            ...best.slice(j + 1),
          ];
          improved = true; break;
        }
      }
      if (improved) break;
    }
  }
  return best;
}

function optimizeRoute(pts: Pt[]): Pt[] {
  if (!pts.length) return [DEPART, DEPART];
  const order = nearestNeighbor(pts);
  return twoOpt([DEPART, ...order.map(i => pts[i]), DEPART]);
}

// ── Gentle wave ────────────────────────────────────────────────
/**
 * Ajoute une légère oscillation sinusoïdale à chaque segment pour
 * casser l'effet "segment droit parfait" sans s'éloigner du trajet réel.
 *
 * Chaque segment est subdivisé en `steps` sous-points.
 * En chaque point, un décalage perpendiculaire suit sin(π·t) :
 * le tracé part du waypoint, dévie légèrement au milieu, et revient
 * exactement au waypoint suivant. Le signe alterne d'un segment à l'autre
 * pour un aspect naturel.
 *
 * amplitude : fraction de la longueur du segment (ex. 0.03 = 3 %)
 *             → pour un segment de 50 km, déviation max ≈ 1.5 km.
 */
function gentleWave(route: Pt[], amplitude: number, steps = 10): Pt[] {
  if (route.length < 2) return route;
  const result: Pt[] = [];

  for (let i = 0; i < route.length - 1; i++) {
    result.push(route[i]);

    const A = route[i], B = route[i + 1];
    const dlat = B.lat - A.lat, dlng = B.lng - A.lng;
    const len  = Math.sqrt(dlat * dlat + dlng * dlng);
    if (len < 1e-9) continue;

    // Vecteur perpendiculaire unitaire
    const perpLat = -dlng / len;
    const perpLng =  dlat / len;
    const amp  = len * amplitude;
    const sign = i % 2 === 0 ? 1 : -1; // alternance gauche / droite

    for (let s = 1; s < steps; s++) {
      const t = s / steps;
      const offset = sign * amp * Math.sin(Math.PI * t); // demi-sinus
      result.push({
        lat: A.lat + t * dlat + offset * perpLat,
        lng: A.lng + t * dlng + offset * perpLng,
      });
    }
  }

  result.push(route[route.length - 1]);
  return result;
}

// ── Zones restreintes — helpers ───────────────────────────────
interface RestrictedZone { name: string; poly: [number, number][] }

function deg2rad(d: number) { return (d * Math.PI) / 180; }

/**
 * Génère des points le long d'un arc de cercle géodésique.
 * cLat/cLng : centre (degrés décimaux)
 * radiusM   : rayon en mètres
 * startBrg/endBrg : relèvements (degrés, Nord=0°, sens horaire)
 * clockwise : sens de parcours
 */
function arcPoints(
  cLat: number, cLng: number, radiusM: number,
  startBrg: number, endBrg: number, clockwise: boolean,
  steps = 32
): [number, number][] {
  const R = 6371000;
  const d = radiusM / R;
  const φ1 = deg2rad(cLat);
  const λ1 = deg2rad(cLng);
  const sweep = clockwise
    ? (endBrg >= startBrg ? endBrg - startBrg : endBrg + 360 - startBrg)
    : (startBrg >= endBrg ? startBrg - endBrg : startBrg + 360 - endBrg);

  return Array.from({ length: steps + 1 }, (_, i) => {
    const brg = deg2rad(((clockwise
      ? startBrg + (sweep * i) / steps
      : startBrg - (sweep * i) / steps) + 720) % 360);
    const φ2 = Math.asin(
      Math.sin(φ1) * Math.cos(d) + Math.cos(φ1) * Math.sin(d) * Math.cos(brg)
    );
    const λ2 = λ1 + Math.atan2(
      Math.sin(brg) * Math.sin(d) * Math.cos(φ1),
      Math.cos(d) - Math.sin(φ1) * Math.sin(φ2)
    );
    return [(φ2 * 180) / Math.PI, (λ2 * 180) / Math.PI] as [number, number];
  });
}

/** Ray-casting — point dans polygone [[lat, lng], …] */
function pointInPolygon(lat: number, lng: number, poly: [number, number][]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [yi, xi] = poly[i], [yj, xj] = poly[j];
    if (yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi)
      inside = !inside;
  }
  return inside;
}

/** [lat,lng][] → Turf ring [lng,lat][], anneau fermé */
function toTurfRing(ring: [number, number][]): [number, number][] {
  const r = ring.map(([lat, lng]): [number, number] => [lng, lat]);
  if (r[0][0] !== r[r.length - 1][0] || r[0][1] !== r[r.length - 1][1]) r.push(r[0]);
  return r;
}

/** Union de toutes les zones restreintes → polygones sans overlap */
function mergeRestrictedZones(zones: RestrictedZone[]): { rings: [number, number][][] }[] {
  const features = zones.map(z => turfPoly([toTurfRing(z.poly as [number, number][])]));
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const merged: any = union(featureCollection(features));
  if (!merged) return [];
  const ll = (r: number[][]): [number, number][] => r.map(([lng, lat]) => [lat, lng]);
  if (merged.geometry.type === "Polygon") {
    return [{ rings: merged.geometry.coordinates.map(ll) }];
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return merged.geometry.coordinates.map((poly: any) => ({ rings: poly.map(ll) }));
}

// ── Zones restreintes définies manuellement ───────────────────
//
// EBR01 — BRUSSELS CITY  (source : AIP Belgique)
// Arc 1 : r=0.8 NM (1482 m), centre 505311N 0042130E
//   de 505311N 0042013E (relèvement 270°) à 505316N 0042247E (84.1°), horaire
// Arc 2 : r=2.7 NM (5002 m), centre 505039N 0042142E
//   de 505316N 0042247E (14.65°) à 505311N 0042013E (339.7°), horaire
//
const RESTRICTED_ZONES: RestrictedZone[] = [
  {
    // EBR01 — BRUSSELS CITY (source : AIP Belgique)
    // Arc 1 : r=0.8 NM (1482 m), centre 505311N 0042130E — de 270° à 84.1°, horaire
    // Arc 2 : r=2.7 NM (5002 m), centre 505039N 0042142E — de 14.65° à 339.7°, horaire
    name: "EBR01 : Bruxelles Ville",
    poly: [
      ...arcPoints(50.886389, 4.358333, 1482,  270,   84.1, true, 20),
      ...arcPoints(50.844167, 4.361667, 5002,  14.65, 339.7, true, 40),
    ],
  },
  {
    // EBR02 — ROYAL ESTATE OF CIERGNON
    // Cercle r=0.8 NM (1482 m), centre 500958N 0050628E
    name: "EBR02 : Domaine royal de Ciergnon",
    poly: arcPoints(50.166111, 5.107778, 1482, 0, 359.99, true, 48),
  },
  {
    // EBR03 — DIEST
    // Cercle r=3 NM (5556 m), centre 505957N 0050355E
    name: "EBR03 : Diest",
    poly: arcPoints(50.999167, 5.065278, 5556, 0, 359.99, true, 48),
  },
  {
    // EBR04 — ELSENBORN 01
    // 503117N 0061200E — (frontière BE-DE) — 502557N 0062234E — 502557N 0060956E — 502657N 0060841E
    name: "EBR04 : Elsenborn",
    poly: [
      [50.521389, 6.200000],
      [50.432500, 6.376111],
      [50.432500, 6.165556],
      [50.449167, 6.144722],
    ],
  },
  {
    // EBR05A — HELCHTEREN
    // 510723N 0053455E — 510157N 0053455E — 505929N 0051951E — 510452N 0051951E — 510557N 0052255E
    name: "EBR05A : Helchteren",
    poly: [
      [51.123056, 5.581944],
      [51.032500, 5.581944],
      [50.991389, 5.330833],
      [51.081111, 5.330833],
      [51.099167, 5.381944],
    ],
  },
  {
    // EBR05B — HELCHTEREN RUN-IN
    // 510805N 0055036E — (frontière BE-NL) — 510333N 0054619E — 510157N 0053455E — 510607N 0053455E
    name: "EBR05B : Helchteren Run-In",
    poly: [
      [51.134722, 5.843333],
      [51.059167, 5.771944],
      [51.032500, 5.581944],
      [51.101944, 5.581944],
    ],
  },
  {
    // EBR05C — HELCHTEREN DOWNWIND
    // 510333N 0054619E — (BE-NL) — 505655N 0054502E — 505528N 0053207E — 505530N 0052752E — 505533N 0051951E — 505929N 0051951E — 510157N 0053455E
    name: "EBR05C : Helchteren Downwind",
    poly: [
      [51.059167, 5.771944],
      [50.948611, 5.750556],
      [50.924444, 5.535278],
      [50.925000, 5.464444],
      [50.925833, 5.330833],
      [50.991389, 5.330833],
      [51.032500, 5.581944],
    ],
  },
  {
    // EBR05D — HELCHTEREN LOFT
    // 505929N 0051951E — 510157N 0053455E — 505547N 0053455E — 505528N 0053207E — 505530N 0052754E
    name: "EBR05D : Helchteren Loft",
    poly: [
      [50.991389, 5.330833],
      [51.032500, 5.581944],
      [50.929722, 5.581944],
      [50.924444, 5.535278],
      [50.925000, 5.465000],
    ],
  },
  {
    // EBR05E — HELCHTEREN MEDIUM LEVEL
    // 505929N 0051951E — 510157N 0053455E — 511015N 0053455E — 510838N 0052127E — 510557N 0051658E — 510057N 0051655E
    name: "EBR05E : Helchteren Medium Level",
    poly: [
      [50.991389, 5.330833],
      [51.032500, 5.581944],
      [51.170833, 5.581944],
      [51.143889, 5.357500],
      [51.099167, 5.282778],
      [51.015833, 5.281944],
    ],
  },
  {
    // EBR05F — HELCHTEREN STRAFING (même emprise que EBR05D)
    // 505929N 0051951E — 510157N 0053455E — 505547N 0053455E — 505528N 0053207E — 505530N 0052754E
    name: "EBR05F : Helchteren Strafing",
    poly: [
      [50.991389, 5.330833],
      [51.032500, 5.581944],
      [50.929722, 5.581944],
      [50.924444, 5.535278],
      [50.925000, 5.465000],
    ],
  },
  {
    // EBR06A — FLORENNES (noyau, hors OPR HR)
    // Cercle r=2 NM (3704 m), centre 501436N 0043845E
    name: "EBR06A : Florennes (2 NM)",
    poly: arcPoints(50.243333, 4.645833, 3704, 0, 359.99, true, 48),
  },
  {
    // EBR06B — FLORENNES (zone élargie, HX)
    // Cercle r=5 NM (9260 m), même centre
    name: "EBR06B : Florennes (5 NM)",
    poly: arcPoints(50.243333, 4.645833, 9260, 0, 359.99, true, 48),
  },
  {
    // EBR07A — KLEINE-BROGEL (noyau, hors OPR HR)
    // Cercle r=2 NM (3704 m), centre 511006N 0052812E
    name: "EBR07A : Kleine-Brogel (2 NM)",
    poly: arcPoints(51.168333, 5.470000, 3704, 0, 359.99, true, 48),
  },
  {
    // EBR07B — KLEINE-BROGEL (zone élargie, HX)
    // Cercle r=5 NM (9260 m), même centre
    name: "EBR07B : Kleine-Brogel (5 NM)",
    poly: arcPoints(51.168333, 5.470000, 9260, 0, 359.99, true, 48),
  },
  {
    // EBR08 — KOKSIJDE (aérodrome militaire)
    // Cercle r=2.5 NM (4630 m), centre 510525N 0023910E
    name: "EBR08 : Koksijde",
    poly: arcPoints(51.090278, 2.652778, 4630, 0, 359.99, true, 48),
  },
  {
    // EBR10 — BEAUVECHAIN (aérodrome militaire)
    // Cercle r=2 NM (3704 m), centre 504528N 0044601E
    name: "EBR10 : Beauvechain",
    poly: arcPoints(50.757778, 4.766944, 3704, 0, 359.99, true, 48),
  },
  {
    // EBR11 — TIHANGE (installation nucléaire)
    // Cercle r=1 NM (1852 m), centre 503203N 0051625E
    name: "EBR11 : Tihange",
    poly: arcPoints(50.534167, 5.273611, 1852, 0, 359.99, true, 48),
  },
  {
    // EBR12 — CHIEVRES (aérodrome militaire)
    // Cercle r=2 NM (3704 m), centre 503433N 0034952E
    name: "EBR12 : Chièvres",
    poly: arcPoints(50.575833, 3.831111, 3704, 0, 359.99, true, 48),
  },
  {
    // EBR17B — LOMBARDSIJDE SECTOR BRAVO (zone de tir côtière, inclut EBR17A)
    // 510907N 0024349E - 511139N 0023503E - arc r=7.5 NM CW centre 510839N 0024601E
    //   → 511602N 0024819E - 511008N 0024631E
    // Brg centre→from ≈305°, brg centre→to ≈9°, sweep 64° CW
    name: "EBR17B : Lombardsijde",
    poly: [
      [51.15194, 2.73028],
      ...arcPoints(51.14417, 2.76694, 13890, 305, 9, true, 12),
      [51.16889, 2.77528],
    ],
  },
  {
    // EBR19 — MARCHE-EN-FAMENNE (zone de tir, actif lun-ven)
    // 501820N 0052340E - 501642N 0052625E - 501506N 0052422E
    //   - 501358N 0052105E - 501418N 0052046E - 501717N 0052059E
    name: "EBR19 : Marche-en-Famenne",
    poly: [
      [50.30556, 5.39444],
      [50.27833, 5.44028],
      [50.25167, 5.40611],
      [50.23278, 5.35139],
      [50.23833, 5.34611],
      [50.28806, 5.34972],
    ],
  },
  {
    // EBR20 — BRASSCHAAT (zone de tir, HX)
    // 511827N 0043155E - 511857N 0043055E - 511957N 0043155E
    //   - 512327N 0043655E - 512217N 0043855E
    name: "EBR20 : Brasschaat",
    poly: [
      [51.30750, 4.53194],
      [51.31583, 4.51528],
      [51.33250, 4.53194],
      [51.39083, 4.61528],
      [51.37139, 4.64861],
    ],
  },
  {
    // EBR22 — CASTEAU / SHAPE (OTAN, PERM)
    // Cercle r=4 NM (7408 m), centre 502957N 0035855E
    name: "EBR22 : Casteau / SHAPE",
    poly: arcPoints(50.49917, 3.98194, 7408, 0, 359.99, true, 48),
  },
  {
    // EBR23 — DOEL (installation nucléaire, PERM)
    // Cercle r=1 NM (1852 m), centre 511930N 0041532E
    name: "EBR23 : Doel",
    poly: arcPoints(51.32500, 4.25889, 1852, 0, 359.99, true, 48),
  },
  {
    // EBR31 — WESTROZEBEKE-HOUTHULST (destruction explosifs, PERM)
    // Cercle r=1.2 NM (2222 m), centre 505752N 0025735E
    name: "EBR31 : Westrozebeke",
    poly: arcPoints(50.96444, 2.95972, 2222, 0, 359.99, true, 48),
  },
  {
    // EBR41A — LAGLAND-ARLON (zone de tir, lun-ven)
    // 493901N 0054000E - 494053N 0054438E - 493939N 0054601E - 493745N 0054236E
    name: "EBR41A : Lagland-Arlon (A)",
    poly: [
      [49.65028, 5.66667],
      [49.68139, 5.74389],
      [49.66083, 5.76694],
      [49.62917, 5.71000],
    ],
  },
  {
    // EBR41B — LAGLAND-ARLON (zone de tir élargie)
    // 493901N 0053945E - 494111N 0054259E - 494114N 0054724E
    //   - 493939N 0054601E - 493745N 0054236E
    name: "EBR41B : Lagland-Arlon (B)",
    poly: [
      [49.65028, 5.66250],
      [49.68639, 5.71639],
      [49.68722, 5.79000],
      [49.66083, 5.76694],
      [49.62917, 5.71000],
    ],
  },
  {
    // EBR42 — BEVERLO 01 (zone de tir, fréquemment actif)
    // 510927N 0051530E - 510927N 0052125E - 510737N 0052125E - 510703N 0051530E
    name: "EBR42 : Beverlo 01",
    poly: [
      [51.15750, 5.25833],
      [51.15750, 5.35694],
      [51.12694, 5.35694],
      [51.11750, 5.25833],
    ],
  },
  {
    // EBR45 — BEVERLO 02 (démolition explosifs, HX)
    // Cercle r=0.5 NM (926 m), centre 510438N 0052046E
    name: "EBR45 : Beverlo 02",
    poly: arcPoints(51.07722, 5.34611, 926, 0, 359.99, true, 32),
  },
  {
    // EBR49 — ZUTENDAAL (fabrique cartouches + tir, PERM)
    // Cercle r=0.5 NM (926 m), centre 505646N 0053603E
    name: "EBR49 : Zutendaal",
    poly: arcPoints(50.94611, 5.60083, 926, 0, 359.99, true, 32),
  },
  {
    // EBR50 — CLERMONT-LEZ-HUY (poudrière, PERM)
    // Cercle r=0.5 NM (926 m), centre 503342N 0052310E
    name: "EBR50 : Clermont-lez-Huy",
    poly: arcPoints(50.56167, 5.38611, 926, 0, 359.99, true, 32),
  },
  {
    // EBR52 — PETIT-RŒULX (fabrique fulminate + tir, PERM)
    // Cercle r=0.5 NM (926 m), centre 503354N 0041831E
    name: "EBR52 : Petit-Rœulx",
    poly: arcPoints(50.56500, 4.30861, 926, 0, 359.99, true, 32),
  },
  {
    // EBR54 — ANTWERP HARBOUR (port d'Anvers, PERM)
    // Polygone 27 points
    name: "EBR54 : Port d'Anvers",
    poly: [
      [51.37722, 4.30417],
      [51.37472, 4.24306],
      [51.35222, 4.25333],
      [51.34917, 4.26750],
      [51.31667, 4.28500],
      [51.30361, 4.23167],
      [51.29361, 4.20944],
      [51.26500, 4.19472],
      [51.24778, 4.19806],
      [51.24722, 4.18944],
      [51.23944, 4.19000],
      [51.24250, 4.24917],
      [51.24111, 4.27000],
      [51.22667, 4.34028],
      [51.24250, 4.35278],
      [51.23833, 4.39833],
      [51.24194, 4.41194],
      [51.24889, 4.41694],
      [51.26028, 4.41917],
      [51.26444, 4.41750],
      [51.26444, 4.40528],
      [51.27611, 4.40528],
      [51.28778, 4.40917],
      [51.29389, 4.40694],
      [51.31167, 4.35667],
      [51.33639, 4.34611],
      [51.33333, 4.30778],
    ],
  },
  {
    // EBR55 — GHENT HARBOUR (port de Gand, PERM)
    // Polygone 23 points
    name: "EBR55 : Port de Gand",
    poly: [
      [51.07278, 3.73417],
      [51.07583, 3.75056],
      [51.08639, 3.75833],
      [51.10639, 3.76194],
      [51.10917, 3.80028],
      [51.12500, 3.80361],
      [51.18167, 3.83556],
      [51.18694, 3.83306],
      [51.19250, 3.82028],
      [51.19222, 3.80833],
      [51.21333, 3.80583],
      [51.21056, 3.80111],
      [51.19250, 3.79861],
      [51.19472, 3.78389],
      [51.19361, 3.77944],
      [51.18056, 3.75806],
      [51.17056, 3.75472],
      [51.14389, 3.73889],
      [51.13889, 3.74722],
      [51.13250, 3.75361],
      [51.12389, 3.74111],
      [51.10444, 3.71917],
      [51.09556, 3.72056],
    ],
  },
  {
    // EBR56 — ZEEBRUGGE HARBOUR (port de Zeebrugge, PERM)
    // Polygone 23 points
    name: "EBR56 : Port de Zeebrugge",
    poly: [
      [51.32750, 3.18472],
      [51.35083, 3.16639],
      [51.36472, 3.18833],
      [51.36000, 3.22750],
      [51.32611, 3.22972],
      [51.29778, 3.26111],
      [51.27306, 3.21389],
      [51.24944, 3.22000],
      [51.25056, 3.22722],
      [51.24444, 3.22778],
      [51.24389, 3.22361],
      [51.22556, 3.22778],
      [51.22222, 3.22361],
      [51.22361, 3.21500],
      [51.23750, 3.21194],
      [51.24611, 3.20611],
      [51.26861, 3.20083],
      [51.27000, 3.21139],
      [51.30750, 3.20194],
      [51.31167, 3.19556],
      [51.30000, 3.19333],
      [51.31722, 3.17694],
      [51.32722, 3.18111],
    ],
  },
  {
    // EBD37 — TRAINING SECTOR (secteur entraînement militaire, lun-ven)
    // 503941N 0044955E - 503457N 0044956E - 502758N 0045957E - 502902N 0050637E
    //   - (arc CW r=6.5 NM, approx ligne droite) - 503101N 0050701E
    //   - 503357N 0050551E - 504355N 0051545E - 504709N 0050621E - 504157N 0045525E
    name: "EBD37 : Secteur entraînement",
    poly: [
      [50.66139, 4.83194],
      [50.58250, 4.83222],
      [50.46611, 4.99917],
      [50.48389, 5.11028],
      [50.51694, 5.11694],
      [50.56583, 5.09750],
      [50.73194, 5.26250],
      [50.78583, 5.10583],
      [50.69917, 4.92361],
    ],
  },
];

// ── Icons ──────────────────────────────────────────────────────
const PLANE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="#F2B705">
  <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/>
</svg>`;

function departIcon() {
  return L.divIcon({
    className: "",
    html: `<div style="width:38px;height:38px;background:#0b2238;border:3px solid #F2B705;border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 14px rgba(0,0,0,.5);">${PLANE_SVG}</div>`,
    iconSize: [38, 38], iconAnchor: [19, 19],
  });
}

function escaleIcon(nom: string) {
  const short = nom.length > 22 ? nom.slice(0, 22) + "…" : nom;
  return L.divIcon({
    className: "",
    html: `
      <div style="display:flex;flex-direction:column;align-items:center;gap:4px;">
        <div style="width:34px;height:34px;background:#0b2238;color:#F2B705;border-radius:8px;
          display:flex;align-items:center;justify-content:center;font-size:16px;
          box-shadow:0 3px 12px rgba(0,0,0,.45);border:2.5px solid #F2B705;cursor:default;">✈</div>
        <div style="background:rgba(17,51,86,0.92);color:#F2B705;font-size:10px;font-weight:700;
          padding:2px 9px;border-radius:20px;white-space:nowrap;box-shadow:0 2px 6px rgba(0,0,0,.4);
          max-width:180px;overflow:hidden;text-overflow:ellipsis;">${short}</div>
      </div>`,
    iconSize: [180, 56], iconAnchor: [90, 17],
  });
}

function poiIcon(n: number, nom: string) {
  const short = nom.length > 20 ? nom.slice(0, 20) + "…" : nom;
  return L.divIcon({
    className: "",
    html: `
      <div style="display:flex;flex-direction:column;align-items:center;gap:4px;">
        <div style="width:34px;height:34px;background:#F2B705;color:#0b2238;border-radius:50%;
          display:flex;align-items:center;justify-content:center;font-weight:800;font-size:13px;
          box-shadow:0 3px 12px rgba(0,0,0,.45);border:2.5px solid #fff;cursor:grab;">${n}</div>
        <div style="background:rgba(11,34,56,0.90);color:#fff;font-size:10px;font-weight:700;
          padding:2px 9px;border-radius:20px;white-space:nowrap;box-shadow:0 2px 6px rgba(0,0,0,.4);
          max-width:180px;overflow:hidden;text-overflow:ellipsis;">${short}</div>
      </div>`,
    iconSize: [180, 56], iconAnchor: [90, 17],
  });
}

// ── Component ──────────────────────────────────────────────────
interface Props {
  onRouteChange: (data: AdventureRouteData) => void;
  styleMode:     StyleMode;
}

interface POIEntry extends POI { marker: L.Marker; circle: L.Circle }

const LeafletMapAdventure = forwardRef<AdventureMapHandle, Props>(
  ({ onRouteChange, styleMode }, ref) => {
    const containerRef  = useRef<HTMLDivElement>(null);
    const mapRef        = useRef<L.Map | null>(null);
    const poisRef       = useRef<POIEntry[]>([]);
    const routeLayerRef = useRef<L.Polyline | null>(null);
    const segLabelsRef  = useRef<L.Marker[]>([]);
    const onChangeRef   = useRef(onRouteChange);
    const styleModeRef  = useRef(styleMode);
    onChangeRef.current  = onRouteChange;
    styleModeRef.current = styleMode;

    function rebuildIcons() {
      poisRef.current.forEach((e, i) => {
        // Renumérote uniquement les POIs encore en placeholder (reverse geocode pas encore reçu)
        if (/^Lieu \d+$/.test(e.nom)) {
          e.nom = `Lieu ${i + 1}`;
          try { e.marker.setTooltipContent(`${e.nom} · cliquer pour supprimer`); } catch { /* ok */ }
        }
        e.marker.setIcon(poiIcon(i + 1, e.nom));
      });
    }

    function redraw() {
      const map = mapRef.current;
      if (!map) return;
      const entries = poisRef.current;

      if (routeLayerRef.current) { map.removeLayer(routeLayerRef.current); routeLayerRef.current = null; }
      segLabelsRef.current.forEach(m => { try { map.removeLayer(m); } catch { /* ok */ } });
      segLabelsRef.current = [];

      if (!entries.length) {
        onChangeRef.current({ pois: [], distKm: 0, transitMin: 0, obsMin: 0, totalMin: 0 });
        return;
      }

      const pts       = entries.map(e => ({ lat: e.lat, lng: e.lng }));
      const baseRoute = optimizeRoute(pts); // [DEPART, …pois…, DEPART]

      // Vue panoramique → oscillation naturelle (6.5%, 24 steps) ; Équilibré → lignes droites
      const isVues    = styleModeRef.current === "vues";
      const displayPts = isVues
        ? gentleWave(baseRoute, 0.065, 24)
        : baseRoute;

      // Polyline principale — style différent selon le mode
      routeLayerRef.current = L.polyline(
        displayPts.map(p => [p.lat, p.lng] as [number, number]),
        isVues
          ? { color: "#F2B705", weight: 3.5, opacity: 0.9, lineCap: "round", lineJoin: "round" }
          : { color: "#F2B705", weight: 3,   opacity: 0.9, lineCap: "round", lineJoin: "round", dashArray: "10 7" }
      ).addTo(map);

      // Distance calculée sur le tracé réel (incluant les courbes)
      let distKm = 0;
      for (let i = 0; i < displayPts.length - 1; i++) {
        distKm += haversine(displayPts[i], displayPts[i + 1]);
      }

      // Labels de segment sur la route de base (entre vrais POI)
      for (let i = 0; i < baseRoute.length - 1; i++) {
        const segDist = haversine(baseRoute[i], baseRoute[i + 1]);
        const segKm   = Math.round(segDist);
        const segMin  = Math.round((segDist / SPEED_KMH) * 60);
        if (segKm < 1) continue;
        const midLat = (baseRoute[i].lat + baseRoute[i + 1].lat) / 2;
        const midLng = (baseRoute[i].lng + baseRoute[i + 1].lng) / 2;
        segLabelsRef.current.push(
          L.marker([midLat, midLng], {
            icon: L.divIcon({
              className: "",
              html: `<div style="background:rgba(11,34,56,0.82);color:#F2B705;font-size:9px;font-weight:800;
                padding:2px 8px;border-radius:10px;white-space:nowrap;backdrop-filter:blur(4px);
                box-shadow:0 1px 4px rgba(0,0,0,.3);">${segKm} km · ${segMin} min</div>`,
              iconSize: [80, 18], iconAnchor: [40, 9],
            }),
            interactive: false, zIndexOffset: 300,
          }).addTo(map)
        );
      }

      distKm = Math.round(distKm * 10) / 10;
      const transitMin = Math.round((distKm / SPEED_KMH) * 60);
      const obsMin     = entries.length * (isVues ? OBS_MIN_VUES : OBS_MIN_RAPIDE);

      onChangeRef.current({
        pois: entries.map(e => ({ id: e.id, lat: e.lat, lng: e.lng, nom: e.nom })),
        distKm,
        transitMin,
        obsMin,
        totalMin: transitMin + obsMin,
      });
    }

    useEffect(() => {
      styleModeRef.current = styleMode;
      if (mapRef.current) redraw();
    }, [styleMode]); // eslint-disable-line react-hooks/exhaustive-deps

    function _addPOIInternal(map: L.Map, poi: POI) {
      // Bloquer si dans une zone restreinte
      const blocked = RESTRICTED_ZONES.find(z => pointInPolygon(poi.lat, poi.lng, z.poly));
      if (blocked) {
        L.popup({ closeButton: false, className: "" })
          .setLatLng([poi.lat, poi.lng])
          .setContent(
            `<div style="background:#0b2238;color:#fff;font-size:11px;font-weight:700;
              padding:7px 13px;border-radius:10px;border:1.5px solid #ef4444;
              white-space:nowrap;">
              🚫 Zone interdite : ${blocked.name}
            </div>`
          )
          .openOn(map);
        setTimeout(() => map.closePopup(), 2500);
        return;
      }

      const isEscale = poi.id.startsWith("stop-");
      const n        = poisRef.current.length + 1;
      const marker   = L.marker([poi.lat, poi.lng], {
        icon:      isEscale ? escaleIcon(poi.nom) : poiIcon(n, poi.nom),
        draggable: !isEscale,
      })
        .addTo(map)
        .bindTooltip(
          isEscale ? `${poi.nom} · escale (cliquer pour retirer)` : `${poi.nom} · cliquer pour supprimer`,
          { direction: "top" }
        );

      const circle = L.circle([poi.lat, poi.lng], {
        radius: OBS_RADIUS_M,
        color: "#F2B705", fillColor: "#F2B705", fillOpacity: 0.08,
        weight: 1.5, dashArray: "5 5", interactive: false,
      }).addTo(map);

      const entry: POIEntry = { ...poi, marker, circle };
      poisRef.current.push(entry);

      marker.on("click", (ev: L.LeafletMouseEvent) => {
        ev.originalEvent?.stopPropagation();
        const i = poisRef.current.indexOf(entry);
        if (i === -1) return;
        map.removeLayer(marker);
        map.removeLayer(circle);
        poisRef.current.splice(i, 1);
        rebuildIcons();
        redraw();
      });
      if (!isEscale) {
        marker.on("dragstart", () => marker.closeTooltip());
        marker.on("dragend", () => {
          const pos = marker.getLatLng();
          entry.lat = pos.lat; entry.lng = pos.lng;
          circle.setLatLng(pos);
          redraw();
        });
      }
      redraw();
    }

    // Init map (once)
    useEffect(() => {
      if (!containerRef.current || mapRef.current) return;
      const container = containerRef.current;

      const map = L.map(container, {
        zoomControl:     true,
        scrollWheelZoom: false, // Ctrl + scroll uniquement
        doubleClickZoom: true,
      }).setView([50.45, 5.0], 8);

      // ── Tiles hybrides ESRI : satellite + routes + noms ────────
      L.tileLayer(
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        { attribution: "Imagery © Esri", maxZoom: 19 }
      ).addTo(map);

      L.tileLayer(
        "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}",
        { attribution: "", maxZoom: 19, pane: "overlayPane", opacity: 0.75 }
      ).addTo(map);

      L.tileLayer(
        "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}",
        { attribution: "", maxZoom: 19, pane: "overlayPane", opacity: 0.9 }
      ).addTo(map);

      // Marqueur EBCI fixe
      L.marker([DEPART.lat, DEPART.lng], { icon: departIcon(), interactive: false })
        .addTo(map)
        .bindTooltip("Charleroi EBCI · Départ et Retour", { direction: "top" });

      // ── Zones restreintes ─────────────────────────────────────
      mergeRestrictedZones(RESTRICTED_ZONES).forEach(({ rings }) => {
        L.polygon(rings as [number, number][][], {
          color:       "#ef4444",
          fillColor:   "#ef4444",
          fillOpacity: 0.18,
          weight:      2,
          dashArray:   "7 5",
          interactive: true,
        })
          .bindTooltip("🚫 Zone interdite", { sticky: true })
          .addTo(map);
      });

      mapRef.current = map;

      // ── Ctrl + molette pour zoomer ─────────────────────────────
      const hintEl = document.createElement("div");
      hintEl.style.cssText =
        "position:absolute;inset:0;display:flex;align-items:center;justify-content:center;" +
        "pointer-events:none;z-index:800;opacity:0;transition:opacity .22s;";
      hintEl.innerHTML =
        `<div style="background:rgba(11,34,56,0.88);backdrop-filter:blur(8px);color:#fff;` +
        `font-size:12px;font-weight:700;padding:10px 20px;border-radius:20px;` +
        `border:1px solid rgba(251,174,23,0.35);">` +
        `<span style="color:#fbae17;">Ctrl</span> + défilement pour zoomer` +
        `</div>`;
      container.appendChild(hintEl);

      let hintTimer: ReturnType<typeof setTimeout> | null = null;
      function showHint() {
        hintEl.style.opacity = "1";
        if (hintTimer) clearTimeout(hintTimer);
        hintTimer = setTimeout(() => { hintEl.style.opacity = "0"; }, 1600);
      }

      container.addEventListener("wheel", (e: WheelEvent) => {
        if (e.ctrlKey) {
          e.preventDefault();
          try {
            const z = map.getZoom();
            map.setZoom(z + (e.deltaY < 0 ? 1 : -1), { animate: true });
          } catch { /* carte pas encore prête */ }
        } else {
          showHint();
        }
      }, { passive: false });

      // ── Mobile : message deux doigts ───────────────────────────
      const touchHintEl = document.createElement("div");
      touchHintEl.style.cssText =
        "position:absolute;bottom:44px;left:50%;transform:translateX(-50%);" +
        "z-index:800;pointer-events:none;opacity:0;transition:opacity .22s;";
      touchHintEl.innerHTML =
        `<div style="background:rgba(11,34,56,0.85);color:#fff;font-size:11px;font-weight:600;` +
        `padding:7px 16px;border-radius:20px;white-space:nowrap;">` +
        `Deux doigts pour déplacer la carte</div>`;
      container.appendChild(touchHintEl);

      let touchTimer: ReturnType<typeof setTimeout> | null = null;
      container.addEventListener("touchstart", (e: TouchEvent) => {
        if (e.touches.length === 1) {
          touchHintEl.style.opacity = "1";
          if (touchTimer) clearTimeout(touchTimer);
          touchTimer = setTimeout(() => { touchHintEl.style.opacity = "0"; }, 2000);
        }
      }, { passive: true });

      // ── Clic carte → ajouter POI + reverse geocode ───────────
      map.on("click", async (e: L.LeafletMouseEvent) => {
        const { lat, lng } = e.latlng;
        const id = `click-${Date.now()}`;
        const placeholder = `Lieu ${poisRef.current.length + 1}`;
        _addPOIInternal(map, { id, lat, lng, nom: placeholder });
        try {
          const r = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=fr&zoom=10`,
            { headers: { "Accept-Language": "fr" } }
          );
          const d = await r.json();
          const realName =
            d.address?.city || d.address?.town || d.address?.village ||
            d.address?.municipality || d.address?.hamlet || d.address?.county || d.name;
          if (realName) {
            const entry = poisRef.current.find(x => x.id === id);
            if (entry) {
              entry.nom = realName;
              const idx = poisRef.current.indexOf(entry);
              try { entry.marker.setTooltipContent(`${realName} · cliquer pour supprimer`); } catch { /* ok */ }
              entry.marker.setIcon(poiIcon(idx + 1, realName));
              redraw();
            }
          }
        } catch { /* garde le nom placeholder */ }
      });

      return () => {
        if (hintTimer)  clearTimeout(hintTimer);
        if (touchTimer) clearTimeout(touchTimer);
        map.remove();
        mapRef.current = null;
      };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    useImperativeHandle(ref, () => ({
      clearAll() {
        const map = mapRef.current;
        if (!map) return;
        poisRef.current.forEach(e => { map.removeLayer(e.marker); map.removeLayer(e.circle); });
        poisRef.current = [];
        redraw();
      },
      addPOI(poi: POI) {
        const map = mapRef.current;
        if (!map || poisRef.current.some(e => e.id === poi.id)) return;
        _addPOIInternal(map, poi);
      },
      removePOI(id: string) {
        const map = mapRef.current;
        if (!map) return;
        const idx = poisRef.current.findIndex(e => e.id === id);
        if (idx === -1) return;
        const entry = poisRef.current[idx];
        map.removeLayer(entry.marker);
        map.removeLayer(entry.circle);
        poisRef.current.splice(idx, 1);
        rebuildIcons();
        redraw();
      },
      fitBounds() {
        const map = mapRef.current;
        if (!map || !poisRef.current.length) return;
        map.fitBounds(
          L.latLngBounds([
            [DEPART.lat, DEPART.lng],
            ...poisRef.current.map(e => [e.lat, e.lng] as [number, number]),
          ]),
          { padding: [50, 50] }
        );
      },
      invalidateSize() {
        setTimeout(() => mapRef.current?.invalidateSize(), 80);
      },
    }));

    return <div ref={containerRef} style={{ width: "100%", height: "100%" }} />;
  }
);

LeafletMapAdventure.displayName = "LeafletMapAdventure";
export default LeafletMapAdventure;
