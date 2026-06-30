"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RotateCcw, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { generateClientRescheduleToken } from "@/lib/actions/reservations";

export function RescheduleButton({ reservationId }: { reservationId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handle() {
    setLoading(true);
    const result = await generateClientRescheduleToken(reservationId);
    setLoading(false);
    if (result.error) {
      toast.error(result.error);
    } else if (result.token) {
      router.push(`/reservation/reporter/${result.token}`);
    }
  }

  return (
    <button
      type="button"
      onClick={handle}
      disabled={loading}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors disabled:opacity-50 cursor-pointer ml-auto"
    >
      {loading ? <Loader2 size={11} className="animate-spin" /> : <RotateCcw size={11} />}
      Reporter
    </button>
  );
}
