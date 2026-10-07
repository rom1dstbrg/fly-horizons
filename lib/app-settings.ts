// Réglages de l'admin (page Paramètres, 01/10) : un seul endroit pour les clés
// `crm_settings`, leurs valeurs par défaut et leur validation. Les défauts sont
// exactement les valeurs qui étaient écrites en dur dans le code : tant qu'on ne
// touche à rien, rien ne change. Module pur (aucun accès base) : importable côté
// client comme côté serveur. La lecture en base est dans app-settings-server.ts.

export interface AppSettings {
  // Site
  maintenanceMode: boolean;
  maintenanceMessage: string;
  maintenanceReopenDate: string;
  calendarClosed: boolean;
  calendarClosedMessage: string;
  chatEnabled: boolean;
  // Réservations
  minJours: number;
  rappelClientH: number;
  annulationImpayeH: number;
  delaiReponsePiloteH: number;
  validitePropositionH: number;
  bilanRappelH: number;
  bilanRelanceH: number;
  // Suivi et alertes (seuils orange puis rouge)
  sansReponseOrangeH: number;
  sansReponseRougeH: number;
  clientPayeOrangeH: number;
  clientPayeRougeH: number;
  paiementOrangeJ: number;
  paiementRougeJ: number;
  nonClotureOrangeH: number;
  nonClotureRougeH: number;
  reportOrangeJ: number;
  reportRougeJ: number;
  satisfactionOrangeJ: number;
  satisfactionRougeJ: number;
  sansHeureActif: boolean;
  // Notifications
  notifSansReponse: boolean;
  notifReport: boolean;
  notifSatisfaction: boolean;
  notifPaiement: boolean;
  notifClientPaye: boolean;
  notifNonCloture: boolean;
  notifNiveau: "warn" | "bad";
  // Finances
  partType: "pourcentage" | "montant";
  partValeur: number;
}

type Kind = "bool" | "text" | "int" | "enum";
interface Def { key: string; kind: Kind; def: boolean | number | string; min?: number; max?: number; options?: readonly string[] }

export const SETTING_DEFS: { [K in keyof AppSettings]: Def } = {
  maintenanceMode:       { key: "maintenance_mode",        kind: "bool", def: true },
  maintenanceMessage:    { key: "maintenance_message",     kind: "text", def: "" },
  maintenanceReopenDate: { key: "maintenance_reopen_date", kind: "text", def: "" },
  calendarClosed:        { key: "calendar_closed",         kind: "bool", def: false },
  calendarClosedMessage: { key: "calendar_closed_message", kind: "text", def: "" },
  chatEnabled:           { key: "chat_enabled",            kind: "bool", def: true },

  minJours:             { key: "reservation_min_jours",   kind: "int", def: 2,  min: 0, max: 60 },
  rappelClientH:        { key: "rappel_client_heures",    kind: "int", def: 48, min: 2, max: 168 },
  annulationImpayeH:    { key: "annulation_impaye_heures", kind: "int", def: 48, min: 1, max: 336 },
  delaiReponsePiloteH:  { key: "delai_reponse_pilote_heures", kind: "int", def: 72, min: 1, max: 336 },
  validitePropositionH: { key: "validite_proposition_heures", kind: "int", def: 48, min: 1, max: 336 },
  bilanRappelH:         { key: "bilan_rappel_heures",     kind: "int", def: 8,  min: 1, max: 168 },
  bilanRelanceH:        { key: "bilan_relance_heures",    kind: "int", def: 24, min: 1, max: 336 },

  sansReponseOrangeH: { key: "signal_sans_reponse_orange_h", kind: "int", def: 36, min: 1, max: 720 },
  sansReponseRougeH:  { key: "signal_sans_reponse_rouge_h",  kind: "int", def: 48, min: 1, max: 720 },
  clientPayeOrangeH:  { key: "signal_client_paye_orange_h",  kind: "int", def: 36, min: 1, max: 720 },
  clientPayeRougeH:   { key: "signal_client_paye_rouge_h",   kind: "int", def: 48, min: 1, max: 720 },
  paiementOrangeJ:    { key: "signal_paiement_orange_j",     kind: "int", def: 3,  min: 1, max: 60 },
  paiementRougeJ:     { key: "signal_paiement_rouge_j",      kind: "int", def: 5,  min: 1, max: 60 },
  nonClotureOrangeH:  { key: "signal_non_cloture_orange_h",  kind: "int", def: 24, min: 1, max: 720 },
  nonClotureRougeH:   { key: "signal_non_cloture_rouge_h",   kind: "int", def: 72, min: 1, max: 720 },
  reportOrangeJ:      { key: "signal_report_orange_j",       kind: "int", def: 7,  min: 1, max: 90 },
  reportRougeJ:       { key: "signal_report_rouge_j",        kind: "int", def: 12, min: 1, max: 90 },
  satisfactionOrangeJ: { key: "signal_satisfaction_orange_j", kind: "int", def: 5,  min: 1, max: 90 },
  satisfactionRougeJ:  { key: "signal_satisfaction_rouge_j",  kind: "int", def: 10, min: 1, max: 90 },
  sansHeureActif:     { key: "signal_sans_heure_actif",      kind: "bool", def: true },

  notifSansReponse: { key: "notif_sans_reponse", kind: "bool", def: true },
  notifReport:      { key: "notif_report",       kind: "bool", def: true },
  notifSatisfaction: { key: "notif_satisfaction", kind: "bool", def: true },
  notifPaiement:    { key: "notif_paiement",     kind: "bool", def: true },
  notifClientPaye:  { key: "notif_client_paye",  kind: "bool", def: true },
  notifNonCloture:  { key: "notif_non_cloture",  kind: "bool", def: true },
  notifNiveau:      { key: "notif_niveau",       kind: "enum", def: "warn", options: ["warn", "bad"] },

  partType:   { key: "part_pilote_type",   kind: "enum", def: "pourcentage", options: ["pourcentage", "montant"] },
  partValeur: { key: "part_pilote_valeur", kind: "int", def: 25, min: 0, max: 100000 },
};

