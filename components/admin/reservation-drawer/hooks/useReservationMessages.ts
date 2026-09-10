"use client";

import { useState, useEffect } from "react";
import { getReservationMessages, type ReservationMessage } from "@/lib/actions/reservation-messages";
import type { DrawerReservation } from "../types";

export function useReservationMessages(
  reservation: DrawerReservation | null,
  activeTab: string,
) {
  const [messages, setMessages] = useState<ReservationMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);

  function reset() {
    setLoaded(false);
    setMessages([]);
  }

  function append(msg: ReservationMessage) {
    setMessages(prev => [...prev, msg]);
  }

  function removeById(id: string) {
    setMessages(prev => prev.filter(m => m.id !== id));
  }

  useEffect(() => {
    if (activeTab !== "messages" || loaded || !reservation) return;
    setLoading(true);
    getReservationMessages(reservation.id).then(res => {
      if (res.data) setMessages(res.data);
      setLoading(false);
      setLoaded(true);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, loaded, reservation?.id]);

  return { messages, loading, loaded, reset, append, removeById };
}
