import { createClient } from "@/lib/supabase/server";
import { HeroSection } from "@/components/shop/HeroSection";
import { FeaturedProducts } from "@/components/shop/FeaturedProducts";
import { StorySection } from "@/components/shop/StorySection";

export default async function HomePage() {
  const supabase = await createClient();

  const { data: products } = await supabase
    .from("products")
    .select("*, images:product_images(*)")
    .eq("active", true)
    .eq("featured", true)
    .order("created_at", { ascending: false })
    .limit(4);

  return (
    <main>
      <HeroSection />
      <FeaturedProducts products={products ?? []} />
      <StorySection />
    </main>
  );
}