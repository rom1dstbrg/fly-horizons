"use client";

import { useState, useTransition } from "react";
import { toggleProductActive } from "@/lib/actions/products";

interface ToggleProductActiveProps {
  productId: string;
  active: boolean;
}

export function ToggleProductActive({ productId, active }: ToggleProductActiveProps) {
  const [isActive, setIsActive] = useState(active);
  const [isPending, startTransition] = useTransition();

  function handleToggle() {
    startTransition(async () => {
      const result = await toggleProductActive(productId, !isActive);
      if (!result.error) setIsActive(!isActive);
    });
  }

  return (
    <button
      onClick={handleToggle}
      disabled={isPending}
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${
        isActive ? "bg-primary" : "bg-border"
      } ${isPending ? "opacity-50" : ""}`}
    >
      <span
        className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
          isActive ? "translate-x-4" : "translate-x-1"
        }`}
      />
    </button>
  );
}