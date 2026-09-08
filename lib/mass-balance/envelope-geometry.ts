/**
 * Géométrie de l'enveloppe de centrage DA40 — partagée par le rendu écran
 * (SVG React) et le PDF (@react-pdf Svg). Porté de `drawChart()` du HTML.
 */

import { cgFwd, CG_AFT, MASS_MAX, MASS_MIN } from "./da40-data";
import type { MbPoint } from "./da40-calc";

const OK = "#1f7a4d";
const ALERT = "#b3261e";
const INK = "#1c2733";
const MUTED = "#5b6b7b";
const GRID = "#e1e6ec";
const NAVY = "#213a5c";
const FILL = "#f3f5f8";

export type MarkerType = "square" | "circle" | "triangle";

export interface EnvelopeGeometry {
  width: number;
  height: number;
  colors: { ok: string; alert: string; ink: string; muted: string; grid: string; navy: string; fill: string };
  gridX: { x: number; label: string }[];
  gridY: { y: number; label: string }[];
  gridTop: number;
  gridBottom: number;
  gridLeft: number;
  gridRight: number;
  axisX: { x: number; y: number; text: string };
  axisYTransform: string;
  envelopePoints: string; // "x,y x,y ..."
  utilityLine: { x1: number; y1: number; x2: number; y2: number };
  staticLabels: { x: number; y: number; text: string; size: number }[];
  trajectory: string;
  markers: { type: MarkerType; x: number; y: number; color: string; label: string }[];
}

export function buildEnvelopeGeometry(
  points: MbPoint[],
  opts?: { width?: number; height?: number },
): EnvelopeGeometry {
  const W = opts?.width ?? 560;
  const H = opts?.height ?? 400;
  const L = 62;
  const R = 20;
  const T = 20;
  const B = 46;
  const cgMin = 2.38;
  const cgMax = 2.62;
  const mMin = 740;
  const mMax = 1180;

  const x = (cg: number) => L + ((cg - cgMin) / (cgMax - cgMin)) * (W - L - R);
  const y = (m: number) => T + ((mMax - m) / (mMax - mMin)) * (H - T - B);

  const gridX: { x: number; label: string }[] = [];
  for (let cg = 2.4; cg <= 2.6 + 1e-9; cg += 0.05) {
    gridX.push({ x: x(cg), label: cg.toFixed(2).replace(".", ",") });
  }

  const gridY: { y: number; label: string }[] = [];
  for (let m = 750; m <= 1150; m += 50) {
    gridY.push({ y: y(m), label: String(m) });
  }

  const env: [number, number][] = [
    [2.4, 780],
    [2.4, 980],
    [2.46, 1150],
    [2.59, 1150],
    [2.59, 780],
  ];

  const shapes: Record<string, MarkerType> = {
    ZFM: "square",
    Décollage: "circle",
    Atterrissage: "triangle",
  };

  const insideFn = (p: MbPoint) =>
    p.m >= MASS_MIN &&
    p.m <= MASS_MAX &&
    p.cg >= cgFwd(p.m) - 1e-9 &&
    p.cg <= CG_AFT + 1e-9;

  return {
    width: W,
    height: H,
    colors: { ok: OK, alert: ALERT, ink: INK, muted: MUTED, grid: GRID, navy: NAVY, fill: FILL },
    gridX,
    gridY,
    gridTop: T,
    gridBottom: H - B,
    gridLeft: L,
    gridRight: W - R,
    axisX: { x: (L + W - R) / 2, y: H - 6, text: "Position du centre de gravité (m)" },
    axisYTransform: `translate(14 ${(T + H - B) / 2}) rotate(-90)`,
    envelopePoints: env.map(([c, m]) => `${x(c)},${y(m)}`).join(" "),
    utilityLine: { x1: x(2.4), y1: y(980), x2: x(2.59), y2: y(980) },
    staticLabels: [
      { x: x(2.495), y: y(1060), text: "Normal", size: 13 },
      { x: x(2.495), y: y(880), text: "Utility & Normal", size: 13 },
      { x: x(2.495), y: y(980) - 5, text: "980 kg", size: 11 },
      { x: x(2.495), y: y(1150) - 5, text: "1150 kg", size: 11 },
    ],
    trajectory: points.map((p) => `${x(p.cg)},${y(p.m)}`).join(" "),
    markers: points.map((p) => ({
      type: shapes[p.k] ?? "circle",
      x: x(p.cg),
      y: y(p.m),
      color: insideFn(p) ? OK : ALERT,
      label: p.k,
    })),
  };
}
