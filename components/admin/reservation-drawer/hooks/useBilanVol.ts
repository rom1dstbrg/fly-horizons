"use client";

import { useState, useTransition } from "react";
import { updateReservationAllFields } from "@/lib/actions/reservation-edit";
import type { DrawerReservation } from "../types";

export function useBilanVol(
  reservation: DrawerReservation | null,
  showFeedback: (msg: string, ok?: boolean) => void
) {
  const [open, setOpen] = useState(false);
  const [dureeReelle, setDureeReelle] = useState("");
  const [tarifEcole, setTarifEcole] = useState<number | null>(null);
  const [isPending, startTransition] = useTransition();

  function reset(res: DrawerReservation | null) {
    setOpen(false);
    setDureeReelle(res?.duree_reelle != null ? String(res.duree_reelle) : "");
    setTarifEcole(null);
  }

  function toggle() {
    if (!open && tarifEcole === null && reservation) {
      import("@/lib/supabase/client").then(({ createClient }) => {
        createClient()
          .from("avion_tarifs")
          .select("prix_heure, actif_depuis")
          .order("actif_depuis", { ascending: false })
          .then(({ data }) => {
            if (data && data.length > 0) {
              const applicable = data.find(t => t.actif_depuis <= reservation.date_vol) ?? data[data.length - 1];
              setTarifEcole(applicable.prix_heure);
            }
          });
      });
    }
    setOpen(v => !v);
  }

  function save() {
    if (!reservation) return;
    const dureeR = parseInt(dureeReelle);
    if (isNaN(dureeR) || dureeR <= 0) return;
    startTransition(async () => {
      const res = await updateReservationAllFields(reservation.id, {}, { duree_reelle: dureeR });
      if (res.error) { showFeedback("Erreur : " + res.error, false); return; }
      showFeedback("Bilan vol enregistré ✓");
    });
  }

  const dureeR = parseInt(dureeReelle) || 0;
  const prixDemande = reservation?.acompte ?? 0;
  const coutEcole = tarifEcole !== null && dureeR > 0
    ? Math.round((tarifEcole / 60) * dureeR * 100) / 100
    : null;
  const resultat = coutEcole !== null && prixDemande > 0
    ? Math.round((prixDemande - coutEcole) * 100) / 100
    : null;

  return {
    open, toggle, reset,
    dureeReelle, setDureeReelle,
    tarifEcole, prixDemande, coutEcole, resultat, dureeR,
    isPending, save,
  };
}
