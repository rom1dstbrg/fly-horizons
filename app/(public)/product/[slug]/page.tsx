import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { ProductDetail } from "@/components/shop/ProductDetail";

interface ProductPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: ProductPageProps) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: product } = await supabase
    .from("products")
    .select("title, short_description")
    .eq("slug", slug)
    .eq("active", true)
    .single();

  if (!product) return { title: "Produit introuvable" };

  return {
    title: product.title,
    description: product.short_description ?? undefined,
  };
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: product } = await supabase
    .from("products")
    .select("*, images:product_images(*)")
    .eq("slug", slug)
    .eq("active", true)
    .single();

  if (!product) notFound();

  return <ProductDetail product={product} />;
}