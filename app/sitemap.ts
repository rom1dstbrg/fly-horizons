import { MetadataRoute } from "next";
import { createAdminClient } from "@/lib/supabase/admin";

// Sans ça le sitemap est figé au build : une annonce annulée après le déploiement
// y restait listée, et Google tombait sur une page notFound() servie avec
// <meta robots noindex> (alerte Search Console du 23/09).
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://fly-horizons.com";
  const adminSupabase = createAdminClient();

  const { data: annonces } = await adminSupabase
    .from("annonces_pilote").select("id, created_at").eq("statut", "publiee");

  const annonceUrls = (annonces ?? []).map((a) => ({
    url: `${siteUrl}/vol/annonce/${a.id}`,
    lastModified: new Date(a.created_at),
    changeFrequency: "weekly" as const,
    priority: 0.9,
  }));

  return [
    { url: siteUrl, lastModified: new Date(), changeFrequency: "daily", priority: 1 },
    { url: `${siteUrl}/nos-offres`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.9 },
    { url: `${siteUrl}/about`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.7 },
    { url: `${siteUrl}/devenir-pilote`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.6 },
    { url: `${siteUrl}/galerie`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.6 },
    { url: `${siteUrl}/faq`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.6 },
    { url: `${siteUrl}/contact`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.5 },
    { url: `${siteUrl}/cgp`, lastModified: new Date(), changeFrequency: "yearly", priority: 0.2 },
    { url: `${siteUrl}/politique-de-confidentialite`, lastModified: new Date(), changeFrequency: "yearly", priority: 0.2 },
    ...annonceUrls,
  ];
}