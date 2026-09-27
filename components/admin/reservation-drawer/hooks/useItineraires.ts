"use client";

import { useState } from "react";
import { getItineraires, incrementItineraireUsage } from "@/lib/actions/itineraires";
import type { Itineraire } from "@/lib/actions/itineraires";
import type { WaypointDraft } from "@/components/admin/AdminRouteEditor";
import { toDraft } from "@/components/pilote/itineraires/ItineraireParts";

// Ouverture du sélecteur « Charger un itinéraire » : la liste est rechargée à
// chaque ouverture (un itinéraire vient peut-être d'être créé ailleurs).
export function useItineraires(setRouteDraft: (wps: WaypointDraft[]) => void, onApplied?: (itin: Itineraire) => void) {
  const [showModal, setShowModal] = useState(false);
  const [items, setItems] = useState<Itineraire[]>([]);
  const [loading, setLoading] = useState(false);

  async function open() {
    setShowModal(true);
    setLoading(items.length === 0);
    try {
      setItems(await getItineraires());
    } finally {
      setLoading(false);
    }
  }

  function apply(itin: Itineraire) {
    setRouteDraft(toDraft(itin));
    incrementItineraireUsage(itin.id);
    onApplied?.(itin);
    setShowModal(false);
  }

  return { showModal, setShowModal, items, loading, open, apply };
}
