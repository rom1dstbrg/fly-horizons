"use client";

import { DeleteButton } from "@/components/admin/DeleteButton";
import { deleteOrder } from "@/lib/actions/delete";

export function DeleteOrderButton({ orderId }: { orderId: string }) {
  return (
    <DeleteButton
      onDelete={() => deleteOrder(orderId)}
      label="Supprimer"
      confirmMessage="Confirmer ?"
    />
  );
}