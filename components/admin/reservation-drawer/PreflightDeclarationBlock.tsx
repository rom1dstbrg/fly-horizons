"use client";

import { useState, useTransition } from "react";
import { ShieldCheck } from "lucide-react";
import { declarePreflight } from "@/lib/actions/pilote-declaration";
import { Button } from "@/components/pilote/studio";

// Déclaration du pilote avant le vol (décision 27/09). Le pilote coche et
// confirme ; l'admin voit seulement si c'est fait. Ne bloque pas le vol (on
// ne peut pas l'empêcher de décoller), mais laisse une trace horodatée.

const POINTS = [
  "3 décollages et 3 atterrissages dans les 90 jours avant le vol",
  "Qualification SEP et certificat médical valables le jour du vol",
  "Avion autorisé pour moi et assurance passagers en vigueur",
];

const frDateTime = (iso: string) =>
  new Date(iso).toLocaleDateString("fr-BE", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });

export function PreflightDeclarationBlock({ reservationId, declaredAt, viewerRole, onDeclared }: {
  reservationId: string;
  declaredAt: string | null;
  viewerRole: "admin" | "pilote";
  onDeclared: (at: string) => void;
}) {
  const [checked, setChecked] = useState<boolean[]>(POINTS.map(() => false));
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (declaredAt) {
    return (
      <p className="flex items-center gap-2 rounded-[12px] bg-st-ok-soft px-3.5 py-2.5 text-[13px] text-st-ok">
        <ShieldCheck size={15} className="shrink-0" />
        Déclaration avant vol faite le {frDateTime(declaredAt)}
      </p>
    );
  }

  if (viewerRole === "admin") {
    return (
      <p className="rounded-[12px] bg-st-warn-soft px-3.5 py-2.5 text-[13px] text-st-warn">
        Le pilote n&apos;a pas encore fait sa déclaration avant vol.
      </p>
    );
  }

  const all = checked.every(Boolean);

  function confirm() {
    setError(null);
    startTransition(async () => {
      const res = await declarePreflight(reservationId);
      if (res.error) setError(res.error);
      else if (res.at) onDeclared(res.at);
    });
  }

  return (
    <div className="space-y-3 rounded-[14px] border border-st-line bg-white p-4">
      <div>
        <p className="text-[13.5px] font-semibold text-st-text">Déclaration avant vol</p>
        <p className="text-[12.5px] text-st-muted">À faire avant chaque vol : elle reste dans l&apos;historique du vol.</p>
      </div>
      <div className="space-y-2">
        {POINTS.map((label, i) => (
          <label key={i} className="flex cursor-pointer items-start gap-2.5 text-[13px] text-st-text-2">
            <input
              type="checkbox"
              checked={checked[i]}
              onChange={(e) => setChecked((c) => c.map((v, j) => (j === i ? e.target.checked : v)))}
              className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-st-ink"
            />
            {label}
          </label>
        ))}
      </div>
      {error && <p className="rounded-[12px] bg-st-bad-soft px-3.5 py-2.5 text-[13px] text-st-bad">{error}</p>}
      <Button fullWidth disabled={!all} loading={pending} onClick={confirm}>Je confirme</Button>
    </div>
  );
}
