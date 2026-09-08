// Bloc A · item 5 — statut légal du pilote, recalculé à chaque lecture.
//
// legal_ok = licence renseignée + licence/medical non expirés + charte acceptée.
// Un pilote dont le statut légal n'est pas "ok" ne peut pas se voir attribuer de
// vol (assignation manuelle et mise en jeu, Blocs B et C).

export type PiloteLegalFields = {
  licence_numero: string | null;
  licence_expiration: string | null; // 'YYYY-MM-DD'
  medical_expiration: string | null; // 'YYYY-MM-DD'
  conditions_accepted_at: string | null;
};

export type LegalIssueSeverity = "error" | "warn";

export type LegalIssue = {
  code: string;
  label: string;
  severity: LegalIssueSeverity;
  // Champ du formulaire concerné, quand il y en a un (permet de surligner l'input).
  field?: "licence_numero" | "licence_expiration" | "medical_expiration";
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
  checkExpiry(p.licence_expiration, "licence", "Licence / SEP", "licence_expiration");
  checkExpiry(p.medical_expiration, "medical", "Certificat médical", "medical_expiration");
  if (!p.conditions_accepted_at) {
    issues.push({ code: "charte", label: "Charte pilote non acceptée", severity: "error" });
  }

  return { ok: !issues.some((i) => i.severity === "error"), issues };
}
