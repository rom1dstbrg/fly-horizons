import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://shop.fly-horizons.com";

  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/shop", "/product/"],
        disallow: ["/admin/", "/account/", "/orders/", "/checkout/", "/api/"],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}