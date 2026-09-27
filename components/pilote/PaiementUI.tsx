import { AlertTriangle, Check, Clock } from "lucide-react";
import { Badge } from "@/components/pilote/studio";
import type { PaiementEtat } from "@/lib/pilote/transactions-shared";

// Éléments communs du paiement d'un passager : une seule source pour la page
// Transactions et le bloc « Règlement » du tiroir d'un vol.

const eur = (v: number) => v.toLocaleString("fr-BE", { maximumFractionDigits: 2 }) + " €";
const pct = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 100) : 0);
const jj_mm = (iso: string) =>
  new Date(iso).toLocaleDateString("fr-BE", { day: "2-digit", month: "2-digit", timeZone: "Europe/Brussels" });

export function EtatBadge({ etat }: { etat: PaiementEtat }) {
  if (etat === "recu") return <Badge tone="success"><Check className="size-3" />Reçu</Badge>;
  if (etat === "relance") return <Badge tone="warning"><AlertTriangle className="size-3" />À relancer</Badge>;
  return <Badge tone="neutral"><Clock className="size-3" />En attente</Badge>;
}

// Une ligne qui dit où en est le paiement (« reçu le 19/09 », « vol fait il y a 3 jours »).
export function paiementDetail(
  t: { etat: PaiementEtat; payeLe: string | null; montant: number | null; date: string },
  today: string,
): string {
  if (t.etat === "recu") return t.payeLe ? `reçu le ${jj_mm(t.payeLe)}` : "reçu";
  if (t.montant == null) return "prix fixé à la clôture du groupe";
  if (t.etat === "attente") return `vol le ${jj_mm(t.date + "T12:00:00Z")}`;
  const jours = Math.round((new Date(today + "T12:00:00Z").getTime() - new Date(t.date + "T12:00:00Z").getTime()) / 86400000);
  return jours <= 0 ? "vol fait aujourd'hui" : `vol fait il y a ${jours} jour${jours > 1 ? "s" : ""}`;
}

// Barre du partage des frais d'un vol : passagers en navy, pilote en or.
export function PartageFrais({ cout, part }: { cout: number; part: number }) {
  const pax = Math.max(0, cout - part);
  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-[13px] font-semibold text-st-text">Partage des frais du vol</p>
        <span className="st-num text-[12.5px] text-st-muted">{eur(cout)}</span>
      </div>
      <div className="flex h-2.5 gap-0.5 overflow-hidden rounded-full">
        {pax > 0 && <span className="bg-st-ink" style={{ flex: pax }} />}
        {part > 0 && <span className="bg-st-gold" style={{ flex: part }} />}
      </div>
      <div className="mt-2 flex flex-wrap justify-between gap-x-4 gap-y-1 text-[12px] text-st-text-2">
        <span className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-[3px] bg-st-ink" />Passagers <b className="st-num font-semibold text-st-text">{eur(pax)}</b></span>
        <span className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-[3px] bg-st-gold" />Vous <b className="st-num font-semibold text-st-text">{eur(part)} · {pct(part, cout)} %</b></span>
      </div>
    </div>
  );
}
