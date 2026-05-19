import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://fly-horizons.com";

  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/nos-offres", "/vols/", "/vol-sur-mesure", "/shop", "/product/", "/faq", "/contact"],
        disallow: ["/admin/", "/account/", "/orders/", "/checkout/", "/api/", "/reservation/", "/login", "/register"],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}