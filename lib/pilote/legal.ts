// Bloc A · item 5 — statut légal du pilote, recalculé à chaque lecture.
//
// legal_ok = licence renseignée + SEP/médical non expirés + classe médicale
// + documents vérifiés par Romain (docs_status) + charte acceptée.
// L'expérience récente (3 décollages et atterrissages en 90 jours, FCL.060) n'est
// pas une date du profil : trop complexe à déclarer justement. Le pilote la
// confirme dans la déclaration avant chaque vol (décision 27/09).
// Un pilote dont le statut légal n'est pas "ok" ne peut pas se voir attribuer de
// vol (assignation manuelle et mise en jeu, Blocs B et C).

export type PiloteLegalFields = {
  licence_numero: string | null;
  licence_expiration: string | null; // 'YYYY-MM-DD'
  medical_expiration: string | null; // 'YYYY-MM-DD'
  medical_classe: string | null;
  docs_status: string | null; // 'aucun' | 'envoyes' | 'verifies' | 'refuses'
  docs_verified_at: string | null; // posé à la 1re vérification, gardé pendant un renouvellement
  conditions_accepted_at: string | null;
};

// Colonnes à sélectionner pour appeler piloteLegalStatus.
export const PILOTE_LEGAL_SELECT =
  "licence_numero, licence_expiration, medical_expiration, medical_classe, docs_status, docs_verified_at, conditions_accepted_at";

export type LegalIssueSeverity = "error" | "warn";

export type LegalIssue = {
  code: string;
  label: string;
  severity: LegalIssueSeverity;
  // Champ du formulaire concerné, quand il y en a un (permet de surligner l'input).
  field?: "licence_numero" | "licence_expiration" | "medical_expiration" | "medical_classe" | "documents";
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

  // Renouvellement (nouveau médical, SEP prolongée) d'un pilote déjà vérifié : il
  // reste en règle sur ses dates vérifiées pendant que Romain regarde le nouveau document.
  if (p.docs_status === "envoyes" && p.docs_verified_at) {
    issues.push({ code: "docs_renewal", label: "Nouveau document en cours de vérification", severity: "warn" });
  } else if (p.docs_status === "envoyes") {
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
