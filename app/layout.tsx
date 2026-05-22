import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import { SplashScreen } from "@/components/SplashScreen";
import { ScrollToTop } from "@/components/ScrollToTop";
import "./globals.css";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  variable: "--font-poppins",
  display: "swap",
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://fly-horizons.com";

export const metadata: Metadata = {
  title: {
    default: "Fly Horizons — Baptême de l'air en Belgique",
    template: "%s | Fly Horizons",
  },
  description:
    "Baptême de l'air et vols privés en avion léger depuis Charleroi (Belgique). Pilote CPL licencié, jusqu'à 3 passagers, itinéraire 100 % libre. Réservez votre expérience unique.",
  metadataBase: new URL(siteUrl),
  keywords: [
    "baptême de l'air Belgique",
    "baptême de l'air Charleroi",
    "vol en avion Belgique",
    "vol privé Charleroi",
    "vol avion léger Belgique",
    "vol découverte Belgique",
    "cadeau vol avion Belgique",
    "vol panoramique Belgique",
    "Fly Horizons",
  ],
  openGraph: {
    type: "website",
    locale: "fr_BE",
    url: siteUrl,
    siteName: "Fly Horizons",
    title: "Fly Horizons — Baptême de l'air en Belgique",
    description:
      "Baptême de l'air et vols privés en avion léger depuis Charleroi. Pilote CPL licencié, jusqu'à 3 passagers, itinéraire 100 % libre.",
    images: [
      {
        url: "/piste.jpg",
        width: 1200,
        height: 630,
        alt: "Fly Horizons — Baptême de l'air en Belgique",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Fly Horizons — Baptême de l'air en Belgique",
    description:
      "Vols privés en avion léger depuis Charleroi. Itinéraire libre, pilote CPL licencié.",
    images: ["/piste.jpg"],
  },
  icons: {
    icon: [
      { url: "/icone.svg", type: "image/svg+xml", sizes: "any" },
      { url: "/favicon.png", type: "image/png", sizes: "32x32" },
    ],
    shortcut: "/favicon.png",
    apple: "/apple-touch-icon.png",
  },
};

const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Fly Horizons",
  url: siteUrl,
  logo: "https://fly-horizons.com/logo-email.png",
  sameAs: ["https://fly-horizons.com"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className={`${poppins.variable} h-full`}>
      <body className="min-h-full antialiased">
        <ScrollToTop />
        <SplashScreen />
        {children}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
        />
      </body>
    </html>
  );
}