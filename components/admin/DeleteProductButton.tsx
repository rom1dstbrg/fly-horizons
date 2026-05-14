"use client";

import { DeleteButton } from "@/components/admin/DeleteButton";
import { deleteProduct } from "@/lib/actions/delete";

export function DeleteProductButton({ productId }: { productId: string }) {
  return (
    <DeleteButton
      onDelete={() => deleteProduct(productId)}
      label="Supprimer le produit"
      confirmMessage="Confirmer ?"
    />
  );
}