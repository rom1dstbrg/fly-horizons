"use client";

import { useState, useTransition } from "react";
import { updateOrderStatus } from "@/lib/actions/orders";

const STATUSES = [
  { value: "pending",    label: "En attente" },
  { value: "paid",       label: "Payee" },
  { value: "processing", label: "En cours" },
  { value: "shipped",    label: "Expediee" },
  { value: "delivered",  label: "Livree" },
  { value: "cancelled",  label: "Annulee" },
  { value: "refunded",   label: "Remboursee" },
];

interface OrderStatusSelectProps {
  orderId: string;
  currentStatus: string;
}

export function OrderStatusSelect({ orderId, currentStatus }: OrderStatusSelectProps) {
  const [status, setStatus] = useState(currentStatus);
  const [isPending, startTransition] = useTransition();

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const newStatus = e.target.value;
    setStatus(newStatus);
    startTransition(async () => {
      await updateOrderStatus(orderId, newStatus);
    });
  }

  return (
    <select
      value={status}
      onChange={handleChange}
      disabled={isPending}
      className="bg-secondary border border-border text-foreground text-xs rounded-md px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer disabled:opacity-50"
    >
      {STATUSES.map((s) => (
        <option key={s.value} value={s.value}>
          {s.label}
        </option>
      ))}
    </select>
  );
}