// Statistiques de la page Admin > Analytiques (01/10). Module pur : reçoit les
// lignes de page_views / site_events et renvoie tout ce que la page affiche,
// y compris les phrases d'interprétation. Aucune requête ici.

export type View = { pathname: string; referrer: string | null; device: string | null; created_at: string; visitor_id: string | null };
export type Ev = { name: string; visitor_id: string | null; created_at: string };

const TZ = "Europe/Brussels";
const dayFmt = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" });
const wdFmt = new Intl.DateTimeFormat("en-US", { timeZone: TZ, weekday: "short" });
/** Jour belge « AAAA-MM-JJ » d'un instant. */
export const dayKey = (ms: number) => dayFmt.format(new Date(ms));

const WD_INDEX: Record<string, number> = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 };
const WD_NAMES = ["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"];
const weekdayOfKey = (key: string) => WD_INDEX[wdFmt.format(new Date(`${key}T12:00:00Z`))] ?? 0;

const fr = (n: number) => n.toLocaleString("fr-BE");
export const fmtDay = (key: string) =>
  new Date(`${key}T12:00:00Z`).toLocaleDateString("fr-BE", { day: "numeric", month: "short", timeZone: "UTC" });

// ── Visites : une visite = une suite de pages d'un même navigateur, coupée
// après 30 minutes d'inactivité.
const SESSION_GAP = 30 * 60 * 1000;

export interface Session {
  visitor: string;
  start: number;
  end: number;
  day: string;
  pages: number;
  referrer: string | null;
  device: string | null;
}

export function buildSessions(views: View[]): Session[] {
  const sorted = [...views].sort((a, b) => (a.created_at < b.created_at ? -1 : 1));
  const last = new Map<string, Session>();
  const out: Session[] = [];
  let anon = 0;
  for (const v of sorted) {
    const t = Date.parse(v.created_at);
    const vid = v.visitor_id ?? `anon:${anon++}`;
    const cur = last.get(vid);
    if (cur && t - cur.end <= SESSION_GAP) {
      cur.pages++;
      cur.end = t;
    } else {
      const s: Session = { visitor: vid, start: t, end: t, day: dayKey(t), pages: 1, referrer: v.referrer, device: v.device };
      last.set(vid, s);
      out.push(s);
    }
  }
  return out;
}

// ── Libellés des pages (site public actuel). Les pages à identifiant ou à jeton
// sont regroupées : « les annonces » comptent pour une seule ligne.
const PAGE_LABELS: Record<string, string> = {
  "/": "Accueil",
  "/nos-offres": "Nos vols",
  "/about": "À propos",
  "/contact": "Contact",
  "/galerie": "Galerie",
  "/faq": "FAQ",
  "/devenir-pilote": "Devenir pilote",
  "/devenir-pilote/candidature": "Candidature de pilote",
  "/reservation/success": "Demande envoyée",
  "/cgp": "Conditions générales",
  "/politique-de-confidentialite": "Confidentialité",
  "/access-ebci": "Accès à l'aérodrome",
  "/login": "Connexion",
  "/register": "Inscription",
  "/maintenance": "Page de maintenance",
  "/mot-de-passe-oublie": "Mot de passe oublié",
  "/reinitialiser-mot-de-passe": "Nouveau mot de passe",
};

