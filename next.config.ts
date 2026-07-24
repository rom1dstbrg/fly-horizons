import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@react-pdf/renderer", "canvas", "sharp"],
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
  async redirects() {
    return [
      { source: "/vols/aventure-60-min",       destination: "/vols/exploration-60-min", permanent: true },
      { source: "/vols/voyage-90-min",          destination: "/vols/immersion-90-min",   permanent: true },
      { source: "/vol-sur-mesure/configurer",   destination: "/configurer",              permanent: true },
      { source: "/vol-sur-mesure/configurer/:path*", destination: "/configurer/:path*",  permanent: true },
    ];
  },

  async headers() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
    const supabaseHost = supabaseUrl ? new URL(supabaseUrl).hostname : "*.supabase.co";

    const csp = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'",         // unsafe-inline requis pour les scripts injectés par Next.js
      "style-src 'self' 'unsafe-inline'",           // requis pour Leaflet et shadcn
      `img-src 'self' data: blob: ${supabaseHost} server.arcgisonline.com *.basemaps.cartocdn.com`,
      `connect-src 'self' ${supabaseHost} wss://${supabaseHost} *.stripe.com nominatim.openstreetmap.org overpass-api.de`,
      "font-src 'self' data:",
      "frame-src 'none'",
      "frame-ancestors 'none'",
      "object-src 'none'",
      "base-uri 'self'",
    ].join("; ");

    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options",           value: "DENY" },
          { key: "X-Content-Type-Options",     value: "nosniff" },
          { key: "Referrer-Policy",            value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy",         value: "camera=(), microphone=(), geolocation=()" },
          { key: "Content-Security-Policy",    value: csp },
        ],
      },
    ];
  },
};

export default nextConfig;