export const DEFAULT_SETTINGS = Object.fromEntries(
  Object.entries(SETTING_DEFS).map(([k, d]) => [k, d.def]),
) as unknown as AppSettings;

/** Lignes `crm_settings` → réglages typés (clé absente ou illisible : valeur par défaut). */
export function parseSettings(rows: { key: string; value: string }[] | null | undefined): AppSettings {
  const byKey = new Map((rows ?? []).map((r) => [r.key, r.value]));
  const out: Record<string, unknown> = {};
  for (const [name, d] of Object.entries(SETTING_DEFS)) {
    const raw = byKey.get(d.key);
    if (raw === undefined || raw === null) { out[name] = d.def; continue; }
    if (d.kind === "bool") out[name] = raw === "true";
    else if (d.kind === "int") {
      const n = parseFloat(raw);
      out[name] = Number.isFinite(n) ? n : d.def;
    } else if (d.kind === "enum") out[name] = d.options?.includes(raw) ? raw : d.def;
    else out[name] = raw;
  }
  return out as unknown as AppSettings;
}

/** Valide un lot de modifications. Renvoie les lignes à écrire, ou un message d'erreur. */
export function serializePatch(patch: Partial<AppSettings>): { rows: { key: string; value: string }[] } | { error: string } {
  const rows: { key: string; value: string }[] = [];
  for (const [name, v] of Object.entries(patch)) {
    const d = SETTING_DEFS[name as keyof AppSettings];
    if (!d) return { error: "Réglage inconnu." };
    if (d.kind === "bool") {
      if (typeof v !== "boolean") return { error: "Valeur invalide." };
      rows.push({ key: d.key, value: String(v) });
    } else if (d.kind === "int") {
      if (typeof v !== "number" || !Number.isFinite(v) || v < (d.min ?? 0) || v > (d.max ?? Infinity)) {
        return { error: `Valeur hors limites (${d.min} à ${d.max}).` };
      }
      rows.push({ key: d.key, value: String(v) });
    } else if (d.kind === "enum") {
      if (typeof v !== "string" || !d.options?.includes(v)) return { error: "Valeur invalide." };
      rows.push({ key: d.key, value: v });
    } else {
      if (typeof v !== "string" || v.length > 600) return { error: "Texte trop long." };
      rows.push({ key: d.key, value: v.trim() });
    }
  }
  const merged = { ...DEFAULT_SETTINGS, ...patch };
  if (merged.sansReponseOrangeH >= merged.sansReponseRougeH
    || merged.clientPayeOrangeH >= merged.clientPayeRougeH
    || merged.paiementOrangeJ >= merged.paiementRougeJ
    || merged.nonClotureOrangeH >= merged.nonClotureRougeH
    || merged.reportOrangeJ >= merged.reportRougeJ
    || merged.satisfactionOrangeJ >= merged.satisfactionRougeJ) {
    return { error: "Le seuil rouge doit être plus grand que le seuil orange." };
  }
  return { rows };
}
