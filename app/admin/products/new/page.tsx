import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { ProductForm } from "@/components/admin/ProductForm";
import { PageHeader } from "@/components/admin/PageHeader";

export const metadata = { title: "Nouveau produit — Admin" };

export default function NewProductPage() {
  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/admin/boutique?tab=produits"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors mb-2"
        >
          <ChevronLeft size={16} />
          Retour aux produits
        </Link>
        <PageHeader domain="boutique" title="Nouveau produit" />
      </div>
      <ProductForm />
    </div>
  );
}