import { getResaBadge } from "@/components/admin/ui/resaBadge";
import type { BadgeVariant } from "@/components/admin/ui/statuts";
import { ROUTE_STATUS_CONFIG } from "@/components/admin/reservation-drawer/types";
import { Badge, type BadgeTone } from "@/components/pilote/studio";

// Statut d'une réservation dans l'espace pilote : mêmes libellés que l'admin
// (getResaBadge), teintes Studio. Une seule source pour toutes les pages pilote.
const TONE: Record<BadgeVariant, BadgeTone> = {
  warning: "warning",
  orange: "warning",
  info: "info",
  success: "success",
  emerald: "success",
  primary: "ink",
  danger: "danger",
  secondary: "neutral",
};

export function ResaBadge({ reservation }: { reservation: Parameters<typeof getResaBadge>[0] }) {
  const { label, variant } = getResaBadge(reservation);
  return <Badge tone={TONE[variant] ?? "neutral"}>{label}</Badge>;
}

// Dernier état de la route proposée au client.
export function RouteStatusBadge({ status }: { status: string | null }) {
  const conf = status ? ROUTE_STATUS_CONFIG[status] : null;
  if (!conf) return null;
  const ok = status === "accepted" || status === "validated";
  return <Badge size="sm" tone={ok ? "success" : "warning"}>{conf.label.replace(" ✓", "")}</Badge>;
}

// Étiquette « Annonce » : vol issu d'une annonce publiée par le pilote.
export function AnnonceTag() {
  return <Badge size="sm" tone="gold">Annonce</Badge>;
}
