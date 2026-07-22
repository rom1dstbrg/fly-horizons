import { createAdminClient } from "@/lib/supabase/admin";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { ProductForm } from "@/components/admin/ProductForm";
import { DeleteProductButton } from "@/components/admin/DeleteProductButton";
import { PageHeader } from "@/components/admin/PageHeader";

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
      <div>
        <Link
          href="/admin/boutique?tab=produits"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors mb-2"
        >
          <ChevronLeft size={16} />
          Retour aux produits
        </Link>
        <PageHeader
          domain="boutique"
          title={`Modifier : ${product.title}`}
          action={<DeleteProductButton productId={product.id} />}
        />
      </div>
      <ProductForm product={product} />
    </div>
  );
}