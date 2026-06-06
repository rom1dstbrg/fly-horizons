import Link from "next/link";
import { ProductCard } from "@/components/shop/ProductCard";
import type { Product } from "@/types/database";

interface VouchersSectionProps {
  vouchers: Product[];
  showSeeAll?: boolean;
}

export function VouchersSection({ vouchers, showSeeAll = false }: VouchersSectionProps) {
  if (vouchers.length === 0) return null;

  return (
    <section className="py-20 bg-[#f5f5f7]">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 xl:px-10">

        {/* Header */}
        <div className="mb-10 flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold text-[#F2B705] uppercase tracking-[3px] mb-2">
              Services
            </p>
            <h2 className="text-4xl sm:text-5xl font-black text-[#0b2238] leading-none tracking-tight">
              Vouchers
            </h2>
            <p className="text-[#0b2238]/50 text-sm mt-2 max-w-lg">
              Offrez ou réservez du temps de vol. Le code vous est envoyé par email immédiatement après l&apos;achat.
            </p>
          </div>
          {showSeeAll && (
            <Link
              href="/nos-offres"
              className="hidden sm:inline-flex shrink-0 text-sm text-[#F2B705] hover:text-[#e6a800] font-medium transition-colors"
            >
              Voir tout
            </Link>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {vouchers.map((voucher) => (
            <ProductCard key={voucher.id} product={voucher} />
          ))}
        </div>

      </div>
    </section>
  );
}
