"use client";

import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";

export function BackLink() {
  const router = useRouter();

  function handleBack() {
    if (window.history.length > 1) {
      router.back();
    } else {
      router.push("/nos-offres");
    }
  }

  return (
    <button
      onClick={handleBack}
      className="inline-flex items-center gap-1.5 text-sm font-medium text-[#0b2238]/50 hover:text-[#0b2238] transition-colors mb-8 cursor-pointer"
    >
      <ChevronLeft size={14} />
      Retour
    </button>
  );
}
