import { createAdminClient } from "@/lib/supabase/admin";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { ProductForm } from "@/components/admin/ProductForm";
import { DeleteProductButton } from "@/components/admin/DeleteProductButton";

interface EditProductPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditProductPage({ params }: EditProductPageProps) {
  const { id } = await params;
  const adminSupabase = createAdminClient();

  const { data: product } = await adminSupabase
    .from("products")
    .select("*, images:product_images(*)")
    .eq("id", id)
    .single();

  if (!product) notFound();

  if (product.images) {
    product.images.sort((a: { position: number }, b: { position: number }) => a.position - b.position);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <Link
            href="/admin/boutique?tab=produits"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors mb-4"
          >
            <ChevronLeft size={16} />
            Retour aux produits
          </Link>
          <h1 className="text-2xl font-bold text-foreground">
            Modifier : {product.title}
          </h1>
        </div>
        <DeleteProductButton productId={product.id} />
      </div>
      <ProductForm product={product} />
    </div>
  );
}