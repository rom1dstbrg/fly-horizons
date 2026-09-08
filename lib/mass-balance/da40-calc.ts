/**
 * Moteur de calcul Masse & Centrage + Performances DA40.
 * Fonctions pures, partagées par l'UI admin, les server actions et le PDF.
 * Porté depuis `DA40_mass_and_balance_2.html` (voir da40-data.ts pour les sources).
 */

import {
  AIRCRAFT,
  ARM,
  BAG_MAX,
  CG_AFT,
  FUEL_MAX_GAL,
  FUEL_MAX_L,
  MASS_MAX,
  MASS_MIN,
  TAXI_FUEL_KG,
  TAXI_FUEL_MOMENT,
  UTILITY_MAX,
  cgFwd,
  galToKg,
  galToL,
  LD_DATA,
  TD_DATA,
  type Curve,
  type PerfTable,
} from "./da40-data";

// ── Types ────────────────────────────────────────────────────────────────────

export interface AerodromeInput {
  icao: string;
  rwy: number | null;
  elev: number | null;
  qnh: number | null;
  oat: number | null;
  wdir: number | null;
  wspd: number | null;
  rawMetar: string;
}

export interface PerfInputs {
  dep: AerodromeInput;
  dest: AerodromeInput;
  alt: AerodromeInput;
  toda: number | null;
  ldaDest: number | null;
  ldaAlt: number | null;
}

export interface MassBalanceInputs {
  aircraftReg: string;
  flightDate: string; // yyyy-mm-dd
  pilot: number;
  fpax: number;
  rpax1: number;
  rpax2: number;
  bag: number;
  fuelGal: number; // gallons US embarqués
  tripGal: number; // gallons US consommés en vol
  perf: PerfInputs;
}

export interface MbRow {
  poste: string;
  sub?: string;
  masse: number | null;
  bras: number | null;
  moment: number | null;
  total?: boolean;
  out?: boolean;
}

export type Verdict = { status: "ok" | "ko" | "pending"; message: string };

export interface PerfLeg {
  pa: number | null;
  da: number | null;
  xwind: number | null;
  headwind: number | null;
}

export interface PerfComputed {
  dep: PerfLeg & {
    todr: number | null;
    todr125: number | null;
    toda: number | null;
    error?: string;
    verdict: Verdict;
  };
  ldg: PerfLeg & {
    ldr: number | null;
    ldaDest: number | null;
    ldaAlt: number | null;
    error?: string;
    verdictDest: Verdict;
    verdictAlt: Verdict;
  };
}

export interface MbPoint {
  k: string;
  m: number;
  cg: number;
  inside: boolean;
}

