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
    <section className="py-20 bg-gradient-navy">
      <div className="container-shop">

        {/* Header */}
        <div className="mb-10 flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-2">
              Services
            </p>
            <h2 className="text-3xl font-bold text-foreground">
              Vouchers
            </h2>
            <p className="text-muted-foreground text-sm mt-2 max-w-lg">
              Offrez ou réservez du temps de vol sur Fly Horizons. Le code vous est envoyé par email immédiatement après l&apos;achat.
            </p>
          </div>
          {showSeeAll && (
            <Link
              href="/nos-offres"
              className="hidden sm:inline-flex shrink-0 text-sm text-primary hover:text-[#e6a800] font-medium transition-colors"
            >
              Voir tout
            </Link>
          )}
        </div>

        {/* Grid — même layout que les produits physiques */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {vouchers.map((voucher) => (
            <ProductCard key={voucher.id} product={voucher} />
          ))}
        </div>

      </div>
    </section>
  );
}
