"use client";

import { useState } from "react";
import { getItineraires, incrementItineraireUsage } from "@/lib/actions/itineraires";
import type { Itineraire } from "@/lib/actions/itineraires";
import type { WaypointDraft } from "@/components/admin/AdminRouteEditor";

export function useItineraires(setRouteDraft: (wps: WaypointDraft[]) => void) {
  const [showModal, setShowModal] = useState(false);
  const [items, setItems] = useState<Itineraire[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showAll, setShowAll] = useState(false);

  async function open() {
    setShowAll(false);
    setShowModal(true);
    if (!loaded) {
      setLoading(true);
      const data = await getItineraires();
      setItems(data);
      setLoaded(true);
      setLoading(false);
    }
  }

  function apply(itin: Itineraire) {
    setRouteDraft(itin.waypoints.map(wp => ({ lat: String(wp.lat), lng: String(wp.lng), nom: wp.nom })));
    incrementItineraireUsage(itin.id);
    setShowModal(false);
  }

  return { showModal, setShowModal, items, loading, showAll, setShowAll, open, apply };
}
