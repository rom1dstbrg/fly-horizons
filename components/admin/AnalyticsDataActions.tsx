"use client";

import { useState, useTransition } from "react";
import { Download } from "lucide-react";
import { Button, buttonClasses } from "@/components/pilote/studio";
import { resetAnalytics } from "@/app/admin/analytics/actions";

// Export des données brutes et remise à zéro (confirmation en deux temps, comme
// la suppression des tiroirs : le bouton change de libellé, puis revient seul).
export function AnalyticsDataActions() {
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  function reset() {
    if (!confirming) {
      setConfirming(true);
      setTimeout(() => setConfirming(false), 4000);
      return;
    }
    start(async () => {
      const r = await resetAnalytics();
      if (r && "error" in r && r.error) setError(r.error);
      setConfirming(false);
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {error && <span className="text-[13px] text-st-bad">{error}</span>}
      {/* Téléchargement d'un fichier : lien simple. */}
      <a href="/api/analytics/export" download className={buttonClasses({ variant: "secondary" })}>
        <Download /> Exporter en CSV
      </a>
      <Button variant="danger" loading={pending} onClick={reset}>
        {confirming ? "Confirmer la suppression" : "Réinitialiser"}
      </Button>
    </div>
  );
}