export function pageLabel(pathname: string): string {
  const p = pathname.length > 1 ? pathname.replace(/\/$/, "") : pathname;
  if (PAGE_LABELS[p]) return PAGE_LABELS[p];
  if (/^\/vol\/annonce\/paiement\//.test(p)) return "Paiement d'une annonce";
  if (/^\/vol\/annonce\/[^/]+\/reserver$/.test(p)) return "Formulaire de demande";
  if (/^\/vol\/annonce\/[^/]+$/.test(p)) return "Pages des annonces";
  if (p.startsWith("/nos-pilotes/")) return "Pages des pilotes";
  if (p.startsWith("/account")) return "Espace client";
  if (/^\/(reservation\/(messages|reporter|creneau-propose)|vol\/proposition|contact\/ticket)\//.test(p)) return "Suivi d'une demande (lien reçu par email)";
  return p;
}

const isAnnoncePage = (p: string) => /^\/vol\/annonce\/(?!paiement(\/|$))[^/]+\/?$/.test(p);
const isFormPage = (p: string) => /^\/vol\/annonce\/[^/]+\/reserver\/?$/.test(p);

function sourceLabel(ref: string | null): string | null {
  if (!ref) return "Direct";
  try {
    const h = new URL(ref).hostname.replace(/^www\./, "");
    if (h.includes("fly-horizons")) return null; // le site lui-même : pas une source
    if (h.includes("google")) return "Google";
    if (h.includes("bing")) return "Bing";
    if (h.includes("duckduckgo")) return "DuckDuckGo";
    if (h.includes("facebook") || h.includes("fb.com") || h === "l.facebook.com") return "Facebook";
    if (h.includes("instagram")) return "Instagram";
    if (h.includes("linkedin") || h.includes("lnkd.in")) return "LinkedIn";
    if (h.includes("whatsapp")) return "WhatsApp";
    return h;
  } catch {
    return "Autre";
  }
}

// ── Texte enrichi : du texte et des passages en gras (rendu par la page).
export type Rich = (string | { b: string; tone?: "up" | "down" })[];

export interface Trend { pct: number | null; dir: "up" | "down" | "flat" | "new" | "none" }
function trend(cur: number, prev: number): Trend {
  // Pas de période d'avant à comparer (site récent, ou rien d'enregistré) : on n'affiche rien.
  if (prev === 0) return { pct: null, dir: "none" };
  const pct = Math.round(((cur - prev) / prev) * 100);
  return { pct, dir: Math.abs(pct) < 3 ? "flat" : pct > 0 ? "up" : "down" };
}

export interface FunnelStep {
  key: string;
  label: string;
  hint: string;
  count: number;
  /** Part des visiteurs de la période. */
  ofVisitors: number;
  /** Part de l'étape précédente de la chaîne (null pour les étapes hors chaîne). */
  ofPrev: number | null;
  /** Étape mesurée par un événement qui n'a encore rien enregistré. */
  pending?: boolean;
}

export interface Analytics {
  empty: boolean;
  visitors: number;
  visits: number;
  pages: number;
  pagesPerVisit: number;
  newShare: number;
  /** Il y a eu des visiteurs sur la période d'avant : sinon « nouveaux » ne veut rien dire. */
  hasPrev: boolean;
  tVisitors: Trend;
  tVisits: Trend;
  tPagesPerVisit: Trend;
  tNew: Trend;
  daily: { day: string; count: number; weekend: boolean; peak: boolean }[];
  dailyInsight: Rich | null;
  topPages: { label: string; count: number; share: number }[];
  sources: { label: string; share: number }[];
  devices: { desktop: number; mobile: number; tablet: number };
  deviceInsight: Rich | null;
  funnel: FunnelStep[];
  funnelInsight: Rich | null;
  brief: { lead: Rich; points: Rich[] };
}

// Espaces internes : jamais comptés. Le suivi les ignore déjà ; ce filtre écarte
// aussi les anciennes lignes enregistrées avant cette règle (espace pilote).
const INTERNAL_PATH_RE = /^\/(admin|pilote)(\/|$)/;

export function computeAnalytics(args: {
  views: View[];
  events: Ev[];
  keys: string[];
  prevKeys: string[];
}): Analytics {
  const { events, keys, prevKeys } = args;
  const views = args.views.filter((v) => !INTERNAL_PATH_RE.test(v.pathname));
  const cur = new Set(keys);
  const prev = new Set(prevKeys);
  const sessions = buildSessions(views);
  const curS = sessions.filter((s) => cur.has(s.day));
  const prevS = sessions.filter((s) => prev.has(s.day));
  const curV = views.filter((v) => cur.has(dayKey(Date.parse(v.created_at))));
  const prevV = views.filter((v) => prev.has(dayKey(Date.parse(v.created_at))));
  const curE = events.filter((e) => cur.has(dayKey(Date.parse(e.created_at))));

  const visitorsOf = (ss: Session[]) => new Set(ss.map((s) => s.visitor));
  const vis = visitorsOf(curS);
  const pvis = visitorsOf(prevS);
  const visitors = vis.size;
  const visits = curS.length;
  const pages = curV.length;
  const ppv = visits ? pages / visits : 0;
  const pppv = prevS.length ? prevV.length / prevS.length : 0;
  const newCount = [...vis].filter((v) => !pvis.has(v)).length;
  const newShare = visitors ? Math.round((newCount / visitors) * 100) : 0;

  // Série par jour
  const perDay = new Map<string, number>(keys.map((k) => [k, 0]));
  for (const s of curS) perDay.set(s.day, (perDay.get(s.day) ?? 0) + 1);
  const counts = keys.map((k) => perDay.get(k) ?? 0);
  const sortedCounts = [...counts].sort((a, b) => a - b);
  const median = sortedCounts.length ? sortedCounts[Math.floor(sortedCounts.length / 2)] : 0;
  const max = Math.max(0, ...counts);
  const peakIdx = max > 0 ? counts.indexOf(max) : -1;
  const daily = keys.map((day, i) => ({ day, count: counts[i], weekend: weekdayOfKey(day) >= 5, peak: i === peakIdx && max >= 3 }));

  // Jour de la semaine le plus chargé et effet week-end (sur 14 jours ou plus)
  let dailyInsight: Rich | null = null;
  const parts: Rich = [];
  if (peakIdx >= 0 && max >= 5 && max >= 2 * Math.max(median, 1)) {
    if (median >= 1) parts.push({ b: `Pic le ${fmtDay(keys[peakIdx])} : ${fr(max)} visites` }, `, soit ${Math.round(max / median)} fois un jour normal (environ ${fr(median)}). `);
    else parts.push({ b: `Pic le ${fmtDay(keys[peakIdx])} : ${fr(max)} visites` }, ", alors que la plupart des jours en comptent très peu. ");
  }
  if (keys.length >= 14 && visits >= 20) {
    const sums = Array(7).fill(0) as number[];
    const occ = Array(7).fill(0) as number[];
    keys.forEach((k, i) => { const w = weekdayOfKey(k); sums[w] += counts[i]; occ[w]++; });
    const avg = sums.map((s, i) => (occ[i] ? s / occ[i] : 0));
    const best = avg.indexOf(Math.max(...avg));
    const we = (sums[5] + sums[6]) / Math.max(occ[5] + occ[6], 1);
    const wk = (sums[0] + sums[1] + sums[2] + sums[3] + sums[4]) / Math.max(occ[0] + occ[1] + occ[2] + occ[3] + occ[4], 1);
    if (wk > 0 && we / wk >= 1.25) parts.push(`Le week-end amène en moyenne ${Math.round((we / wk - 1) * 100)} % de visites en plus qu'en semaine. `);
    else if (wk > 0 && we / wk <= 0.8) parts.push(`Le week-end est plus calme qu'en semaine (${Math.round((1 - we / wk) * 100)} % de visites en moins). `);
    parts.push({ b: `Le ${WD_NAMES[best]}` }, ` est le jour le plus fréquenté.`);
  }
  if (parts.length) dailyInsight = parts;

  // Pages les plus vues
  const byPage = new Map<string, number>();
  for (const v of curV) byPage.set(pageLabel(v.pathname), (byPage.get(pageLabel(v.pathname)) ?? 0) + 1);
  const topPages = [...byPage.entries()].sort((a, b) => b[1] - a[1]).slice(0, 7)
    .map(([label, count]) => ({ label, count, share: pages ? Math.round((count / pages) * 100) : 0 }));

  // Sources (par visite, hors navigation interne)
  const bySource = new Map<string, number>();
  let srcTotal = 0;
  for (const s of curS) {
    const l = sourceLabel(s.referrer);
    if (l === null) continue;
    bySource.set(l, (bySource.get(l) ?? 0) + 1);
    srcTotal++;
  }
  const sources = [...bySource.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5)
    .map(([label, c]) => ({ label, share: srcTotal ? Math.round((c / srcTotal) * 100) : 0 }));

  // Appareils (par visite)
  const dev = { desktop: 0, mobile: 0, tablet: 0 };
  for (const s of curS) if (s.device && s.device in dev) dev[s.device as keyof typeof dev]++;
  const devTotal = dev.desktop + dev.mobile + dev.tablet;
  const devPct = {
    desktop: devTotal ? Math.round((dev.desktop / devTotal) * 100) : 0,
    mobile: devTotal ? Math.round((dev.mobile / devTotal) * 100) : 0,
    tablet: devTotal ? Math.round((dev.tablet / devTotal) * 100) : 0,
  };
  let deviceInsight: Rich | null = null;
  if (devTotal >= 10) {
    if (devPct.mobile >= 60) deviceInsight = [{ b: `${devPct.mobile >= 66 ? "Plus des deux tiers" : "La majorité"} des visites viennent du téléphone.` }, " La version mobile du site est donc la version principale."];
    else if (devPct.desktop >= 60) deviceInsight = [{ b: "La majorité des visites viennent d'un ordinateur." }, " Les pages se lisent surtout sur grand écran."];
    else deviceInsight = [{ b: "Téléphone et ordinateur se partagent les visites." }, " Les deux versions du site comptent autant."];
  }

  // ── Parcours : de la visite à la demande envoyée
  const seen = (pred: (p: string) => boolean) => new Set(curV.filter((v) => v.visitor_id && pred(v.pathname)).map((v) => v.visitor_id as string));
  const evSet = (name: string) => new Set(curE.filter((e) => e.name === name && e.visitor_id).map((e) => e.visitor_id as string));
  const allVisitors = new Set(curV.filter((v) => v.visitor_id).map((v) => v.visitor_id as string));
  const nosVols = seen((p) => p === "/nos-offres");
  const annonce = seen(isAnnoncePage);
  const form = seen(isFormPage);
  const creneau = evSet("creneau_choisi");
  const infos = evSet("etape_infos");
  const sent = seen((p) => p === "/reservation/success");
  const eventsMeasured = curE.length > 0;

  const base = allVisitors.size;
  const pct = (n: number, d: number) => (d ? Math.round((n / d) * 100) : 0);
  const funnel: FunnelStep[] = [
    { key: "visite", label: "Ont visité le site", hint: "Toute page", count: base, ofVisitors: 100, ofPrev: null },
    { key: "vols", label: "Ont vu Nos vols", hint: "La liste des annonces", count: nosVols.size, ofVisitors: pct(nosVols.size, base), ofPrev: null },
    { key: "annonce", label: "Ont ouvert une annonce", hint: "Depuis la liste, un lien partagé ou un pilote", count: annonce.size, ofVisitors: pct(annonce.size, base), ofPrev: null },
  ];
  // La suite est une chaîne : chaque étape ne garde que ceux qui ont franchi la précédente.
  let chain = annonce;
  const steps: { key: string; label: string; hint: string; set: Set<string>; pending?: boolean }[] = [
    { key: "form", label: "Ont ouvert le formulaire", hint: "Bouton « Réserver »", set: form },
    { key: "creneau", label: "Ont choisi un créneau", hint: "Date et heure", set: creneau, pending: !eventsMeasured },
    { key: "infos", label: "Sont passés aux informations", hint: "Étape 2 sur 2", set: infos, pending: !eventsMeasured },
    { key: "sent", label: "Ont envoyé une demande", hint: "Page « Demande envoyée »", set: sent },
  ];
  for (const st of steps) {
    if (st.pending) {
      funnel.push({ key: st.key, label: st.label, hint: st.hint, count: 0, ofVisitors: 0, ofPrev: null, pending: true });
      continue;
    }
    const next = new Set([...chain].filter((v) => st.set.has(v)));
    funnel.push({ key: st.key, label: st.label, hint: st.hint, count: next.size, ofVisitors: pct(next.size, base), ofPrev: pct(next.size, chain.size) });
    chain = next;
  }

  // Où l'on perd le plus de monde (parmi les étapes mesurées, d'au moins 5 visiteurs)
  let funnelInsight: Rich | null = null;
  if (base < 20) {
    funnelInsight = ["Pas encore assez de visites pour tirer une conclusion : il en faut une vingtaine au moins."];
  } else {
    const chainSteps = [{ key: "annonce", count: annonce.size }, ...funnel.filter((f) => ["form", "creneau", "infos", "sent"].includes(f.key) && !f.pending)];
    let worst: { from: string; to: string; lost: number; rate: number } | null = null;
    const first = { from: "visite", to: "annonce", lost: base - annonce.size, rate: base ? (base - annonce.size) / base : 0 };
    if (base >= 5) worst = first;
    for (let i = 1; i < chainSteps.length; i++) {
      const a = chainSteps[i - 1].count, b = chainSteps[i].count;
      if (a < 5) continue;
      const rate = (a - b) / a;
      if (!worst || rate > worst.rate) worst = { from: chainSteps[i - 1].key, to: chainSteps[i].key, lost: a - b, rate };
    }
    if (worst) {
      const p = Math.round(worst.rate * 100);
      const MSG: Record<string, string> = {
        "visite>annonce": `${p} % des visiteurs n'ouvrent aucune annonce. Ils repartent après la première page : c'est là qu'un appel plus clair à voir les vols aurait le plus d'effet.`,
        "annonce>form": `${p} % de ceux qui ouvrent une annonce ne vont pas jusqu'au formulaire. Le prix, la description ou les photos ne les décident pas.`,
        "form>creneau": `${p} % de ceux qui ouvrent le formulaire ne choisissent aucun créneau. Le calendrier manque peut-être de dates qui leur conviennent.`,
        "creneau>infos": `${p} % de ceux qui choisissent un créneau ne passent pas à l'étape suivante. Vérifie que le bouton « Continuer » se voit bien sur téléphone.`,
        "infos>sent": `${p} % de ceux qui arrivent aux informations n'envoient pas leur demande. Trop de champs, ou une hésitation au moment de confirmer.`,
        "annonce>sent": `${p} % de ceux qui ouvrent une annonce n'envoient pas de demande.`,
      };
      funnelInsight = [{ b: `Le plus gros écart est ${worst.from === "visite" ? "entre la visite et les annonces" : "à cette étape"}` }, ` : ${MSG[`${worst.from}>${worst.to}`] ?? `${p} % ne passent pas à l'étape suivante.`}`];
    }
  }

  // ── Synthèse
  const periodLabel = keys.length === 1 ? "aujourd'hui" : `ces ${keys.length} derniers jours`;
  const tV = trend(visitors, pvis.size);
  const empty = visits === 0;
  const lead: Rich = [];
  if (empty) {
    lead.push(`Aucune visite enregistrée ${periodLabel}.`);
  } else {
    lead.push(`${cap(periodLabel)}, `, { b: `${fr(visitors)} ${visitors > 1 ? "personnes ont" : "personne a"}` }, " visité le site");
    if (tV.dir === "up" && tV.pct !== null) lead.push(", ", { b: `${tV.pct} % de plus`, tone: "up" }, " que sur la période d'avant");
    else if (tV.dir === "down" && tV.pct !== null) lead.push(", ", { b: `${Math.abs(tV.pct)} % de moins`, tone: "down" }, " que sur la période d'avant");
    else if (tV.dir === "flat") lead.push(", à peu près autant que sur la période d'avant");
    lead.push(". Elles ont ouvert ", { b: `${fr(pages)} pages` });
    const topSrc = sources[0];
    const topDev = (Object.entries(devPct).sort((a, b) => b[1] - a[1])[0] ?? [null, 0]) as [keyof typeof devPct | null, number];
    const DEV_FR = { desktop: "ordinateur", mobile: "téléphone", tablet: "tablette" } as const;
    if (topSrc && topSrc.share >= 30 && topSrc.label !== "Direct") lead.push(", la plupart depuis ", { b: topSrc.label });
    else if (topSrc && topSrc.label === "Direct" && topSrc.share >= 30) lead.push(", la plupart en tapant directement l'adresse ou depuis un lien sans origine");
    if (topDev[0] && topDev[1] >= 50) lead.push(topSrc ? ", sur " : ", surtout sur ", { b: DEV_FR[topDev[0]] });
    lead.push(".");
  }
  const points: Rich[] = [];
  if (!empty && topPages[0]) {
    points.push(["La page la plus regardée est ", { b: topPages[0].label }, ` (${topPages[0].share} % des pages vues).`]);
  }
  if (!empty) {
    const sentN = funnel.find((f) => f.key === "sent")?.count ?? 0;
    if (base >= 20) points.push([`Sur 100 visiteurs, `, { b: String(Math.round((annonce.size / base) * 100)) }, " ouvrent une annonce et ", { b: String(Math.round((sentN / base) * 100)) }, " envoient une demande. C'est le chiffre à surveiller."]);
    else points.push([{ b: String(sentN) }, ` demande${sentN > 1 ? "s" : ""} envoyée${sentN > 1 ? "s" : ""} pour ${fr(base)} visiteur${base > 1 ? "s" : ""} : trop peu de visites pour en tirer un taux.`]);
  }
  if (dailyInsight && keys.length >= 14) {
    const bestDay = dailyInsight.find((x) => typeof x !== "string" && x.b.startsWith("Le ")) as { b: string } | undefined;
    if (bestDay) points.push([{ b: bestDay.b }, " est le jour le plus fréquenté : c'est le bon moment pour publier une annonce."]);
  }

  return {
    empty,
    visitors, visits, pages,
    pagesPerVisit: Math.round(ppv * 10) / 10,
    newShare,
    hasPrev: pvis.size > 0,
    tVisitors: tV,
    tVisits: trend(visits, prevS.length),
    tPagesPerVisit: trend(Math.round(ppv * 10), Math.round(pppv * 10)),
    tNew: { pct: null, dir: "none" },
    daily, dailyInsight, topPages, sources,
    devices: devPct, deviceInsight,
    funnel, funnelInsight,
    brief: { lead, points },
  };
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
