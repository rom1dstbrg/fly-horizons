"use client";

import { useState, useEffect } from "react";
import { getReservationHistory } from "@/lib/actions/reservation-edit";
import type { DrawerReservation, HistoryItem } from "../types";

export function useReservationHistory(reservation: DrawerReservation | null, activeTab: string) {
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);

  function reset() {
    setLoaded(false);
    setItems([]);
  }

  useEffect(() => {
    if (activeTab !== "historique" || loaded || !reservation) return;
    setLoading(true);
    getReservationHistory(reservation.id).then(res => {
      if (res.data) setItems(res.data as HistoryItem[]);
      setLoading(false);
      setLoaded(true);
    });
  }, [activeTab, loaded, reservation?.id]);

  return { items, loading, loaded, reset };
}
