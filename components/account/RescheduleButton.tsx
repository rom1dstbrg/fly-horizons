"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarClock, Loader2 } from "lucide-react";
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
      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-[9px] border border-border text-xs font-semibold text-foreground bg-white hover:border-foreground transition-colors disabled:opacity-50 cursor-pointer"
    >
      {loading ? <Loader2 size={13} className="animate-spin" /> : <CalendarClock size={13} />}
      Reporter
    </button>
  );
}
