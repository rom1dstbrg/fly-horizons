"use client";

import { DeleteButton } from "@/components/admin/DeleteButton";
import { deleteCoupon } from "@/lib/actions/delete";

export function DeleteCouponButton({ couponId }: { couponId: string }) {
  return (
    <DeleteButton
      onDelete={() => deleteCoupon(couponId)}
      label="Supprimer"
      confirmMessage="Confirmer ?"
    />
  );
}