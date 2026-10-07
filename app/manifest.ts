import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Fly Horizons Admin",
    short_name: "FH Admin",
    description: "Interface d'administration Fly Horizons",
    start_url: "/admin",
    display: "standalone",
    background_color: "#f5f5f7",
    theme_color: "#0b2238",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icone.svg", sizes: "any", type: "image/svg+xml" },
    ],
  };
}
