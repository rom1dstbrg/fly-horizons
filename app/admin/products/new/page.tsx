import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { ProductForm } from "@/components/admin/ProductForm";

export const metadata = { title: "Nouveau produit — Admin" };

export default function NewProductPage() {
  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/admin/products"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors mb-4"
        >
          <ChevronLeft size={16} />
          Retour aux produits
        </Link>
        <h1 className="text-2xl font-bold text-foreground">
          Nouveau produit
        </h1>
      </div>
      <ProductForm />
    </div>
  );
}