export interface MassBalanceComputed {
  aircraftReg: string;
  bem: number;
  bemArm: number;
  bemMoment: number;
  front: number;
  rear: number;
  bag: number;
  zfm: number;
  cgZfm: number;
  moZfm: number;
  fuelKg: number;
  fuelL: number;
  fuelGal: number;
  ramp: number;
  cgRamp: number;
  moRamp: number;
  tom: number;
  cgTom: number;
  moTom: number;
  tripKg: number;
  tripL: number;
  tripGal: number;
  lm: number;
  cgLm: number;
  moLm: number;
  rows: MbRow[];
  issues: string[];
  withinLimits: boolean;
  category: string;
  points: MbPoint[];
  perf: PerfComputed;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const clamp0 = (v: number | null | undefined) => Math.max(0, Number(v) || 0);
const frNum = (v: number, d = 1) =>
  v.toLocaleString("fr-FR", { minimumFractionDigits: d, maximumFractionDigits: d });

export function aircraftByReg(reg: string): [string, number, number, number] {
  return AIRCRAFT.find((a) => a[0] === reg) ?? AIRCRAFT[0];
}

/** Répartit un poids total sur les sièges du DA40. Pilote traité à part. */
export function splitPassengerWeight(
  total: number,
  pax: number,
): { fpax: number; rpax1: number; rpax2: number } {
  const T = clamp0(total);
  if (!T || pax <= 0) return { fpax: 0, rpax1: 0, rpax2: 0 };
  if (pax === 1) return { fpax: Math.round(T), rpax1: 0, rpax2: 0 };
  if (pax === 2) {
    const half = Math.round(T / 2);
    return { fpax: half, rpax1: T - half, rpax2: 0 };
  }
  // 3 passagers ou plus : réparti également, reste à l'avant
  const third = Math.round(T / 3);
  return { fpax: T - 2 * third, rpax1: third, rpax2: third };
}

// ── Masse & centrage ─────────────────────────────────────────────────────────

export function computeMassBalance(input: MassBalanceInputs): MassBalanceComputed {
  const [reg, bem, bemArm, bemMoment] = aircraftByReg(input.aircraftReg);

  const pilot = clamp0(input.pilot);
  const fpax = clamp0(input.fpax);
  const r1 = clamp0(input.rpax1);
  const r2 = clamp0(input.rpax2);
  const bag = clamp0(input.bag);
  const fuelGal = Math.min(clamp0(input.fuelGal), FUEL_MAX_GAL * 1.5);
  const tripGal = Math.min(clamp0(input.tripGal), fuelGal);

  const front = pilot + fpax;
  const rear = r1 + r2;
  const moFront = front * ARM.front;
  const moRear = rear * ARM.rear;
  const moBag = bag * ARM.bag;

  const zfm = bem + front + rear + bag;
  const moZfm = bemMoment + moFront + moRear + moBag;

  const fuelL = galToL(fuelGal);
  const fuelKg = galToKg(fuelGal);
  const moFuel = fuelKg * ARM.fuel;

  const ramp = zfm + fuelKg;
  const moRamp = moZfm + moFuel;

  const tom = ramp - TAXI_FUEL_KG;
  const moTom = moRamp - TAXI_FUEL_MOMENT;

  const tripL = galToL(tripGal);
  const tripKg = galToKg(tripGal);
  const moTrip = tripKg * ARM.fuel;

  const lm = tom - tripKg;
  const moLm = moTom - moTrip;

  const cgZfm = moZfm / zfm;
  const cgRamp = moRamp / ramp;
  const cgTom = moTom / tom;
  const cgLm = moLm / lm;

  // Vérification des limites
  const pts: { k: string; m: number; cg: number }[] = [
    { k: "ZFM", m: zfm, cg: cgZfm },
    { k: "Décollage", m: tom, cg: cgTom },
    { k: "Atterrissage", m: lm, cg: cgLm },
  ];

  const issues: string[] = [];
  const outFlags: Record<string, boolean> = {};
  if (bag > BAG_MAX) issues.push(`Bagages ${frNum(bag, 0)} kg > 30 kg`);
  if (fuelL > FUEL_MAX_L) issues.push(`Carburant ${frNum(fuelL, 0)} l > 106 l`);
  if (ramp > MASS_MAX + TAXI_FUEL_KG)
    issues.push(`Masse parking ${frNum(ramp)} kg > 1151,5 kg`);

  for (const p of pts) {
    let bad = false;
    if (p.m > MASS_MAX) {
      issues.push(`${p.k} : ${frNum(p.m)} kg > 1150 kg`);
      bad = true;
    }
    if (p.m < MASS_MIN) {
      issues.push(`${p.k} : ${frNum(p.m)} kg < 780 kg`);
      bad = true;
    }
    if (p.cg < cgFwd(p.m) - 1e-9) {
      issues.push(
        `${p.k} : CG ${frNum(p.cg, 3)} m en avant de la limite (${frNum(cgFwd(p.m), 3)} m)`,
      );
      bad = true;
    }
    if (p.cg > CG_AFT + 1e-9) {
      issues.push(`${p.k} : CG ${frNum(p.cg, 3)} m en arrière de la limite (2,59 m)`);
      bad = true;
    }
    outFlags[p.k] = bad;
  }

  const withinLimits = issues.length === 0;
  const category =
    Math.max(zfm, tom) <= UTILITY_MAX ? "Utility & Normal" : "Normal";

  const insideFn = (m: number, cg: number) =>
    m >= MASS_MIN &&
    m <= MASS_MAX &&
    cg >= cgFwd(m) - 1e-9 &&
    cg <= CG_AFT + 1e-9;

  const points: MbPoint[] = pts.map((p) => ({
    k: p.k,
    m: p.m,
    cg: p.cg,
    inside: insideFn(p.m, p.cg),
  }));

  const rows: MbRow[] = [
    { poste: "Masse à vide de base", masse: bem, bras: bemArm, moment: bemMoment },
    { poste: "Sièges avant", masse: front, bras: ARM.front, moment: moFront },
    { poste: "Sièges arrière", masse: rear, bras: ARM.rear, moment: moRear },
    { poste: "Bagages (max 30 kg)", masse: bag, bras: ARM.bag, moment: moBag, out: bag > BAG_MAX },
    {
      poste: "Masse sans carburant (ZFM)",
      masse: zfm,
      bras: cgZfm,
      moment: moZfm,
      total: true,
      out: outFlags["ZFM"],
    },
    {
      poste: "Carburant utilisable",
      sub: `${frNum(fuelGal, 1)} gal · ${frNum(fuelL, 0)} l embarqués`,
      masse: fuelKg,
      bras: ARM.fuel,
      moment: moFuel,
    },
    {
      poste: "Masse au parking (Ramp)",
      masse: ramp,
      bras: cgRamp,
      moment: moRamp,
      total: true,
    },
    { poste: "Roulage", masse: -TAXI_FUEL_KG, bras: ARM.fuel, moment: -TAXI_FUEL_MOMENT },
    {
      poste: "Masse au décollage (max 1150 kg)",
      masse: tom,
      bras: cgTom,
      moment: moTom,
      total: true,
      out: outFlags["Décollage"],
    },
    {
      poste: "Carburant trajet",
      sub: `${frNum(tripGal, 1)} gal · ${frNum(tripL, 0)} l consommés`,
      masse: -tripKg,
      bras: ARM.fuel,
      moment: -moTrip,
    },
    {
      poste: "Masse à l'atterrissage (max 1150 kg)",
      masse: lm,
      bras: cgLm,
      moment: moLm,
      total: true,
      out: outFlags["Atterrissage"],
    },
  ];

  const perf = computePerf(input.perf, tom, lm);

  return {
    aircraftReg: reg,
    bem,
    bemArm,
    bemMoment,
    front,
    rear,
    bag,
    zfm,
    cgZfm,
    moZfm,
    fuelKg,
    fuelL,
    fuelGal,
    ramp,
    cgRamp,
    moRamp,
    tom,
    cgTom,
    moTom,
    tripKg,
    tripL,
    tripGal,
    lm,
    cgLm,
    moLm,
    rows,
    issues,
    withinLimits,
    category,
    points,
    perf,
  };
}

// ── Interpolation abaques (identique à l'outil de référence DA40D-Calculator) ──

function evalCurve(curve: Curve, xVal: number): number {
  const { xs, ys } = curve;
  const n = xs.length;
  if (n === 0) return 0;
  if (n === 1) return ys[0];
  const ascending = xs[n - 1] > xs[0];
  if (ascending) {
    if (xVal <= xs[0]) return ys[0];
    if (xVal >= xs[n - 1]) return ys[n - 1];
  } else {
    if (xVal >= xs[0]) return ys[0];
    if (xVal <= xs[n - 1]) return ys[n - 1];
  }
  for (let i = 0; i < n - 1; i++) {
    const x1 = xs[i];
    const x2 = xs[i + 1];
    const y1 = ys[i];
    const y2 = ys[i + 1];
    if ((xVal >= x1 && xVal <= x2) || (xVal >= x2 && xVal <= x1)) {
      if (x2 === x1) return y1;
      return y1 + ((y2 - y1) * (xVal - x1)) / (x2 - x1);
    }
  }
  return ys[n - 1];
}

function evalBilinear(
  altBands: number[],
  curves: Curve[],
  alt: number,
  xVal: number,
): number {
  const n = altBands.length;
  if (alt <= altBands[0]) return evalCurve(curves[0], xVal);
  if (alt >= altBands[n - 1]) return evalCurve(curves[n - 1], xVal);
  for (let i = 0; i < n - 1; i++) {
    if (alt >= altBands[i] && alt <= altBands[i + 1]) {
      const y1 = evalCurve(curves[i], xVal);
      const y2 = evalCurve(curves[i + 1], xVal);
      return y1 + ((y2 - y1) * (alt - altBands[i])) / (altBands[i + 1] - altBands[i]);
    }
  }
  return evalCurve(curves[n - 1], xVal);
}

function evalCorrectionStep(curves: Curve[], paramVal: number, distIn: number): number {
  const n = curves.length;
  if (n === 0) return distIn;
  const entryParam = curves[0].xs[0];
  const distAtEntry = curves.map((c) => evalCurve(c, entryParam));
  const ascending = distAtEntry[n - 1] > distAtEntry[0];
  let frac: number | undefined;
  let loIdx: number | undefined;
  let hiIdx: number | undefined;
  if (ascending) {
    if (distIn <= distAtEntry[0]) {
      frac = 0;
      loIdx = 0;
      hiIdx = 0;
    } else if (distIn >= distAtEntry[n - 1]) {
      frac = 1;
      loIdx = n - 1;
      hiIdx = n - 1;
    } else {
      for (let i = 0; i < n - 1; i++) {
        if (distIn >= distAtEntry[i] && distIn <= distAtEntry[i + 1]) {
          const span = distAtEntry[i + 1] - distAtEntry[i];
          frac = span === 0 ? 0 : (distIn - distAtEntry[i]) / span;
          loIdx = i;
          hiIdx = i + 1;
          break;
        }
      }
    }
  } else {
    if (distIn >= distAtEntry[0]) {
      frac = 0;
      loIdx = 0;
      hiIdx = 0;
    } else if (distIn <= distAtEntry[n - 1]) {
      frac = 1;
      loIdx = n - 1;
      hiIdx = n - 1;
    } else {
      for (let i = 0; i < n - 1; i++) {
        if (distIn <= distAtEntry[i] && distIn >= distAtEntry[i + 1]) {
          const span = distAtEntry[i + 1] - distAtEntry[i];
          frac = span === 0 ? 0 : (distIn - distAtEntry[i]) / span;
          loIdx = i;
          hiIdx = i + 1;
          break;
        }
      }
    }
  }
  if (loIdx === undefined || hiIdx === undefined || frac === undefined) return distIn;
  const dLo = evalCurve(curves[loIdx], paramVal);
  const dHi = loIdx === hiIdx ? dLo : evalCurve(curves[hiIdx], paramVal);
  return dLo + frac * (dHi - dLo);
}

// ── Take-off / landing distance over 50 ft obstacle ───────────────────────────

export function calcTODR(o: {
  pressAlt: number;
  oat: number;
  mass: number;
  wind: number;
}): { result?: number; error?: string } {
  if (o.pressAlt > 10000) return { error: "Altitude pression > 10 000 ft (hors abaque)" };
  if (o.mass < 748 || o.mass > 1150) return { error: "Masse hors abaque (748–1150 kg)" };
  const td = TD_DATA as PerfTable & { step3hw: Curve[]; step3tw: Curve[] };
  const s1 = evalBilinear(td.altBands, td.step1, o.pressAlt, o.oat);
  const s2 = evalCorrectionStep(td.step2, o.mass, s1);
  const s3 =
    o.wind >= 0
      ? evalCorrectionStep(td.step3hw, o.wind, s2)
      : evalCorrectionStep(td.step3tw, Math.abs(o.wind), s2);
  return { result: Math.round(s3) };
}

export function calcLDR(o: {
  pressAlt: number;
  oat: number;
  mass: number;
  wind: number;
}): { result?: number; error?: string } {
  if (o.pressAlt > 10000) return { error: "Altitude pression > 10 000 ft (hors abaque)" };
  const ld = LD_DATA as PerfTable & { step3: Curve[] };
  const s1 = evalBilinear(ld.altBands, ld.step1, o.pressAlt, o.oat);
  const s2 = evalCorrectionStep(ld.step2, o.mass, s1);
  const hw = Math.max(0, o.wind);
  const s3 = hw > 0 ? evalCorrectionStep(ld.step3, hw, s2) : s2;
  return { result: Math.round(s3) };
}

// ── Altitude pression / densité / composantes de vent ─────────────────────────

export function pressureAltitude(elevFt: number, qnhHPa: number): number {
  return Math.round(elevFt + (1013.25 - qnhHPa) * 27);
}

export function densityAltitude(pressAlt: number, oat: number): number {
  const isaTemp = 15 - 2 * (pressAlt / 1000);
  return Math.round(pressAlt + 120 * (oat - isaTemp));
}

export function windComponents(
  windDir: number,
  windSpeed: number,
  rwyAxis: number,
): { headwind: number; crosswind: number } {
  const angle = ((windDir - rwyAxis) * Math.PI) / 180;
  return {
    headwind: Math.round(windSpeed * Math.cos(angle) * 10) / 10,
    crosswind: Math.round(Math.abs(windSpeed * Math.sin(angle)) * 10) / 10,
  };
}

// ── METAR brut → valeurs ─────────────────────────────────────────────────────

export function extractFromRawMetar(rawInput: string): {
  oat: number | null;
  qnh: number | null;
  wdir: number | null;
  wspd: number | null;
  vrb: boolean;
  found: boolean;
} {
  const raw = (rawInput || "").trim().toUpperCase();
  const out = {
    oat: null as number | null,
    qnh: null as number | null,
    wdir: null as number | null,
    wspd: null as number | null,
    vrb: false,
    found: false,
  };
  const wind = raw.match(/\b(\d{3}|VRB)(\d{2,3})(?:G\d{2,3})?KT\b/);
  if (wind) {
    if (wind[1] === "VRB") out.vrb = true;
    else out.wdir = parseInt(wind[1], 10);
    out.wspd = parseInt(wind[2], 10);
    out.found = true;
  }
  const temp = raw.match(/(?:^|\s)(M?\d{2})\/(M?\d{2})(?=\s|$)/);
  if (temp) {
    out.oat = temp[1].startsWith("M")
      ? -parseInt(temp[1].slice(1), 10)
      : parseInt(temp[1], 10);
    out.found = true;
  }
  const qMatch = raw.match(/\bQ(\d{4})\b/);
  const aMatch = raw.match(/\bA(\d{4})\b/);
  if (qMatch) {
    out.qnh = parseInt(qMatch[1], 10);
    out.found = true;
  } else if (aMatch) {
    out.qnh = Math.round((parseInt(aMatch[1], 10) / 100) * 33.8639);
    out.found = true;
  }
  return out;
}

// ── Performance data ─────────────────────────────────────────────────────────

const PENDING_DEP: Verdict = {
  status: "pending",
  message: "Renseignez le départ (piste, élévation, QNH, OAT, vent) et la TODA.",
};

export function computePerf(
  perf: PerfInputs,
  tom: number,
  lm: number,
): PerfComputed {
  const { dep, dest } = perf;

  // ===== Départ — décollage =====
  let depPA: number | null = null;
  let depDA: number | null = null;
  let depXwind: number | null = null;
  let depHW: number | null = null;
  let todr: number | null = null;
  let todr125: number | null = null;
  let depError: string | undefined;

  if (dep.elev != null && dep.qnh != null) depPA = pressureAltitude(dep.elev, dep.qnh);
  if (depPA != null && dep.oat != null) depDA = densityAltitude(depPA, dep.oat);
  if (dep.wdir != null && dep.wspd != null && dep.rwy != null) {
    const w = windComponents(dep.wdir, dep.wspd, dep.rwy);
    depXwind = w.crosswind;
    depHW = w.headwind;
  }
  if (depPA != null && dep.oat != null && depHW != null && tom) {
    const r = calcTODR({ pressAlt: depPA, oat: dep.oat, mass: tom, wind: depHW });
    if (r.error) depError = r.error;
    else {
      todr = r.result ?? null;
      todr125 = todr != null ? Math.round(todr * 1.25) : null;
    }
  }

  let depVerdict: Verdict = PENDING_DEP;
  if (todr125 != null && perf.toda != null) {
    const ok = todr125 <= perf.toda;
    depVerdict = {
      status: ok ? "ok" : "ko",
      message: ok
        ? `OK — TODR × 1.25 (${todr125} m) ≤ TODA (${perf.toda} m)`
        : `Insuffisant — TODR × 1.25 (${todr125} m) > TODA (${perf.toda} m)`,
    };
  }

  // ===== Atterrissage — conditions destination =====
  let ldgPA: number | null = null;
  let ldgDA: number | null = null;
  let ldgXwind: number | null = null;
  let ldgHW: number | null = null;
  let ldr: number | null = null;
  let ldgError: string | undefined;

  if (dest.elev != null && dest.qnh != null)
    ldgPA = pressureAltitude(dest.elev, dest.qnh);
  if (ldgPA != null && dest.oat != null) ldgDA = densityAltitude(ldgPA, dest.oat);
  if (dest.wdir != null && dest.wspd != null && dest.rwy != null) {
    const w = windComponents(dest.wdir, dest.wspd, dest.rwy);
    ldgXwind = w.crosswind;
    ldgHW = w.headwind;
  }
  if (ldgPA != null && dest.oat != null && ldgHW != null && lm) {
    const r = calcLDR({ pressAlt: ldgPA, oat: dest.oat, mass: lm, wind: ldgHW });
    if (r.error) ldgError = r.error;
    else ldr = r.result ?? null;
  }

  const mkLdgVerdict = (lda: number | null, label: string): Verdict => {
    if (ldr == null || lda == null)
      return {
        status: "pending",
        message:
          label === "Destination"
            ? "Renseignez la destination (piste, élévation, QNH, OAT, vent) et la LDA."
            : "Renseignez la LDA alternate.",
      };
    const ok = ldr <= lda;
    return {
      status: ok ? "ok" : "ko",
      message: ok
        ? `${label} OK — LDR (${ldr} m) ≤ LDA (${lda} m)`
        : `${label} insuffisant — LDR (${ldr} m) > LDA (${lda} m)`,
    };
  };

  return {
    dep: {
      pa: depPA,
      da: depDA,
      xwind: depXwind,
      headwind: depHW,
      todr,
      todr125,
      toda: perf.toda,
      error: depError,
      verdict: depVerdict,
    },
    ldg: {
      pa: ldgPA,
      da: ldgDA,
      xwind: ldgXwind,
      headwind: ldgHW,
      ldr,
      ldaDest: perf.ldaDest,
      ldaAlt: perf.ldaAlt,
      error: ldgError,
      verdictDest: mkLdgVerdict(perf.ldaDest, "Destination"),
      verdictAlt: mkLdgVerdict(perf.ldaAlt, "Alternate"),
    },
  };
}

// ── Valeurs par défaut ───────────────────────────────────────────────────────

export function emptyAerodrome(): AerodromeInput {
  return {
    icao: "",
    rwy: null,
    elev: null,
    qnh: 1013,
    oat: null,
    wdir: null,
    wspd: null,
    rawMetar: "",
  };
}

export function defaultInputs(overrides?: Partial<MassBalanceInputs>): MassBalanceInputs {
  return {
    aircraftReg: AIRCRAFT[0][0],
    flightDate: new Date().toISOString().slice(0, 10),
    pilot: 82,
    fpax: 0,
    rpax1: 0,
    rpax2: 0,
    bag: 0,
    fuelGal: FUEL_MAX_GAL,
    tripGal: 10,
    perf: {
      dep: emptyAerodrome(),
      dest: emptyAerodrome(),
      alt: emptyAerodrome(),
      toda: null,
      ldaDest: null,
      ldaAlt: null,
    },
    ...overrides,
  };
}
