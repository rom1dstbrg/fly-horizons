import { MetadataRoute } from "next";
import { createAdminClient } from "@/lib/supabase/admin";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://fly-horizons.com";
  const adminSupabase = createAdminClient();

  const { data: products } = await adminSupabase
    .from("products")
    .select("slug, updated_at, product_type")
    .eq("active", true);

  const voucherUrls = (products ?? [])
    .filter((p) => p.product_type === "voucher")
    .map((p) => ({
      url: `${siteUrl}/vols/${p.slug}`,
      lastModified: new Date(p.updated_at),
      changeFrequency: "weekly" as const,
      priority: 0.9,
    }));

  const physicalUrls = (products ?? [])
    .filter((p) => p.product_type === "physical")
    .map((p) => ({
      url: `${siteUrl}/product/${p.slug}`,
      lastModified: new Date(p.updated_at),
      changeFrequency: "weekly" as const,
      priority: 0.7,
    }));

  return [
    { url: siteUrl, lastModified: new Date(), changeFrequency: "daily", priority: 1 },
    { url: `${siteUrl}/nos-offres`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.9 },
    { url: `${siteUrl}/vol-sur-mesure`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.8 },
    { url: `${siteUrl}/shop`, lastModified: new Date(), changeFrequency: "daily", priority: 0.7 },
    { url: `${siteUrl}/faq`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.6 },
    { url: `${siteUrl}/contact`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.5 },
    ...voucherUrls,
    ...physicalUrls,
  ];
}