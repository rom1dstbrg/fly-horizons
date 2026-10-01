import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@react-pdf/renderer", "canvas", "sharp"],
  // Dev uniquement : ouvrir le serveur local depuis un téléphone du réseau
  // (sinon Next bloque le JS de dev et les formulaires ne répondent pas).
  allowedDevOrigins: ["192.168.*.*"],
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
  async headers() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
    const supabaseHost = supabaseUrl ? new URL(supabaseUrl).hostname : "*.supabase.co";

    const isDev = process.env.NODE_ENV === "development";

    const csp = [
      "default-src 'self'",
      // unsafe-eval requis uniquement en dev (fast refresh / stack traces React), jamais en prod
      `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
      "style-src 'self' 'unsafe-inline'",           // requis pour Leaflet et shadcn
      `img-src 'self' data: blob: ${supabaseHost} server.arcgisonline.com *.basemaps.cartocdn.com nwy-tiles-api.prod.newaydata.com`,
      `connect-src 'self' ${supabaseHost} wss://${supabaseHost} *.stripe.com nominatim.openstreetmap.org overpass-api.de`,
      "font-src 'self' data:",
      // Cadres autorisés : Supabase (PDF des documents pilote, URL signée du bucket privé)
      // et Google Maps (carte du point de rendez-vous sur /contact et /access-ebci,
      // bloquée jusqu'au 28/09 faute de ces deux domaines). Aucun autre domaine.
      `frame-src ${supabaseHost} https://www.google.com https://maps.google.com`,
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