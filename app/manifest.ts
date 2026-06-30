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
      { src: "/icone.png", sizes: "2149x2149", type: "image/png" },
      { src: "/icone.svg", sizes: "any",       type: "image/svg+xml" },
    ],
  };
}
