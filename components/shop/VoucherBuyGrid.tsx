"use client";

import { PackBuyCard } from "@/components/shop/PackCard";

interface VoucherProduct {
  id: string;
  title: string;
  price: number;
  slug: string;
  short_description: string | null;
  voucher_duration_minutes: number | null;
  images: { url: string }[] | null;
}

export function VoucherBuyGrid({ vols }: { vols: VoucherProduct[] }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
      {vols.map((vol) => (
        <PackBuyCard key={vol.id} pack={vol} />
      ))}
    </div>
  );
}
