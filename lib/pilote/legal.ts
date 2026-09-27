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

  // Le pilote envoie ses justificatifs ; Romain relève licence, SEP, médical en
  // les vérifiant (décision 27/09). Tant que rien n'est vérifié, une seule
  // alerte : les justificatifs. Ensuite, seules les dates dépassées bloquent ;
  // une valeur manquante est un avertissement pour Romain, pas pour le pilote.
  if (!p.docs_verified_at) {
    if (p.docs_status === "envoyes") {
      issues.push({ code: "docs_pending", label: "Justificatifs en cours de vérification par Romain", severity: "error" });
    } else if (p.docs_status === "refuses") {
      issues.push({ code: "docs_refused", label: "Justificatifs refusés : à renvoyer", severity: "error", field: "documents" });
    } else {
      issues.push({ code: "docs_missing", label: "Envoyez vos justificatifs (licence et certificat médical)", severity: "error", field: "documents" });
    }
  } else {
    const checkExpiry = (value: string | null, code: string, label: string, field: LegalIssue["field"]) => {
      const d = value ? new Date(`${value}T00:00:00`) : null;
      if (!value || !d || Number.isNaN(d.getTime())) {
        issues.push({ code: `${code}_missing`, label: `${label} : date à compléter par Romain`, severity: "warn", field });
      } else if (d < today) {
        issues.push({ code: `${code}_expired`, label: `${label} expiré le ${frDate(value)} : envoyez le nouveau document`, severity: "error", field });
      } else if (d < warnLimit) {
        issues.push({ code: `${code}_soon`, label: `${label} expire le ${frDate(value)}`, severity: "warn", field });
      }
    };
    if (!p.licence_numero?.trim()) {
      issues.push({ code: "licence_numero", label: "Numéro de licence à compléter par Romain", severity: "warn", field: "licence_numero" });
    }
    checkExpiry(p.licence_expiration, "licence", "Qualification SEP", "licence_expiration");
    checkExpiry(p.medical_expiration, "medical", "Certificat médical", "medical_expiration");
    if (!p.medical_classe) {
      issues.push({ code: "medical_classe", label: "Classe médicale à compléter par Romain", severity: "warn", field: "medical_classe" });
    }
    // Renouvellement : le pilote reste en règle sur ses dates vérifiées.
    if (p.docs_status === "envoyes") {
      issues.push({ code: "docs_renewal", label: "Nouveau document en cours de vérification", severity: "warn" });
    }
  }
  if (!p.conditions_accepted_at) {
    issues.push({ code: "charte", label: "Charte pilote non acceptée", severity: "error" });
  }

  return { ok: !issues.some((i) => i.severity === "error"), issues };
}
