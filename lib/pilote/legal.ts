// Bloc A · item 5 — statut légal du pilote, recalculé à chaque lecture.
//
// legal_ok = licence renseignée + SEP/médical non expirés + classe médicale +
// expérience récente valide (3 décollages et atterrissages en 90 jours, FCL.060)
// + documents vérifiés par Romain (docs_status) + charte acceptée.
// Un pilote dont le statut légal n'est pas "ok" ne peut pas se voir attribuer de
// vol (assignation manuelle et mise en jeu, Blocs B et C).

export type PiloteLegalFields = {
  licence_numero: string | null;
  licence_expiration: string | null; // 'YYYY-MM-DD'
  medical_expiration: string | null; // 'YYYY-MM-DD'
  medical_classe: string | null;
  recence_date: string | null; // date du 3e atterrissage le plus récent
  docs_status: string | null; // 'aucun' | 'envoyes' | 'verifies' | 'refuses'
  conditions_accepted_at: string | null;
};

// Colonnes à sélectionner pour appeler piloteLegalStatus.
export const PILOTE_LEGAL_SELECT =
  "licence_numero, licence_expiration, medical_expiration, medical_classe, recence_date, docs_status, conditions_accepted_at";

// Expérience récente : valable 90 jours après le 3e atterrissage le plus récent.
export const RECENCE_DAYS = 90;
export function recenceValidUntil(recenceDate: string | null): string | null {
  if (!recenceDate) return null;
  const d = new Date(`${recenceDate}T00:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  d.setDate(d.getDate() + RECENCE_DAYS);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export type LegalIssueSeverity = "error" | "warn";

export type LegalIssue = {
  code: string;
  label: string;
  severity: LegalIssueSeverity;
  // Champ du formulaire concerné, quand il y en a un (permet de surligner l'input).
  field?: "licence_numero" | "licence_expiration" | "medical_expiration" | "medical_classe" | "recence_date" | "documents";
};

export type PiloteLegalStatus = {
  ok: boolean; // aucun problème bloquant (severity "error")
  issues: LegalIssue[]; // erreurs + avertissements (expiration proche)
};

// Fenêtre d'avertissement avant expiration.
const WARN_DAYS = 30;

function frDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  return d && m && y ? `${d}/${m}/${y}` : iso;
}

export function piloteLegalStatus(p: PiloteLegalFields | null | undefined): PiloteLegalStatus {
  if (!p) {
    return { ok: false, issues: [{ code: "no_fiche", label: "Fiche pilote introuvable", severity: "error" }] };
  }

  const issues: LegalIssue[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const warnLimit = new Date(today);
  warnLimit.setDate(warnLimit.getDate() + WARN_DAYS);

  const checkExpiry = (
    value: string | null,
    code: string,
    label: string,
    field: LegalIssue["field"],
  ) => {
    if (!value) {
      issues.push({ code: `${code}_missing`, label: `${label} : date d'expiration non renseignée`, severity: "error", field });
      return;
    }
    const d = new Date(`${value}T00:00:00`);
    if (Number.isNaN(d.getTime())) {
      issues.push({ code: `${code}_invalid`, label: `${label} : date invalide`, severity: "error", field });
      return;
    }
    if (d < today) {
      issues.push({ code: `${code}_expired`, label: `${label} expiré le ${frDate(value)}`, severity: "error", field });
    } else if (d < warnLimit) {
      issues.push({ code: `${code}_soon`, label: `${label} expire le ${frDate(value)}`, severity: "warn", field });
    }
  };

  if (!p.licence_numero?.trim()) {
    issues.push({ code: "licence_numero", label: "Numéro de licence non renseigné", severity: "error", field: "licence_numero" });
  }
  checkExpiry(p.licence_expiration, "licence", "Qualification SEP", "licence_expiration");
  checkExpiry(p.medical_expiration, "medical", "Certificat médical", "medical_expiration");
  if (!p.medical_classe) {
    issues.push({ code: "medical_classe", label: "Classe du certificat médical non renseignée", severity: "error", field: "medical_classe" });
  }

  const recence = recenceValidUntil(p.recence_date);
  if (!recence) {
    issues.push({ code: "recence_missing", label: "Expérience récente non renseignée (3 décollages et atterrissages en 90 jours)", severity: "error", field: "recence_date" });
  } else {
    const until = new Date(`${recence}T00:00:00`);
    const soon = new Date(today);
    soon.setDate(soon.getDate() + 14);
    if (until < today) {
      issues.push({ code: "recence_expired", label: `Expérience récente échue le ${frDate(recence)} (3 décollages et atterrissages en 90 jours)`, severity: "error", field: "recence_date" });
    } else if (until < soon) {
      issues.push({ code: "recence_soon", label: `Expérience récente valable jusqu'au ${frDate(recence)}`, severity: "warn", field: "recence_date" });
    }
  }

  if (p.docs_status === "envoyes") {
    issues.push({ code: "docs_pending", label: "Documents en cours de vérification par Fly Horizons", severity: "error" });
  } else if (p.docs_status === "refuses") {
    issues.push({ code: "docs_refused", label: "Documents refusés : à renvoyer", severity: "error", field: "documents" });
  } else if (p.docs_status !== "verifies") {
    issues.push({ code: "docs_missing", label: "Documents à envoyer pour vérification (licence, certificat médical)", severity: "error", field: "documents" });
  }
  if (!p.conditions_accepted_at) {
    issues.push({ code: "charte", label: "Charte pilote non acceptée", severity: "error" });
  }

  return { ok: !issues.some((i) => i.severity === "error"), issues };
}
